import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Simple API or health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Setup Vite middleware for development or serve custom static build in production
  if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_HMR === 'true') {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode - Serve static files from compiled dist directory
    // If running bundled server.cjs from dist directory, __dirname is the dist folder itself.
    const isProd = process.env.NODE_ENV === 'production' || __dirname.includes('dist');
    const distPath = isProd ? path.resolve(__dirname) : path.join(process.cwd(), 'dist');
    
    // Serve static assets with aggressive caching, but bypass index.html to allow custom headers
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      index: false
    }));

    // Explicitly serve root index.html with completely disabled caching
    app.get('/', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    // Fallback to index.html for Single Page Application routing (SPA)
    app.get('*', (req, res) => {
      // Do not serve index.html for missing static assets (preventing index-xxx.js MIME type errors)
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        res.status(404).send('Not Found');
        return;
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
