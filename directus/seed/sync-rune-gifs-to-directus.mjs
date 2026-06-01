import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const publicRoot = process.env.PUBLIC_ROOT || path.join(repoRoot, 'web', 'public');
const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
const rootFolderName = process.env.DIRECTUS_IMAGE_ROOT_FOLDER || 'Emberlore Assets';
const manifestPath =
  process.env.RUNE_GIF_MANIFEST_PATH || path.join(__dirname, 'generated', 'rune-gif-manifest.json');
const origin = process.env.RUNE_GIF_ORIGIN || 'https://undecember.thein.ru';
const locale = process.env.RUNE_GIF_LOCALE || 'en';
const sectionSlug = process.env.RUNE_GIF_SECTION || 'runes';

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${staticToken}`,
    ...extra,
  };
}

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(new URL(pathname, directusUrl), {
    ...options,
    headers: headers({
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function uploadRequest(formData) {
  const response = await fetch(new URL('/files', directusUrl), {
    method: 'POST',
    headers: headers(),
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST /files failed: ${response.status} ${text}`);
  }

  return response.json();
}

function toFolderParts(publicPath) {
  return publicPath
    .replace(/^\//, '')
    .split('/')
    .slice(0, -1)
    .filter(Boolean);
}

function guessMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.gif':
      return 'image/gif';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

const directusAssetPathPattern = /\/assets\/([0-9a-f-]+)(?:[/?#]|$)/i;
const directusFileIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractFileId(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }

  if (directusFileIdPattern.test(value)) {
    return value;
  }

  const match = value.match(directusAssetPathPattern);
  return match?.[1] || '';
}

async function fetchAllFiles() {
  let page = 1;
  const items = [];

  while (true) {
    const query = new URLSearchParams({
      limit: '500',
      page: String(page),
      fields: 'id,description,folder,title,filename_download',
    });
    const payload = await jsonRequest(`/files?${query.toString()}`);
    const batch = payload?.data || [];
    items.push(...batch);

    if (batch.length < 500) {
      break;
    }

    page += 1;
  }

  return items;
}

async function fetchAllFolders() {
  let page = 1;
  const items = [];

  while (true) {
    const query = new URLSearchParams({
      limit: '500',
      page: String(page),
      fields: 'id,name,parent',
    });
    const payload = await jsonRequest(`/folders?${query.toString()}`);
    const batch = payload?.data || [];
    items.push(...batch);

    if (batch.length < 500) {
      break;
    }

    page += 1;
  }

  return items;
}

function folderCacheKey(name, parent) {
  return `${parent || 'root'}::${name}`;
}

async function ensureFolder(name, parent, cache) {
  const key = folderCacheKey(name, parent);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const created = await jsonRequest('/folders', {
    method: 'POST',
    body: JSON.stringify({
      name,
      parent: parent || null,
    }),
  });

  const folder = created?.data || created;
  cache.set(key, folder.id);
  return folder.id;
}

async function ensureRootFolder(folderIdCache) {
  const existingFolders = await fetchAllFolders();

  for (const folder of existingFolders) {
    folderIdCache.set(folderCacheKey(folder.name, folder.parent || null), folder.id);
  }

  const key = folderCacheKey(rootFolderName, null);
  if (folderIdCache.has(key)) {
    return folderIdCache.get(key);
  }

  return ensureFolder(rootFolderName, null, folderIdCache);
}

async function ensureFolderPath(publicPath, rootFolderId, folderIdCache) {
  const parts = toFolderParts(publicPath);
  let parentId = rootFolderId;

  for (const part of parts) {
    const key = folderCacheKey(part, parentId);
    const cached = folderIdCache.get(key);

    if (cached) {
      parentId = cached;
      continue;
    }

    parentId = await ensureFolder(part, parentId, folderIdCache);
  }

  return parentId;
}

async function uploadFile(filePath, publicPath, folderId) {
  const buffer = await readFile(filePath);
  const fileName = path.basename(filePath);
  const formData = new FormData();

  formData.append('folder', String(folderId));
  formData.append('title', fileName.replace(path.extname(fileName), ''));
  formData.append('description', publicPath);
  formData.append('file', new Blob([buffer], { type: guessMimeType(filePath) }), fileName);

  const payload = await uploadRequest(formData);
  return payload?.data || payload;
}

async function patchItem(collection, id, patch) {
  await jsonRequest(`/items/${collection}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

function localPathForPublicPath(publicPath) {
  return path.join(publicRoot, publicPath.replace(/^\//, '').split('/').join(path.sep));
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function downloadToLocalMirror(publicPath) {
  const localPath = localPathForPublicPath(publicPath);

  if (await exists(localPath)) {
    return {
      localPath,
      downloaded: false,
    };
  }

  await mkdir(path.dirname(localPath), { recursive: true });
  const response = await fetch(new URL(publicPath, origin));

  if (!response.ok) {
    throw new Error(`Failed to download ${publicPath}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(localPath, new Uint8Array(arrayBuffer));
  return {
    localPath,
    downloaded: true,
  };
}

async function syncFiles(items) {
  const folderIdCache = new Map();
  const rootFolderId = await ensureRootFolder(folderIdCache);
  const existingFiles = await fetchAllFiles();
  const fileMap = new Map();

  for (const file of existingFiles) {
    if (typeof file.description === 'string' && file.description.startsWith('/image/')) {
      fileMap.set(file.description, file);
    }
  }

  let downloaded = 0;
  let uploaded = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.public_path) {
      continue;
    }

    const mirror = await downloadToLocalMirror(item.public_path);
    if (mirror.downloaded) {
      downloaded += 1;
    }
    const existing = fileMap.get(item.public_path);

    if (existing?.id) {
      skipped += 1;
      continue;
    }

    const folderId = await ensureFolderPath(item.public_path, rootFolderId, folderIdCache);
    const created = await uploadFile(mirror.localPath, item.public_path, folderId);
    fileMap.set(item.public_path, created);
    uploaded += 1;
  }

  return {
    fileMap,
    downloaded,
    uploaded,
    skipped,
  };
}

async function fetchRuneEntries() {
  const query = new URLSearchParams({
    limit: '500',
    fields: 'id,slug,source_key,video_url',
    'filter[locale][_eq]': locale,
    'filter[section_slug][_eq]': sectionSlug,
  });
  const payload = await jsonRequest(`/items/content_entries?${query.toString()}`);
  return payload?.data || [];
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestItems = (manifest.items || [])
  .filter((item) => typeof item?.slug === 'string' && typeof item?.public_path === 'string' && item.public_path)
  .sort((a, b) => a.slug.localeCompare(b.slug));

if (manifestItems.length === 0) {
  throw new Error(`No rune gif items found in ${manifestPath}`);
}

const { fileMap, downloaded, uploaded, skipped } = await syncFiles(manifestItems);
process.stdout.write(
  `rune gif files synced: checked=${manifestItems.length}, downloaded=${downloaded}, uploaded=${uploaded}, already_present=${skipped}\n`,
);

const entries = await fetchRuneEntries();
const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
let patched = 0;
let missingEntries = 0;
let missingFiles = 0;

for (const item of manifestItems) {
  const entry = entryBySlug.get(item.slug);

  if (!entry?.id) {
    missingEntries += 1;
    continue;
  }

  const file = fileMap.get(item.public_path);
  if (!file?.id) {
    missingFiles += 1;
    continue;
  }

  const currentFileId = extractFileId(entry.video_url);
  if (currentFileId === file.id) {
    continue;
  }

  await patchItem('content_entries', entry.id, {
    video_url: file.id,
  });
  patched += 1;
}

process.stdout.write(
  `rune gif field sync completed: patched=${patched}, missing_entries=${missingEntries}, missing_files=${missingFiles}\n`,
);
