import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: {
    __IS_SINGLE_FILE__: 'true',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'virtual:pwa-register': path.resolve(__dirname, 'src/pwa-stub.ts'),
    },
  },
  build: {
    outDir: 'dist-singlefile',
    emptyOutDir: true,
    assetsInlineLimit: 10_000_000,
    chunkSizeWarningLimit: 5000,
  },
  publicDir: false,
});
