import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

const TRANSLATION_COLLECTIONS = [
  {
    collection: 'navigation_links_translations',
    baseCollection: 'navigation_links',
    fields: 'source_key,label,href,sort_order',
    filter: { 'filter[locale][_eq]': 'en' },
    sort: 'sort_order,source_key',
    label: (item) => `${item.label} -> ${item.href}`,
  },
  {
    collection: 'download_links_translations',
    baseCollection: 'download_links',
    fields: 'source_key,label,platform,sort_order',
    filter: { 'filter[locale][_eq]': 'en' },
    sort: 'sort_order,source_key',
    label: (item) => `${item.label} (${item.platform})`,
  },
  {
    collection: 'home_slides_translations',
    baseCollection: 'home_slides',
    fields: 'source_key,title,sort_order',
    filter: { 'filter[locale][_eq]': 'en' },
    sort: 'sort_order,source_key',
    label: (item) => item.title || item.source_key,
  },
  {
    collection: 'home_featured_cards_translations',
    baseCollection: 'home_featured_cards',
    fields: 'source_key,title,card_size,sort_order',
    filter: { 'filter[locale][_eq]': 'en' },
    sort: 'sort_order,source_key',
    label: (item) => `${item.title || item.source_key} (${item.card_size})`,
  },
  {
    collection: 'content_sections_translations',
    baseCollection: 'content_sections',
    fields: 'source_key,title,slug,sort_order',
    filter: { 'filter[locale][_eq]': 'en' },
    sort: 'sort_order,source_key',
    label: (item) => `${item.title || item.slug || item.source_key} (${item.slug || item.source_key})`,
  },
  {
    collection: 'content_entries_translations',
    baseCollection: 'content_entries',
    fields: 'source_key,title,slug,sort_order',
    filter: { 'filter[locale][_eq]': 'en' },
    sort: 'sort_order,title',
    label: (item) => `${item.title || item.slug || item.source_key} (${item.slug || item.source_key})`,
  },
  {
    collection: 'terminology_entries_translations',
    baseCollection: 'terminology_entries',
    fields: 'source_key,term_key,base_value,group_name,sort_order',
    filter: { 'filter[locale][_eq]': 'en' },
    sort: 'group_name,sort_order,base_value',
    label: (item) => `${item.base_value} (${item.term_key})`,
  },
  {
    collection: 'entry_tags_translations',
    baseCollection: 'entry_tags',
    fields: 'source_key,label,entry_source_key,sort_order',
    sort: 'entry_source_key,sort_order',
    label: (item) => `${item.label} [${item.entry_source_key}]`,
  },
  {
    collection: 'entry_properties_translations',
    baseCollection: 'entry_properties',
    fields: 'source_key,label,value,entry_source_key,sort_order',
    sort: 'entry_source_key,sort_order',
    label: (item) => `${item.label}: ${clip(item.value, 48)} [${item.entry_source_key}]`,
  },
  {
    collection: 'entry_stat_blocks_translations',
    baseCollection: 'entry_stat_blocks',
    fields: 'source_key,title,entry_source_key,sort_order',
    sort: 'entry_source_key,sort_order',
    label: (item) => `${item.title} [${item.entry_source_key}]`,
  },
  {
    collection: 'entry_stat_lines_translations',
    baseCollection: 'entry_stat_lines',
    fields: 'source_key,content,block_source_key,sort_order',
    sort: 'block_source_key,sort_order',
    label: (item) => `${clip(item.content, 72)} [${item.block_source_key}]`,
  },
  {
    collection: 'entry_awakening_groups_translations',
    baseCollection: 'entry_awakening_groups',
    fields: 'source_key,title,code,entry_source_key,sort_order',
    sort: 'entry_source_key,sort_order',
    label: (item) => `${item.title} (${item.code}) [${item.entry_source_key}]`,
  },
  {
    collection: 'entry_awakening_lines_translations',
    baseCollection: 'entry_awakening_lines',
    fields: 'source_key,content,awakening_source_key,sort_order',
    sort: 'awakening_source_key,sort_order',
    label: (item) => `${clip(item.content, 72)} [${item.awakening_source_key}]`,
  },
];

