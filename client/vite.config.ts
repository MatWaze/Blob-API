import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3065,
    open: './client.html'
  }
});
