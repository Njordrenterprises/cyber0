import { defineConfig } from "npm:vite@5.0.12";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/views': 'http://localhost:8000',
      '/cards': 'http://localhost:8000',
      '/assets': 'http://localhost:8000',
      '/src/js': 'http://localhost:8000'
    }
  },
  root: ".",
  build: {
    outDir: "./dist"
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
}); 