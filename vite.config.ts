import { defineConfig } from "npm:vite@5.0.12";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true
  },
  root: ".",
  build: {
    outDir: "./dist"
  }
}); 