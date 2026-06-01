import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const terminologySourcePath = path.join(__dirname, '..', '..', 'web', 'src', 'lib', 'terminology.ts');

const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
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
  const existing = await findBySourceKey(collection, item.source_key);

  if (!existing) {
    const payload = await request(new URL(`/items/${collection}`, directusUrl), {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return payload.data;
  }

  const payload = await request(new URL(`/items/${collection}/${existing.id}`, directusUrl), {
    method: 'PATCH',
    body: JSON.stringify(item),
  });
  return payload.data;
}

function extractZhCnTermMap(source) {
  const match = source.match(/const ZH_CN_TERM_MAP = (\{[\s\S]*?\}) as const;/);

  if (!match) {
    throw new Error('Could not find ZH_CN_TERM_MAP in terminology.ts');
  }

  return Function(`"use strict"; return (${match[1]});`)();
}

function slugifyTermKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/\./g, ' dot ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function inferGroupName(baseValue) {
  if (
    [
      'Sort',
      'Sort.',
      'Sort...',
      'Rarity',
      'How to get',
      'Weapon',
      'To buy in',
      'Rune stat',
      'Rune type',
      'Rune tags',
      'Equipment type',
      'Option tags',
      'Material type',
      'Cards type',
      'Essences type',
      'Potions type',
      'Materials type',
      'Trials of Power',
      'Link',
    ].includes(baseValue)
  ) {
    return 'ui';
  }

  if (
    [
      'Min. rarity',
      'Max level',
      'Use on',
      'Weapon Range',
      'Position',
      'Tag ID',
      'Requires',
      'Type',
      'Status',
      'Mode',
      'Stat',
    ].includes(baseValue)
  ) {
    return 'property';
  }

  if (
    [
      'Rune Grade',
      'Source',
      'Origin',
      'Verity',
      'Link Rune',
      'Link Skill',
      'LinkSkill',
      'Skill Rune',
    ].includes(baseValue)
  ) {
    return 'detail';
  }

  return 'term';
}

function buildTerminologySeed(termMap) {
  const seenKeys = new Map();
  const entries = [];

  for (const [index, [baseValue, translatedValue]] of Object.entries(termMap).entries()) {
    const rawTermKey = slugifyTermKey(baseValue) || `term-${index + 1}`;
    const duplicateCount = seenKeys.get(rawTermKey) || 0;
    seenKeys.set(rawTermKey, duplicateCount + 1);

    const termKey = duplicateCount === 0 ? rawTermKey : `${rawTermKey}-${duplicateCount + 1}`;
    const sourceKey = `en:term:${termKey}`;

    entries.push({
      base: {
        source_key: sourceKey,
        locale: 'en',
        term_key: termKey,
        group_name: inferGroupName(baseValue),
        base_value: baseValue,
        note: '',
        sort_order: index + 1,
      },
      translation: {
        source_key: `zh-CN:term:${termKey}`,
        base_source_key: sourceKey,
        locale: 'zh-CN',
        value: translatedValue,
      },
    });
  }

  return entries;
}

async function main() {
  const source = await readFile(terminologySourcePath, 'utf8');
  const zhCnTermMap = extractZhCnTermMap(source);
  const seedEntries = buildTerminologySeed(zhCnTermMap);

  process.stdout.write(`sync terminology entries (${seedEntries.length})\n`);

  for (const entry of seedEntries) {
    await upsertItem('terminology_entries', entry.base);
    await upsertItem('terminology_entries_translations', entry.translation);
  }

  process.stdout.write('terminology sync completed\n');
}

await main();