const LOCALE_CHOICES = [
  { text: '简体中文', value: 'zh-CN' },
  { text: '繁體中文', value: 'zh-TW' },
  { text: 'Français', value: 'fr' },
  { text: '日本語', value: 'ja' },
  { text: 'Русский', value: 'ru' },
  { text: '한국어', value: 'ko' },
];
const MAX_DROPDOWN_CHOICES = 2000;
const CONTENT_ENTRY_PRESET_FIELDS = [
  'title',
  'description',
  'rarity',
  'acquisition_method',
  'weapon_requirement',
  'slug',
  'section_slug',
  'source_key',
];
const CONTENT_ENTRY_TRANSLATION_PRESET_FIELDS = [
  'title',
  'description',
  'rarity',
  'acquisition_method',
  'weapon_requirement',
  'locale',
  'base_source_key',
  'source_key',
];
const ENTRY_TAG_TRANSLATION_PRESET_FIELDS = [
  'label',
  'locale',
  'base_source_key',
  'source_key',
];
const ENTRY_PROPERTY_TRANSLATION_PRESET_FIELDS = [
  'label',
  'value',
  'locale',
  'base_source_key',
  'source_key',
];
const ENTRY_STAT_LINE_TRANSLATION_PRESET_FIELDS = [
  'content',
  'locale',
  'base_source_key',
  'source_key',
];
const ENTRY_AWAKENING_LINE_TRANSLATION_PRESET_FIELDS = [
  'content',
  'locale',
  'base_source_key',
  'source_key',
];

function headers() {
  return {
    Authorization: `Bearer ${staticToken}`,
    'Content-Type': 'application/json',
  };
}

