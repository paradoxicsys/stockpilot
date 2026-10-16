import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, Vite proxies /api to the local FastAPI server so the browser
// never needs to know the backend address (same as Nginx/Ingress in production).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": process.env.VITE_PROXY_TARGET || "http://localhost:8000",
    },
  },
});
