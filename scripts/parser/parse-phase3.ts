import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TDWebApiParser } from './parser/index.js';
import { PathOperationGenerator } from './schema/path-operation-generator.js';
import { SchemaGenerator } from './schema/schema-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PhaseResult {
  phase: string;
  status: 'success' | 'failed';
  summary: string;
  details: {
    endpointsExtracted: number;
    pathsGenerated: number;
    operationsGenerated: number;
    typesExtracted: number;
    schemasGenerated: number;
    parametersGenerated: number;
    errors: number;
    warnings: number;
    processingTimeMs: number;
  };
  output?: {
    pathsFile: string;
    combinedFile: string;
    reportFile: string;
  };
}

async function runPhase3(): Promise<PhaseResult> {
  const startTime = Date.now();

  try {
    console.log('🚀 Phase 3: Path & Operation Generation\n');
    console.log('═'.repeat(60));

    // Step 1: Parse markdown documentation
    console.log('\n📄 Step 1: Parsing documentation...');
    const sourceDir = path.join(__dirname, '../../sources/TDWebApi/Home');

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }

    const parser = new TDWebApiParser(sourceDir);
    const parseResult = await parser.parse();

    console.log(`✓ Extracted ${parseResult.endpoints.length} endpoints`);
    console.log(`✓ Extracted ${parseResult.types.length} types`);

    if (parseResult.errors.length > 0) {
      console.log(`⚠ Warnings/Errors: ${parseResult.errors.length} issues found`);
      parseResult.errors.slice(0, 3).forEach(err => {
        console.log(`  - [${err.level}] ${err.message}`);
      });
    }

    // Step 2: Generate schemas
    console.log('\n🏗️  Step 2: Generating OpenAPI schemas...');
    const schemaGenerator = new SchemaGenerator();
    schemaGenerator.addTypes(parseResult.types);
    const schemaResult = schemaGenerator.generate();

    console.log(`✓ Generated ${Object.keys(schemaResult.schemas).length} schemas`);

    // Step 3: Generate paths and operations
    console.log('\n🛣️  Step 3: Generating paths and operations...');
    const pathGenerator = new PathOperationGenerator();
    pathGenerator.addEndpoints(parseResult.endpoints);
    const pathResult = pathGenerator.generate();

    const pathStats = pathGenerator.getStats();
    console.log(`✓ Generated ${pathStats.pathCount} unique paths`);
    console.log(`✓ Generated ${pathStats.operationCount} operations`);
    console.log(`✓ Generated ${pathStats.parameterCount} parameters`);

    if (pathResult.errors.length > 0) {
      console.log(`⚠ Path generation warnings: ${pathResult.errors.length}`);
      pathResult.errors.slice(0, 3).forEach(err => {
        console.log(`  - [${err.type}] ${err.endpoint}: ${err.message}`);
      });
    }

    // Step 4: Write paths to disk
    console.log('\n💾 Step 4: Writing output files...');
    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write paths
    const pathsFile = path.join(outputDir, 'paths.json');
    fs.writeFileSync(pathsFile, JSON.stringify(pathResult.paths, null, 2));
    console.log(`✓ Wrote paths to ${pathsFile}`);

    // Step 5: Generate combined OpenAPI structure
    console.log('\n🔗 Step 5: Combining schemas and paths...');
    const combinedSpec: any = {
      openapi: '3.1.0',
      info: {
        title: 'TeamDynamix Web API',
        description: 'The TeamDynamix Web API allows you to integrate with TeamDynamix from your own applications.',
        version: '1.0.0',
        contact: {
          name: 'TeamDynamix Support',
          url: 'https://www.teamdynamix.com',
        },
        license: {
          name: 'MIT',
        },
      },
      servers: [
        {
          url: 'https://{tenant}.teamdynamix.com',
          variables: {
            tenant: {
              default: 'api',
              description: 'Your TeamDynamix tenant name',
            },
          },
        },
      ],
      paths: pathResult.paths,
      components: {
        schemas: schemaResult.schemas,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Bearer token authentication',
          },
        },
      },
      tags: Array.from(
        new Set(
          Object.values(pathResult.paths)
            .flatMap(path => Object.values(path))
            .flatMap((op: any) => op.tags || []),
        ),
      ).map(tag => ({ name: tag as string, description: `${tag} operations` })),
    };

    const combinedFile = path.join(outputDir, 'openapi-combined.json');
    fs.writeFileSync(combinedFile, JSON.stringify(combinedSpec, null, 2));
    console.log(`✓ Wrote combined spec to ${combinedFile}`);

    // Step 6: Generate report
    console.log('\n📊 Step 6: Generating report...');
    const report = generateReport(parseResult, pathStats, schemaResult, pathResult);
    const reportFile = path.join(outputDir, 'phase-3-report.md');
    fs.writeFileSync(reportFile, report);
    console.log(`✓ Wrote report to ${reportFile}`);

    // Summary
    const processingTime = Date.now() - startTime;
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Phase 3 Complete\n');
    console.log('Summary:');
    console.log(`  - Endpoints extracted: ${parseResult.endpoints.length}`);
    console.log(`  - Unique paths: ${pathStats.pathCount}`);
    console.log(`  - Operations: ${pathStats.operationCount}`);
    console.log(`  - Parameters: ${pathStats.parameterCount}`);
    console.log(`  - Schemas: ${Object.keys(schemaResult.schemas).length}`);
    console.log(`  - Processing time: ${processingTime}ms`);

    return {
      phase: 'Phase 3: Path & Operation Generation',
      status: 'success',
      summary: `Successfully generated ${pathStats.operationCount} operations across ${pathStats.pathCount} paths from ${parseResult.endpoints.length} endpoints`,
      details: {
        endpointsExtracted: parseResult.endpoints.length,
        pathsGenerated: pathStats.pathCount,
        operationsGenerated: pathStats.operationCount,
        typesExtracted: parseResult.types.length,
        schemasGenerated: Object.keys(schemaResult.schemas).length,
        parametersGenerated: pathStats.parameterCount,
        errors: pathResult.errors.filter(e => e.type === 'error').length,
        warnings: parseResult.errors.length + pathResult.errors.filter(e => e.type === 'warning').length,
        processingTimeMs: processingTime,
      },
      output: {
        pathsFile,
        combinedFile,
        reportFile,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('\n❌ Phase 3 Failed');
    console.error(`Error: ${errorMessage}`);

    return {
      phase: 'Phase 3: Path & Operation Generation',
      status: 'failed',
      summary: `Phase 3 failed: ${errorMessage}`,
      details: {
        endpointsExtracted: 0,
        pathsGenerated: 0,
        operationsGenerated: 0,
        typesExtracted: 0,
        schemasGenerated: 0,
        parametersGenerated: 0,
        errors: 1,
        warnings: 0,
        processingTimeMs: processingTime,
      },
    };
  }
}

