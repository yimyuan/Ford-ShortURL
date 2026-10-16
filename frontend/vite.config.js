import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || '/';
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw new Error('Invalid VITE_BASE_PATH');
  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': 'http://127.0.0.1:3000', '/r': 'http://127.0.0.1:3000' },
    },
  };
});
