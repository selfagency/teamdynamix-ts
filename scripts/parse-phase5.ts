import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ExampleEnricher, enrichSpecWithExamples } from '../src/schema/example-enricher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PhaseResult {
  phase: string;
  status: 'success' | 'failed';
  summary: string;
  details: {
    schemaExamplesAdded: number;
    operationEnrichmentsAdded: number;
    validationRulesAdded: number;
    rateLimitsAdded: number;
    commonErrorsAdded: number;
    processingTimeMs: number;
  };
  output?: {
    enrichedSpecFile: string;
    reportFile: string;
  };
}

async function runPhase5(): Promise<PhaseResult> {
  const startTime = Date.now();

  try {
    console.log('🚀 Phase 5: Enrichment & Examples\n');
    console.log('═'.repeat(60));

    // Step 1: Load enriched spec from Phase 4
    console.log('\n📄 Step 1: Loading enriched specification...');
    const outputDir = path.join(__dirname, '../output');
    const specPath = path.join(outputDir, 'openapi.json');

    if (!fs.existsSync(specPath)) {
      throw new Error(`Enriched spec not found at ${specPath}. Please run Phase 4 first.`);
    }

    const specContent = fs.readFileSync(specPath, 'utf-8');
    const spec = JSON.parse(specContent);

    console.log(`✓ Loaded OpenAPI spec with ${Object.keys(spec.paths).length} paths`);
    console.log(`✓ Loaded ${Object.keys(spec.components.schemas).length} schemas`);

    // Step 2: Generate and inject examples
    console.log('\n📚 Step 2: Generating examples and enrichment...');
    const enricher = new ExampleEnricher();

    // Generate type examples
    const typeExamples = ExampleEnricher.generateTypeExamples();
    let schemaExamplesAdded = 0;

    for (const [typeName, example] of typeExamples) {
      enricher.addSchemaExample(typeName, example);
      schemaExamplesAdded++;
    }

    console.log(`✓ Generated ${schemaExamplesAdded} type examples`);

    // Generate common errors (used for all operations)
    const commonErrors = ExampleEnricher.getCommonErrors();
    console.log(`✓ Generated ${commonErrors.length} common error definitions`);

    // Step 3: Inject enrichment into spec
    console.log('\n💉 Step 3: Injecting enrichment into specification...');
    const enrichedSpec = enrichSpecWithExamples(spec, enricher);

    // Count injections
    let validationRulesAdded = 0;
    let rateLimitsAdded = 0;
    let commonErrorsAdded = 0;

    for (const schema of Object.values(enrichedSpec.components?.schemas || {})) {
      const s = schema as any;
      if (s['x-validationRules']) validationRulesAdded++;
    }

    for (const pathOps of Object.values(enrichedSpec.paths || {})) {
      for (const operation of Object.values(pathOps)) {
        const op = operation as any;
        if (op['x-rateLimit']) rateLimitsAdded++;
        if (op['x-commonErrors']) commonErrorsAdded++;
      }
    }

    console.log(`✓ Added ${validationRulesAdded} validation rule sets`);
    console.log(`✓ Added ${rateLimitsAdded} rate limit definitions`);
    console.log(`✓ Added ${commonErrorsAdded} common error mappings`);

    // Step 4: Write enriched spec
    console.log('\n💾 Step 4: Writing enriched specification...');
    const enrichedSpecFile = path.join(outputDir, 'openapi-enriched.json');
    fs.writeFileSync(enrichedSpecFile, JSON.stringify(enrichedSpec, null, 2));
    console.log(`✓ Wrote enriched spec to ${enrichedSpecFile}`);

    // Step 5: Generate report
    console.log('\n📊 Step 5: Generating report...');
    const report = generateReport(enrichedSpec, {
      schemaExamplesAdded,
      validationRulesAdded,
      rateLimitsAdded,
      commonErrorsAdded,
    });
    const reportFile = path.join(outputDir, 'phase-5-report.md');
    fs.writeFileSync(reportFile, report);
    console.log(`✓ Wrote report to ${reportFile}`);

    // Summary
    const processingTime = Date.now() - startTime;
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Phase 5 Complete\n');
    console.log('Summary:');
    console.log(`  - Schema examples: ${schemaExamplesAdded}`);
    console.log(`  - Validation rules: ${validationRulesAdded}`);
    console.log(`  - Rate limits: ${rateLimitsAdded}`);
    console.log(`  - Common errors: ${commonErrorsAdded}`);
    console.log(`  - Processing time: ${processingTime}ms`);

    return {
      phase: 'Phase 5: Enrichment & Examples',
      status: 'success',
      summary: `Successfully enriched OpenAPI spec with ${schemaExamplesAdded} examples, ${validationRulesAdded} validation rules, and rate limit definitions`,
      details: {
        schemaExamplesAdded,
        operationEnrichmentsAdded: rateLimitsAdded,
        validationRulesAdded,
        rateLimitsAdded,
        commonErrorsAdded,
        processingTimeMs: processingTime,
      },
      output: {
        enrichedSpecFile,
        reportFile,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('\n❌ Phase 5 Failed');
    console.error(`Error: ${errorMessage}`);

    return {
      phase: 'Phase 5: Enrichment & Examples',
      status: 'failed',
      summary: `Phase 5 failed: ${errorMessage}`,
      details: {
        schemaExamplesAdded: 0,
        operationEnrichmentsAdded: 0,
        validationRulesAdded: 0,
        rateLimitsAdded: 0,
        commonErrorsAdded: 0,
        processingTimeMs: processingTime,
      },
    };
  }
}

function generateReport(
  spec: any,
  counts: {
    schemaExamplesAdded: number;
    validationRulesAdded: number;
    rateLimitsAdded: number;
    commonErrorsAdded: number;
  },
): string {
  const lines: string[] = [];

  lines.push('# Phase 5: Enrichment & Examples Report\n');

  lines.push('## Overview\n');
  lines.push(`- **Schema examples added:** ${counts.schemaExamplesAdded}`);
  lines.push(`- **Validation rules added:** ${counts.validationRulesAdded}`);
  lines.push(`- **Rate limits added:** ${counts.rateLimitsAdded}`);
  lines.push(`- **Common errors added:** ${counts.commonErrorsAdded}\n`);

  lines.push('## Schema Examples\n');
  lines.push('The following schemas now include example values:\n');
  lines.push('```');
  const schemasWithExamples = (Object.entries(spec.components?.schemas || {}) as [string, any][])
    .filter(([_, schema]) => schema.example)
    .map(([name]) => name);
  schemasWithExamples.slice(0, 10).forEach(name => {
    lines.push(`- ${name}`);
  });
  if (schemasWithExamples.length > 10) {
    lines.push(`- ... and ${schemasWithExamples.length - 10} more`);
  }
  lines.push('```\n');

  lines.push('## Validation Rules\n');
  lines.push('The following schemas include validation rules:\n');
  lines.push('```');
  const schemasWithRules = (Object.entries(spec.components?.schemas || {}) as [string, any][])
    .filter(([_, schema]) => schema['x-validationRules'])
    .map(([name, schema]) => `${name}: ${schema['x-validationRules'].length} rules`);
  schemasWithRules.slice(0, 10).forEach(text => {
    lines.push(`- ${text}`);
  });
  lines.push('```\n');

  lines.push('## Rate Limiting\n');
  lines.push('All operations now include rate limit information:\n');
  lines.push('- **Read operations:** 60 requests/minute, 3600 requests/hour');
  lines.push('- **Write operations:** 30 requests/minute, 1800 requests/hour');
  lines.push('- **Search operations:** 60 requests/minute, 3600 requests/hour\n');

  lines.push('## Common Errors\n');
  lines.push('All operations include a list of common error responses:\n');
  lines.push('```');
  const commonErrors = [
    '400 Bad Request - Invalid parameters',
    '401 Unauthorized - Missing or invalid authentication',
    '403 Forbidden - Insufficient permissions',
    '404 Not Found - Resource does not exist',
    '422 Unprocessable Entity - Validation failed',
    '429 Too Many Requests - Rate limit exceeded',
    '500 Internal Server Error',
  ];
  commonErrors.forEach(err => {
    lines.push(`- ${err}`);
  });
  lines.push('```\n');

  lines.push('## Statistics\n');
  lines.push(`- **Total paths:** ${Object.keys(spec.paths).length}`);
  lines.push(`- **Total schemas:** ${Object.keys(spec.components.schemas).length}`);
  lines.push(`- **Spec size:** ${Math.round(JSON.stringify(spec).length / 1024)} KB`);
  lines.push(`- **Generated:** ${new Date().toISOString()}`);

  return lines.join('\n');
}

// Run phase 5
const result = await runPhase5();

// Exit with appropriate code
process.exit(result.status === 'success' ? 0 : 1);
