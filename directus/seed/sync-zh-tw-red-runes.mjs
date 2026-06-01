import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8056';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
const locale = 'zh-TW';
const sourceUrl = 'https://undecember.fandom.com/zh-tw/wiki/%E7%B4%85%E8%89%B2%E7%AC%A6%E6%96%87';
const gradeLabels = new Set(['一般', '魔法', '稀有']);
const slugOverridesByUrl = new Map([
  ['https://undecember.fandom.com/zh-tw/wiki/%E7%8C%9B%E7%83%88%E5%BC%B7%E6%93%8A', 'FierceStrike'],
]);

const navigationTranslations = [
  ['en:nav:1', '符文'],
  ['en:nav:2', '眾神權能'],
  ['en:nav:3', '遺物'],
  ['en:nav:4', '符文大師之路'],
  ['en:nav:5', '詞綴'],
  ['en:nav:6', '精華'],
  ['en:nav:7', '貨幣'],
  ['en:nav:8', '藥劑'],
  ['en:nav:9', '材料'],
  ['en:nav:10', '符文石'],
].map(([base_source_key, label]) => ({
  source_key: buildSourceKey(locale, base_source_key),
  base_source_key,
  locale,
  label,
}));

const sectionTranslations = [
  ['en:runes', '符文', '符文的說明與屬性一覽'],
  ['en:authority', '眾神權能', '權能詞條一覽'],
  ['en:uniques', '遺物', '遺物裝備詞條一覽'],
  ['en:runemaster', '符文大師之路', '符文大師之路計算器'],
  ['en:tags', '詞綴', 'UNDECEMBER 詞綴'],
  ['en:essences', '精華', '精華列表'],
  ['en:coins', '貨幣', 'UNDECEMBER 貨幣'],
  ['en:potions', '藥劑', '藥劑列表'],
  ['en:materials', '材料', '材料列表'],
  ['en:runecast', '符文石', '符文石列表'],
  ['en:equipments', '裝備選項', ''],
].map(([base_source_key, title, description]) => ({
  source_key: buildSourceKey(locale, base_source_key),
  base_source_key,
  locale,
  title,
  description,
}));

const homeSlideTranslations = [
  ['en:home:slide:1', '符文', ''],
  ['en:home:slide:2', '精華', ''],
  ['en:home:slide:3', '材料', ''],
].map(([base_source_key, title, subtitle]) => ({
  source_key: buildSourceKey(locale, base_source_key),
  base_source_key,
  locale,
  title,
  subtitle,
}));

const featuredCardTranslations = [
  ['en:home:card:wide:1', '符文庫', '符文的說明與屬性一覽'],
  ['en:home:card:tile:1', '精華', ''],
  ['en:home:card:tile:2', '詞綴', ''],
  ['en:home:card:tile:3', '貨幣', ''],
  ['en:home:card:tile:4', '裝備選項', ''],
  ['en:home:card:tile:5', '藥劑', ''],
  ['en:home:card:tile:6', '材料', ''],
  ['en:home:card:tile:7', '符文石', ''],
  ['en:home:card:tile:8', '語言包', ''],
].map(([base_source_key, title, subtitle]) => ({
  source_key: buildSourceKey(locale, base_source_key),
  base_source_key,
  locale,
  title,
  subtitle,
}));

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scrapedJsonPath = path.join(__dirname, 'generated', 'zh-tw-red-runes-scraped.json');

