'use client';

import Link from 'next/link';
import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ContentEntry, EntryProperty } from '@/lib/cms';
import { formatMessage, getLocaleMessages, resolveLocale } from '@/lib/i18n';
import { localizeTerminology, type TerminologyMap } from '@/lib/terminology';

type FilterKey = 'sort' | 'stat' | 'get' | 'type' | 'shop' | 'rarity' | 'weapon' | 'tags' | 'req' | 'mode';

type FilterOption = {
  value: string;
  label: string;
  aliases?: string[];
};

type FilterGroup = {
  key: FilterKey;
  title?: string;
  options: FilterOption[];
  area: 'main' | 'more';
  modeToggle?: boolean;
};

const UNIQUE_GENERIC_TAG_KEYS = new Set(['level', 'stat', '等级', '属性'].map(normalize));
const COMPOUND_CARD_PROP_TERMS = [
  'Act 1',
  'Act 2',
  'Act 3',
  'Act 4',
  'Act 5',
  'Act 6-10',
  'Act 11-12',
  'Auction house',
  'Black Market',
  'Buy for cash',
  'Buy for diamond',
  'Chaos Dungeon',
  'Content reward',
  'Descent Raid',
  'Event reward',
  'Hardcore Mode',
  'Item sale',
  'Paid Shop',
  'Randome Bounty',
  'Ranking reward',
  'Season Content',
  'Unique Dungeon',
].map((term) => ({
  value: term,
  parts: term.split(/\s+/),
}));

type SectionSearchProps = {
  locale: string;
  section: string;
  sectionTitle: string;
  entries: ContentEntry[];
  terminologyMap?: TerminologyMap;
};

const rarityOptions: FilterOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Magic', label: 'Magic' },
  { value: 'Rare', label: 'Rare' },
  { value: 'Unique', label: 'Unique' },
  { value: 'Legendary', label: 'Legendary' },
  { value: 'Holy', label: 'Holy' },
  { value: 'Ancient', label: 'Ancient' },
];

const runeGroups: FilterGroup[] = [
  {
    key: 'sort',
    title: 'Sort.',
    area: 'main',
    options: [{ value: 'Sort...', label: 'Sort' }],
  },
  {
    key: 'stat',
    title: 'Rune stat',
    area: 'main',
    options: [
      { value: 'Strength', label: 'Strength' },
      { value: 'Agility', label: 'Dexterity', aliases: ['Dexterity'] },
      { value: 'Intellect', label: 'Intelligence', aliases: ['Intelligence'] },
    ],
  },
  {
    key: 'get',
    title: 'How to get',
    area: 'main',
    options: [
      { value: 'Drop', label: 'Drop' },
      { value: 'Shop', label: 'Shop' },
      { value: 'Synthesis', label: 'Synthesis' },
      { value: 'Guild', label: 'Guild' },
      { value: 'UniqueDungeon', label: 'Unique Dungeon', aliases: ['Unique Dungeon'] },
    ],
  },
  {
    key: 'type',
    title: 'Rune type',
    area: 'main',
    options: [
      { value: 'Skill', label: 'Skill' },
      { value: 'LinkSkill', label: 'Link', aliases: ['Link Skill', 'Link'] },
    ],
  },
  {
    key: 'shop',
    title: 'To buy in',
    area: 'more',
    options: [
      { value: 'Act1', label: 'Act 1', aliases: ['Act 1'] },
      { value: 'Act2', label: 'Act 2', aliases: ['Act 2'] },
      { value: 'Act3', label: 'Act 3', aliases: ['Act 3'] },
      { value: 'Act4', label: 'Act 4', aliases: ['Act 4'] },
      { value: 'Act5', label: 'Act 5', aliases: ['Act 5'] },
      { value: 'Act6-10', label: 'Act 6-10', aliases: ['Act 6-10'] },
      { value: 'Act11-12', label: 'Act 11-12', aliases: ['Act 11-12', 'Act11'] },
    ],
  },
  {
    key: 'rarity',
    title: 'Min. rarity',
    area: 'more',
    options: rarityOptions.slice(0, 3),
  },
  {
    key: 'weapon',
    title: 'Weapon',
    area: 'more',
    options: [
      { value: 'Dagger', label: 'Dagger' },
      { value: 'Sword', label: 'Sword' },
      { value: 'Axe', label: 'Axe' },
      { value: 'Blunt', label: 'Blunt' },
      { value: 'Staff', label: 'Staff' },
      { value: 'Shield', label: 'Shield' },
      { value: 'Bow', label: 'Bow' },
      { value: 'Wand', label: 'Wand' },
      { value: 'Scepter', label: 'Scepter' },
      { value: '1hSword', label: '1-handed sword', aliases: ['1-handed sword'] },
      { value: '1hAxe', label: '1-handed Axe', aliases: ['1-handed Axe'] },
      { value: '1hBlunt', label: '1-handed Blunt', aliases: ['1-handed Blunt'] },
    ],
  },
];

