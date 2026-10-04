import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../static'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/reports': 'http://localhost:8000',
      '/moderator': 'http://localhost:8000',
      '/suggest': 'http://localhost:8000',
      '/ml': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
});
