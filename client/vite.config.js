import { defineConfig } from 'vite';
import { realpathSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = realpathSync(process.cwd());
// Keep Vite and esbuild on the same physical root when client is a junction.
process.chdir(projectRoot);

// https://vite.dev/config/
export default defineConfig({
  root: projectRoot,
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    open: false,
  },
});