const uniqueEquipmentOptions: FilterOption[] = [
  { value: 'Dagger', label: 'Dagger' },
  { value: 'Sword', label: 'Sword' },
  { value: 'Axe', label: 'Axe' },
  { value: 'Blunt', label: 'Blunt' },
  { value: 'Scepter', label: 'Scepter' },
  { value: 'Wand', label: 'Wand' },
  { value: 'Staff', label: 'Staff' },
  { value: '2hSword', label: '2-handed sword', aliases: ['2-handed sword'] },
  { value: '2hAxe', label: '2-handed Axe', aliases: ['2-handed Axe'] },
  { value: '2hBlunt', label: '2-handed Blunt', aliases: ['2-handed Blunt'] },
  { value: 'Bow', label: 'Bow' },
  { value: 'SteelBow', label: 'Steel Bow', aliases: ['Steel Bow'] },
  { value: 'Quiver', label: 'Quiver' },
  { value: 'Bowgun', label: 'Bowgun' },
  { value: 'Magazine', label: 'Magazine' },
  { value: 'Shield', label: 'Shield' },
  { value: 'Helmet', label: 'Helmet' },
  { value: 'Spaulders', label: 'Spaulders' },
  { value: 'Armor', label: 'Armor' },
  { value: 'Gloves', label: 'Gloves' },
  { value: 'Shoes', label: 'Shoes' },
  { value: 'Belt', label: 'Belt' },
  { value: 'Ring', label: 'Ring' },
  { value: 'Necklace', label: 'Necklace' },
];

