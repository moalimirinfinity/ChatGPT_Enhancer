import path from 'node:path';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

const projectRoot = process.cwd();

export default defineConfig({
  root: path.resolve(projectRoot, 'src'),
  publicDir: path.resolve(projectRoot, 'public'),
  plugins: [crx({ manifest })],
  build: {
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(projectRoot, 'src/popup/index.html'),
        help: path.resolve(projectRoot, 'src/help/index.html')
      }
    },
    commonjsOptions: {
      include: [/node_modules/, /html-docx-js/]
    }
  }
});
