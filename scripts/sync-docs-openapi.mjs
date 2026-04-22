import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const preferredSourceSpec = path.join(projectRoot, 'output', 'openapi-types.json');
const fallbackSourceSpec = path.join(projectRoot, 'src', 'generated', 'openapi.json');
const docsPublicDir = path.join(projectRoot, 'docs', 'public');
const destinationSpec = path.join(docsPublicDir, 'openapi.json');

async function resolveSourceSpec(...candidates) {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    `Unable to find an OpenAPI spec to sync. Checked:\n` +
      `- ${preferredSourceSpec}\n` +
      `- ${fallbackSourceSpec}\n\n` +
      'Run the OpenAPI generation step that produces output/openapi-types.json, or ensure src/generated/openapi.json is present.'
  );
}

const sourceSpec = await resolveSourceSpec(preferredSourceSpec, fallbackSourceSpec);
await mkdir(docsPublicDir, { recursive: true });
await copyFile(sourceSpec, destinationSpec);

console.log('✓ Synced OpenAPI spec to docs/public/openapi.json');
