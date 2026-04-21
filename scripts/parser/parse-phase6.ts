import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpecExporter } from './schema/spec-exporter.js';
import { SpecValidator } from './schema/spec-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Phase6Result {
  phase: string;
  status: 'success' | 'failed';
  summary: string;
  details: {
    specValid: boolean;
    validationErrors: number;
    validationWarnings: number;
    formatsGenerated: string[];
    filesWritten: number;
    processingTimeMs: number;
  };
  output?: {
    specJSON: string;
    specYAML: string;
    htmlDocs: string;
    markdownDocs: string;
    validationReport: string;
  };
}

async function runPhase6(): Promise<Phase6Result> {
  const startTime = Date.now();

  try {
    console.log('🚀 Phase 6: Validation & Output\n');
    console.log('═'.repeat(60));

    // Step 1: Load enriched spec from Phase 5
    console.log('\n📄 Step 1: Loading enriched specification...');
    const outputDir = path.join(__dirname, '../output');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const enrichedSpecFile = path.join(outputDir, 'openapi-enriched.json');

    if (!fs.existsSync(enrichedSpecFile)) {
      throw new Error(`Enriched spec not found at ${enrichedSpecFile}. Please run Phase 5 first.`);
    }

    const specContent = fs.readFileSync(enrichedSpecFile, 'utf-8');
    const spec = JSON.parse(specContent);

    console.log(`✓ Loaded enriched OpenAPI spec`);
    console.log(`✓ ${Object.keys(spec.paths || {}).length} paths`);
    console.log(`✓ ${Object.keys(spec.components?.schemas || {}).length} schemas`);

    // Step 2: Validate specification
    console.log('\n✔️ Step 2: Validating specification...');
    const validator = new SpecValidator();
    const validationResult = validator.validate(spec);

    if (validationResult.valid) {
      console.log('✓ Specification is valid');
    } else {
      console.log(`⚠️  Found ${validationResult.errors.length} error(s)`);
      validationResult.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.location}: ${err.message}`);
      });
      if (validationResult.errors.length > 5) {
        console.log(`   ... and ${validationResult.errors.length - 5} more`);
      }
    }

    if (validationResult.warnings.length > 0) {
      console.log(`⚠️  Found ${validationResult.warnings.length} warning(s)`);
    }

    // Step 3: Export formats
    console.log('\n💾 Step 3: Exporting specifications in multiple formats...');

    const formats: string[] = [];
    let filesWritten = 0;

    // JSON export
    const jsonFile = path.join(outputDir, 'openapi.json');
    SpecExporter.exportJSON(spec, jsonFile, true);
    formats.push('JSON');
    filesWritten++;
    console.log(`✓ Exported JSON: ${path.basename(jsonFile)}`);

    // YAML export
    const yamlFile = path.join(outputDir, 'openapi.yaml');
    SpecExporter.exportYAML(spec, yamlFile);
    formats.push('YAML');
    filesWritten++;
    console.log(`✓ Exported YAML: ${path.basename(yamlFile)}`);

    // HTML export
    const htmlFile = path.join(outputDir, 'api-docs.html');
    SpecExporter.exportHTML(spec, htmlFile);
    formats.push('HTML');
    filesWritten++;
    console.log(`✓ Exported HTML: ${path.basename(htmlFile)}`);

    // Markdown export
    const mdFile = path.join(outputDir, 'api-docs.md');
    SpecExporter.exportMarkdown(spec, mdFile);
    formats.push('Markdown');
    filesWritten++;
    console.log(`✓ Exported Markdown: ${path.basename(mdFile)}`);

    // Step 4: Generate validation report
    console.log('\n📊 Step 4: Generating validation report...');
    const validationReport = SpecValidator.generateReport(validationResult);
    const reportFile = path.join(outputDir, 'validation-report.md');
    fs.writeFileSync(reportFile, validationReport);
    filesWritten++;
    console.log(`✓ Wrote validation report: ${path.basename(reportFile)}`);

    // Step 5: Generate phase summary
    console.log('\n📝 Step 5: Generating phase summary...');
    const summary = generatePhaseSummary(validationResult, formats);
    const summaryFile = path.join(outputDir, 'phase-6-summary.md');
    fs.writeFileSync(summaryFile, summary);
    filesWritten++;
    console.log(`✓ Wrote phase summary: ${path.basename(summaryFile)}`);

    // Step 6: Generate overall project report
    console.log('\n🎯 Step 6: Generating overall project report...');
    const projectReport = generateProjectReport(spec, validationResult, formatFileSize(jsonFile));
    const projectReportFile = path.join(outputDir, 'README.md');
    fs.writeFileSync(projectReportFile, projectReport);
    filesWritten++;
    console.log(`✓ Wrote project report: ${path.basename(projectReportFile)}`);

    // Summary
    const processingTime = Date.now() - startTime;
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Phase 6 Complete - Pipeline Finished\n');
    console.log('Summary:');
    console.log(`  - Validation: ${validationResult.valid ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`  - Formats: ${formats.join(', ')}`);
    console.log(`  - Files written: ${filesWritten}`);
    console.log(`  - Processing time: ${processingTime}ms`);

    console.log('\n📦 Output Files:');
    console.log(`  - ${path.basename(jsonFile)} (${formatFileSize(jsonFile)})`);
    console.log(`  - ${path.basename(yamlFile)} (${formatFileSize(yamlFile)})`);
    console.log(`  - ${path.basename(htmlFile)} (${formatFileSize(htmlFile)})`);
    console.log(`  - ${path.basename(mdFile)} (${formatFileSize(mdFile)})`);
    console.log(`  - ${path.basename(reportFile)}`);
    console.log(`  - ${path.basename(summaryFile)}`);
    console.log(`  - ${path.basename(projectReportFile)}`);

    return {
      phase: 'Phase 6: Validation & Output',
      status: 'success',
      summary: `Successfully completed full OpenAPI pipeline: validated spec, exported ${formats.length} formats, generated documentation`,
      details: {
        specValid: validationResult.valid,
        validationErrors: validationResult.errors.length,
        validationWarnings: validationResult.warnings.length,
        formatsGenerated: formats,
        filesWritten,
        processingTimeMs: processingTime,
      },
      output: {
        specJSON: jsonFile,
        specYAML: yamlFile,
        htmlDocs: htmlFile,
        markdownDocs: mdFile,
        validationReport: reportFile,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('\n❌ Phase 6 Failed');
    console.error(`Error: ${errorMessage}`);

    return {
      phase: 'Phase 6: Validation & Output',
      status: 'failed',
      summary: `Phase 6 failed: ${errorMessage}`,
      details: {
        specValid: false,
        validationErrors: 0,
        validationWarnings: 0,
        formatsGenerated: [],
        filesWritten: 0,
        processingTimeMs: processingTime,
      },
    };
  }
}

function formatFileSize(filePath: string): string {
  const bytes = fs.statSync(filePath).size;
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function generatePhaseSummary(result: any, formats: string[]): string {
  const lines: string[] = [];

  lines.push('# Phase 6: Validation & Output Summary\n');

  lines.push('## Validation Results\n');
  if (result.valid) {
    lines.push('✅ **Specification is valid and ready for production use**\n');
  } else {
    lines.push('❌ **Specification has validation issues**\n');
    lines.push(`- Errors: ${result.errors.length}`);
    lines.push(`- Warnings: ${result.warnings.length}\n`);
  }

  lines.push('## Exported Formats\n');
  formats.forEach(format => {
    lines.push(`- ✓ ${format}`);
  });
  lines.push('');

  lines.push('## Statistics\n');
  lines.push(`- **Paths:** ${result.stats.totalPaths}`);
  lines.push(`- **Operations:** ${result.stats.totalOperations}`);
  lines.push(`- **Schemas:** ${result.stats.totalSchemas}`);
  lines.push(`- **Schemas with examples:** ${result.stats.schemasWithExamples}`);
  lines.push(`- **Operations with rate limits:** ${result.stats.operationsWithRateLimits}\n`);

  lines.push('## Next Steps\n');
  lines.push('1. Review the validation report for any issues');
  lines.push('2. Use the OpenAPI JSON/YAML with code generators (e.g., OpenAPI Generator)');
  lines.push('3. Deploy the HTML documentation for client access');
  lines.push('4. Share the Markdown docs with your team');

  return lines.join('\n');
}

function generateProjectReport(spec: any, validation: any, jsonSize: string): string {
  const lines: string[] = [];

  lines.push(`# ${spec.info?.title || 'OpenAPI Specification'} - Complete Report\n`);

  lines.push(`**Version:** ${spec.info?.version || '1.0.0'}\n`);

  if (spec.info?.description) {
    lines.push(`${spec.info.description}\n`);
  }

  lines.push('## 📊 Comprehensive Statistics\n');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| API Endpoints (Paths) | ${validation.stats.totalPaths} |`);
  lines.push(`| Operations (GET/POST/etc) | ${validation.stats.totalOperations} |`);
  lines.push(`| Data Models (Schemas) | ${validation.stats.totalSchemas} |`);
  lines.push(`| Models with Examples | ${validation.stats.schemasWithExamples} |`);
  lines.push(`| Operations with Rate Limits | ${validation.stats.operationsWithRateLimits} |`);
  lines.push(`| Validation Status | ${validation.valid ? '✅ Valid' : '❌ Invalid'} |`);
  lines.push(`| Validation Errors | ${validation.errors.length} |`);
  lines.push(`| Validation Warnings | ${validation.warnings.length} |`);
  lines.push(`| Spec Size (JSON) | ${jsonSize} |\n`);

  lines.push('## 📦 Generated Deliverables\n');
  lines.push('- **openapi.json** - Machine-readable OpenAPI 3.1.0 spec');
  lines.push('- **openapi.yaml** - YAML format for readability');
  lines.push('- **api-docs.html** - Interactive HTML documentation');
  lines.push('- **api-docs.md** - Markdown documentation for version control');
  lines.push('- **validation-report.md** - Detailed validation findings\n');

  lines.push('## 🚀 Quick Start\n');
  lines.push('### Option 1: Code Generation');
  lines.push('```bash');
  lines.push('# Generate TypeScript SDK');
  lines.push('npx @openapitools/openapi-generator-cli generate \\');
  lines.push('  -i openapi.json \\');
  lines.push('  -g typescript-axios \\');
  lines.push('  -o generated-sdk');
  lines.push('```\n');

  lines.push('### Option 2: API Documentation');
  lines.push('- View `api-docs.html` in a web browser');
  lines.push('- Share `api-docs.md` with your team\n');

  lines.push('### Option 3: Client Library');
  lines.push('```bash');
  lines.push('# Using Swagger UI Docker');
  lines.push('docker run -p 8080:8080 -v $(pwd):/tmp swaggerapi/swagger-ui');
  lines.push('# Then open http://localhost:8080 and specify openapi.json');
  lines.push('```\n');

  lines.push('## ✅ Quality Checklist\n');
  lines.push(`- ${validation.valid ? '✓' : '✗'} OpenAPI spec is valid`);
  lines.push(
    `- ${validation.stats.schemasWithExamples === validation.stats.totalSchemas ? '✓' : '✗'} All schemas have examples`,
  );
  lines.push(`- ${validation.stats.operationsWithRateLimits > 0 ? '✓' : '✗'} Rate limits documented`);
  lines.push(`- ${spec.info?.description ? '✓' : '✗'} API description provided`);
  lines.push(`- ${spec.servers?.length ? '✓' : '✗'} Servers configured\n`);

  if (validation.errors.length > 0) {
    lines.push('## ⚠️ Issues Found\n');
    lines.push('The following issues should be addressed:\n');
    validation.errors.slice(0, 10).forEach((err: any, idx: number) => {
      lines.push(`${idx + 1}. **${err.location}**: ${err.message}`);
    });
    if (validation.errors.length > 10) {
      lines.push(`... and ${validation.errors.length - 10} more`);
    }
    lines.push('');
  }

  lines.push('## 📚 Resources\n');
  lines.push('- [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0)');
  lines.push('- [OpenAPI Generator](https://openapi-generator.tech/)');
  lines.push('- [Swagger Editor](https://editor.swagger.io/)\n');

  lines.push(`Generated: ${new Date().toISOString()}`);

  return lines.join('\n');
}

// Run phase 6
const result = await runPhase6();

// Exit with appropriate code
process.exit(result.status === 'success' ? 0 : 1);