function generateReport(parseResult: any, pathStats: any, schemaResult: any, pathResult: any): string {
  const lines: string[] = [];

  lines.push('# Phase 3: Path & Operation Generation Report\n');

  lines.push('## Overview\n');
  lines.push(`- **Endpoints Extracted:** ${parseResult.endpoints.length}`);
  lines.push(`- **Unique Paths:** ${pathStats.pathCount}`);
  lines.push(`- **Operations Generated:** ${pathStats.operationCount}`);
  lines.push(`- **Parameters Generated:** ${pathStats.parameterCount}`);
  lines.push(`- **Schemas Integrated:** ${Object.keys(schemaResult.schemas).length}\n`);

  lines.push('## Paths Generated\n');
  lines.push('```json');
  lines.push(JSON.stringify(Object.keys(pathResult.paths), null, 2));
  lines.push('```\n');

  if (pathResult.errors.length > 0) {
    lines.push('## Warnings\n');
    pathResult.errors.slice(0, 10).forEach((err: any) => {
      lines.push(`- [${err.type}] ${err.endpoint}: ${err.message}`);
    });
    lines.push('');
  }

  if (parseResult.errors.length > 0) {
    lines.push('## Parse Errors\n');
    parseResult.errors.slice(0, 10).forEach((err: any) => {
      lines.push(`- [${err.level}] ${err.file}: ${err.message}`);
    });
    lines.push('');
  }

  lines.push('## Statistics\n');
  lines.push(`- **Processing timestamp:** ${new Date().toISOString()}`);
  lines.push(`- **Output files:** paths.json, openapi-combined.json`);

  return lines.join('\n');
}

// Run phase 3
const result = await runPhase3();

// Exit with appropriate code
process.exit(result.status === 'success' ? 0 : 1);
