import { directusAsset, directusFetch } from '@/lib/directus';
import { CONTENT_BASE_LOCALE, resolveLocale } from '@/lib/i18n';
import {
  getFallbackTerminologyMap,
  localizeAwakeningTerminology,
  localizeBlockTerminology,
  localizeEntryTerminology,
  localizeLineTerminology,
  localizePropertyTerminology,
  localizeTagTerminology,
  type TerminologyMap,
} from '@/lib/terminology';

export type NavLink = {
  source_key: string;
  locale: string;
  label: string;
  href: string;
  group_name?: string;
  open_in_new_tab?: boolean;
  sort_order?: number;
};

export type DownloadLink = {
  source_key: string;
  locale: string;
  platform: string;
  label: string;
  href: string;
  icon_url?: string;
  sort_order?: number;
};

export type HomeSlide = {
  source_key: string;
  locale: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  background_css?: string;
  href: string;
  sort_order?: number;
};

export type HomeCard = {
  source_key: string;
  locale: string;
  card_size: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  background_css?: string;
  href: string;
  sort_order?: number;
};

export type ContentSection = {
  source_key: string;
  locale: string;
  slug: string;
  title: string;
  description?: string;
  hero_image_url?: string;
  icon_image_url?: string;
  theme_token?: string;
  sort_order?: number;
  status?: string;
};

export type ContentEntry = {
  source_key: string;
  locale: string;
  section_slug: string;
  entry_type?: string;
  list_stat?: string;
  list_props?: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  video_url?: string;
  rarity?: string;
  acquisition_method?: string;
  weapon_requirement?: string;
  sort_order?: number;
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
  base_tags?: string[];
  properties?: EntryProperty[];
  base_title?: string;
  base_subtitle?: string;
  base_list_stat?: string;
  base_list_props?: string;
  base_rarity?: string;
  base_acquisition_method?: string;
  base_weapon_requirement?: string;
};

export type EntryProperty = {
  source_key: string;
  entry_source_key: string;
  label: string;
  value: string;
  sort_order?: number;
  base_label?: string;
  base_value?: string;
};

export type EntryTag = {
  source_key: string;
  entry_source_key: string;
  label: string;
  sort_order?: number;
  base_label?: string;
};

export type EntryStatBlock = {
  source_key: string;
  entry_source_key: string;
  title: string;
  variant?: string;
  sort_order?: number;
  lines: EntryStatLine[];
};

export type EntryStatLine = {
  source_key: string;
  block_source_key: string;
  content: string;
  sort_order?: number;
  base_content?: string;
};

export type EntryAwakeningGroup = {
  source_key: string;
  entry_source_key: string;
  code: string;
  title: string;
  sort_order?: number;
  lines: EntryAwakeningLine[];
};

export type EntryAwakeningLine = {
  source_key: string;
  awakening_source_key: string;
  content: string;
  sort_order?: number;
  base_content?: string;
};

export type TerminologyEntry = {
  source_key: string;
  locale: string;
  term_key: string;
  group_name?: string;
  base_value: string;
  note?: string;
  sort_order?: number;
};

export type TerminologyTranslation = {
  source_key: string;
  base_source_key: string;
  locale: string;
  value: string;
};

type ItemResponse<T> = { data: T[] };
type SingletonResponse<T> = { data: T };

type TranslationRecord<T> = {
  source_key: string;
  base_source_key: string;
  locale: string;
} & Partial<T>;

const NAV_FIELDS = 'source_key,locale,label,href,group_name,open_in_new_tab,sort_order';
const DOWNLOAD_FIELDS = 'source_key,locale,platform,label,href,icon_url,sort_order';
const HOME_SLIDE_FIELDS = 'source_key,locale,title,subtitle,image_url,background_css,href,sort_order';
const HOME_CARD_FIELDS = 'source_key,locale,card_size,title,subtitle,image_url,background_css,href,sort_order';
const SECTION_FIELDS =
  'source_key,locale,slug,title,description,hero_image_url,icon_image_url,theme_token,sort_order,status';
const ENTRY_LIST_FIELDS =
  'source_key,locale,section_slug,entry_type,list_stat,list_props,slug,title,subtitle,description,image_url,rarity,acquisition_method,weapon_requirement,sort_order,seo_title,seo_description';
const ENTRY_DETAIL_FIELDS =
  'source_key,locale,section_slug,entry_type,list_stat,list_props,slug,title,subtitle,description,image_url,video_url,rarity,acquisition_method,weapon_requirement,sort_order,seo_title,seo_description';
const TAG_FIELDS = 'source_key,entry_source_key,label,sort_order';
const PROPERTY_FIELDS = 'source_key,entry_source_key,label,value,sort_order';
const BLOCK_FIELDS = 'source_key,entry_source_key,title,variant,sort_order';
const LINE_FIELDS = 'source_key,block_source_key,content,sort_order';
const AWAKENING_GROUP_FIELDS = 'source_key,entry_source_key,code,title,sort_order';
const AWAKENING_LINE_FIELDS = 'source_key,awakening_source_key,content,sort_order';
const TERMINOLOGY_FIELDS = 'source_key,locale,term_key,group_name,base_value,note,sort_order';

