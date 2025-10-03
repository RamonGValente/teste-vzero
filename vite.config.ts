import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
import { createToken } from './vite/livekitDevToken';

export default defineConfig(({ mode }) => ({
  server: {
    setup: (server) => {
      server.middlewares.use('/dev/livekit-token', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost:8080');
          const room = url.searchParams.get('room') || 'udg';
          const identity = url.searchParams.get('identity') || 'user';
          const name = url.searchParams.get('name') || identity;
          const out = await createToken({ room, identity, name });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(out));
        } catch (e) {
          res.statusCode = 500; res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
