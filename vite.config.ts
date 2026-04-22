import { resolve } from 'node:path';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

const nodeBuiltins = new Set(builtinModules.flatMap(mod => [mod, `node:${mod}`]));

const isExternal = (id: string): boolean => {
  if (nodeBuiltins.has(id)) {
    return true;
  }

  if (id.startsWith('.') || id.startsWith('/')) {
    return false;
  }

  if (id.startsWith('\0')) {
    return false;
  }

  return true;
};

export default defineConfig({
  build: {
    target: 'esnext',
    sourcemap: true,
    minify: 'esbuild',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: isExternal,
      output: {
        exports: 'named',
      },
    },
  },
});