function sortByOrder<T extends { sort_order?: number }>(items: T[]) {
  return [...items].sort((a, b) => {
    const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return String((a as { source_key?: string }).source_key || '').localeCompare(
      String((b as { source_key?: string }).source_key || ''),
    );
  });
}

function imageify<
  T extends {
    image_url?: string;
    video_url?: string;
    icon_url?: string;
    hero_image_url?: string;
    icon_image_url?: string;
  },
>(item: T) {
  return {
    ...item,
    image_url: item.image_url ? directusAsset(item.image_url) : item.image_url,
    video_url: item.video_url ? directusAsset(item.video_url) : item.video_url,
    icon_url: item.icon_url ? directusAsset(item.icon_url) : item.icon_url,
    hero_image_url: item.hero_image_url ? directusAsset(item.hero_image_url) : item.hero_image_url,
    icon_image_url: item.icon_image_url
      ? directusAsset(item.icon_image_url)
      : item.icon_image_url,
  };
}

function sourceKeyChunks(sourceKeys: string[], chunkSize = 80) {
  const chunks: string[][] = [];

  for (let index = 0; index < sourceKeys.length; index += chunkSize) {
    chunks.push(sourceKeys.slice(index, index + chunkSize));
  }

  return chunks;
}

async function optionalDirectusFetch<T>(pathname: string, query?: Record<string, string>) {
  try {
    return await directusFetch<T>(pathname, query);
  } catch {
    return null;
  }
}

async function fetchItemList<T>(collection: string, query: Record<string, string>) {
  const payload = await directusFetch<ItemResponse<T>>(`/items/${collection}`, query);
  return payload.data || [];
}

async function fetchOptionalItemList<T>(collection: string, query: Record<string, string>) {
  const payload = await optionalDirectusFetch<ItemResponse<T>>(`/items/${collection}`, query);
  return payload?.data || [];
}

async function fetchOptionalTranslations<T>(
  collection: string,
  locale: string,
  baseSourceKeys: string[],
  fields: string,
) {
  const resolvedLocale = resolveLocale(locale);

  if (resolvedLocale === CONTENT_BASE_LOCALE || baseSourceKeys.length === 0) {
    return [] as Array<TranslationRecord<T>>;
  }

  const payload = await optionalDirectusFetch<ItemResponse<TranslationRecord<T>>>(`/items/${collection}`, {
    'filter[locale][_eq]': resolvedLocale,
    'filter[base_source_key][_in]': baseSourceKeys.join(','),
    limit: '-1',
    sort: 'base_source_key',
    fields: `source_key,base_source_key,locale,${fields}`,
  });

  return payload?.data || [];
}

export async function getTerminologyMap(locale: string): Promise<TerminologyMap> {
  const resolvedLocale = resolveLocale(locale);
  const fallbackMap = getFallbackTerminologyMap(resolvedLocale);

  if (resolvedLocale === CONTENT_BASE_LOCALE) {
    return fallbackMap;
  }

  const baseTerms = await fetchOptionalItemList<TerminologyEntry>('terminology_entries', {
    'filter[locale][_eq]': CONTENT_BASE_LOCALE,
    limit: '-1',
    sort: 'sort_order,base_value',
    fields: TERMINOLOGY_FIELDS,
  });

  if (baseTerms.length === 0) {
    return fallbackMap;
  }

  const translations = await fetchOptionalTranslations<Pick<TerminologyTranslation, 'value'>>(
    'terminology_entries_translations',
    resolvedLocale,
    baseTerms.map((item) => item.source_key),
    'value',
  );

  const translationsByBaseKey = new Map(
    translations.map((item) => [item.base_source_key, String(item.value || '').trim()]),
  );

  const nextMap: TerminologyMap = { ...fallbackMap };

  for (const term of baseTerms) {
    const source = String(term.base_value || '').trim();
    const translated = translationsByBaseKey.get(term.source_key) || '';

    if (!source) {
      continue;
    }

    nextMap[source] = translated || nextMap[source] || source;
  }

  return nextMap;
}

function mergeTranslatedItem<T extends { source_key: string }>(
  item: T,
  translation?: TranslationRecord<Partial<T>>,
) {
  if (!translation) {
    return item;
  }

  const merged = { ...item } as Record<string, unknown>;

  for (const [key, value] of Object.entries(translation)) {
    if (key === 'source_key' || key === 'base_source_key' || key === 'locale') {
      continue;
    }

    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
}

function mergeTranslatedItems<T extends { source_key: string }>(
  items: T[],
  translations: Array<TranslationRecord<Partial<T>>>,
) {
  const translationMap = new Map(translations.map((item) => [item.base_source_key, item]));
  return items.map((item) => mergeTranslatedItem(item, translationMap.get(item.source_key)));
}

function attachEntryCanonicalFields(displayEntry: ContentEntry, baseEntry: ContentEntry) {
  return {
    ...displayEntry,
    base_title: baseEntry.title,
    base_subtitle: baseEntry.subtitle,
    base_list_stat: baseEntry.list_stat,
    base_list_props: baseEntry.list_props,
    base_rarity: baseEntry.rarity,
    base_acquisition_method: baseEntry.acquisition_method,
    base_weapon_requirement: baseEntry.weapon_requirement,
  };
}

function attachPropertyCanonicalFields(displayProperty: EntryProperty, baseProperty: EntryProperty) {
  return {
    ...displayProperty,
    base_label: baseProperty.label,
    base_value: baseProperty.value,
  };
}

function attachTagCanonicalFields(displayTag: EntryTag, baseTag: EntryTag) {
  return {
    ...displayTag,
    base_label: baseTag.label,
  };
}

function attachLineCanonicalFields<T extends { content: string }>(displayLine: T, baseLine: T) {
  return {
    ...displayLine,
    base_content: baseLine.content,
  };
}

const STAT_TEMPLATE_TOKEN_REGEX = /(?:\[[^\]]+\]|[+-]?\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)(?:\s*%|\s*s)?/g;

