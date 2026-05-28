import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'frontend', 'public');
const cacheRoot = path.join(projectRoot, 'frontend', '.mirror-cache');

const ORIGIN = 'https://undecember.thein.ru';
const SEED_PATHS = ['/en/'];
const PAGE_PREFIXES = ['/en/'];
const PAGE_EXTENSIONS = ['', '.html'];
const ASSET_EXTENSIONS = [
  '.css',
  '.js',
  '.json',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp',
  '.gif',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.webmanifest',
];

function log(message) {
  process.stdout.write(`${message}\n`);
}

function ensureLeadingSlash(value) {
  return value.startsWith('/') ? value : `/${value}`;
}

function normalizePagePath(pathname) {
  if (!pathname.endsWith('/')) {
    return `${pathname}/`;
  }

  return pathname;
}

function isPagePath(pathname) {
  return PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    && !ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function isAssetPath(pathname) {
  return ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext))
    || pathname.startsWith('/_next/')
    || pathname.startsWith('/image/')
    || pathname === '/favicon.ico'
    || pathname === '/favicon-16x16.png'
    || pathname === '/favicon-32x32.png'
    || pathname === '/apple-touch-icon.png'
    || pathname === '/manifest.webmanifest';
}

function toAbsoluteUrl(candidate) {
  if (!candidate) {
    return null;
  }

  if (
    candidate.startsWith('mailto:')
    || candidate.startsWith('tel:')
    || candidate.startsWith('javascript:')
    || candidate.startsWith('#')
  ) {
    return null;
  }

  try {
    return new URL(candidate, ORIGIN);
  } catch {
    return null;
  }
}

function extractHtmlLinks(html) {
  const matches = new Set();
  const patterns = [
    /\b(?:href|src)=["']([^"'#]+)["']/g,
    /\bsrcset=["']([^"']+)["']/g,
    /url\(([^)]+)\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (!match[1]) {
        continue;
      }

      if (pattern === patterns[1]) {
        const items = match[1].split(',').map((part) => part.trim().split(/\s+/)[0]);

        for (const item of items) {
          const cleaned = item.replace(/^["']|["']$/g, '');
          if (cleaned) {
            matches.add(cleaned);
          }
        }
      } else {
        const cleaned = match[1].trim().replace(/^["']|["']$/g, '');
        if (cleaned) {
          matches.add(cleaned);
        }
      }
    }
  }

  return [...matches];
}

function cacheKeyFor(url) {
  return createHash('sha1').update(url).digest('hex');
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchBinary(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

function pageFilePath(pathname) {
  const safePath = pathname === '/' ? '/index/' : pathname;
  return path.join(outputRoot, safePath, 'index.html');
}

function assetFilePath(pathname) {
  return path.join(outputRoot, pathname);
}

async function savePage(pathname, contents) {
  const filePath = pageFilePath(pathname);
  await ensureDir(filePath);
  await writeFile(filePath, contents, 'utf8');
}

async function saveAsset(pathname, contents) {
  const filePath = assetFilePath(pathname);
  await ensureDir(filePath);
  await writeFile(filePath, contents);
}

async function fetchPage(url) {
  const pathname = normalizePagePath(url.pathname);
  const filePath = pageFilePath(pathname);

  if (await exists(filePath)) {
    return readFile(filePath, 'utf8');
  }

  const contents = await fetchText(url);
  await savePage(pathname, contents);
  return contents;
}

async function fetchAsset(url) {
  const filePath = assetFilePath(url.pathname);

  if (await exists(filePath)) {
    return;
  }

  const binary = await fetchBinary(url);
  await saveAsset(url.pathname, binary);
}

async function writeMirrorManifest(manifest) {
  const filePath = path.join(cacheRoot, 'manifest.json');
  await ensureDir(filePath);
  await writeFile(filePath, JSON.stringify(manifest, null, 2), 'utf8');
}

async function mirror() {
  const seenPages = new Set();
  const seenAssets = new Set();
  const queue = SEED_PATHS.map((pathname) => normalizePagePath(ensureLeadingSlash(pathname)));
  const manifest = {
    origin: ORIGIN,
    mirroredAt: new Date().toISOString(),
    pages: [],
    assets: [],
    skippedPages: [],
    skippedAssets: [],
  };

  while (queue.length > 0) {
    const pathname = queue.shift();

    if (seenPages.has(pathname)) {
      continue;
    }

    seenPages.add(pathname);
    const url = new URL(pathname, ORIGIN);
    log(`page ${pathname}`);

    let html = '';
    try {
      html = await fetchPage(url);
    } catch (error) {
      manifest.skippedPages.push({
        path: pathname,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
      log(`skip page ${pathname}`);
      continue;
    }

    manifest.pages.push(pathname);

    for (const candidate of extractHtmlLinks(html)) {
      const absolute = toAbsoluteUrl(candidate);

      if (!absolute || absolute.origin !== ORIGIN) {
        continue;
      }

      const normalizedPath = absolute.pathname;

      if (isPagePath(normalizedPath)) {
        const nextPath = normalizePagePath(normalizedPath);

        if (!seenPages.has(nextPath)) {
          queue.push(nextPath);
        }

        continue;
      }

      if (isAssetPath(normalizedPath) && !seenAssets.has(normalizedPath)) {
        seenAssets.add(normalizedPath);
        log(`asset ${normalizedPath}`);
        try {
          await fetchAsset(absolute);
          manifest.assets.push(normalizedPath);
        } catch (error) {
          manifest.skippedAssets.push({
            path: normalizedPath,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
          log(`skip asset ${normalizedPath}`);
          continue;
        }

        if (normalizedPath.endsWith('.css')) {
          const css = await readFile(assetFilePath(normalizedPath), 'utf8');
          for (const linked of extractHtmlLinks(css)) {
            const linkedUrl = toAbsoluteUrl(linked);

            if (
              linkedUrl
              && linkedUrl.origin === ORIGIN
              && isAssetPath(linkedUrl.pathname)
              && !seenAssets.has(linkedUrl.pathname)
            ) {
              seenAssets.add(linkedUrl.pathname);
              log(`asset ${linkedUrl.pathname}`);
              try {
                await fetchAsset(linkedUrl);
                manifest.assets.push(linkedUrl.pathname);
              } catch (error) {
                manifest.skippedAssets.push({
                  path: linkedUrl.pathname,
                  reason: error instanceof Error ? error.message : 'Unknown error',
                });
                log(`skip asset ${linkedUrl.pathname}`);
              }
            }
          }
        }
      }
    }
  }

  await writeMirrorManifest(manifest);
  log(`done: ${manifest.pages.length} pages, ${manifest.assets.length} assets`);
}

await mirror();
