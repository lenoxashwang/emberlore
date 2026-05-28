import { directusAsset, directusFetch } from '@/lib/directus';

export type NavLink = {
  source_key: string;
  label: string;
  href: string;
  group_name?: string;
  open_in_new_tab?: boolean;
  sort_order?: number;
};

export type DownloadLink = {
  source_key: string;
  platform: string;
  label: string;
  href: string;
  icon_url?: string;
  sort_order?: number;
};

export type HomeSlide = {
  source_key: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  background_css?: string;
  href: string;
  sort_order?: number;
};

export type HomeCard = {
  source_key: string;
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
  properties?: EntryProperty[];
};

export type EntryProperty = {
  source_key: string;
  entry_source_key: string;
  label: string;
  value: string;
  sort_order?: number;
};

export type EntryTag = {
  source_key: string;
  entry_source_key: string;
  label: string;
  sort_order?: number;
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
};

type ItemResponse<T> = { data: T[] };
type SingletonResponse<T> = { data: T };

function sortByOrder<T extends { sort_order?: number }>(items: T[]) {
  return [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function imageify<T extends { image_url?: string; icon_url?: string; hero_image_url?: string }>(item: T) {
  return {
    ...item,
    image_url: item.image_url ? directusAsset(item.image_url) : item.image_url,
    icon_url: item.icon_url ? directusAsset(item.icon_url) : item.icon_url,
    hero_image_url: item.hero_image_url ? directusAsset(item.hero_image_url) : item.hero_image_url,
  };
}

function sourceKeyChunks(sourceKeys: string[], chunkSize = 80) {
  const chunks: string[][] = [];

  for (let index = 0; index < sourceKeys.length; index += chunkSize) {
    chunks.push(sourceKeys.slice(index, index + chunkSize));
  }

  return chunks;
}

async function getListMetadata(entries: ContentEntry[]) {
  const sourceKeys = entries.map((entry) => entry.source_key);

  if (sourceKeys.length === 0) {
    return {
      tagsByEntry: new Map<string, string[]>(),
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
          fields: 'source_key,entry_source_key,label,sort_order',
        }),
      ),
    ),
    Promise.all(
      sourceKeyChunks(sourceKeys).map((chunk) =>
        directusFetch<ItemResponse<EntryProperty>>('/items/entry_properties', {
          'filter[entry_source_key][_in]': chunk.join(','),
          limit: '-1',
          sort: 'entry_source_key,sort_order',
          fields: 'source_key,entry_source_key,label,value,sort_order',
        }),
      ),
    ),
  ]);

  const tagsByEntry = new Map<string, string[]>();
  const propertiesByEntry = new Map<string, EntryProperty[]>();

  for (const tag of tagPayloads.flatMap((payload) => payload.data || [])) {
    const tags = tagsByEntry.get(tag.entry_source_key) || [];
    tags.push(tag.label);
    tagsByEntry.set(tag.entry_source_key, tags);
  }

  for (const property of propertyPayloads.flatMap((payload) => payload.data || [])) {
    const properties = propertiesByEntry.get(property.entry_source_key) || [];
    properties.push(property);
    propertiesByEntry.set(property.entry_source_key, properties);
  }

  return { tagsByEntry, propertiesByEntry };
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
  const payload = await directusFetch<ItemResponse<NavLink>>('/items/navigation_links', {
    'filter[locale][_eq]': locale,
    limit: '-1',
    sort: 'sort_order',
    fields: 'source_key,label,href,group_name,open_in_new_tab,sort_order',
  });
  return sortByOrder(payload.data || []);
}

export async function getDownloadLinks(locale: string) {
  const payload = await directusFetch<ItemResponse<DownloadLink>>('/items/download_links', {
    'filter[locale][_eq]': locale,
    limit: '-1',
    sort: 'sort_order',
    fields: 'source_key,platform,label,href,icon_url,sort_order',
  });
  return sortByOrder(payload.data || []).map(imageify);
}

export async function getHomeSlides(locale: string) {
  const payload = await directusFetch<ItemResponse<HomeSlide>>('/items/home_slides', {
    'filter[locale][_eq]': locale,
    limit: '-1',
    sort: 'sort_order',
    fields: 'source_key,title,subtitle,image_url,background_css,href,sort_order',
  });
  return sortByOrder(payload.data || []).map(imageify);
}

export async function getHomeCards(locale: string) {
  const payload = await directusFetch<ItemResponse<HomeCard>>('/items/home_featured_cards', {
    'filter[locale][_eq]': locale,
    limit: '-1',
    sort: 'sort_order',
    fields: 'source_key,card_size,title,subtitle,image_url,background_css,href,sort_order',
  });
  return sortByOrder(payload.data || []).map(imageify);
}

export async function getSections(locale: string) {
  const payload = await directusFetch<ItemResponse<ContentSection>>('/items/content_sections', {
    'filter[locale][_eq]': locale,
    'filter[status][_eq]': 'published',
    limit: '-1',
    sort: 'sort_order',
    fields: 'source_key,locale,slug,title,description,hero_image_url,icon_image_url,theme_token,sort_order,status',
  });
  return sortByOrder(payload.data || []).map(imageify);
}

