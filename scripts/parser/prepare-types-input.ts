import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const inputPath = path.join(projectRoot, 'output', 'openapi.json');
const outputPath = path.join(projectRoot, 'output', 'openapi-types.json');

const decodePointerToken = (token: string): string => token.replace(/~1/g, '/').replace(/~0/g, '~');

const resolveJsonPointer = (root: unknown, pointer: string): unknown => {
  if (!pointer.startsWith('#/')) return undefined;
  const parts = pointer.slice(2).split('/').map(decodePointerToken);
  let current: unknown = root;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const visit = (
  node: unknown,
  root: Record<string, unknown>,
  unresolved: string[],
  pathParts: string[] = [],
): unknown => {
  if (Array.isArray(node)) {
    return node.map((item, index) => visit(item, root, unresolved, [...pathParts, String(index)]));
  }

  if (typeof node !== 'object' || node === null) {
    return node;
  }

  const obj = node as Record<string, unknown>;

  if (typeof obj.$ref === 'string' && obj.$ref.startsWith('#/')) {
    const resolved = resolveJsonPointer(root, obj.$ref);
    if (resolved === undefined) {
      unresolved.push(`${pathParts.join('.')} -> ${obj.$ref}`);
      return {
        type: 'object',
        additionalProperties: true,
        description: `Unresolved reference fallback for ${obj.$ref}`,
        'x-unresolved-ref': obj.$ref,
      };
    }
    return obj;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = visit(value, root, unresolved, [...pathParts, key]);
  }

  return result;
};

if (!fs.existsSync(inputPath)) {
  throw new Error(`Missing ${inputPath}. Run \"pnpm run parse:all\" first.`);
}

const specRaw = fs.readFileSync(inputPath, 'utf8');
const spec = JSON.parse(specRaw) as Record<string, unknown>;
const unresolved: string[] = [];
const sanitized = visit(spec, spec, unresolved) as Record<string, unknown>;

fs.writeFileSync(outputPath, JSON.stringify(sanitized, null, 2));

if (unresolved.length > 0) {
  console.warn(`⚠ Detected ${unresolved.length} unresolved $ref value(s). Replaced with safe object fallbacks.`);
  for (const item of unresolved.slice(0, 10)) {
    console.warn(`  - ${item}`);
  }
  if (unresolved.length > 10) {
    console.warn(`  ... and ${unresolved.length - 10} more`);
  }
} else {
  console.log('✓ No unresolved $ref values detected.');
}

console.log(`✓ Wrote sanitized OpenAPI types input to ${outputPath}`);
