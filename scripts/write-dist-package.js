import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(__filename, '../..');

async function main() {
  const rootPkgPath = resolve(ROOT, 'package.json');
  const outDir = resolve(ROOT, 'dist');
  const raw = await readFile(rootPkgPath, 'utf8');
  const { name, version, description, keywords, homepage, bugs, repository, license, author, dependencies } =
    JSON.parse(raw);

  const distPkg = {
    name,
    version,
    description,
    keywords,
    homepage,
    bugs,
    repository,
    license,
    author,
    type: 'module',
    files: ['index.js', 'index.js.map', 'index.d.ts', 'index.d.ts.map', '**/*.d.ts', '**/*.d.ts.map'],
    main: './index.js',
    types: './index.d.ts',
    exports: {
      '.': {
        import: './index.js',
        types: './index.d.ts',
      },
    },
    dependencies,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'package.json'), `${JSON.stringify(distPkg, null, 2)}\n`, 'utf8');
  console.log('Wrote', resolve(outDir, 'package.json'));

  // Copy README — prefer package-level, fall back to root-level
  const pkgReadme = resolve(ROOT, 'README.md');
  const readmeDest = resolve(outDir, 'README.md');
  try {
    await access(pkgReadme);
    await copyFile(pkgReadme, readmeDest);
    console.log('Copied', pkgReadme, 'to', readmeDest);
  } catch {
    console.warn('No README.md found; skipping copy.');
  }

  // Copy generated OpenAPI schema declarations — tsc doesn't emit input .d.ts files
  const schemaSrc = resolve(ROOT, 'src/generated/schema.d.ts');
  const schemaDest = resolve(outDir, 'generated/schema.d.ts');
  await mkdir(resolve(outDir, 'generated'), { recursive: true });
  await copyFile(schemaSrc, schemaDest);
  console.log('Copied', schemaSrc, 'to', schemaDest);
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
