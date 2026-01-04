import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      // Proxy all backend routes
      ...['/admin', '/contacts', '/conversations', '/leads', '/inbox', '/whatsapp', '/webhooks', '/automation', '/dashboard', '/messages', '/health'].reduce((acc, route) => ({
        ...acc,
        [route]: {
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }), {})
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
