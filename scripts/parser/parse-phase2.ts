import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TDWebApiParser } from './parser/index.js';
import { SchemaGenerator } from './schema/schema-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PhaseResult {
  phase: string;
  status: 'success' | 'failed';
  summary: string;
  details: {
    typesExtracted: number;
    schemasGenerated: number;
    errors: number;
    warnings: number;
    processingTimeMs: number;
  };
  output?: {
    schemasFile: string;
    consolidatedFile: string;
    reportFile: string;
  };
}

async function runPhase2(): Promise<PhaseResult> {
  const startTime = Date.now();

  try {
    console.log('🚀 Phase 2: Schema Generation\n');
    console.log('═'.repeat(60));

    // Step 1: Parse markdown documentation
    console.log('\n📄 Step 1: Parsing documentation...');
    const sourceDir = path.join(__dirname, '../../sources/TDWebApi/Home');

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }

    const parser = new TDWebApiParser(sourceDir);
    const parseResult = await parser.parse();

    console.log(`✓ Extracted ${parseResult.types.length} types`);
    console.log(`✓ Extracted ${parseResult.endpoints.length} endpoints`);

    if (parseResult.errors.length > 0) {
      console.log(`⚠ Warnings/Errors: ${parseResult.errors.length} issues found`);
      parseResult.errors.slice(0, 5).forEach(err => {
        console.log(`  - [${err.level}] ${err.file}: ${err.message}`);
      });
    }

    // Step 2: Generate schemas
    console.log('\n🏗️  Step 2: Generating OpenAPI schemas...');
    const generator = new SchemaGenerator();
    generator.addTypes(parseResult.types);

    const schemaResult = generator.generate();
    console.log(`✓ Generated ${Object.keys(schemaResult.schemas).length} schemas`);
    console.log(`✓ Consolidated ${Object.keys(schemaResult.consolidated).length} variant groups`);

    if (schemaResult.errors.length > 0) {
      console.log(`⚠ Schema generation warnings: ${schemaResult.errors.length}`);
      schemaResult.errors.slice(0, 5).forEach(err => {
        console.log(`  - [${err.type}] ${err.message}`);
      });
    }

    // Step 3: Write schemas to disk
    console.log('\n💾 Step 3: Writing output files...');
    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write full schemas
    const schemasFile = path.join(outputDir, 'schemas.json');
    fs.writeFileSync(schemasFile, JSON.stringify(schemaResult.schemas, null, 2));
    console.log(`✓ Wrote schemas to ${schemasFile}`);

    // Write consolidated schemas
    const consolidatedFile = path.join(outputDir, 'consolidated-schemas.json');
    const consolidatedOutput = Object.fromEntries(
      Array.from(Object.entries(schemaResult.consolidated)).map(([name, consolidated]) => [
        name,
        {
          base: consolidated.baseSchema,
          variants: consolidated.variants,
          variantCount: Object.keys(consolidated.variants).length,
          totalVersions: consolidated.allVersions.length,
        },
      ]),
    );
    fs.writeFileSync(consolidatedFile, JSON.stringify(consolidatedOutput, null, 2));
    console.log(`✓ Wrote consolidated schemas to ${consolidatedFile}`);

    // Step 4: Generate report
    console.log('\n📊 Step 4: Generating report...');
    const report = generateReport(parseResult, schemaResult);
    const reportFile = path.join(outputDir, 'phase-2-report.md');
    fs.writeFileSync(reportFile, report);
    console.log(`✓ Wrote report to ${reportFile}`);

    // Summary
    const processingTime = Date.now() - startTime;
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Phase 2 Complete\n');
    console.log('Summary:');
    console.log(`  - Types processed: ${parseResult.types.length}`);
    console.log(`  - Schemas generated: ${Object.keys(schemaResult.schemas).length}`);
    console.log(`  - Consolidated variants: ${Object.keys(schemaResult.consolidated).length}`);
    console.log(`  - Processing time: ${processingTime}ms`);

    return {
      phase: 'Phase 2: Schema Generation',
      status: 'success',
      summary: `Successfully generated ${Object.keys(schemaResult.schemas).length} OpenAPI schemas from ${parseResult.types.length} type definitions`,
      details: {
        typesExtracted: parseResult.types.length,
        schemasGenerated: Object.keys(schemaResult.schemas).length,
        errors: schemaResult.errors.length,
        warnings: parseResult.errors.length,
        processingTimeMs: processingTime,
      },
      output: {
        schemasFile,
        consolidatedFile,
        reportFile,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('\n❌ Phase 2 Failed');
    console.error(`Error: ${errorMessage}`);

    return {
      phase: 'Phase 2: Schema Generation',
      status: 'failed',
      summary: `Phase 2 failed: ${errorMessage}`,
      details: {
        typesExtracted: 0,
        schemasGenerated: 0,
        errors: 1,
        warnings: 0,
        processingTimeMs: processingTime,
      },
    };
  }
}

function generateReport(
  parseResult: Awaited<ReturnType<InstanceType<any>['parse']>>,
  schemaResult: ReturnType<InstanceType<any>['generate']>,
): string {
  const lines: string[] = [];

  lines.push('# Phase 2: Schema Generation Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // Execution summary
  lines.push('## Execution Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Types Extracted | ${parseResult.types.length} |`);
  lines.push(`| Schemas Generated | ${Object.keys(schemaResult.schemas).length} |`);
  lines.push(`| Consolidated Variant Groups | ${Object.keys(schemaResult.consolidated).length} |`);
  lines.push(`| Parser Warnings | ${parseResult.errors.length} |`);
  lines.push(`| Schema Generation Warnings | ${schemaResult.errors.length} |`);
  lines.push('');

  // Type extraction details
  lines.push('## Type Extraction Details');
  lines.push('');
  const typesByNamespace = new Map<string, number>();
  for (const type of parseResult.types) {
    const ns = type.namespace || 'Global';
    typesByNamespace.set(ns, (typesByNamespace.get(ns) || 0) + 1);
  }

  lines.push('### Types by Namespace');
  lines.push('');
  for (const [ns, count] of Array.from(typesByNamespace.entries()).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${ns}**: ${count} types`);
  }
  lines.push('');

  // Schema generation details
  lines.push('## Schema Generation Details');
  lines.push('');
  lines.push('### Type Variants');
  lines.push('');

  const searchTypes = parseResult.types.filter(t => t.isSearch).length;
  const createTypes = parseResult.types.filter(t => t.isCreate).length;
  const updateTypes = parseResult.types.filter(t => t.isUpdate).length;
  const enumTypes = parseResult.types.filter(t => t.isEnum).length;

  lines.push(`- **Search Types**: ${searchTypes}`);
  lines.push(`- **Create Types**: ${createTypes}`);
  lines.push(`- **Update Types**: ${updateTypes}`);
  lines.push(`- **Enum Types**: ${enumTypes}`);
  lines.push('');

  // Consolidated variants
  lines.push('### Consolidated Variants');
  lines.push('');
  for (const [baseName, consolidated] of Array.from(Object.entries(schemaResult.consolidated)).sort()) {
    const variants = Object.keys(consolidated.variants || {});
    lines.push(`- **${baseName}**: ${variants.length} variants`);
  }
  lines.push('');

  // Warnings and errors
  if (schemaResult.errors.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    const byType = new Map<string, string[]>();
    for (const err of schemaResult.errors) {
      if (!byType.has(err.type)) {
        byType.set(err.type, []);
      }
      byType.get(err.type)!.push(err.message);
    }

    for (const [type, messages] of Array.from(byType.entries()).sort()) {
      lines.push(`### ${type}`);
      lines.push('');
      for (const msg of messages.slice(0, 10)) {
        lines.push(`- ${msg}`);
      }
      if (messages.length > 10) {
        lines.push(`- ... and ${messages.length - 10} more`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('- Review consolidated schemas for correctness');
  lines.push('- Proceed to Phase 3: Endpoint & Operation Generation');
  lines.push('- Generate full OpenAPI 3.1 specification document');

  return lines.join('\n');
}

// Run the phase
const result = await runPhase2();
process.exit(result.status === 'success' ? 0 : 1);
