import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultSeedPath = path.join(__dirname, 'generated', 'reference-seed.json');
const seedPath = process.argv[2] || defaultSeedPath;

const directusUrl = process.env.DIRECTUS_URL;
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

if (!directusUrl || !staticToken) {
  throw new Error('DIRECTUS_URL and DIRECTUS_STATIC_TOKEN are required');
}

function headers() {
  return {
    Authorization: `Bearer ${staticToken}`,
    'Content-Type': 'application/json',
  };
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Directus request failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function findBySourceKey(collection, sourceKey) {
  const url = new URL(`/items/${collection}`, directusUrl);
  url.searchParams.set('limit', '1');
  url.searchParams.set('fields', 'id,source_key');
  url.searchParams.set('filter[source_key][_eq]', sourceKey);
  const payload = await request(url);
  return payload.data?.[0] || null;
}

async function upsertItem(collection, item) {
  if (!item.source_key) {
    const createPayload = await request(new URL(`/items/${collection}`, directusUrl), {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return createPayload.data;
  }

  const existing = await findBySourceKey(collection, item.source_key);
  if (!existing) {
    const createPayload = await request(new URL(`/items/${collection}`, directusUrl), {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return createPayload.data;
  }

  const updatePayload = await request(new URL(`/items/${collection}/${existing.id}`, directusUrl), {
    method: 'PATCH',
    body: JSON.stringify(item),
  });
  return updatePayload.data;
}

async function upsertSingleton(collection, item) {
  const payload = await request(new URL(`/items/${collection}`, directusUrl), {
    method: 'PATCH',
    body: JSON.stringify(item),
  });

  return payload?.data ?? payload;
}

function bySort(a, b) {
  return (a.sort_order || 0) - (b.sort_order || 0);
}

const seed = JSON.parse(await readFile(seedPath, 'utf8'));

for (const item of seed.site_settings || []) {
  await upsertSingleton('site_settings', item);
}

for (const collection of [
  'navigation_links',
  'download_links',
  'home_slides',
  'home_featured_cards',
  'content_sections',
  'content_entries',
  'entry_tags',
  'entry_properties',
  'entry_stat_blocks',
  'entry_stat_lines',
  'entry_awakening_groups',
  'entry_awakening_lines',
]) {
  const items = [...(seed[collection] || [])].sort(bySort);
  process.stdout.write(`import ${collection} (${items.length})\n`);
  for (const item of items) {
    await upsertItem(collection, item);
  }
}

process.stdout.write('directus import completed\n');