function buildSourceKey(nextLocale, baseSourceKey) {
  const safeLocale = String(nextLocale || '').trim();
  const safeBaseSourceKey = String(baseSourceKey || '').trim();
  const separatorIndex = safeBaseSourceKey.indexOf(':');
  const suffix = separatorIndex >= 0 ? safeBaseSourceKey.slice(separatorIndex + 1) : safeBaseSourceKey;
  return suffix ? `${safeLocale}:${suffix}` : null;
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
    throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function fetchItems(collection, query = {}) {
  const url = new URL(`/items/${collection}`, directusUrl);
  url.searchParams.set('limit', '-1');

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const payload = await request(url);
  return payload?.data || [];
}

async function findBySourceKey(collection, sourceKey) {
  const items = await fetchItems(collection, {
    fields: 'id,source_key',
    'filter[source_key][_eq]': sourceKey,
  });
  return items[0] || null;
}

async function upsertItem(collection, item) {
  const existing = await findBySourceKey(collection, item.source_key);

  if (!existing) {
    await request(new URL(`/items/${collection}`, directusUrl), {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return 'created';
  }

  await request(new URL(`/items/${collection}/${existing.id}`, directusUrl), {
    method: 'PATCH',
    body: JSON.stringify(item),
  });
  return 'updated';
}

async function syncCollection(collection, items) {
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const action = await upsertItem(collection, item);
    if (action === 'created') {
      created += 1;
    } else {
      updated += 1;
    }
  }

  process.stdout.write(`${collection}: created ${created}, updated ${updated}\n`);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hasDetailContent(row) {
  return Boolean(row?.detail && row.detail.hasNoContent === false);
}

function rowQualityScore(row) {
  return [
    hasDetailContent(row) ? 1000 : 0,
    row?.detail?.detailLines?.length || 0,
    row?.detail?.effectTags?.length || 0,
    row?.detail?.description ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
}

function normalizeScrapedRows(rows) {
  const deduped = new Map();

  for (const rawRow of rows) {
    const slug = slugOverridesByUrl.get(rawRow.url) || rawRow.slug;
    const row = {
      ...rawRow,
      slug,
      source_key: `en:runes:${slug}`,
    };
    const existing = deduped.get(slug);

    if (!existing || rowQualityScore(row) > rowQualityScore(existing)) {
      deduped.set(slug, row);
    }
  }

  return Array.from(deduped.values());
}

function localizeListStat(value) {
  switch (cleanText(value).toLowerCase()) {
    case 'strength':
      return '力量';
    case 'dexterity':
    case 'agility':
      return '敏捷';
    case 'intellect':
    case 'intelligence':
      return '智力';
    default:
      return cleanText(value);
  }
}

function normalizeDelimitedValue(value) {
  return cleanText(value)
    .replace(/[、,/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRarity(value) {
  const text = cleanText(value);

  switch (text.toLowerCase()) {
    case 'normal':
    case 'common':
    case '普通':
    case '一般':
      return '一般';
    case 'magic':
    case '魔法':
      return '魔法';
    case 'rare':
    case '稀有':
      return '稀有';
    case 'unique':
    case '獨特':
      return '獨特';
    case 'legendary':
    case '傳奇':
      return '傳奇';
    case 'holy':
    case '神聖':
      return '神聖';
    case 'ancient':
    case '遠古':
      return '遠古';
    default:
      return text;
  }
}

function localizeAcquisition(value) {
  return normalizeDelimitedValue(value)
    .split(/\s+/)
    .map((token) => {
      switch (token.toLowerCase()) {
        case 'drop':
          return '掉落';
        case 'shop':
        case 'buy':
        case 'purchase':
          return '購買';
        case 'synthesis':
          return '合成';
        case 'guild':
          return '公會';
        default:
          return token;
      }
    })
    .filter(Boolean)
    .join(' ');
}

function localizeChapter(value) {
  const text = cleanText(value);
  if (!text || text === '-') {
    return text || '-';
  }

  return text
    .split(/[、,/]+/)
    .map((token) => cleanText(token))
    .filter(Boolean)
    .map((token) => {
      const actMatch = token.match(/^Act\s*(\d+(?:-\d+)?)$/i);
      return actMatch ? `第 ${actMatch[1]} 章` : token;
    })
    .join(' ');
}

function localizeWeaponRequirement(value) {
  return normalizeDelimitedValue(value)
    .split(/\s+/)
    .map((token) => {
      switch (token.toLowerCase()) {
        case 'all':
        case 'weapons':
          return '';
        case 'allweapons':
          return '所有武器';
        case 'shield':
          return '盾';
        case 'staff':
          return '手杖';
        case 'dagger':
          return '匕首';
        case 'sword':
          return '劍';
        case 'axe':
          return '斧頭';
        case 'blunt':
          return '鈍器';
        default:
          return token;
      }
    })
    .filter(Boolean)
    .join(' ')
    .replace(/^所有武器\s+$/, '所有武器')
    .trim() || cleanText(value);
}

function formatTopRow(label, value) {
  const safeLabel = cleanText(label);
  const safeValue = cleanText(value);

  if (!safeLabel) {
    return safeValue;
  }

  if (!safeValue) {
    return safeLabel;
  }

  if (safeLabel === '消耗魔力' && /消耗|增幅|資源/i.test(safeValue)) {
    return safeValue;
  }

  return `${safeLabel} ${safeValue}`;
}

function parseDetailBlocks(detail) {
  const metaLines = (detail?.topRows || [])
    .filter((row) => !gradeLabels.has(cleanText(row.label)))
    .map((row) => formatTopRow(row.label, row.value))
    .filter(Boolean);

  const gradeRowsFallback = (detail?.gradeRows || [])
    .map((row) => cleanText(row.value))
    .filter(Boolean);

  if (!detail?.rawText) {
    return {
      block1Lines: [...metaLines, ...((detail?.detailLines || []).map(cleanText).filter(Boolean))],
      block3Lines: gradeRowsFallback,
    };
  }

  const lines = String(detail.rawText)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const detailIndex = lines.indexOf('詳細資料');
  const contentLines = detailIndex >= 0 ? lines.slice(detailIndex + 1) : [];
  const generalLines = [];
  const gradeGroups = [];
  let currentGroup = null;

  for (const line of contentLines) {
    if (/^除非另有註明/i.test(line)) {
      break;
    }

    const match = line.match(/^(一般|魔法|稀有)\t?(.*)$/);
    if (match) {
      currentGroup = { label: match[1], lines: [] };
      if (cleanText(match[2])) {
        currentGroup.lines.push(cleanText(match[2]));
      }
      gradeGroups.push(currentGroup);
      continue;
    }

    if (currentGroup) {
      currentGroup.lines.push(cleanText(line));
    } else {
      generalLines.push(cleanText(line));
    }
  }

  return {
    block1Lines: [...metaLines, ...generalLines],
    block3Lines: gradeGroups.length > 0
      ? gradeGroups.flatMap((group) => group.lines).filter(Boolean)
      : gradeRowsFallback,
  };
}

function createTranslationItem(baseSourceKey, fields) {
  return {
    source_key: buildSourceKey(locale, baseSourceKey),
    base_source_key: baseSourceKey,
    locale,
    ...fields,
  };
}

function toEntryTranslation(baseEntry, row) {
  const title = cleanText(row?.detail?.title || row?.list?.title || baseEntry.title);
  const description = hasDetailContent(row) ? cleanText(row.detail.description) : '';
  const listStat = localizeListStat(baseEntry.list_stat) || '力量';
  const acquisitionMethod = localizeAcquisition(row?.list?.acquisition || '');
  const rarity = normalizeRarity(row?.list?.rarity || baseEntry.rarity);
  const weaponRequirement = localizeWeaponRequirement(row?.list?.weapon || baseEntry.weapon_requirement);

  return createTranslationItem(baseEntry.source_key, {
    title,
    description,
    list_stat: listStat,
    list_props: [listStat, acquisitionMethod].filter(Boolean).join(' ').trim(),
    rarity,
    acquisition_method: acquisitionMethod,
    weapon_requirement: weaponRequirement,
  });
}

function toPropertyTranslations(baseEntry, row) {
  const base = `${baseEntry.source_key}:property:`;

  return [
    {
      label: '最低稀有度',
      value: normalizeRarity(row?.list?.rarity || baseEntry.rarity),
    },
    {
      label: '獲取方式',
      value: localizeAcquisition(row?.list?.acquisition || ''),
    },
    {
      label: '可購買章節',
      value: localizeChapter(row?.list?.chapter || ''),
    },
    {
      label: '武器',
      value: localizeWeaponRequirement(row?.list?.weapon || baseEntry.weapon_requirement),
    },
  ].map((item, index) =>
    createTranslationItem(`${base}${index + 1}`, item),
  );
}

function buildTagTranslations(baseTags, effectTags) {
  if (!Array.isArray(baseTags) || baseTags.length === 0) {
    return [];
  }

  if (!Array.isArray(effectTags) || effectTags.length !== baseTags.length) {
    return [];
  }

  return baseTags.map((tag, index) =>
    createTranslationItem(tag.source_key, {
      label: cleanText(effectTags[index]),
    }),
  );
}

function buildLineTranslations(blockLines, translatedLines) {
  if (!Array.isArray(blockLines) || blockLines.length === 0) {
    return [];
  }

  const usableLines = translatedLines.map(cleanText).filter(Boolean).slice(0, blockLines.length);
  return usableLines.map((content, index) =>
    createTranslationItem(blockLines[index].source_key, { content }),
  );
}

const rawRows = JSON.parse(await readFile(scrapedJsonPath, 'utf8'));
const scrapedRows = normalizeScrapedRows(rawRows);
const baseEntries = await fetchItems('content_entries', {
  fields: 'source_key,slug,title,list_stat,rarity,weapon_requirement',
  'filter[source_key][_in]': scrapedRows.map((row) => row.source_key).join(','),
});
const baseEntriesByKey = new Map(baseEntries.map((item) => [item.source_key, item]));
const syncedRows = scrapedRows.filter((row) => baseEntriesByKey.has(row.source_key));
const detailRows = syncedRows.filter(hasDetailContent);

const baseTags = detailRows.length > 0
  ? await fetchItems('entry_tags', {
      fields: 'source_key,entry_source_key,sort_order,label',
      sort: 'sort_order',
      'filter[entry_source_key][_in]': detailRows.map((row) => row.source_key).join(','),
    })
  : [];
const baseBlocks = detailRows.length > 0
  ? await fetchItems('entry_stat_blocks', {
      fields: 'source_key,entry_source_key,sort_order,title',
      sort: 'sort_order',
      'filter[entry_source_key][_in]': detailRows.map((row) => row.source_key).join(','),
    })
  : [];
const baseLines = baseBlocks.length > 0
  ? await fetchItems('entry_stat_lines', {
      fields: 'source_key,block_source_key,sort_order,content',
      sort: 'sort_order',
      'filter[block_source_key][_in]': baseBlocks.map((block) => block.source_key).join(','),
    })
  : [];

const tagsByEntry = groupBy(baseTags, 'entry_source_key');
const blocksByEntry = groupBy(baseBlocks, 'entry_source_key');
const linesByBlock = groupBy(baseLines, 'block_source_key');
const entryTranslations = [];
const propertyTranslations = [];
const tagTranslations = [];
const lineTranslations = [];

for (const row of syncedRows) {
  const baseEntry = baseEntriesByKey.get(row.source_key);
  if (!baseEntry) {
    continue;
  }

  entryTranslations.push(toEntryTranslation(baseEntry, row));
  propertyTranslations.push(...toPropertyTranslations(baseEntry, row));

  if (!hasDetailContent(row)) {
    continue;
  }

  const effectTags = row?.detail?.effectTags || [];
  tagTranslations.push(...buildTagTranslations(tagsByEntry.get(baseEntry.source_key) || [], effectTags));

  const blocks = (blocksByEntry.get(baseEntry.source_key) || []).sort((left, right) => {
    return Number(left.sort_order || 0) - Number(right.sort_order || 0);
  });
  const parsed = parseDetailBlocks(row.detail);
  const firstBlock = blocks[0];
  const thirdBlock = blocks[2];

  if (firstBlock) {
    lineTranslations.push(
      ...buildLineTranslations(linesByBlock.get(firstBlock.source_key) || [], parsed.block1Lines),
    );
  }

  if (thirdBlock) {
    lineTranslations.push(
      ...buildLineTranslations(linesByBlock.get(thirdBlock.source_key) || [], parsed.block3Lines),
    );
  }
}

process.stdout.write(`source: ${sourceUrl}\n`);
process.stdout.write(`scraped rows: ${rawRows.length}\n`);
process.stdout.write(`synced rows: ${syncedRows.length}\n`);
process.stdout.write(`detail rows: ${detailRows.length}\n`);

await syncCollection('navigation_links_translations', navigationTranslations);
await syncCollection('content_sections_translations', sectionTranslations);
await syncCollection('home_slides_translations', homeSlideTranslations);
await syncCollection('home_featured_cards_translations', featuredCardTranslations);
await syncCollection('content_entries_translations', entryTranslations);
await syncCollection('entry_properties_translations', propertyTranslations);

if (tagTranslations.length > 0) {
  await syncCollection('entry_tags_translations', tagTranslations);
}

if (lineTranslations.length > 0) {
  await syncCollection('entry_stat_lines_translations', lineTranslations);
}

process.stdout.write(`synced ${entryTranslations.length} zh-TW red skill rune translations\n`);
process.stdout.write(`synced ${tagTranslations.length} zh-TW tag translations\n`);
process.stdout.write(`synced ${lineTranslations.length} zh-TW stat line translations\n`);

function groupBy(items, key) {
  const grouped = new Map();

  for (const item of items) {
    const groupKey = item[key];
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey).push(item);
  }

  return grouped;
}
