import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3065,
    open: './client.html'
  },
  build: {
    rollupOptions: {
      input: {
        main: './client.html',
        login: './login.html',
        register: './register.html'
      }
    }
  },
});
