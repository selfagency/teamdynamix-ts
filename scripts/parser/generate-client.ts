import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const outputSpecPath = path.join(projectRoot, 'output', 'openapi-types.json');
const generatedDir = path.join(projectRoot, 'src', 'generated');
const generatedSpecPath = path.join(generatedDir, 'openapi.json');
const metadataPath = path.join(generatedDir, 'client-metadata.json');

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
if (!fs.existsSync(outputSpecPath)) {
  throw new Error(`Expected generated OpenAPI spec at ${outputSpecPath}. Run "pnpm run parse:all" first.`);
}

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
if (!fs.existsSync(generatedDir)) {
  // nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
  fs.mkdirSync(generatedDir, { recursive: true });
}

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
const specRaw = fs.readFileSync(outputSpecPath, 'utf8');
const spec = JSON.parse(specRaw) as {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
};

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
fs.copyFileSync(outputSpecPath, generatedSpecPath);

const metadata = {
  generatedAt: new Date().toISOString(),
  source: 'output/openapi-types.json',
  copiedTo: 'src/generated/openapi.json',
  stats: {
    pathCount: Object.keys(spec.paths ?? {}).length,
    schemaCount: Object.keys(spec.components?.schemas ?? {}).length,
  },
};

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('✓ Copied OpenAPI spec to src/generated/openapi.json');
console.log(`✓ Wrote client metadata (${metadata.stats.pathCount} paths, ${metadata.stats.schemaCount} schemas)`);