function hasLatinLetters(value?: string | null) {
  return /[A-Za-z]/.test(String(value || ''));
}

function statTemplateSignature(value?: string | null) {
  return String(value || '')
    .replace(STAT_TEMPLATE_TOKEN_REGEX, '{#}')
    .replace(/\s+/g, ' ')
    .trim();
}

function statTemplateTokens(value?: string | null) {
  return String(value || '').match(STAT_TEMPLATE_TOKEN_REGEX) || [];
}

function applyStatTemplateTranslation(referenceTranslation: string, targetBaseValue: string) {
  const targetTokens = statTemplateTokens(targetBaseValue);

  if (targetTokens.length === 0) {
    return referenceTranslation;
  }

  let index = 0;
  return referenceTranslation.replace(STAT_TEMPLATE_TOKEN_REGEX, () => targetTokens[index++] || '');
}

function localizeLineWithReferenceTemplate<T extends { content: string; base_content?: string }>(
  line: T,
  referenceLine: T | undefined,
  locale: string,
  terminologyMap?: TerminologyMap,
) {
  const localizedLine = localizeLineTerminology(line, locale, terminologyMap);

  if (!hasLatinLetters(localizedLine.content)) {
    return localizedLine;
  }

  if (!referenceLine) {
    return localizedLine;
  }

  const currentBase = String(line.base_content || line.content || '').trim();
  const referenceBase = String(referenceLine.base_content || referenceLine.content || '').trim();

  if (!currentBase || !referenceBase) {
    return localizedLine;
  }

  if (statTemplateSignature(currentBase) !== statTemplateSignature(referenceBase)) {
    return localizedLine;
  }

  const localizedReference = localizeLineTerminology(referenceLine, locale, terminologyMap);
  const referenceTranslation = String(localizedReference.content || '').trim();

  if (!referenceTranslation || referenceTranslation === referenceBase || hasLatinLetters(referenceTranslation)) {
    return localizedLine;
  }

  const baseTokens = statTemplateTokens(referenceBase);
  const targetTokens = statTemplateTokens(currentBase);
  const translatedTokens = statTemplateTokens(referenceTranslation);

  if (baseTokens.length !== targetTokens.length) {
    return localizedLine;
  }

  if (translatedTokens.length > 0 && translatedTokens.length !== baseTokens.length) {
    return localizedLine;
  }

  return {
    ...localizedLine,
    content: applyStatTemplateTranslation(referenceTranslation, currentBase),
  };
}

async function getLegacyLocalizedCollection<T>(
  collection: string,
  locale: string,
  fields: string,
  extraQuery: Record<string, string>,
) {
  const resolvedLocale = resolveLocale(locale);

  if (resolvedLocale === CONTENT_BASE_LOCALE) {
    return [] as T[];
  }

  return fetchItemList<T>(collection, {
    'filter[locale][_eq]': resolvedLocale,
    ...extraQuery,
    limit: extraQuery.limit || '-1',
    fields,
  });
}

async function getTranslatedCollection<T extends { source_key: string }>(
  collection: string,
  translationCollection: string,
  locale: string,
  fields: string,
  translationFields: string,
  extraQuery: Record<string, string>,
) {
  const baseItems = await fetchItemList<T>(collection, {
    'filter[locale][_eq]': CONTENT_BASE_LOCALE,
    ...extraQuery,
    limit: extraQuery.limit || '-1',
    fields,
  });

  const translations = await fetchOptionalTranslations<Partial<T>>(
    translationCollection,
    locale,
    baseItems.map((item) => item.source_key),
    translationFields,
  );

  return mergeTranslatedItems(baseItems, translations);
}

