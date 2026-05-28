export const REMOTE_SECTION_NAMES = [
  'runes',
  'authority',
  'uniques',
  'runemaster',
  'tags',
  'essences',
  'coins',
  'potions',
  'materials',
  'runecast',
  'equipments',
];

export const SECTION_LABELS = {
  runes: 'Runes Library',
  authority: 'Authority of the gods',
  uniques: 'Unique equipment',
  runemaster: 'The Path of the Rune master',
  tags: 'Tags',
  essences: 'Essences',
  coins: 'Coins',
  potions: 'Potions',
  materials: 'Materials',
  runecast: 'Runestones',
  equipments: 'Equipment option',
};

export function isRemoteSectionSupported(section) {
  return REMOTE_SECTION_NAMES.includes(section);
}

export function normalizeContentPath(pathname = '/en/') {
  let normalized = pathname || '/en/';

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized;
}

export function parseContentPath(pathname = '/en/') {
  const normalizedPath = normalizeContentPath(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);

  return {
    normalizedPath,
    locale: segments[0] || 'en',
    section: segments[1] || '',
    slug: segments[2] || '',
  };
}

export function buildSectionPath(section, locale = 'en') {
  return normalizeContentPath(`/${locale}/${section}/`);
}

export function buildEntryPath(section, slug, locale = 'en') {
  return normalizeContentPath(`/${locale}/${section}/${slug}/`);
}

export function slugFromHref(href = '') {
  const { slug } = parseContentPath(href);
  return slug;
}

export function titleFromSection(section) {
  return SECTION_LABELS[section]
    || section
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
}

