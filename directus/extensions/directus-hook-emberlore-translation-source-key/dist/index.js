const TRANSLATION_COLLECTIONS = new Set([
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
]);
const AWAKENING_GROUP_COLLECTION = 'entry_awakening_groups';
const AWAKENING_TITLE_BY_CODE = {
  s: 'Source',
  source: 'Source',
  o: 'Origin',
  origin: 'Origin',
  v: 'Verity',
  verity: 'Verity',
};

function buildSourceKey(locale, baseSourceKey) {
  const safeLocale = String(locale || '').trim();
  const safeBaseSourceKey = String(baseSourceKey || '').trim();

  if (!safeLocale || !safeBaseSourceKey) {
    return null;
  }

  const separatorIndex = safeBaseSourceKey.indexOf(':');
  const suffix = separatorIndex >= 0
    ? safeBaseSourceKey.slice(separatorIndex + 1)
    : safeBaseSourceKey;

  return suffix ? `${safeLocale}:${suffix}` : null;
}

async function findExistingValues(database, collection, keys, fields = ['locale', 'base_source_key']) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return {};
  }

  const row = await database(collection)
    .select(...fields)
    .whereIn('id', keys)
    .first();

  return row || {};
}

async function withGeneratedSourceKey(payload, meta, context) {
  if (!meta?.collection || !TRANSLATION_COLLECTIONS.has(meta.collection)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  let locale = payload.locale;
  let baseSourceKey = payload.base_source_key;

  if ((!locale || !baseSourceKey) && context?.database) {
    const current = await findExistingValues(context.database, meta.collection, meta.keys);
    locale ||= current.locale;
    baseSourceKey ||= current.base_source_key;
  }

  const sourceKey = buildSourceKey(locale, baseSourceKey);
  if (!sourceKey) {
    return payload;
  }

  return {
    ...payload,
    source_key: sourceKey,
  };
}

function resolveAwakeningTitle(code) {
  const normalizedCode = String(code || '').trim().toLowerCase();
  return AWAKENING_TITLE_BY_CODE[normalizedCode] || null;
}

async function withGeneratedAwakeningTitle(payload, meta, context) {
  if (meta?.collection !== AWAKENING_GROUP_COLLECTION) {
    return payload;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  let code = payload.code;

  if (!code && context?.database) {
    const current = await findExistingValues(
      context.database,
      meta.collection,
      meta.keys,
      ['code'],
    );
    code ||= current.code;
  }

  const title = resolveAwakeningTitle(code);
  if (!title) {
    return payload;
  }

  return {
    ...payload,
    title,
  };
}

export default ({ filter }) => {
  filter('items.create', async (payload, meta, context) => {
    const withSourceKey = await withGeneratedSourceKey(payload, meta, context);
    return withGeneratedAwakeningTitle(withSourceKey, meta, context);
  });

  filter('items.update', async (payload, meta, context) => {
    const withSourceKey = await withGeneratedSourceKey(payload, meta, context);
    return withGeneratedAwakeningTitle(withSourceKey, meta, context);
  });
};
