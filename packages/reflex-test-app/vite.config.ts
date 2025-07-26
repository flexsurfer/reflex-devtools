import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@flexsurfer/reflex': path.resolve(__dirname, '../../../reflex/src'),
      '@flexsurfer/reflex-devtools': path.resolve(__dirname, '../reflex-devtools/src')
    }
  }
}); 