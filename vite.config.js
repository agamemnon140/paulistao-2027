import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O app mora em app/ e importa o motor e os dados da raiz do repositório. `base` relativa
// para servir de qualquer pasta (o GitHub Pages publica em /paulistao-2027/).
export default defineConfig({
  root: 'app',
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  worker: { format: 'es' },
  build: { outDir: '../dist', emptyOutDir: true }
});
