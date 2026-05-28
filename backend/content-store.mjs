import { dbPath, getDatabase } from './database.mjs';
import {
  buildEntryPath,
  buildSectionPath,
  isRemoteSectionSupported,
  normalizeContentPath,
  parseContentPath,
  slugFromHref,
  titleFromSection,
} from './sections.mjs';
import { fetchPage, fetchSection, fetchSectionItem } from './scraper.mjs';

const db = getDatabase();

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function toJson(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildEntrySummary(section, slug, entry) {
  const rarity = entry.properties.find((item) => /rarity/i.test(item.label))?.value || '';
  const type = entry.tags[0] || '';

  return {
    id: `manual-${section}-${slug}`,
    stat: '',
    href: buildEntryPath(section, slug, entry.meta.locale),
    slug,
    title: entry.title,
    rarity,
    type,
    image: entry.image,
    props: entry.properties.map((item) => item.value).filter(Boolean).slice(0, 3),
  };
}

function normalizeListItems(section, locale, items = []) {
  return items.map((item) => {
    const slug = item.slug || slugFromHref(item.href);

    return {
      ...item,
      slug,
      href: item.href || buildEntryPath(section, slug, locale),
    };
  });
}

function rowToEntry(row) {
  return {
    kind: row.kind,
    meta: {
      path: row.path,
      title: row.meta_title || row.title,
      description: row.meta_description || row.description,
      ogImage: row.og_image || row.image,
      locale: row.locale,
    },
    navigation: parseJson(row.navigation_json, []),
    backLink: row.back_link || buildSectionPath(row.section, row.locale),
    title: row.title,
    image: row.image,
    description: row.description,
    tags: parseJson(row.tags_json, []),
    properties: parseJson(row.properties_json, []),
    tiles: parseJson(row.tiles_json, []),
    awakenings: parseJson(row.awakenings_json, []),
  };
}

function rowToAdminEntry(row) {
  return {
    section: row.section,
    slug: row.slug,
    sourceType: row.source_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    summary: parseJson(row.summary_json, {}),
    raw: parseJson(row.raw_json, {}),
    entry: rowToEntry(row),
  };
}

function rowToSectionSnapshot(row) {
  return {
    kind: 'list',
    meta: {
      path: row.path,
      title: row.meta_title,
      description: row.meta_description,
      ogImage: row.og_image,
      locale: row.locale,
    },
    navigation: parseJson(row.navigation_json, []),
    items: parseJson(row.items_json, []),
  };
}

function getEntryRow(section, slug, locale = 'en') {
  return db.prepare(`
    SELECT *
    FROM content_entries
    WHERE section = ? AND slug = ? AND locale = ?
  `).get(section, slug, locale);
}

function getSectionRow(section, locale = 'en') {
  return db.prepare(`
    SELECT *
    FROM section_snapshots
    WHERE section = ? AND locale = ?
  `).get(section, locale);
}

function upsertSectionSnapshot(sectionData, sourceType = 'scraped') {
  const timestamp = nowIso();
  const section = parseContentPath(sectionData.meta.path).section || sectionData.section;
  const locale = sectionData.meta.locale || 'en';
  const items = normalizeListItems(section, locale, sectionData.items);

  db.prepare(`
    INSERT INTO section_snapshots (
      section,
      locale,
      path,
      meta_title,
      meta_description,
      og_image,
      navigation_json,
      items_json,
      source_type,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(section, locale) DO UPDATE SET
      path = excluded.path,
      meta_title = excluded.meta_title,
      meta_description = excluded.meta_description,
      og_image = excluded.og_image,
      navigation_json = excluded.navigation_json,
      items_json = excluded.items_json,
      source_type = excluded.source_type,
      updated_at = excluded.updated_at
  `).run(
    section,
    locale,
    sectionData.meta.path,
    sectionData.meta.title || titleFromSection(section),
    sectionData.meta.description || '',
    sectionData.meta.ogImage || '',
    toJson(sectionData.navigation, []),
    toJson(items, []),
    sourceType,
    timestamp,
    timestamp,
  );

  return rowToSectionSnapshot(getSectionRow(section, locale));
}

function upsertEntrySummary(section, locale, summary, sourceType = 'scraped') {
  const timestamp = nowIso();
  const slug = summary.slug || slugFromHref(summary.href);
  const path = normalizeContentPath(summary.href || buildEntryPath(section, slug, locale));
  const existing = getEntryRow(section, slug, locale);
  const entrySummary = {
    ...summary,
    slug,
    href: path,
  };

  if (existing) {
    const updatedSummary = {
      ...parseJson(existing.summary_json, {}),
      ...entrySummary,
    };

    if (existing.kind === 'detail') {
      db.prepare(`
        UPDATE content_entries
        SET summary_json = ?, updated_at = ?
        WHERE section = ? AND slug = ? AND locale = ?
      `).run(
        toJson(updatedSummary, {}),
        timestamp,
        section,
        slug,
        locale,
      );
      return;
    }
  }

  db.prepare(`
    INSERT INTO content_entries (
      section,
      slug,
      locale,
      path,
      kind,
      title,
      description,
      image,
      meta_title,
      meta_description,
      og_image,
      back_link,
      navigation_json,
      tags_json,
      properties_json,
      tiles_json,
      awakenings_json,
      summary_json,
      raw_json,
      raw_html,
      source_type,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(section, slug, locale) DO UPDATE SET
      path = excluded.path,
      kind = excluded.kind,
      title = excluded.title,
      image = excluded.image,
      summary_json = excluded.summary_json,
      updated_at = excluded.updated_at
  `).run(
    section,
    slug,
    locale,
    path,
    'summary',
    summary.title || '',
    '',
    summary.image || '',
    summary.title || '',
    '',
    summary.image || '',
    buildSectionPath(section, locale),
    '[]',
    '[]',
    '[]',
    '[]',
    '[]',
    toJson(entrySummary, {}),
    '{}',
    '',
    sourceType,
    'published',
    timestamp,
    timestamp,
  );
}

function upsertEntryDetail(section, slug, entry, options = {}) {
  const locale = entry.meta.locale || 'en';
  const timestamp = nowIso();
  const existing = getEntryRow(section, slug, locale);
  const summary = {
    ...(existing ? parseJson(existing.summary_json, {}) : {}),
    ...(options.summary || buildEntrySummary(section, slug, entry)),
    slug,
    href: buildEntryPath(section, slug, locale),
    title: entry.title,
    image: entry.image,
  };
  const sourceType = options.sourceType || 'manual';
  const status = options.status || (existing?.status ?? 'published');

  db.prepare(`
    INSERT INTO content_entries (
      section,
      slug,
      locale,
      path,
      kind,
      title,
      description,
      image,
      meta_title,
      meta_description,
      og_image,
      back_link,
      navigation_json,
      tags_json,
      properties_json,
      tiles_json,
      awakenings_json,
      summary_json,
      raw_json,
      raw_html,
      source_type,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(section, slug, locale) DO UPDATE SET
      path = excluded.path,
      kind = excluded.kind,
      title = excluded.title,
      description = excluded.description,
      image = excluded.image,
      meta_title = excluded.meta_title,
      meta_description = excluded.meta_description,
      og_image = excluded.og_image,
      back_link = excluded.back_link,
      navigation_json = excluded.navigation_json,
      tags_json = excluded.tags_json,
      properties_json = excluded.properties_json,
      tiles_json = excluded.tiles_json,
      awakenings_json = excluded.awakenings_json,
      summary_json = excluded.summary_json,
      raw_json = excluded.raw_json,
      raw_html = excluded.raw_html,
      source_type = excluded.source_type,
      status = excluded.status,
      updated_at = excluded.updated_at
  `).run(
    section,
    slug,
    locale,
    entry.meta.path || buildEntryPath(section, slug, locale),
    'detail',
    entry.title,
    entry.description || '',
    entry.image || '',
    entry.meta.title || entry.title,
    entry.meta.description || entry.description || '',
    entry.meta.ogImage || entry.image || '',
    entry.backLink || buildSectionPath(section, locale),
    toJson(entry.navigation, []),
    toJson(entry.tags, []),
    toJson(entry.properties, []),
    toJson(entry.tiles, []),
    toJson(entry.awakenings, []),
    toJson(summary, {}),
    toJson(options.raw || entry, {}),
    options.rawHtml || '',
    sourceType,
    status,
    timestamp,
    timestamp,
  );

  upsertSectionItem(section, locale, summary, sourceType);
}

function createEmptySectionSnapshot(section, locale = 'en') {
  const meta = {
    path: buildSectionPath(section, locale),
    title: titleFromSection(section),
    description: '',
    ogImage: '',
    locale,
  };

  return upsertSectionSnapshot({
    section,
    kind: 'list',
    meta,
    navigation: [],
    items: [],
  }, 'manual');
}

function upsertSectionItem(section, locale, summary, sourceType = 'manual') {
  const row = getSectionRow(section, locale);
  const snapshot = row ? rowToSectionSnapshot(row) : createEmptySectionSnapshot(section, locale);
  const items = clone(snapshot.items);
  const slug = summary.slug || slugFromHref(summary.href);
  const index = items.findIndex((item) => (item.slug || slugFromHref(item.href)) === slug);
  const nextItem = {
    ...items[index],
    ...summary,
    slug,
    href: summary.href || buildEntryPath(section, slug, locale),
  };

  if (index >= 0) {
    items[index] = nextItem;
  } else {
    items.push(nextItem);
  }

  upsertSectionSnapshot({
    section,
    kind: 'list',
    meta: snapshot.meta,
    navigation: snapshot.navigation,
    items,
  }, sourceType);
}

function removeSectionItem(section, locale, slug) {
  const row = getSectionRow(section, locale);
  if (!row) {
    return;
  }

  const snapshot = rowToSectionSnapshot(row);
  const items = snapshot.items.filter((item) => (item.slug || slugFromHref(item.href)) !== slug);

  upsertSectionSnapshot({
    section,
    kind: 'list',
    meta: snapshot.meta,
    navigation: snapshot.navigation,
    items,
  }, row.source_type || 'manual');
}

function buildManualEntry(section, slug, payload, existing = null) {
  const current = existing || {
    kind: 'detail',
    meta: {
      path: buildEntryPath(section, slug, 'en'),
      title: payload.title || '',
      description: payload.description || '',
      ogImage: payload.image || '',
      locale: payload.locale || 'en',
    },
    navigation: [],
    backLink: buildSectionPath(section, payload.locale || 'en'),
    title: payload.title || '',
    image: payload.image || '',
    description: payload.description || '',
    tags: [],
    properties: [],
    tiles: [],
    awakenings: [],
  };

  return {
    kind: 'detail',
    meta: {
      ...current.meta,
      ...(payload.meta || {}),
      path: buildEntryPath(section, slug, (payload.meta?.locale || current.meta.locale || 'en')),
      title: payload.meta?.title || payload.title || current.meta.title,
      description: payload.meta?.description || payload.description || current.meta.description,
      ogImage: payload.meta?.ogImage || payload.image || current.meta.ogImage,
    },
    navigation: payload.navigation ?? current.navigation,
    backLink: payload.backLink ?? current.backLink,
    title: payload.title ?? current.title,
    image: payload.image ?? current.image,
    description: payload.description ?? current.description,
    tags: payload.tags ?? current.tags,
    properties: payload.properties ?? current.properties,
    tiles: payload.tiles ?? current.tiles,
    awakenings: payload.awakenings ?? current.awakenings,
  };
}

export function getDatabaseInfo() {
  return {
    path: dbPath,
  };
}

export function getStats() {
  const sectionCount = db.prepare(`SELECT COUNT(*) AS count FROM section_snapshots`).get().count;
  const entryCount = db.prepare(`SELECT COUNT(*) AS count FROM content_entries`).get().count;

  return {
    sections: sectionCount,
    entries: entryCount,
  };
}

export async function getPageFromStore(pathname) {
  const parsed = parseContentPath(pathname);

  if (!parsed.section) {
    return fetchPage(parsed.normalizedPath);
  }

  if (!parsed.slug) {
    return getSectionFromStore(parsed.section, parsed.locale);
  }

  return getEntryFromStore(parsed.section, parsed.slug, parsed.locale);
}

export async function getSectionFromStore(section, locale = 'en') {
  let row = getSectionRow(section, locale);

  if (!row && isRemoteSectionSupported(section)) {
    await importSection(section, locale);
    row = getSectionRow(section, locale);
  }

  if (!row) {
    const fallbackItems = db.prepare(`
      SELECT *
      FROM content_entries
      WHERE section = ? AND locale = ? AND status != 'archived'
      ORDER BY title ASC
    `).all(section, locale);

    if (fallbackItems.length === 0) {
      throw new Error(`Section not found: ${section}`);
    }

    return {
      kind: 'list',
      meta: {
        path: buildSectionPath(section, locale),
        title: titleFromSection(section),
        description: '',
        ogImage: '',
        locale,
      },
      navigation: [],
      items: fallbackItems.map((item) => parseJson(item.summary_json, {})),
    };
  }

  return rowToSectionSnapshot(row);
}

export async function getEntryFromStore(section, slug, locale = 'en') {
  let row = getEntryRow(section, slug, locale);

  if ((!row || row.kind !== 'detail') && isRemoteSectionSupported(section)) {
    await importEntry(section, slug, locale);
    row = getEntryRow(section, slug, locale);
  }

  if (!row) {
    throw new Error(`Entry not found: ${section}/${slug}`);
  }

  return rowToEntry(row);
}

export async function importSection(section, locale = 'en') {
  const data = await fetchSection(section);
  const snapshot = upsertSectionSnapshot(data, 'scraped');

  for (const item of snapshot.items) {
    upsertEntrySummary(section, locale, item, 'scraped');
  }

  return snapshot;
}

export async function importEntry(section, slug, locale = 'en') {
  const detail = await fetchSectionItem(section, slug);
  const existing = getEntryRow(section, slug, locale);
  const summary = existing
    ? parseJson(existing.summary_json, {})
    : buildEntrySummary(section, slug, detail);

  upsertEntryDetail(section, slug, detail, {
    sourceType: 'scraped',
    status: existing?.status || 'published',
    summary,
    raw: detail,
  });

  return rowToEntry(getEntryRow(section, slug, locale));
}

export function listEntries(section = '', locale = 'en', includeArchived = true) {
  let rows;

  if (section) {
    rows = db.prepare(`
      SELECT *
      FROM content_entries
      WHERE section = ? AND locale = ?
      ${includeArchived ? '' : `AND status != 'archived'`}
      ORDER BY updated_at DESC, title ASC
    `).all(section, locale);
  } else {
    rows = db.prepare(`
      SELECT *
      FROM content_entries
      WHERE locale = ?
      ${includeArchived ? '' : `AND status != 'archived'`}
      ORDER BY section ASC, title ASC
    `).all(locale);
  }

  return rows.map(rowToAdminEntry);
}

export function getAdminEntry(section, slug, locale = 'en') {
  const row = getEntryRow(section, slug, locale);
  if (!row) {
    throw new Error(`Entry not found: ${section}/${slug}`);
  }

  return rowToAdminEntry(row);
}

export function listSectionSnapshots(locale = 'en') {
  const rows = db.prepare(`
    SELECT *
    FROM section_snapshots
    WHERE locale = ?
    ORDER BY section ASC
  `).all(locale);

  return rows.map((row) => ({
    section: row.section,
    sourceType: row.source_type,
    updatedAt: row.updated_at,
    itemCount: parseJson(row.items_json, []).length,
    snapshot: rowToSectionSnapshot(row),
  }));
}

export function createEntry(section, slug, payload) {
  const entry = buildManualEntry(section, slug, payload);
  const summary = {
    ...(payload.summary || {}),
    ...buildEntrySummary(section, slug, entry),
  };

  upsertEntryDetail(section, slug, entry, {
    sourceType: 'manual',
    status: payload.status || 'published',
    summary,
    raw: payload,
  });

  return getAdminEntry(section, slug, entry.meta.locale);
}

export function updateEntry(section, slug, payload) {
  const currentRow = getEntryRow(section, slug, payload.locale || 'en');
  if (!currentRow) {
    throw new Error(`Entry not found: ${section}/${slug}`);
  }

  const currentEntry = rowToEntry(currentRow);
  const entry = buildManualEntry(section, slug, payload, currentEntry);
  const summary = {
    ...parseJson(currentRow.summary_json, {}),
    ...(payload.summary || {}),
    ...buildEntrySummary(section, slug, entry),
  };

  upsertEntryDetail(section, slug, entry, {
    sourceType: currentRow.source_type === 'scraped' ? 'mixed' : 'manual',
    status: payload.status || currentRow.status,
    summary,
    raw: {
      ...parseJson(currentRow.raw_json, {}),
      ...payload,
    },
  });

  return getAdminEntry(section, slug, entry.meta.locale);
}

export function archiveEntry(section, slug, locale = 'en') {
  const row = getEntryRow(section, slug, locale);
  if (!row) {
    throw new Error(`Entry not found: ${section}/${slug}`);
  }

  db.prepare(`
    UPDATE content_entries
    SET status = 'archived', updated_at = ?
    WHERE section = ? AND slug = ? AND locale = ?
  `).run(
    nowIso(),
    section,
    slug,
    locale,
  );

  removeSectionItem(section, locale, slug);
  return getAdminEntry(section, slug, locale);
}

