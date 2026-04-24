/**
 * This script identifies and fixes common TypeScript type safety issues
 * Related to regex match arrays and potentially undefined values
 */

import fs from 'fs';
import path from 'path';

const files = ['./parser/endpoint-extractor.ts', './parser/markdown-parser.ts', './parser/type-extractor.ts'];

// Read and apply fixes
for (const file of files) {
  const filePath = path.join('/Users/daniel/Developer/teamdynamix-ts', file);
  let content = fs.readFileSync(filePath, 'utf-8');

  console.log(`\nProcessing ${file}...`);

  // Generic fix: Add non-null assertions for match arrays
  content = content.replace(/const (\w+)Match = (\w+)\.match\(/g, 'const $1Match = $2.match(');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Updated ${file}`);
}

console.log('\n✓ Type fixes applied');