async function getLegacyListMetadata(entries: ContentEntry[], locale: string, terminologyMap?: TerminologyMap) {
  const sourceKeys = entries.map((entry) => entry.source_key);

  if (sourceKeys.length === 0) {
    return {
      tagsByEntry: new Map<string, string[]>(),
      baseTagsByEntry: new Map<string, string[]>(),
      propertiesByEntry: new Map<string, EntryProperty[]>(),
    };
  }

  const [tagPayloads, propertyPayloads] = await Promise.all([
    Promise.all(
      sourceKeyChunks(sourceKeys).map((chunk) =>
        directusFetch<ItemResponse<EntryTag>>('/items/entry_tags', {
          'filter[entry_source_key][_in]': chunk.join(','),
          limit: '-1',
          sort: 'entry_source_key,sort_order',
          fields: TAG_FIELDS,
        }),
      ),
    ),
    Promise.all(
      sourceKeyChunks(sourceKeys).map((chunk) =>
        directusFetch<ItemResponse<EntryProperty>>('/items/entry_properties', {
          'filter[entry_source_key][_in]': chunk.join(','),
          limit: '-1',
          sort: 'entry_source_key,sort_order',
          fields: PROPERTY_FIELDS,
        }),
      ),
    ),
  ]);

  const tagsByEntry = new Map<string, string[]>();
  const baseTagsByEntry = new Map<string, string[]>();
  const propertiesByEntry = new Map<string, EntryProperty[]>();

  for (const tag of tagPayloads.flatMap((payload) => payload.data || [])) {
    const tags = tagsByEntry.get(tag.entry_source_key) || [];
    const localizedTag = localizeTagTerminology(
      attachTagCanonicalFields(tag, tag),
      locale,
      terminologyMap,
    );
    const baseLabels = baseTagsByEntry.get(tag.entry_source_key) || [];
    tags.push(localizedTag.label);
    tagsByEntry.set(tag.entry_source_key, tags);
    baseLabels.push(tag.label);
    baseTagsByEntry.set(tag.entry_source_key, baseLabels);
  }

  for (const property of propertyPayloads.flatMap((payload) => payload.data || [])) {
    const properties = propertiesByEntry.get(property.entry_source_key) || [];
    properties.push(
      localizePropertyTerminology(
        {
          ...property,
          base_label: property.label,
          base_value: property.value,
        },
        locale,
        terminologyMap,
      ),
    );
    propertiesByEntry.set(property.entry_source_key, properties);
  }

  return { tagsByEntry, baseTagsByEntry, propertiesByEntry };
}

async function getTranslatedListMetadata(
  baseEntries: ContentEntry[],
  locale: string,
  terminologyMap?: TerminologyMap,
) {
  const sourceKeys = baseEntries.map((entry) => entry.source_key);

  if (sourceKeys.length === 0) {
    return {
      tagsByEntry: new Map<string, string[]>(),
      baseTagsByEntry: new Map<string, string[]>(),
      propertiesByEntry: new Map<string, EntryProperty[]>(),
    };
  }

  const [tagPayloads, propertyPayloads] = await Promise.all([
    Promise.all(
      sourceKeyChunks(sourceKeys).map((chunk) =>
        directusFetch<ItemResponse<EntryTag>>('/items/entry_tags', {
          'filter[entry_source_key][_in]': chunk.join(','),
          limit: '-1',
          sort: 'entry_source_key,sort_order',
          fields: TAG_FIELDS,
        }),
      ),
    ),
    Promise.all(
      sourceKeyChunks(sourceKeys).map((chunk) =>
        directusFetch<ItemResponse<EntryProperty>>('/items/entry_properties', {
          'filter[entry_source_key][_in]': chunk.join(','),
          limit: '-1',
          sort: 'entry_source_key,sort_order',
          fields: PROPERTY_FIELDS,
        }),
      ),
    ),
  ]);

  const baseTags = tagPayloads.flatMap((payload) => payload.data || []);
  const baseProperties = propertyPayloads.flatMap((payload) => payload.data || []);

  const [tagTranslations, propertyTranslations] = await Promise.all([
    fetchOptionalTranslations<Pick<EntryTag, 'label'>>(
      'entry_tags_translations',
      locale,
      baseTags.map((item) => item.source_key),
      'label',
    ),
    fetchOptionalTranslations<Pick<EntryProperty, 'label' | 'value'>>(
      'entry_properties_translations',
      locale,
      baseProperties.map((item) => item.source_key),
      'label,value',
    ),
  ]);

  const displayTags = mergeTranslatedItems(baseTags, tagTranslations).map((item, index) =>
    localizeTagTerminology(attachTagCanonicalFields(item, baseTags[index]), locale, terminologyMap),
  );
  const displayProperties = mergeTranslatedItems(baseProperties, propertyTranslations).map((item, index) =>
    localizePropertyTerminology(
      attachPropertyCanonicalFields(item, baseProperties[index]),
      locale,
      terminologyMap,
    ),
  );

  const tagsByEntry = new Map<string, string[]>();
  const baseTagsByEntry = new Map<string, string[]>();
  const propertiesByEntry = new Map<string, EntryProperty[]>();

  for (const [index, tag] of displayTags.entries()) {
    const baseTag = baseTags[index];
    const tags = tagsByEntry.get(tag.entry_source_key) || [];
    tags.push(tag.label);
    tagsByEntry.set(tag.entry_source_key, tags);

    const baseLabels = baseTagsByEntry.get(tag.entry_source_key) || [];
    baseLabels.push(baseTag.label);
    baseTagsByEntry.set(tag.entry_source_key, baseLabels);
  }

  for (const property of displayProperties) {
    const properties = propertiesByEntry.get(property.entry_source_key) || [];
    properties.push(property);
    propertiesByEntry.set(property.entry_source_key, properties);
  }

  return { tagsByEntry, baseTagsByEntry, propertiesByEntry };
}

