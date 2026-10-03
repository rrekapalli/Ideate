import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/// Directory-per-page keeps clean canonical URLs (`/features` → `features/index.html`).
const pages = [
  'index',
  'about',
  'features',
  'personas',
  'security',
  'privacy',
  'terms',
  'contact',
  'cookies',
];

/// Vite's dev and preview servers do not resolve extensionless directory URLs.
function cleanUrls(): Plugin {
  const rewrite = (req: IncomingMessage, _res: ServerResponse, next: () => void): void => {
    const [path = '/', query] = (req.url ?? '/').split('?');
    if (path !== '/' && !path.includes('.')) {
      req.url = `${path.replace(/\/+$/, '')}/index.html${query ? `?${query}` : ''}`;
    }
    next();
  };

  return {
    name: 'ideate-clean-urls',
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [cleanUrls()],
  build: {
    outDir: 'output',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [
          page,
          page === 'index'
            ? resolve(import.meta.dirname, 'index.html')
            : resolve(import.meta.dirname, page, 'index.html'),
        ]),
      ),
    },
  },
});
