import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TDWebApiParser } from '../src/parser/index.js';
import { SchemaGenerator } from '../src/schema/schema-generator.js';
import { PathOperationGenerator } from '../src/schema/path-operation-generator.js';
import {
  MetadataEnricher,
  extractTagsFromPaths,
  generateStandardTags,
  type EnrichedOpenAPISpec,
} from '../src/schema/metadata-enricher.js';

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
    tagsGenerated: number;
    serversConfigured: number;
    securitySchemesConfigured: number;
    schemasIncluded: number;
    processingTimeMs: number;
  };
  output?: {
    specFile: string;
    reportFile: string;
  };
}

async function runPhase4(): Promise<PhaseResult> {
  const startTime = Date.now();

  try {
    console.log('🚀 Phase 4: Metadata & Global Definitions\n');
    console.log('═'.repeat(60));

    // Step 1: Parse and generate from previous phases
    console.log('\n📄 Step 1: Loading extracted data...');
    const sourceDir = path.join(__dirname, '../sources/TDWebApi/Home');

    const parser = new TDWebApiParser(sourceDir);
    const parseResult = await parser.parse();

    console.log(`✓ Loaded ${parseResult.endpoints.length} endpoints`);
    console.log(`✓ Loaded ${parseResult.types.length} types`);

    // Step 2: Generate schemas and paths
    console.log('\n🔨 Step 2: Generating schemas and paths...');
    const schemaGenerator = new SchemaGenerator();
    schemaGenerator.addTypes(parseResult.types);
    const schemaResult = schemaGenerator.generate();

    const pathGenerator = new PathOperationGenerator();
    pathGenerator.addEndpoints(parseResult.endpoints);
    const pathResult = pathGenerator.generate();

    console.log(`✓ Generated ${Object.keys(schemaResult.schemas).length} schemas`);
    console.log(`✓ Generated ${Object.keys(pathResult.paths).length} paths`);

    // Step 3: Extract and generate metadata
    console.log('\n📋 Step 3: Enriching with metadata...');
    const tagUsage = extractTagsFromPaths(pathResult.paths);
    const tags = generateStandardTags(tagUsage);

    console.log(`✓ Generated ${tags.length} tag definitions`);

    // Step 4: Build enriched specification
    console.log('\n🏗️  Step 4: Building enriched specification...');
    const enricher = new MetadataEnricher();

    // Set comprehensive info
    enricher.setInfo({
      title: 'TeamDynamix Web API',
      description:
        'The TeamDynamix Web API allows you to integrate with TeamDynamix from your own applications. It provides comprehensive endpoints for managing accounts, assets, issues, projects, and more.',
      version: '1.0.0',
      contact: {
        name: 'TeamDynamix Support',
        url: 'https://www.teamdynamix.com',
        email: 'support@teamdynamix.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      termsOfService: 'https://www.teamdynamix.com/terms',
    });

    // Add servers
    enricher.addServers([
      {
        url: 'https://{tenant}.teamdynamix.com',
        description: 'TeamDynamix production API',
        variables: {
          tenant: {
            default: 'api',
            description: 'Your TeamDynamix tenant name',
          },
        },
      },
      {
        url: 'https://{tenant}-sandbox.teamdynamix.com',
        description: 'TeamDynamix sandbox/testing environment',
        variables: {
          tenant: {
            default: 'api',
            description: 'Your TeamDynamix tenant name',
          },
        },
      },
    ]);

    // Set paths and schemas
    enricher.setPaths(pathResult.paths);
    enricher.setSchemas(schemaResult.schemas);

    // Add security schemes
    enricher.addSecurityScheme('bearerAuth', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Bearer token authentication using JWT',
    });

    enricher.addSecurityScheme('apiKey', {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'API key authentication',
    });

    // Add tags
    enricher.addTags(tags);

    // Set external documentation
    enricher.setExternalDocs({
      description: 'Find more information at TeamDynamix documentation',
      url: 'https://www.teamdynamix.com/documentation',
    });

    // Set global security
    enricher.setGlobalSecurity([{ bearerAuth: [] }]);

    // Build the spec
    const enrichedSpec = enricher.build();

    console.log(`✓ Added ${enrichedSpec.tags?.length || 0} tags`);
    console.log(`✓ Configured ${enrichedSpec.servers.length} servers`);
    console.log(`✓ Configured ${Object.keys(enrichedSpec.components.securitySchemes).length} security schemes`);

    // Step 5: Write enriched spec
    console.log('\n💾 Step 5: Writing enriched specification...');
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const specFile = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(specFile, JSON.stringify(enrichedSpec, null, 2));
    console.log(`✓ Wrote enriched spec to ${specFile}`);

    // Step 6: Generate report
    console.log('\n📊 Step 6: Generating report...');
    const report = generateReport(enrichedSpec, tagUsage);
    const reportFile = path.join(outputDir, 'phase-4-report.md');
    fs.writeFileSync(reportFile, report);
    console.log(`✓ Wrote report to ${reportFile}`);

    // Summary
    const processingTime = Date.now() - startTime;
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Phase 4 Complete\n');
    console.log('Summary:');
    console.log(`  - API title: ${enrichedSpec.info.title}`);
    console.log(`  - Version: ${enrichedSpec.info.version}`);
    console.log(`  - Servers: ${enrichedSpec.servers.length}`);
    console.log(`  - Tags: ${enrichedSpec.tags?.length || 0}`);
    console.log(`  - Security schemes: ${Object.keys(enrichedSpec.components.securitySchemes).length}`);
    console.log(`  - Paths: ${Object.keys(enrichedSpec.paths).length}`);
    console.log(`  - Schemas: ${Object.keys(enrichedSpec.components.schemas).length}`);
    console.log(`  - Processing time: ${processingTime}ms`);

    return {
      phase: 'Phase 4: Metadata & Global Definitions',
      status: 'success',
      summary: `Successfully enriched OpenAPI specification with comprehensive metadata, ${enrichedSpec.tags?.length} operation tags, ${enrichedSpec.servers.length} servers, and security definitions`,
      details: {
        endpointsExtracted: parseResult.endpoints.length,
        pathsGenerated: Object.keys(pathResult.paths).length,
        operationsGenerated: pathGenerator.getStats().operationCount,
        tagsGenerated: enrichedSpec.tags?.length || 0,
        serversConfigured: enrichedSpec.servers.length,
        securitySchemesConfigured: Object.keys(enrichedSpec.components.securitySchemes).length,
        schemasIncluded: Object.keys(enrichedSpec.components.schemas).length,
        processingTimeMs: processingTime,
      },
      output: {
        specFile,
        reportFile,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('\n❌ Phase 4 Failed');
    console.error(`Error: ${errorMessage}`);

    return {
      phase: 'Phase 4: Metadata & Global Definitions',
      status: 'failed',
      summary: `Phase 4 failed: ${errorMessage}`,
      details: {
        endpointsExtracted: 0,
        pathsGenerated: 0,
        operationsGenerated: 0,
        tagsGenerated: 0,
        serversConfigured: 0,
        securitySchemesConfigured: 0,
        schemasIncluded: 0,
        processingTimeMs: processingTime,
      },
    };
  }
}

function generateReport(spec: EnrichedOpenAPISpec, tagUsage: Map<string, number>): string {
  const lines: string[] = [];

  lines.push('# Phase 4: Metadata & Global Definitions Report\n');

  lines.push('## API Information\n');
  lines.push(`- **Title:** ${spec.info.title}`);
  lines.push(`- **Version:** ${spec.info.version}`);
  lines.push(`- **Description:** ${spec.info.description}`);
  if (spec.info.contact) {
    lines.push(`- **Contact:** ${spec.info.contact.name || 'TeamDynamix'} (${spec.info.contact.url})`);
  }
  lines.push('');

  lines.push('## Servers\n');
  spec.servers.forEach(server => {
    lines.push(`- **${server.description || server.url}**`);
    lines.push(`  - URL: ${server.url}`);
    if (server.variables) {
      lines.push(`  - Variables: ${Object.keys(server.variables).join(', ')}`);
    }
  });
  lines.push('');

  lines.push('## Security Schemes\n');
  Object.entries(spec.components.securitySchemes).forEach(([name, scheme]) => {
    lines.push(`- **${name}** (${scheme.type})`);
    if (scheme.description) {
      lines.push(`  - Description: ${scheme.description}`);
    }
  });
  lines.push('');

  lines.push('## Operation Tags\n');
  lines.push('```');
  const sortedTags = Array.from(tagUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  sortedTags.forEach(([tag, count]) => {
    lines.push(`${tag.padEnd(25)} ${count} endpoints`);
  });
  lines.push('```\n');

  lines.push('## Paths & Operations\n');
  const pathsArray = Object.keys(spec.paths).sort();
  lines.push(`- **Total paths:** ${pathsArray.length}`);
  lines.push(`- **Sample paths:**`);
  pathsArray.slice(0, 10).forEach(path => {
    const methods = Object.keys(spec.paths[path]).map(m => m.toUpperCase());
    lines.push(`  - ${methods.join('/')} ${path}`);
  });
  lines.push('');

  lines.push('## Component Schemas\n');
  lines.push(`- **Total schemas:** ${Object.keys(spec.components.schemas).length}`);
  lines.push(`- **Sample schemas:** ${Object.keys(spec.components.schemas).slice(0, 5).join(', ')}`);
  lines.push('');

  lines.push('## Statistics\n');
  lines.push(`- **Generated:** ${new Date().toISOString()}`);
  lines.push(`- **Spec size:** ${Math.round(JSON.stringify(spec).length / 1024)} KB`);

  return lines.join('\n');
}

// Run phase 4
const result = await runPhase4();

// Exit with appropriate code
process.exit(result.status === 'success' ? 0 : 1);
