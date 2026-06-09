#!/usr/bin/env node

/**
 * Simple script to prepare the OpenAPI spec for generation.
 * This bypasses the broken markdown parsing pipeline and uses the existing spec directly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const sourceSpecPath = path.join(projectRoot, 'src/spec/openapi.yaml');
const outputDir = path.join(projectRoot, 'output');
const outputSpecPath = path.join(outputDir, 'openapi-types.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✓ Created output directory: ${outputDir}`);
}

// Check if source spec exists
if (!fs.existsSync(sourceSpecPath)) {
  throw new Error(`Source OpenAPI spec not found at ${sourceSpecPath}`);
}

// Read and convert the YAML spec
const specYaml = fs.readFileSync(sourceSpecPath, 'utf8');
const specJson = yaml.load(specYaml);

// Write the JSON spec to output location
fs.writeFileSync(outputSpecPath, JSON.stringify(specJson, null, 2));

console.log(`✓ OpenAPI spec prepared at ${outputSpecPath}`);
console.log(`✓ Source spec from ${sourceSpecPath}`);
console.log(`✓ Generated spec contains ${Object.keys(specJson.paths || {}).length} paths`);

// Generate a simple report
const reportPath = path.join(outputDir, 'preparation-report.md');
const report = [
  '# OpenAPI Spec Preparation Report',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  '',
  '## Sources',
  `- Source spec: ${sourceSpecPath}`,
  `- Output spec: ${outputSpecPath}`,
  '',
  '## Spec Statistics',
  `- Paths: ${Object.keys(specJson.paths || {}).length}`,
  `- Components: ${Object.keys(specJson.components?.schemas || {}).length}`,
  `- Version: ${specJson.info?.version || 'unknown'}`,
  '',
  '## Next Steps',
  '1. Run `pnpm run generate:client` to generate the TypeScript client',
  '2. Run `pnpm run generate:types` to generate TypeScript types',
  '3. Run `pnpm run generate:all` to run both steps',
  '',
].join('\n');

fs.writeFileSync(reportPath, report);
console.log(`✓ Report written to ${reportPath}`);
