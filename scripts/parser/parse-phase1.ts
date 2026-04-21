#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { parseTeamDynamixApi } from './parser/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI script to run Phase 1 parser
 */

async function main() {
  const sourceDir = process.argv[2] || path.join(__dirname, '../sources/TDWebApi');

  console.log('🚀 TeamDynamix API Parser - Phase 1\n');
  console.log(`📁 Source directory: ${sourceDir}\n`);

  try {
    const result = await parseTeamDynamixApi(sourceDir);

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('PARSING RESULTS');
    console.log('='.repeat(60));

    console.log(`\n✅ Endpoints Parsed: ${result.stats.totalEndpointsParsed}`);
    if (result.endpoints.length > 0) {
      console.log('   Sample endpoints:');
      result.endpoints.slice(0, 5).forEach(ep => {
        console.log(`   - ${ep.method} ${ep.path}`);
      });
      if (result.endpoints.length > 5) {
        console.log(`   ... and ${result.endpoints.length - 5} more`);
      }
    }

    console.log(`\n✅ Types Parsed: ${result.stats.totalTypesParsed}`);
    if (result.types.length > 0) {
      console.log('   Sample types:');
      result.types.slice(0, 5).forEach(type => {
        console.log(`   - ${type.fullName} (${type.properties.length} properties)`);
      });
      if (result.types.length > 5) {
        console.log(`   ... and ${result.types.length - 5} more`);
      }
    }

    console.log(`\n📊 Statistics:`);
    console.log(`   - Total files processed: ${result.stats.totalFilesProcessed}`);
    console.log(`   - Cross-reference types: ${result.crossReferences.types.size}`);
    console.log(`   - API sections: ${result.crossReferences.sections.size}`);
    console.log(`   - Errors: ${result.stats.errorCount}`);
    console.log(`   - Warnings: ${result.stats.warningCount}`);
    console.log(`   - Processing time: ${result.stats.processingTimeMs}ms`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Issues Found (${result.errors.length}):`);
      result.errors.slice(0, 10).forEach(err => {
        const icon = err.level === 'error' ? '❌' : '⚠️';
        console.log(`   ${icon} [${err.file}] ${err.message}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more issues`);
      }
    }

    // List all sections
    if (result.crossReferences.sections.size > 0) {
      console.log(`\n📑 API Sections (${result.crossReferences.sections.size}):`);
      let count = 0;
      for (const [section, endpoints] of result.crossReferences.sections) {
        console.log(`   - ${section} (${endpoints.length} endpoints)`);
        count++;
        if (count >= 10) {
          const remaining = result.crossReferences.sections.size - count;
          if (remaining > 0) {
            console.log(`   ... and ${remaining} more sections`);
          }
          break;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Phase 1 Complete! ✨');
    console.log('='.repeat(60) + '\n');

    // Exit with appropriate code
    process.exit(result.stats.errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Parser error:', error);
    process.exit(1);
  }
}

main();
