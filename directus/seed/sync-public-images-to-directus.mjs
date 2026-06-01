import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const publicRoot = process.env.PUBLIC_ROOT || path.join(repoRoot, 'web', 'public');
const imageRoot = process.env.IMAGE_ROOT || path.join(publicRoot, 'image');
const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
const rootFolderName = process.env.DIRECTUS_IMAGE_ROOT_FOLDER || 'Emberlore Assets';

const COLLECTION_IMAGE_FIELDS = [
  { collection: 'download_links', fields: ['icon_url'] },
  { collection: 'home_slides', fields: ['image_url'] },
  { collection: 'home_featured_cards', fields: ['image_url'] },
  { collection: 'content_sections', fields: ['hero_image_url', 'icon_image_url'] },
  { collection: 'content_entries', fields: ['image_url', 'video_url'] },
];

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

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPublicPath(filePath) {
  const relativePath = path.relative(publicRoot, filePath).split(path.sep).join('/');
  return `/${relativePath}`;
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
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

const directusAssetPathPattern = /\/assets\/([0-9a-f-]+)(?:[/?#]|$)/i;
const directusFileIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fileFieldValue(fileId) {
  return fileId;
}

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

async function syncFiles() {
  const folderIdCache = new Map();
  const rootFolderId = await ensureRootFolder(folderIdCache);
  const existingFiles = await fetchAllFiles();
  const fileMap = new Map();

  for (const file of existingFiles) {
    if (typeof file.description === 'string' && file.description.startsWith('/image/')) {
      fileMap.set(file.description, file);
    }
  }

  const filePaths = await walkFiles(imageRoot);
  let uploaded = 0;
  let skipped = 0;

  for (const filePath of filePaths) {
    const publicPath = toPublicPath(filePath);
    const existing = fileMap.get(publicPath);

    if (existing?.id) {
      skipped += 1;
      continue;
    }

    const folderId = await ensureFolderPath(publicPath, rootFolderId, folderIdCache);
    const created = await uploadFile(filePath, publicPath, folderId);
    fileMap.set(publicPath, created);
    uploaded += 1;

    if (uploaded % 100 === 0) {
      process.stdout.write(`uploaded ${uploaded} files\n`);
    }
  }

  return {
    fileMap,
    uploaded,
    skipped,
  };
}

async function patchItem(collection, id, patch) {
  await jsonRequest(`/items/${collection}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

async function syncCollectionImageFields(fileMap) {
  const missing = new Set();
  const summary = [];

  for (const config of COLLECTION_IMAGE_FIELDS) {
    let page = 1;
    let updated = 0;

    while (true) {
      const query = new URLSearchParams({
        limit: '500',
        page: String(page),
        fields: ['id', 'source_key', ...config.fields].join(','),
      });
      const payload = await jsonRequest(`/items/${config.collection}?${query.toString()}`);
      const items = payload?.data || [];

      for (const item of items) {
        const patch = {};

        for (const field of config.fields) {
          const current = item[field];

          if (typeof current !== 'string' || current.length === 0) {
            continue;
          }

          const existingFileId = extractFileId(current);
          if (existingFileId) {
            if (current !== existingFileId) {
              patch[field] = existingFileId;
            }
            continue;
          }

          if (!current.startsWith('/image/')) {
            continue;
          }

          const file = fileMap.get(current);
          if (!file?.id) {
            missing.add(current);
            continue;
          }

          patch[field] = fileFieldValue(file.id);
        }

        if (Object.keys(patch).length === 0) {
          continue;
        }

        await patchItem(config.collection, item.id, patch);
        updated += 1;
      }

      if (items.length < 500) {
        break;
      }

      page += 1;
    }

    summary.push({
      collection: config.collection,
      updated,
    });
  }

  return {
    missing: [...missing].sort(),
    summary,
  };
}

const { fileMap, uploaded, skipped } = await syncFiles();
process.stdout.write(`files synced: uploaded=${uploaded}, already_present=${skipped}, total=${fileMap.size}\n`);

const result = await syncCollectionImageFields(fileMap);
for (const item of result.summary) {
  process.stdout.write(`rewired ${item.collection}: ${item.updated}\n`);
}

if (result.missing.length > 0) {
  process.stdout.write(`missing public images: ${result.missing.length}\n`);
  for (const imagePath of result.missing.slice(0, 20)) {
    process.stdout.write(`  ${imagePath}\n`);
  }
} else {
  process.stdout.write('all referenced public images were mapped to Directus files\n');
}
