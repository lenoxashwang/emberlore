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

function toBaseCollectionName(collection) {
  return collection.endsWith('_translations') ? collection : `${collection}_translations`;
}

function translatedFieldsForCollection(collection) {
  switch (collection) {
    case 'navigation_links':
      return ['label'];
    case 'download_links':
      return ['label'];
    case 'home_slides':
      return ['title', 'subtitle'];
    case 'home_featured_cards':
      return ['title', 'subtitle'];
    case 'content_sections':
      return ['title', 'description'];
    case 'content_entries':
      return [
        'title',
        'subtitle',
        'description',
        'list_stat',
        'list_props',
        'rarity',
        'acquisition_method',
        'weapon_requirement',
        'seo_title',
        'seo_description',
      ];
    case 'terminology_entries':
      return ['base_value'];
    case 'entry_tags':
      return ['label'];
    case 'entry_properties':
      return ['label', 'value'];
    case 'entry_stat_blocks':
      return ['title'];
    case 'entry_stat_lines':
      return ['content'];
    case 'entry_awakening_groups':
      return ['title'];
    case 'entry_awakening_lines':
      return ['content'];
    default:
      return [];
  }
}

function baseFieldsForCollection(collection) {
  switch (collection) {
    case 'navigation_links':
      return ['source_key', 'locale', 'group_name', 'label', 'href', 'open_in_new_tab', 'sort_order'];
    case 'download_links':
      return ['source_key', 'locale', 'platform', 'label', 'href', 'icon_url', 'sort_order'];
    case 'home_slides':
      return ['source_key', 'locale', 'title', 'subtitle', 'image_url', 'background_css', 'href', 'sort_order'];
    case 'home_featured_cards':
      return ['source_key', 'locale', 'card_size', 'title', 'subtitle', 'image_url', 'background_css', 'href', 'sort_order'];
    case 'content_sections':
      return [
        'source_key',
        'locale',
        'slug',
        'title',
        'description',
        'hero_image_url',
        'icon_image_url',
        'theme_token',
        'sort_order',
        'status',
        'source_path',
        'source_url',
      ];
    case 'content_entries':
      return [
        'source_key',
        'locale',
        'section_slug',
        'entry_type',
        'list_stat',
        'list_props',
        'slug',
        'title',
        'subtitle',
        'description',
        'image_url',
        'video_url',
        'rarity',
        'acquisition_method',
        'weapon_requirement',
        'sort_order',
        'status',
        'seo_title',
        'seo_description',
        'source_path',
        'source_url',
      ];
    case 'terminology_entries':
      return ['source_key', 'locale', 'term_key', 'group_name', 'base_value', 'note', 'sort_order'];
    case 'entry_tags':
      return ['source_key', 'entry_source_key', 'label', 'sort_order'];
    case 'entry_properties':
      return ['source_key', 'entry_source_key', 'label', 'value', 'sort_order'];
    case 'entry_stat_blocks':
      return ['source_key', 'entry_source_key', 'title', 'variant', 'sort_order'];
    case 'entry_stat_lines':
      return ['source_key', 'block_source_key', 'content', 'sort_order'];
    case 'entry_awakening_groups':
      return ['source_key', 'entry_source_key', 'code', 'title', 'sort_order'];
    case 'entry_awakening_lines':
      return ['source_key', 'awakening_source_key', 'content', 'sort_order'];
    default:
      return Object.keys(collection);
  }
}

function pick(item, fields) {
  const next = {};
  for (const field of fields) {
    if (item[field] !== undefined) {
      next[field] = item[field];
    }
  }
  return next;
}

function buildTranslationItem(collection, item) {
  const locale = item.locale;
  if (!locale || locale === 'en') {
    return null;
  }

  const translatedFields = translatedFieldsForCollection(collection);
  if (translatedFields.length === 0) {
    return null;
  }

  return {
    source_key: item.source_key,
    base_source_key: item.source_key.replace(new RegExp(`^${locale}:`), 'en:'),
    locale,
    ...pick(item, translatedFields),
  };
}

function buildBaseItem(collection, item) {
  const baseFields = baseFieldsForCollection(collection);
  return pick(item, baseFields);
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
  'terminology_entries',
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
    await upsertItem(collection, buildBaseItem(collection, item));

    const translationItem = buildTranslationItem(collection, item);
    if (translationItem) {
      await upsertItem(toBaseCollectionName(collection), translationItem);
    }
  }
}

for (const collection of [
  'navigation_links_translations',
  'download_links_translations',
  'home_slides_translations',
  'home_featured_cards_translations',
  'content_sections_translations',
  'content_entries_translations',
  'terminology_entries_translations',
  'entry_tags_translations',
  'entry_properties_translations',
  'entry_stat_blocks_translations',
  'entry_stat_lines_translations',
  'entry_awakening_groups_translations',
  'entry_awakening_lines_translations',
]) {
  const items = [...(seed[collection] || [])].sort(bySort);
  if (items.length === 0) {
    continue;
  }

  process.stdout.write(`import ${collection} (${items.length})\n`);
  for (const item of items) {
    await upsertItem(collection, item);
  }
}

process.stdout.write('directus import completed\n');