const statRequirementOptions: FilterOption[] = [
  { value: 'Strength', label: 'Strength' },
  { value: 'Dexterity', label: 'Dexterity', aliases: ['Agility'] },
  { value: 'Intellect', label: 'Intelligence', aliases: ['Intellect'] },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function uniqueOptions(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalize(value);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function propertyValue(properties: EntryProperty[] | undefined, label: string) {
  return (
    properties?.find(
      (property) => property.label === label || property.base_label === label,
    )?.value || ''
  );
}

function propertyBaseValue(properties: EntryProperty[] | undefined, label: string) {
  const property = properties?.find(
    (item) => item.label === label || item.base_label === label,
  );
  return property?.base_value || property?.value || '';
}

function listProps(entry: ContentEntry) {
  return [entry.list_props || '', entry.base_list_props || '']
    .flatMap((value) => value.split(/\s+/))
    .filter(Boolean);
}

function optionTerms(option: FilterOption) {
  return [option.value, option.label, ...(option.aliases || [])].filter(Boolean);
}

function textMatchesOption(text: string, option: FilterOption) {
  const normalizedText = normalize(text);
  return optionTerms(option).some((term) => {
    const normalizedTerm = normalize(term);

    if (!normalizedTerm) {
      return text.toLowerCase().includes(term.toLowerCase());
    }

    return normalizedText.includes(normalizedTerm);
  });
}

function entryMatchesName(entry: ContentEntry, query: string) {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const searchableText = [
    entry.title,
    entry.base_title || '',
    entry.slug,
    entry.subtitle || '',
    entry.base_subtitle || '',
  ].join(' ').toLowerCase();
  const normalizedText = normalize(searchableText);

  return terms.every((term) => {
    const normalizedTerm = normalize(term);

    if (!normalizedTerm) {
      return searchableText.includes(term);
    }

    return searchableText.includes(term) || normalizedText.includes(normalizedTerm);
  });
}

function hasFilterValue(searchParams: URLSearchParams, key: FilterKey, value: string) {
  return selectedValues(searchParams, key).includes(value);
}

function selectedValues(searchParams: URLSearchParams, key: FilterKey) {
  return (searchParams.get(key) || '').split(',').filter(Boolean);
}

function entryMatchesSelection(entry: ContentEntry, key: FilterKey, selected: string[], groups: FilterGroup[], section: string) {
  if (selected.length === 0 || key === 'sort') {
    return true;
  }

  const group = groups.find((item) => item.key === key);
  const options = selected
    .map((value) => group?.options.find((option) => option.value === value) || { value, label: value })
    .filter(Boolean);

  if (key === 'type') {
    const values = section === 'uniques'
      ? [propertyValue(entry.properties, 'Type'), propertyBaseValue(entry.properties, 'Type')]
      : [entry.entry_type || ''];

    return options.some((option) => values.some((value) => value === option.value || value === option.label || textMatchesOption(value, option)));
  }

  if (key === 'rarity') {
    return options.some(
      (option) =>
        entry.rarity === option.value
        || entry.rarity === option.label
        || entry.base_rarity === option.value
        || entry.base_rarity === option.label,
    );
  }

  if (key === 'stat') {
    const values = [entry.list_stat || '', entry.base_list_stat || '', ...listProps(entry)];
    return options.some((option) => values.some((value) => textMatchesOption(value, option)));
  }

  if (key === 'get') {
    const values = [entry.acquisition_method || '', entry.base_acquisition_method || '', ...listProps(entry)];
    return options.some((option) => values.some((value) => textMatchesOption(value, option)));
  }

  if (key === 'shop') {
    const values = [propertyValue(entry.properties, 'To buy in'), propertyBaseValue(entry.properties, 'To buy in')];
    return options.some((option) => values.some((value) => textMatchesOption(value, option)));
  }

  if (key === 'weapon') {
    const value = entry.weapon_requirement || propertyValue(entry.properties, 'Weapon');
    const baseValue = entry.base_weapon_requirement || propertyBaseValue(entry.properties, 'Weapon');
    const values = [value, baseValue].filter(Boolean);

    if (values.some((item) => normalize(item).includes('allweapons'))) {
      return true;
    }

    return options.some((option) => values.some((item) => textMatchesOption(item, option)));
  }

  if (key === 'req') {
    const requirementValues = [
      propertyValue(entry.properties, 'Requires'),
      propertyBaseValue(entry.properties, 'Requires'),
      ...listProps(entry),
    ];
    const reqMode = selected.includes('AsAnd') ? 'and' : 'or';
    const reqOptions = options.filter((option) => option.value !== 'AsAnd');

    if (reqOptions.length === 0) {
      return true;
    }

    return reqMode === 'and'
      ? reqOptions.every((option) => requirementValues.some((value) => textMatchesOption(value, option)))
      : reqOptions.some((option) => requirementValues.some((value) => textMatchesOption(value, option)));
  }

  if (key === 'mode') {
    return true;
  }

  if (key === 'tags') {
    const entryTags = [...(entry.tags || []), ...(entry.base_tags || [])].map(normalize);
    const tagMode = selected.includes('AsAnd') ? 'and' : 'or';
    const tagValues = selected.filter((value) => value !== 'AsAnd').map(normalize);

    if (tagValues.length === 0) {
      return true;
    }

    return tagMode === 'and'
      ? tagValues.every((value) => entryTags.includes(value))
      : tagValues.some((value) => entryTags.includes(value));
  }

  return true;
}

function buildGroups(section: string, entries: ContentEntry[]) {
  if (section === 'runes') {
    const tagOptions = uniqueOptions(entries.flatMap((entry) => entry.tags || []));
    return [
      ...runeGroups,
      {
        key: 'tags' as const,
        title: 'Rune tags',
        area: 'more' as const,
        options: tagOptions,
      },
    ];
  }

  if (section === 'uniques') {
    const tagOptions = uniqueOptions(entries.flatMap((entry) => [...(entry.tags || []), ...(entry.base_tags || [])]))
      .filter((option) => !UNIQUE_GENERIC_TAG_KEYS.has(normalize(option.value)));
    const groups: FilterGroup[] = [
      {
        key: 'type',
        title: 'Equipment type',
        area: 'main',
        options: uniqueEquipmentOptions.filter((option) =>
          entries.some((entry) =>
            [propertyValue(entry.properties, 'Type'), propertyBaseValue(entry.properties, 'Type')].some((value) =>
              textMatchesOption(value, option),
            ),
          ),
        ),
      },
      {
        key: 'sort',
        title: 'Sort.',
        area: 'main',
        options: [{ value: 'Sort...', label: 'Sort' }],
      },
      {
        key: 'req',
        title: 'Requires',
        area: 'main',
        modeToggle: true,
        options: statRequirementOptions.filter((option) =>
          entries.some((entry) =>
            [propertyValue(entry.properties, 'Requires'), propertyBaseValue(entry.properties, 'Requires'), ...listProps(entry)].some((value) =>
              textMatchesOption(value, option),
            ),
          ),
        ),
      },
      {
        key: 'mode',
        title: 'Type',
        area: 'main',
        options: [{ value: 'TrialsOfPower', label: 'Trials of Power' }],
      },
    ];

    if (tagOptions.length > 0) {
      groups.push({
        key: 'tags',
        title: 'Option tags',
        area: 'more',
        modeToggle: true,
        options: tagOptions,
      });
    }

    return groups;
  }

  const groups: FilterGroup[] = [];
  const rarities = rarityOptions.filter((option) =>
    entries.some(
      (entry) =>
        entry.rarity === option.value
        || entry.rarity === option.label
        || entry.base_rarity === option.value
        || entry.base_rarity === option.label,
    ),
  );
  const types = uniqueOptions(entries.map((entry) => entry.entry_type || ''));

  if (rarities.length > 1) {
    groups.push({
      key: 'rarity',
      title: 'Rarity',
      area: 'main',
      options: rarities,
    });
  }

  if (types.length > 1) {
    groups.push({
      key: 'type',
      title: section === 'essences' || section === 'materials' ? 'Material type' : `${sectionTitleFromSlug(section)} type`,
      area: 'main',
      options: types,
    });
  }

  return groups;
}

function sectionTitleFromSlug(section: string) {
  return section
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sortEntries(entries: ContentEntry[], enabled: boolean) {
  if (!enabled) {
    return entries;
  }

  return [...entries].sort((a, b) => a.title.localeCompare(b.title));
}

function dedupePropValues(values: Array<string | undefined>) {
  const seen = new Set<string>();

  return values.filter((value) => {
    if (!value) {
      return false;
    }

    const normalizedValue = normalize(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
}

function splitCardPropString(value: string) {
  const tokens = value.split(/\s+/).filter(Boolean);
  const props: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const matched = COMPOUND_CARD_PROP_TERMS.find((term) =>
      term.parts.every((part, partIndex) => tokens[index + partIndex] === part),
    );

    if (matched) {
      props.push(matched.value);
      index += matched.parts.length - 1;
      continue;
    }

    props.push(tokens[index]);
  }

  return props;
}

function uniqueEntryProps(entry: ContentEntry) {
  const source = entry.list_props || entry.base_list_props || '';
  const tokens = source.split(/\s+/).filter(Boolean);
  const props: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (/^tier$/i.test(current) && next) {
      props.push(`${current} ${next}`);
      index += 1;
      continue;
    }

    props.push(current);
  }

  return dedupePropValues(props).slice(0, 3);
}

function displayProps(entry: ContentEntry, section: string) {
  if (section === 'uniques') {
    return uniqueEntryProps(entry);
  }

  const listProps = splitCardPropString(entry.list_props || entry.base_list_props || '');
  const acquisitionProps = splitCardPropString(entry.acquisition_method || entry.base_acquisition_method || '');

  return dedupePropValues([
    entry.list_stat,
    entry.entry_type,
    entry.rarity,
    ...listProps,
    ...acquisitionProps,
  ]).slice(0, 6);
}

function rarityDataValue(entry: ContentEntry) {
  const candidates = [entry.rarity, entry.base_rarity].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalize(candidate || '');

    switch (normalized) {
      case 'normal':
      case '一般':
      case '普通':
        return 'Normal';
      case 'magic':
      case '魔法':
        return 'Magic';
      case 'rare':
      case '稀有':
        return 'Rare';
      case 'legendary':
      case '傳奇':
        return 'Legendary';
      case 'unique':
      case '獨特':
        return 'Unique';
      case 'holy':
      case '神聖':
        return 'Holy';
      case 'ancient':
      case '遠古':
        return 'Ancient';
      default:
        break;
    }
  }

  return undefined;
}

function entrySummary(entry: ContentEntry, section: string) {
  const description = String(entry.description || '').trim();
  const title = String(entry.title || '').trim();

  if (section === 'tags') {
    return description && normalize(description) !== normalize(title) ? description : '';
  }

  if (section === 'runemaster') {
    const fields = [
      propertyValue(entry.properties, 'Position'),
      propertyValue(entry.properties, 'Cost'),
      propertyValue(entry.properties, 'Max level'),
    ].filter(Boolean);

    return fields.length > 0 ? fields.join('  ·  ') : '';
  }

  return '';
}

export default function SectionSearch({
  locale,
  section,
  sectionTitle,
  entries,
  terminologyMap,
}: SectionSearchProps) {
  const resolvedLocale = resolveLocale(locale);
  const messages = getLocaleMessages(resolvedLocale);
  const router = useRouter();
  const pathname = usePathname();
  const readonlySearchParams = useSearchParams();
  const searchParams = new URLSearchParams(readonlySearchParams.toString());
  const queryFromUrl = searchParams.get('q') || '';
  const [searchText, setSearchText] = useState(queryFromUrl);
  const deferredSearchText = useDeferredValue(searchText);
  const groups = buildGroups(section, entries);
  const mainGroups = groups.filter((group) => group.area === 'main');
  const moreGroups = groups.filter((group) => group.area === 'more');
  const moreOpened = searchParams.get('more') === 'Opened';
  const textOnlyCards = section === 'tags' || section === 'runemaster';

  useEffect(() => {
    setSearchText(queryFromUrl);
  }, [queryFromUrl]);

  const filteredEntries = sortEntries(
    entries.filter((entry) =>
      entryMatchesName(entry, deferredSearchText)
      && groups.every((group) =>
          entryMatchesSelection(entry, group.key, selectedValues(searchParams, group.key), groups, section),
        ),
    ),
    hasFilterValue(searchParams, 'sort', 'Sort...'),
  );

  function replaceParams(nextParams: URLSearchParams) {
    const query = nextParams.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function updateSearch(value: string) {
    setSearchText(value);

    const nextParams = new URLSearchParams(searchParams.toString());
    const nextValue = value.trim();

    if (nextValue) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }

    replaceParams(nextParams);
  }

  function clearSearch() {
    setSearchText('');

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('q');
    replaceParams(nextParams);
  }

  function toggleValue(key: FilterKey, value: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    const current = selectedValues(nextParams, key);
    const nextValues = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    if (nextValues.length === 0) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, nextValues.join(','));
    }

    replaceParams(nextParams);
  }

  function setMoreOpened(opened: boolean) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (opened) {
      nextParams.set('more', 'Opened');
    } else {
      nextParams.delete('more');
    }

    replaceParams(nextParams);
  }

  function setGroupMode(key: FilterKey, mode: 'or' | 'and') {
    const nextParams = new URLSearchParams(searchParams.toString());
    const values = selectedValues(nextParams, key).filter((value) => value !== 'AsAnd');
    const nextValues = mode === 'and' ? [...values, 'AsAnd'] : values;

    if (nextValues.length === 0) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, nextValues.join(','));
    }

    replaceParams(nextParams);
  }

  function clearFilters() {
    setSearchText('');
    replaceParams(new URLSearchParams());
  }

  function renderGroup(group: FilterGroup) {
    if (group.options.length === 0) {
      return null;
    }

    const andMode = selectedValues(searchParams, group.key).includes('AsAnd');

    const displayTitle = group.title
      ? localizeTerminology(resolvedLocale, group.title, terminologyMap)
      : '';

    return (
      <div className="module-filter-item" data-attr={group.key} data-title={Boolean(group.title)} key={group.key}>
        {group.title ? (
          <div className="module-filter-title">
            <span>{displayTitle}</span>
            {group.modeToggle ? (
              <span className="module-filter-toggle" data-as={andMode ? 'and' : 'or'}>
                <button
                  className={!andMode ? 'is-active' : ''}
                  onClick={() => setGroupMode(group.key, 'or')}
                  type="button"
                >
                  {messages.or}
                </button>
                <button
                  className={andMode ? 'is-active' : ''}
                  onClick={() => setGroupMode(group.key, 'and')}
                  type="button"
                >
                  {messages.and}
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="module-filter-set" data-attr={group.key}>
          {group.options.map((option) => (
            <div className="module-filter-size" key={option.value}>
              <button
                className={hasFilterValue(searchParams, group.key, option.value) ? 'module-filter-button is-selected' : 'module-filter-button'}
                data-id={option.value}
                onClick={() => toggleValue(group.key, option.value)}
                title={localizeTerminology(resolvedLocale, option.label, terminologyMap)}
                type="button"
              >
                <i />
                <span>{localizeTerminology(resolvedLocale, option.label, terminologyMap)}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="module-search" data-section={section}>
      <div className="module-search-bar" role="search">
        <label className="module-search-label" htmlFor={`module-search-${section}`}>
          {messages.nameSearch}
        </label>
        <div className="module-search-control">
          <input
            id={`module-search-${section}`}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder={formatMessage(messages.searchByName, { sectionTitle })}
            type="search"
            value={searchText}
          />
          {searchText ? (
            <button className="module-search-clear" onClick={clearSearch} type="button">
              {messages.clear}
            </button>
          ) : null}
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="module-filter-block" data-locale={locale}>
          <div className="module-filter-main">
            {mainGroups.map(renderGroup)}
            {moreGroups.length > 0 ? (
              <div className="module-filter-item" data-attr="more">
                <div className="module-filter-set" data-attr="more">
                  <div className="module-filter-size">
                    <button
                      className={moreOpened ? 'module-filter-button is-selected' : 'module-filter-button'}
                      data-id="Closed"
                      onClick={() => setMoreOpened(!moreOpened)}
                      title={messages.more}
                      type="button"
                    >
                      <i />
                      <span>{messages.more}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {moreGroups.length > 0 ? (
            <div className={moreOpened ? 'module-filter-more is-opened' : 'module-filter-more'}>
              <div className="module-filter-more-scroll">
                <div className="module-filter-more-list">
                  <div className="module-filter-more-set">{moreGroups.map(renderGroup)}</div>
                </div>
              </div>
              <button className="module-filter-more-close" onClick={() => setMoreOpened(false)} type="button">
                <span />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="module-result-bar">
        <div className="content_list_count">
          {filteredEntries.length > 0
            ? formatMessage(messages.itemsFound, { count: filteredEntries.length })
            : messages.notMatching}
        </div>
        {searchParams.size > 0 ? (
          <button className="module-clear-button" onClick={clearFilters} type="button">
            {messages.clear}
          </button>
        ) : null}
      </div>

      {filteredEntries.length > 0 ? (
        <ul
          className={textOnlyCards ? 'content_list module-content-list module-content-list--text' : 'content_list module-content-list'}
          data-type="items"
        >
          {filteredEntries.map((entry) => (
            <li
              className="content_list_item module-content-list-item"
              data-id={entry.source_key}
              data-stat={entry.base_list_stat || entry.list_stat || undefined}
              key={entry.source_key}
            >
              <Link href={`/${locale}/${section}/${entry.slug}`}>
                <span
                  className={textOnlyCards ? 'module-elem-list-item module-elem-list-item--text' : 'module-elem-list-item'}
                  data-rarity={rarityDataValue(entry)}
                  data-type={entry.entry_type || undefined}
                >
                  <span
                    className="module-elem-rarity"
                    data-rarity={rarityDataValue(entry)}
                  />
                  {textOnlyCards ? (
                    <span className="module-elem-text">
                      <span className="module-elem-props module-elem-props--text">
                        {displayProps(entry, section).map((prop) => (
                          <span data-prop={prop} key={prop}>
                            {localizeTerminology(resolvedLocale, prop, terminologyMap)}
                          </span>
                        ))}
                      </span>
                      <span className="module-elem-title module-elem-title--text">{entry.title}</span>
                      {entrySummary(entry, section) ? (
                        <span className="module-elem-summary">{entrySummary(entry, section)}</span>
                      ) : null}
                    </span>
                  ) : (
                    <>
                      <span className="module-elem-content">
                        <span className="module-elem-image" data-type={entry.entry_type || undefined}>
                          {entry.image_url ? <img alt="" className="module-elem-icon" src={entry.image_url} /> : null}
                          {entry.list_stat ? (
                            <span
                              className="module-elem-point"
                              data-stat={entry.base_list_stat || entry.list_stat}
                            />
                          ) : null}
                        </span>
                        <span className="module-elem-props">
                          {displayProps(entry, section).map((prop) => (
                            <span data-prop={prop} key={prop}>
                              {localizeTerminology(resolvedLocale, prop, terminologyMap)}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="module-elem-title">{entry.title}</span>
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">{formatMessage(messages.noFilterResults, { sectionTitle })}</div>
      )}
    </div>
  );
}
