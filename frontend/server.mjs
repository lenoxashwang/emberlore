import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(__dirname, 'public');
const port = Number(process.env.FRONTEND_PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.webmanifest', 'application/manifest+json'],
]);

async function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  const basePath = cleanPath === '/' ? '/index/' : cleanPath;
  const asDirectory = path.join(publicRoot, basePath, 'index.html');
  const asFile = path.join(publicRoot, cleanPath);

  try {
    await access(asDirectory);
    return asDirectory;
  } catch {
    return asFile;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const filePath = await resolvePath(request.url || '/');
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes.get(ext) || 'application/octet-stream',
    });

    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`frontend http://${host}:${port}\n`);
});

