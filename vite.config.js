import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

const page = name => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/captif/' : '/',
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: { main: page('./index.html'), enseignant: page('./enseignant.html') },
    },
  },
}));
