import path from 'node:path';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

const projectRoot = process.cwd();

export default defineConfig({
  root: path.resolve(projectRoot, 'src'),
  publicDir: path.resolve(projectRoot, 'public'),
  plugins: [crx({ manifest })],
  optimizeDeps: {
    exclude: ['html-docx-js', 'html-docx-js/dist/html-docx']
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true
  }
});
