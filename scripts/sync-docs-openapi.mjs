import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const preferredSourceSpec = path.join(projectRoot, 'output', 'openapi-types.json');
const fallbackSourceSpec = path.join(projectRoot, 'src', 'generated', 'openapi.json');
const sourceCandidates = [
  path.join(projectRoot, 'output', 'openapi-types.json'),
  path.join(projectRoot, 'src', 'generated', 'openapi.json'),
  path.join(projectRoot, 'output', 'openapi.json'),
];
const docsPublicDir = path.join(projectRoot, 'docs', 'public');
const destinationSpec = path.join(docsPublicDir, 'openapi.json');

let sourceSpec;
for (const candidate of sourceCandidates) {
  try {
    await access(candidate);
    sourceSpec = candidate;
    break;
  } catch {
    // Continue to next candidate.
  }
}

if (!sourceSpec) {
  throw new Error(`Unable to find an OpenAPI source spec. Checked:\n- ${sourceCandidates.join('\n- ')}`);
}

await mkdir(docsPublicDir, { recursive: true });
await copyFile(sourceSpec, destinationSpec);

console.log(`✓ Synced OpenAPI spec to docs/public/openapi.json (source: ${sourceSpec})`);
