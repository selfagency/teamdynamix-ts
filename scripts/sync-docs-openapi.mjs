import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceSpec = path.join(projectRoot, 'output', 'openapi-types.json');
const docsPublicDir = path.join(projectRoot, 'docs', 'public');
const destinationSpec = path.join(docsPublicDir, 'openapi.json');

await access(sourceSpec);
await mkdir(docsPublicDir, { recursive: true });
await copyFile(sourceSpec, destinationSpec);

console.log('✓ Synced OpenAPI spec to docs/public/openapi.json');