export async function getSection(locale: string, slug: string) {
  const payload = await directusFetch<ItemResponse<ContentSection>>('/items/content_sections', {
    'filter[locale][_eq]': locale,
    'filter[slug][_eq]': slug,
    limit: '1',
    fields: 'source_key,locale,slug,title,description,hero_image_url,icon_image_url,theme_token,sort_order,status',
  });
  return payload.data?.[0] ? imageify(payload.data[0]) : null;
}

export async function getEntries(locale: string, sectionSlug: string) {
  const payload = await directusFetch<ItemResponse<ContentEntry>>('/items/content_entries', {
    'filter[locale][_eq]': locale,
    'filter[section_slug][_eq]': sectionSlug,
    'filter[status][_eq]': 'published',
    limit: '-1',
    sort: 'sort_order,title',
    fields: 'source_key,locale,section_slug,entry_type,list_stat,list_props,slug,title,subtitle,description,image_url,rarity,acquisition_method,weapon_requirement,sort_order,seo_title,seo_description',
  });
  const entries = sortByOrder(payload.data || []).map(imageify);
  const { tagsByEntry, propertiesByEntry } = await getListMetadata(entries);

  return entries.map((entry) => ({
    ...entry,
    tags: tagsByEntry.get(entry.source_key) || [],
    properties: propertiesByEntry.get(entry.source_key) || [],
  }));
}

export async function getEntry(locale: string, sectionSlug: string, slug: string) {
  const payload = await directusFetch<ItemResponse<ContentEntry>>('/items/content_entries', {
    'filter[locale][_eq]': locale,
    'filter[section_slug][_eq]': sectionSlug,
    'filter[slug][_eq]': slug,
    limit: '1',
    fields: 'source_key,locale,section_slug,entry_type,slug,title,subtitle,description,image_url,video_url,rarity,acquisition_method,weapon_requirement,sort_order,seo_title,seo_description',
  });

  const entry = payload.data?.[0];
  if (!entry) {
    return null;
  }

  const [tagsPayload, propertiesPayload, blocksPayload, awakeningPayload] =
    await Promise.all([
      directusFetch<ItemResponse<EntryTag>>('/items/entry_tags', {
        'filter[entry_source_key][_eq]': entry.source_key,
        sort: 'sort_order',
        fields: 'source_key,entry_source_key,label,sort_order',
      }),
      directusFetch<ItemResponse<EntryProperty>>('/items/entry_properties', {
        'filter[entry_source_key][_eq]': entry.source_key,
        sort: 'sort_order',
        fields: 'source_key,entry_source_key,label,value,sort_order',
      }),
      directusFetch<ItemResponse<Omit<EntryStatBlock, 'lines'>>>('/items/entry_stat_blocks', {
        'filter[entry_source_key][_eq]': entry.source_key,
        sort: 'sort_order',
        fields: 'source_key,entry_source_key,title,variant,sort_order',
      }),
      directusFetch<ItemResponse<Omit<EntryAwakeningGroup, 'lines'>>>('/items/entry_awakening_groups', {
        'filter[entry_source_key][_eq]': entry.source_key,
        sort: 'sort_order',
        fields: 'source_key,entry_source_key,code,title,sort_order',
      }),
    ]);

  const blockKeys = (blocksPayload.data || []).map((block) => block.source_key);
  const awakeningKeys = (awakeningPayload.data || []).map((awakening) => awakening.source_key);

  const [linesPayload, awakeningLinesPayload] = await Promise.all([
    blockKeys.length > 0
      ? directusFetch<ItemResponse<EntryStatLine>>('/items/entry_stat_lines', {
          'filter[block_source_key][_in]': blockKeys.join(','),
          sort: 'sort_order',
          fields: 'source_key,block_source_key,content,sort_order',
        })
      : Promise.resolve({ data: [] }),
    awakeningKeys.length > 0
      ? directusFetch<ItemResponse<EntryAwakeningLine>>('/items/entry_awakening_lines', {
          'filter[awakening_source_key][_in]': awakeningKeys.join(','),
          sort: 'sort_order',
          fields: 'source_key,awakening_source_key,content,sort_order',
        })
      : Promise.resolve({ data: [] }),
  ]);

  const blocks = sortByOrder(blocksPayload.data || []).map((block) => ({
    ...block,
    lines: sortByOrder(
      (linesPayload.data || []).filter((line) => line.block_source_key === block.source_key),
    ),
  }));

  const awakenings = sortByOrder(awakeningPayload.data || []).map((awakening) => ({
    ...awakening,
    lines: sortByOrder(
      (awakeningLinesPayload.data || []).filter(
        (line) => line.awakening_source_key === awakening.source_key,
      ),
    ),
  }));

  return {
    entry: imageify(entry),
    tags: sortByOrder(tagsPayload.data || []),
    properties: sortByOrder(propertiesPayload.data || []),
    blocks,
    awakenings,
  };
}

export async function getHomePageData(locale: string) {
  const [settings, navigation, downloads, slides, cards, sections] = await Promise.all([
    getSiteSettings(),
    getNavigation(locale),
    getDownloadLinks(locale),
    getHomeSlides(locale),
    getHomeCards(locale),
    getSections(locale),
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
