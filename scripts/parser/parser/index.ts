import fs from 'fs';
import path from 'path';
import { EndpointExtractor } from './endpoint-extractor.js';
import { TypeExtractor } from './type-extractor.js';
import { CrossReferenceResolver } from './cross-reference-resolver.js';
import { parseMarkdownFiles } from './markdown-parser.js';
import type { ParserResult, ParsedType, ParsedEndpoint, ParserError, ParserStats } from './types.js';

/**
 * Main parser that orchestrates extraction of endpoints and types
 * from the TeamDynamix API documentation markdown files
 */

export class TDWebApiParser {
  private sourceDir: string;
  private errors: ParserError[] = [];
  private startTime: number = 0;

  constructor(sourceDir: string) {
    this.sourceDir = sourceDir;
  }

  /**
   * Main parse entry point
   */
  async parse(): Promise<ParserResult> {
    this.startTime = Date.now();
    this.errors = [];

    try {
      // Step 1: Parse all markdown files
      console.log('📄 Parsing markdown files...');
      const markdownFiles = await parseMarkdownFiles(this.sourceDir);
      console.log(`   Found ${markdownFiles.size} markdown files`);

      // Step 2: Extract endpoints from section files
      console.log('🔗 Extracting endpoints from section files...');
      const endpoints = await this.extractEndpoints(markdownFiles);
      console.log(`   Extracted ${endpoints.length} endpoints`);

      // Step 3: Extract types from member files
      console.log('🏗️  Extracting types from member files...');
      const types = await this.extractTypes(markdownFiles);
      console.log(`   Extracted ${types.length} types`);

      // Step 4: Build cross-references
      console.log('🔍 Building cross-references...');
      const resolver = new CrossReferenceResolver();
      resolver.addTypes(types, this.sourceDir);
      resolver.addEndpoints(endpoints);

      // Step 5: Validate cross-references
      console.log('✅ Validating cross-references...');
      const validationErrors = resolver.validate();
      console.log(`   Found ${validationErrors.length} reference issues`);

      // Record validation warnings
      for (const error of validationErrors) {
        this.errors.push({
          level: 'warning',
          file: `types/${error.type}`,
          message: `Missing type references: ${error.missing.join(', ')}`,
        });
      }

      // Step 6: Generate stats
      const stats = resolver.getStats();
      const processingTimeMs = Date.now() - this.startTime;

      const result: ParserResult = {
        endpoints,
        types,
        crossReferences: resolver.getMap(),
        errors: this.errors,
        stats: {
          totalFilesProcessed: markdownFiles.size,
          totalEndpointsParsed: endpoints.length,
          totalTypesParsed: types.length,
          errorCount: this.errors.filter(e => e.level === 'error').length,
          warningCount: this.errors.filter(e => e.level === 'warning').length,
          processingTimeMs,
        },
      };

      console.log('\n📊 Parse Summary:');
      console.log(`   Files: ${result.stats.totalFilesProcessed}`);
      console.log(`   Endpoints: ${result.stats.totalEndpointsParsed}`);
      console.log(`   Types: ${result.stats.totalTypesParsed}`);
      console.log(`   Errors: ${result.stats.errorCount}, Warnings: ${result.stats.warningCount}`);
      console.log(`   Time: ${processingTimeMs}ms`);

      return result;
    } catch (error) {
      this.errors.push({
        level: 'error',
        file: 'parser',
        message: `Parser failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      return {
        endpoints: [],
        types: [],
        crossReferences: {
          types: new Map(),
          typeFiles: new Map(),
          endpoints: [],
          sections: new Map(),
        },
        errors: this.errors,
        stats: {
          totalFilesProcessed: 0,
          totalEndpointsParsed: 0,
          totalTypesParsed: 0,
          errorCount: this.errors.length,
          warningCount: 0,
          processingTimeMs: Date.now() - this.startTime,
        },
      };
    }
  }

  /**
   * Extract endpoints from section markdown files
   */
  private async extractEndpoints(markdownFiles: Map<string, { rawContent: string }>): Promise<ParsedEndpoint[]> {
    const endpoints: ParsedEndpoint[] = [];

    for (const [filePath, content] of markdownFiles) {
      // Only process section files
      if (!filePath.startsWith('section/')) {
        continue;
      }

      try {
        const sectionName = path.basename(filePath, '.md');
        const sectionEndpoints = EndpointExtractor.extractEndpoints(content.rawContent, sectionName);

        endpoints.push(...sectionEndpoints);
      } catch (error) {
        this.errors.push({
          level: 'warning',
          file: filePath,
          message: `Failed to extract endpoints: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return endpoints;
  }

  /**
   * Extract types from type markdown files
   */
  private async extractTypes(markdownFiles: Map<string, { rawContent: string }>): Promise<ParsedType[]> {
    const types: ParsedType[] = [];
    const typeMap = new Map<string, ParsedType>();

    for (const [filePath, content] of markdownFiles) {
      // Only process type files (not member files)
      if (!filePath.startsWith('type/')) {
        continue;
      }

      try {
        const type = TypeExtractor.extractType(content.rawContent, filePath);

        if (type) {
          // Store by full name, handling duplicates
          if (typeMap.has(type.fullName)) {
            const existing = typeMap.get(type.fullName)!;
            // Merge properties from this variant
            for (const prop of type.properties) {
              if (!existing.properties.find(p => p.name === prop.name)) {
                existing.properties.push(prop);
              }
            }
          } else {
            typeMap.set(type.fullName, type);
          }
        }
      } catch (error) {
        this.errors.push({
          level: 'warning',
          file: filePath,
          message: `Failed to extract type: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return Array.from(typeMap.values());
  }
}

/**
 * Quick parse function
 */
export async function parseTeamDynamixApi(sourceDir: string): Promise<ParserResult> {
  const parser = new TDWebApiParser(sourceDir);
  return parser.parse();
}
