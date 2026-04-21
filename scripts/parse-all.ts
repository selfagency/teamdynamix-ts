#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PipelineResult {
  phase: number;
  name: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface PipelineReport {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  phases: PipelineResult[];
  allSuccess: boolean;
  outputDirectory: string;
}

class OpenAPIGeneratorPipeline {
  private phases = [
    { num: 1, name: 'Parser & Data Extraction', script: 'parse-phase1.ts' },
    { num: 2, name: 'Schema Generation', script: 'parse-phase2.ts' },
    { num: 3, name: 'Path & Operation Generation', script: 'parse-phase3.ts' },
    { num: 4, name: 'Metadata & Global Definitions', script: 'parse-phase4.ts' },
    { num: 5, name: 'Enrichment & Examples', script: 'parse-phase5.ts' },
    { num: 6, name: 'Validation & Output', script: 'parse-phase6.ts' },
  ];

  private results: PipelineResult[] = [];

  async run(skipPhases?: number[]): Promise<PipelineReport> {
    const startTime = new Date();

    console.log('\n' + '═'.repeat(70));
    console.log('🚀 OpenAPI Generator - Complete Pipeline');
    console.log('═'.repeat(70) + '\n');

    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const phase of this.phases) {
      if (skipPhases?.includes(phase.num)) {
        console.log(`⏭️  Skipping Phase ${phase.num}: ${phase.name}`);
        this.results.push({
          phase: phase.num,
          name: phase.name,
          status: 'skipped',
          duration: 0,
        });
        continue;
      }

      console.log(`\n${'─'.repeat(70)}`);
      const success = await this.runPhase(phase);
      if (!success) {
        console.log(`\n⚠️  Pipeline halted at Phase ${phase.num}`);
        break;
      }
    }

    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();

    // Generate final report
    this.generatePipelineReport(outputDir, startTime, endTime, totalDuration);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 Pipeline Summary');
    console.log('═'.repeat(70));
    this.printSummary(outputDir, totalDuration);

    return {
      startTime,
      endTime,
      totalDuration,
      phases: this.results,
      allSuccess: this.results.every(r => r.status !== 'failed'),
      outputDirectory: outputDir,
    };
  }

  private async runPhase(phase: { num: number; name: string; script: string }): Promise<boolean> {
    return new Promise(resolve => {
      const startTime = Date.now();
      const scriptPath = path.join(__dirname, phase.script);

      console.log(`📍 Phase ${phase.num}: ${phase.name}`);
      console.log(`   Script: ${phase.script}`);

      const child = spawn('node', ['--loader', 'ts-node/esm', scriptPath], {
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env, NODE_OPTIONS: '--loader ts-node/esm' },
      });

      child.on('close', code => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          console.log(`✅ Phase ${phase.num} completed in ${(duration / 1000).toFixed(2)}s`);
          this.results.push({
            phase: phase.num,
            name: phase.name,
            status: 'success',
            duration,
          });
          resolve(true);
        } else {
          console.log(`❌ Phase ${phase.num} failed with exit code ${code}`);
          this.results.push({
            phase: phase.num,
            name: phase.name,
            status: 'failed',
            duration,
            error: `Exit code ${code}`,
          });
          resolve(false);
        }
      });

      child.on('error', err => {
        console.log(`❌ Phase ${phase.num} error: ${err.message}`);
        this.results.push({
          phase: phase.num,
          name: phase.name,
          status: 'failed',
          duration: Date.now() - startTime,
          error: err.message,
        });
        resolve(false);
      });
    });
  }

  private generatePipelineReport(outputDir: string, startTime: Date, endTime: Date, totalDuration: number): void {
    const lines: string[] = [];

    lines.push('# OpenAPI Generator Pipeline Report\n');
    lines.push(`**Generated:** ${new Date().toISOString()}\n`);

    lines.push('## Execution Summary\n');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Start Time | ${startTime.toISOString()} |`);
    lines.push(`| End Time | ${endTime.toISOString()} |`);
    lines.push(`| Total Duration | ${(totalDuration / 1000).toFixed(2)}s |`);
    lines.push(`| Phases | ${this.results.length} |`);
    lines.push(`| Successful | ${this.results.filter(r => r.status === 'success').length} |`);
    lines.push(`| Failed | ${this.results.filter(r => r.status === 'failed').length} |\n`);

    lines.push('## Phase Results\n');
    this.results.forEach(result => {
      const statusIcon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      const duration = result.duration > 0 ? ` (${(result.duration / 1000).toFixed(2)}s)` : '';
      lines.push(`${statusIcon} **Phase ${result.phase}: ${result.name}**${duration}`);
      if (result.error) {
        lines.push(`   Error: ${result.error}`);
      }
    });
    lines.push('');

    lines.push('## Output Files\n');
    lines.push('The following files were generated:\n');
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir).sort();
      files.forEach(file => {
        const filePath = path.join(outputDir, file);
        const size = fs.statSync(filePath).size;
        const sizeStr = size < 1024 ? `${size}B` : `${(size / 1024).toFixed(1)}KB`;
        lines.push(`- **${file}** (${sizeStr})`);
      });
    }
    lines.push('');

    const reportPath = path.join(outputDir, 'pipeline-report.md');
    fs.writeFileSync(reportPath, lines.join('\n'));
    console.log(`\n✓ Full report: ${path.basename(reportPath)}`);
  }

  private printSummary(outputDir: string, totalDuration: number): void {
    console.log(`\n✨ All phases completed in ${(totalDuration / 1000).toFixed(2)} seconds\n`);

    console.log('📦 Output Directory:', path.resolve(outputDir));
    console.log('\n📋 Generated Files:\n');

    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir).sort().slice(0, 10);
      files.forEach(file => {
        console.log(`   • ${file}`);
      });
      const totalFiles = fs.readdirSync(outputDir).length;
      if (totalFiles > 10) {
        console.log(`   ... and ${totalFiles - 10} more`);
      }
    }

    console.log('\n🎯 Next Steps:\n');
    console.log('1. Review the output files in the output/ directory');
    console.log('2. Check validation-report.md for any issues');
    console.log('3. Use openapi.json with your preferred tools');
    console.log('4. Share api-docs.html or api-docs.md with stakeholders\n');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const skipPhases: number[] = [];

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
OpenAPI Generator Pipeline

Usage: node parse-all.ts [options]

Options:
  --skip <phase>    Skip a specific phase (e.g., --skip 1 --skip 2)
  --help, -h        Show this help message

Examples:
  node parse-all.ts                    # Run all phases
  node parse-all.ts --skip 1           # Skip phase 1
  node parse-all.ts --skip 1 --skip 2  # Skip phases 1 and 2
`);
  process.exit(0);
}

if (args.includes('--skip')) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--skip' && i + 1 < args.length) {
      const phaseNum = parseInt(args[i + 1], 10);
      if (!isNaN(phaseNum) && phaseNum >= 1 && phaseNum <= 6) {
        skipPhases.push(phaseNum);
      }
    }
  }
}

// Run pipeline
const pipeline = new OpenAPIGeneratorPipeline();
pipeline.run(skipPhases).then(report => {
  process.exit(report.allSuccess ? 0 : 1);
});