async function request(pathname, options = {}) {
  const response = await fetch(new URL(pathname, directusUrl), {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
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

function clip(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildChoice(item, labelBuilder) {
  const text = clip(labelBuilder(item) || item.source_key, 120);
  return {
    text,
    value: item.source_key,
  };
}

async function fetchBaseChoices(config) {
  const query = new URLSearchParams({
    limit: '-1',
    fields: config.fields,
    sort: config.sort || 'source_key',
  });

  for (const [key, value] of Object.entries(config.filter || {})) {
    query.set(key, value);
  }

  const payload = await request(`/items/${config.baseCollection}?${query.toString()}`);
  const items = payload?.data || [];

  return items.map((item) => buildChoice(item, config.label));
}

async function patchField(collection, field, metaPatch) {
  const current = await request(`/fields/${collection}/${field}`);
  const nextMeta = {
    ...current.data.meta,
    ...metaPatch,
  };

  await request(`/fields/${collection}/${field}`, {
    method: 'PATCH',
    body: JSON.stringify({
      meta: nextMeta,
    }),
  });
}

async function getCurrentUser() {
  const payload = await request('/users/me');
  return payload?.data || null;
}

async function findPresetByCollection(collection, userId) {
  const query = new URLSearchParams({
    limit: '1',
    'filter[collection][_eq]': collection,
    'filter[user][_eq]': userId,
  });

  const payload = await request(`/presets?${query.toString()}`);
  return payload?.data?.[0] || null;
}

async function upsertPreset(collection, userId, layoutOptions) {
  const existing = await findPresetByCollection(collection, userId);
  const payload = {
    collection,
    user: userId,
    role: null,
    bookmark: null,
    search: null,
    layout: 'tabular',
    layout_query: {
      tabular: {
        page: 1,
      },
    },
    layout_options: {
      tabular: {
        fields: layoutOptions,
      },
    },
    refresh_interval: null,
    filter: null,
    icon: 'bookmark',
    color: null,
  };

  if (existing?.id) {
    await request(`/presets/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return;
  }

  await request('/presets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function main() {
  process.stdout.write(`configure translation fields from ${__dirname}\n`);

  for (const config of TRANSLATION_COLLECTIONS) {
    const baseChoices = await fetchBaseChoices(config);
    process.stdout.write(`configure ${config.collection} (${baseChoices.length} base choices)\n`);

    await patchField(config.collection, 'locale', {
      interface: 'emberlore-translation-locale-select',
      options: {
        choices: LOCALE_CHOICES,
        allowOther: false,
      },
      note: 'Select the target language for this translation.',
      width: 'half',
      sort: 2,
    });

    const usesDropdown = baseChoices.length > 0 && baseChoices.length <= MAX_DROPDOWN_CHOICES;

    await patchField(config.collection, 'base_source_key', {
      interface: usesDropdown ? 'select-dropdown' : 'input',
      options: usesDropdown
        ? {
            choices: baseChoices,
            allowOther: false,
          }
        : null,
      note: usesDropdown
        ? 'Select the English source record this translation belongs to.'
        : 'This collection is too large for a static dropdown. Enter the English source_key or import in bulk.',
      width: 'full',
      sort: 3,
    });

    await patchField(config.collection, 'source_key', {
      interface: 'input',
      options: null,
      readonly: true,
      required: false,
      note: 'Auto-generated from Locale and Base Source Key as you edit and when you save.',
      width: 'full',
      sort: 4,
    });
  }

  await patchField('content_entries', 'description', {
    note: 'Base English detail-page intro shown directly under the entry title.',
    interface: 'input-multiline',
    width: 'full',
  });
  await patchField('content_entries_translations', 'title', {
    note: 'Localized page title used on both list cards and detail pages.',
    width: 'full',
  });
  await patchField('content_entries_translations', 'description', {
    note: 'Localized detail-page intro shown directly under the skill/equipment title.',
    interface: 'input-multiline',
    width: 'full',
  });
  await patchField('content_entries_translations', 'rarity', {
    note: 'Localized rarity shown in the detail header area.',
    width: 'half',
  });
  await patchField('content_entries_translations', 'acquisition_method', {
    note: 'Localized acquisition text shown in the detail header area.',
    width: 'half',
  });
  await patchField('content_entries_translations', 'weapon_requirement', {
    note: 'Localized weapon requirement shown in the detail header area.',
    width: 'half',
  });
  await patchField('entry_tags_translations', 'label', {
    note: 'One translated tag pill on the detail page, such as Attack or Lightning.',
    width: 'full',
  });
  await patchField('entry_properties_translations', 'label', {
    note: 'Property label shown in the detail header metadata area.',
    width: 'half',
  });
  await patchField('entry_properties_translations', 'value', {
    note: 'Property value shown in the detail header metadata area.',
    interface: 'input-multiline',
    width: 'full',
  });
  await patchField('entry_stat_lines_translations', 'content', {
    note: 'One translated line inside Rune Level 1 / Rune Level 45 / Rune Grade blocks.',
    interface: 'input-multiline',
    width: 'full',
  });
  await patchField('entry_awakening_lines_translations', 'content', {
    note: 'One translated line inside Source / Origin / Verity awakening blocks.',
    interface: 'input-multiline',
    width: 'full',
  });
  await patchField('maintenance_guide', 'title', {
    note: 'This singleton page title is shown only inside the Directus admin guide.',
    width: 'full',
  });
  await patchField('maintenance_guide', 'summary', {
    note: 'Short Chinese summary for editors explaining what this guide is for.',
    interface: 'input-multiline',
    width: 'full',
  });
  await patchField('maintenance_guide', 'content', {
    note: 'Main maintenance instructions for editors. Update this when your content workflow changes.',
    interface: 'input-multiline',
    width: 'full',
  });

  const currentUser = await getCurrentUser();
  if (currentUser?.id) {
    await upsertPreset('content_entries', currentUser.id, CONTENT_ENTRY_PRESET_FIELDS);
    await upsertPreset(
      'content_entries_translations',
      currentUser.id,
      CONTENT_ENTRY_TRANSLATION_PRESET_FIELDS,
    );
    await upsertPreset(
      'entry_tags_translations',
      currentUser.id,
      ENTRY_TAG_TRANSLATION_PRESET_FIELDS,
    );
    await upsertPreset(
      'entry_properties_translations',
      currentUser.id,
      ENTRY_PROPERTY_TRANSLATION_PRESET_FIELDS,
    );
    await upsertPreset(
      'entry_stat_lines_translations',
      currentUser.id,
      ENTRY_STAT_LINE_TRANSLATION_PRESET_FIELDS,
    );
    await upsertPreset(
      'entry_awakening_lines_translations',
      currentUser.id,
      ENTRY_AWAKENING_LINE_TRANSLATION_PRESET_FIELDS,
    );
    await upsertPreset('terminology_entries', currentUser.id, [
      'base_value',
      'group_name',
      'term_key',
      'source_key',
      'locale',
      'sort_order',
    ]);
    await upsertPreset('terminology_entries_translations', currentUser.id, [
      'value',
      'locale',
      'base_source_key',
      'source_key',
    ]);
  }

  process.stdout.write('translation field configuration completed\n');
}

await main();