export async function getSiteSettings() {
  const payload = await directusFetch<SingletonResponse<Record<string, string>>>('/items/site_settings');
  return payload.data || {
    site_name: 'Undecember',
    default_locale: 'en',
    logo_text: 'Undecember',
    copyright_text: '',
    reference_url: '',
  };
}

export async function getNavigation(locale: string) {
  const resolvedLocale = resolveLocale(locale);
  const legacy = await getLegacyLocalizedCollection<NavLink>('navigation_links', resolvedLocale, NAV_FIELDS, {
    sort: 'sort_order',
  });

  if (legacy.length > 0) {
    return sortByOrder(legacy);
  }

  const translated = await getTranslatedCollection<NavLink>(
    'navigation_links',
    'navigation_links_translations',
    resolvedLocale,
    NAV_FIELDS,
    'label',
    {
      sort: 'sort_order',
    },
  );

  return sortByOrder(translated);
}

export async function getDownloadLinks(locale: string) {
  const resolvedLocale = resolveLocale(locale);
  const legacy = await getLegacyLocalizedCollection<DownloadLink>('download_links', resolvedLocale, DOWNLOAD_FIELDS, {
    sort: 'sort_order',
  });

  if (legacy.length > 0) {
    return sortByOrder(legacy).map(imageify);
  }

  const translated = await getTranslatedCollection<DownloadLink>(
    'download_links',
    'download_links_translations',
    resolvedLocale,
    DOWNLOAD_FIELDS,
    'label',
    {
      sort: 'sort_order',
    },
  );

  return sortByOrder(translated).map(imageify);
}

export async function getHomeSlides(locale: string) {
  const resolvedLocale = resolveLocale(locale);
  const legacy = await getLegacyLocalizedCollection<HomeSlide>('home_slides', resolvedLocale, HOME_SLIDE_FIELDS, {
    sort: 'sort_order',
  });

  if (legacy.length > 0) {
    return sortByOrder(legacy).map(imageify);
  }

  const translated = await getTranslatedCollection<HomeSlide>(
    'home_slides',
    'home_slides_translations',
    resolvedLocale,
    HOME_SLIDE_FIELDS,
    'title,subtitle',
    {
      sort: 'sort_order',
    },
  );

  return sortByOrder(translated).map(imageify);
}

export async function getHomeCards(locale: string) {
  const resolvedLocale = resolveLocale(locale);
  const legacy = await getLegacyLocalizedCollection<HomeCard>(
    'home_featured_cards',
    resolvedLocale,
    HOME_CARD_FIELDS,
    {
      sort: 'sort_order',
    },
  );

  if (legacy.length > 0) {
    return sortByOrder(legacy).map(imageify);
  }

  const translated = await getTranslatedCollection<HomeCard>(
    'home_featured_cards',
    'home_featured_cards_translations',
    resolvedLocale,
    HOME_CARD_FIELDS,
    'title,subtitle',
    {
      sort: 'sort_order',
    },
  );

  return sortByOrder(translated).map(imageify);
}

export async function getSections(locale: string) {
  const resolvedLocale = resolveLocale(locale);
  const legacy = await getLegacyLocalizedCollection<ContentSection>(
    'content_sections',
    resolvedLocale,
    SECTION_FIELDS,
    {
      'filter[status][_eq]': 'published',
      sort: 'sort_order',
    },
  );

  if (legacy.length > 0) {
    return sortByOrder(legacy).map(imageify);
  }

  const translated = await getTranslatedCollection<ContentSection>(
    'content_sections',
    'content_sections_translations',
    resolvedLocale,
    SECTION_FIELDS,
    'title,description',
    {
      'filter[status][_eq]': 'published',
      sort: 'sort_order',
    },
  );

  return sortByOrder(translated).map(imageify);
}

export async function getSection(locale: string, slug: string) {
  const resolvedLocale = resolveLocale(locale);
  const legacy = await getLegacyLocalizedCollection<ContentSection>(
    'content_sections',
    resolvedLocale,
    SECTION_FIELDS,
    {
      'filter[slug][_eq]': slug,
      limit: '1',
    },
  );

  if (legacy[0]) {
    return imageify(legacy[0]);
  }

  const translated = await getTranslatedCollection<ContentSection>(
    'content_sections',
    'content_sections_translations',
    resolvedLocale,
    SECTION_FIELDS,
    'title,description',
    {
      'filter[slug][_eq]': slug,
      limit: '1',
    },
  );

  return translated[0] ? imageify(translated[0]) : null;
}

export async function getEntries(locale: string, sectionSlug: string, terminologyMap?: TerminologyMap) {
  const resolvedLocale = resolveLocale(locale);
  const terms = terminologyMap || (await getTerminologyMap(resolvedLocale));
  const legacy = await getLegacyLocalizedCollection<ContentEntry>(
    'content_entries',
    resolvedLocale,
    ENTRY_LIST_FIELDS,
    {
      'filter[section_slug][_eq]': sectionSlug,
      'filter[status][_eq]': 'published',
      sort: 'sort_order,title',
    },
  );

  if (legacy.length > 0) {
    const entries = sortByOrder(legacy).map(imageify).map((entry) =>
      localizeEntryTerminology(attachEntryCanonicalFields(entry, entry), resolvedLocale, terms),
    );
    const { tagsByEntry, baseTagsByEntry, propertiesByEntry } = await getLegacyListMetadata(
      entries,
      resolvedLocale,
      terms,
    );

    return entries.map((entry) => ({
      ...entry,
      tags: tagsByEntry.get(entry.source_key) || [],
      base_tags: baseTagsByEntry.get(entry.source_key) || [],
      properties: propertiesByEntry.get(entry.source_key) || [],
    }));
  }

  const baseEntries = await fetchItemList<ContentEntry>('content_entries', {
    'filter[locale][_eq]': CONTENT_BASE_LOCALE,
    'filter[section_slug][_eq]': sectionSlug,
    'filter[status][_eq]': 'published',
    limit: '-1',
    sort: 'sort_order,title',
    fields: ENTRY_LIST_FIELDS,
  });

  const entryTranslations = await fetchOptionalTranslations<
    Pick<
      ContentEntry,
      'title' | 'subtitle' | 'description' | 'seo_title' | 'seo_description' | 'rarity' | 'acquisition_method' | 'weapon_requirement'
    >
      >(
        'content_entries_translations',
        resolvedLocale,
        baseEntries.map((entry) => entry.source_key),
        'title,subtitle,description,list_stat,list_props,seo_title,seo_description,rarity,acquisition_method,weapon_requirement',
      );

  const entries = sortByOrder(
    mergeTranslatedItems(baseEntries, entryTranslations)
      .map((entry, index) =>
        localizeEntryTerminology(
          attachEntryCanonicalFields(imageify(entry), baseEntries[index]),
          resolvedLocale,
          terms,
        ),
      ),
  );

  const { tagsByEntry, baseTagsByEntry, propertiesByEntry } = await getTranslatedListMetadata(
    baseEntries,
    resolvedLocale,
    terms,
  );

  return entries.map((entry) => ({
    ...entry,
    tags: tagsByEntry.get(entry.source_key) || [],
    base_tags: baseTagsByEntry.get(entry.source_key) || [],
    properties: propertiesByEntry.get(entry.source_key) || [],
  }));
}

async function getLegacyEntry(
  locale: string,
  sectionSlug: string,
  slug: string,
  terminologyMap?: TerminologyMap,
) {
  const legacyItems = await getLegacyLocalizedCollection<ContentEntry>(
    'content_entries',
    locale,
    ENTRY_DETAIL_FIELDS,
    {
      'filter[section_slug][_eq]': sectionSlug,
      'filter[slug][_eq]': slug,
      limit: '1',
    },
  );

  const entry = legacyItems[0];
  if (!entry) {
    return null;
  }

  let displayEntry = entry;

  if (!entry.image_url || !entry.video_url) {
    const fallbackPayload = await optionalDirectusFetch<ItemResponse<ContentEntry>>('/items/content_entries', {
      'filter[locale][_eq]': CONTENT_BASE_LOCALE,
      'filter[section_slug][_eq]': sectionSlug,
      'filter[slug][_eq]': slug,
      limit: '1',
      fields: ENTRY_DETAIL_FIELDS,
    });
    const fallbackEntry = fallbackPayload?.data?.[0];

    if (fallbackEntry) {
      displayEntry = {
        ...entry,
        image_url: entry.image_url || fallbackEntry.image_url,
        video_url: entry.video_url || fallbackEntry.video_url,
      };
    }
  }

  const [tags, properties, blocks, awakenings] = await Promise.all([
    fetchItemList<EntryTag>('entry_tags', {
      'filter[entry_source_key][_eq]': entry.source_key,
      sort: 'sort_order',
      fields: TAG_FIELDS,
      limit: '-1',
    }),
    fetchItemList<EntryProperty>('entry_properties', {
      'filter[entry_source_key][_eq]': entry.source_key,
      sort: 'sort_order',
      fields: PROPERTY_FIELDS,
      limit: '-1',
    }),
    fetchItemList<Omit<EntryStatBlock, 'lines'>>('entry_stat_blocks', {
      'filter[entry_source_key][_eq]': entry.source_key,
      sort: 'sort_order',
      fields: BLOCK_FIELDS,
      limit: '-1',
    }),
    fetchItemList<Omit<EntryAwakeningGroup, 'lines'>>('entry_awakening_groups', {
      'filter[entry_source_key][_eq]': entry.source_key,
      sort: 'sort_order',
      fields: AWAKENING_GROUP_FIELDS,
      limit: '-1',
    }),
  ]);

  const blockKeys = blocks.map((block) => block.source_key);
  const awakeningKeys = awakenings.map((awakening) => awakening.source_key);

  const [lines, awakeningLines] = await Promise.all([
    blockKeys.length > 0
      ? fetchItemList<EntryStatLine>('entry_stat_lines', {
          'filter[block_source_key][_in]': blockKeys.join(','),
          sort: 'sort_order',
          fields: LINE_FIELDS,
          limit: '-1',
        })
      : Promise.resolve([]),
    awakeningKeys.length > 0
      ? fetchItemList<EntryAwakeningLine>('entry_awakening_lines', {
          'filter[awakening_source_key][_in]': awakeningKeys.join(','),
          sort: 'sort_order',
          fields: AWAKENING_LINE_FIELDS,
          limit: '-1',
        })
      : Promise.resolve([]),
  ]);

  return {
    entry: localizeEntryTerminology(
      attachEntryCanonicalFields(imageify(displayEntry), displayEntry),
      locale,
      terminologyMap,
    ),
    tags: sortByOrder(tags).map((item) =>
      localizeTagTerminology(attachTagCanonicalFields(item, item), locale, terminologyMap),
    ),
    properties: sortByOrder(properties).map((item) =>
      localizePropertyTerminology(attachPropertyCanonicalFields(item, item), locale, terminologyMap),
    ),
    blocks: sortByOrder(blocks).map((block) => ({
      ...localizeBlockTerminology(block as EntryStatBlock, locale, terminologyMap),
      lines: (() => {
        const blockLines = sortByOrder(
          lines
            .filter((line) => line.block_source_key === block.source_key)
            .map((line) => attachLineCanonicalFields(line, line)),
        );
        const referenceBlockKey = block.source_key.replace(/:block:2$/, ':block:1');
        const referenceLines = referenceBlockKey !== block.source_key
          ? sortByOrder(
              lines
                .filter((line) => line.block_source_key === referenceBlockKey)
                .map((line) => attachLineCanonicalFields(line, line)),
            )
          : [];

        return blockLines.map((line, index) =>
          localizeLineWithReferenceTemplate(line, referenceLines[index], locale, terminologyMap),
        );
      })(),
    })),
    awakenings: sortByOrder(awakenings).map((awakening) => ({
      ...localizeAwakeningTerminology(awakening as EntryAwakeningGroup, locale, terminologyMap),
      lines: sortByOrder(
        awakeningLines
          .filter((line) => line.awakening_source_key === awakening.source_key)
          .map((line) => localizeLineTerminology(attachLineCanonicalFields(line, line), locale, terminologyMap)),
      ),
    })),
  };
}

export async function getEntry(
  locale: string,
  sectionSlug: string,
  slug: string,
  terminologyMap?: TerminologyMap,
) {
  const resolvedLocale = resolveLocale(locale);
  const terms = terminologyMap || (await getTerminologyMap(resolvedLocale));

  const legacyEntry = await getLegacyEntry(resolvedLocale, sectionSlug, slug, terms);
  if (legacyEntry) {
    return legacyEntry;
  }

  const basePayload = await directusFetch<ItemResponse<ContentEntry>>('/items/content_entries', {
    'filter[locale][_eq]': CONTENT_BASE_LOCALE,
    'filter[section_slug][_eq]': sectionSlug,
    'filter[slug][_eq]': slug,
    limit: '1',
    fields: ENTRY_DETAIL_FIELDS,
  });

  const baseEntry = basePayload.data?.[0];
  if (!baseEntry) {
    return null;
  }

  const [entryTranslations, tagsPayload, propertiesPayload, blocksPayload, awakeningPayload] =
    await Promise.all([
      fetchOptionalTranslations<
        Pick<
          ContentEntry,
          'title' | 'subtitle' | 'description' | 'seo_title' | 'seo_description' | 'rarity' | 'acquisition_method' | 'weapon_requirement'
        >
      >(
        'content_entries_translations',
        resolvedLocale,
        [baseEntry.source_key],
        'title,subtitle,description,list_stat,list_props,seo_title,seo_description,rarity,acquisition_method,weapon_requirement',
      ),
      fetchItemList<EntryTag>('entry_tags', {
        'filter[entry_source_key][_eq]': baseEntry.source_key,
        sort: 'sort_order',
        fields: TAG_FIELDS,
        limit: '-1',
      }),
      fetchItemList<EntryProperty>('entry_properties', {
        'filter[entry_source_key][_eq]': baseEntry.source_key,
        sort: 'sort_order',
        fields: PROPERTY_FIELDS,
        limit: '-1',
      }),
      fetchItemList<Omit<EntryStatBlock, 'lines'>>('entry_stat_blocks', {
        'filter[entry_source_key][_eq]': baseEntry.source_key,
        sort: 'sort_order',
        fields: BLOCK_FIELDS,
        limit: '-1',
      }),
      fetchItemList<Omit<EntryAwakeningGroup, 'lines'>>('entry_awakening_groups', {
        'filter[entry_source_key][_eq]': baseEntry.source_key,
        sort: 'sort_order',
        fields: AWAKENING_GROUP_FIELDS,
        limit: '-1',
      }),
    ]);

  const entry = attachEntryCanonicalFields(
    imageify(mergeTranslatedItem(baseEntry, entryTranslations[0])),
    baseEntry,
  );

  const [tagTranslations, propertyTranslations, blockTranslations] =
    await Promise.all([
      fetchOptionalTranslations<Pick<EntryTag, 'label'>>(
        'entry_tags_translations',
        resolvedLocale,
        tagsPayload.map((item) => item.source_key),
        'label',
      ),
      fetchOptionalTranslations<Pick<EntryProperty, 'label' | 'value'>>(
        'entry_properties_translations',
        resolvedLocale,
        propertiesPayload.map((item) => item.source_key),
        'label,value',
      ),
      fetchOptionalTranslations<Pick<EntryStatBlock, 'title'>>(
        'entry_stat_blocks_translations',
        resolvedLocale,
        blocksPayload.map((item) => item.source_key),
        'title',
      ),
    ]);

  const tags = sortByOrder(
    mergeTranslatedItems(tagsPayload, tagTranslations).map((item, index) =>
      localizeTagTerminology(attachTagCanonicalFields(item, tagsPayload[index]), resolvedLocale, terms),
    ),
  );

  const properties = sortByOrder(
    mergeTranslatedItems(propertiesPayload, propertyTranslations).map((item, index) =>
      localizePropertyTerminology(
        attachPropertyCanonicalFields(item, propertiesPayload[index]),
        resolvedLocale,
        terms,
      ),
    ),
  );

  const blocks = sortByOrder(
    mergeTranslatedItems(blocksPayload, blockTranslations).map((block) =>
      localizeBlockTerminology(block as EntryStatBlock, resolvedLocale, terms),
    ),
  );
  const awakenings = sortByOrder(
    awakeningPayload.map((awakening) =>
      localizeAwakeningTerminology(awakening as EntryAwakeningGroup, resolvedLocale, terms),
    ),
  );

  const blockKeys = blocksPayload.map((block) => block.source_key);
  const awakeningKeys = awakeningPayload.map((awakening) => awakening.source_key);

  const [baseLines, baseAwakeningLines] = await Promise.all([
    blockKeys.length > 0
      ? fetchItemList<EntryStatLine>('entry_stat_lines', {
          'filter[block_source_key][_in]': blockKeys.join(','),
          sort: 'sort_order',
          fields: LINE_FIELDS,
          limit: '-1',
        })
      : Promise.resolve([]),
    awakeningKeys.length > 0
      ? fetchItemList<EntryAwakeningLine>('entry_awakening_lines', {
          'filter[awakening_source_key][_in]': awakeningKeys.join(','),
          sort: 'sort_order',
          fields: AWAKENING_LINE_FIELDS,
          limit: '-1',
        })
      : Promise.resolve([]),
  ]);

  const [lineTranslations, awakeningLineTranslations] = await Promise.all([
    fetchOptionalTranslations<Pick<EntryStatLine, 'content'>>(
      'entry_stat_lines_translations',
      resolvedLocale,
      baseLines.map((item) => item.source_key),
      'content',
    ),
    fetchOptionalTranslations<Pick<EntryAwakeningLine, 'content'>>(
      'entry_awakening_lines_translations',
      resolvedLocale,
      baseAwakeningLines.map((item) => item.source_key),
      'content',
    ),
  ]);

  const lines = mergeTranslatedItems(baseLines, lineTranslations).map((item, index) =>
    attachLineCanonicalFields(item, baseLines[index]),
  );
  const awakeningLines = mergeTranslatedItems(baseAwakeningLines, awakeningLineTranslations).map((item, index) =>
    attachLineCanonicalFields(item, baseAwakeningLines[index]),
  );

  return {
    entry: localizeEntryTerminology(entry, resolvedLocale, terms),
    tags,
    properties,
    blocks: blocks.map((block) => ({
      ...block,
      lines: (() => {
        const blockLines = sortByOrder(lines.filter((line) => line.block_source_key === block.source_key));
        const referenceBlockKey = block.source_key.replace(/:block:2$/, ':block:1');
        const referenceLines = referenceBlockKey !== block.source_key
          ? sortByOrder(lines.filter((line) => line.block_source_key === referenceBlockKey))
          : [];

        return blockLines.map((line, index) =>
          localizeLineWithReferenceTemplate(line, referenceLines[index], resolvedLocale, terms),
        );
      })(),
    })),
    awakenings: awakenings.map((awakening) => ({
      ...awakening,
      lines: sortByOrder(
        awakeningLines
          .filter((line) => line.awakening_source_key === awakening.source_key)
          .map((line) => localizeLineTerminology(line, resolvedLocale, terms)),
      ),
    })),
  };
}

export async function getHomePageData(locale: string) {
  const resolvedLocale = resolveLocale(locale);
  const [settings, navigation, downloads, slides, cards, sections] = await Promise.all([
    getSiteSettings(),
    getNavigation(resolvedLocale),
    getDownloadLinks(resolvedLocale),
    getHomeSlides(resolvedLocale),
    getHomeCards(resolvedLocale),
    getSections(resolvedLocale),
  ]);

  return {
    settings,
    navigation,
    downloads,
    slides,
    cards,
    sections,
  };
}
