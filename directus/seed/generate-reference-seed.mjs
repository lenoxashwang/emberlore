import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, fetchSection, fetchSectionItem } from '../../backend/scraper.mjs';
import { REMOTE_SECTION_NAMES, titleFromSection } from '../../backend/sections.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, 'generated');
const origin = 'https://undecember.thein.ru';
const locale = 'en';

const requestedSections = process.argv.slice(2).filter(Boolean);
const sectionsToExport = requestedSections.length > 0 ? requestedSections : REMOTE_SECTION_NAMES;

function keyForSection(section) {
  return `${locale}:${section}`;
}

function keyForEntry(section, slug) {
  return `${locale}:${section}:${slug}`;
}

function toLocalUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(value, origin);

    if (url.origin === origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    return value;
  }
}

function sanitize(text) {
  return String(text || '').trim();
}

const inferredTagRules = [
  ['Abyssling', /\babyssling/i],
  ['Accuracy', /accuracy|hit rate/i],
  ['Amplification', /amplif/i],
  ['Area', /area/i],
  ['Armor', /armor/i],
  ['Attack', /attack/i],
  ['Aura', /aura/i],
  ['Barrier', /barrier/i],
  ['Bind', /bind/i],
  ['Bleeding', /bleed/i],
  ['Blindness', /blind/i],
  ['Block', /block/i],
  ['Bosses', /boss/i],
  ['Bow', /\bbow\b|arrow/i],
  ['Buff', /buff/i],
  ['Burn', /burn/i],
  ['Chain', /chain/i],
  ['Chance', /chance|rate/i],
  ['Channeling', /channel/i],
  ['Chaos', /chaos/i],
  ['Chill', /chill/i],
  ['Cold', /cold|frost/i],
  ['Cooldown', /cooldown/i],
  ['Cost', /\bcost\b/i],
  ['Count', /\bcount\b/i],
  ['Critical', /critical|crit/i],
  ['Crowd Control', /crowd control/i],
  ['Damage', /\bdmg\b|damage/i],
  ['Debuff', /debuff/i],
  ['Decrease', /decrease|dampen/i],
  ['Defense', /defense|armor|barrier/i],
  ['Dodge', /dodge/i],
  ['DoT', /\bdot\b|damage over time/i],
  ['Double', /double/i],
  ['Drop', /drop/i],
  ['Duration', /duration/i],
  ['Elemental', /element|fire|cold|lightning|poison|chaos/i],
  ['Energy', /energy/i],
  ['Enhance', /enhance/i],
  ['Exp', /\bexp\b|experience/i],
  ['Fire', /fire|burn/i],
  ['Freeze', /freeze/i],
  ['Gear', /gear/i],
  ['Gold', /gold/i],
  ['Hit', /\bhit\b/i],
  ['HP', /\bhp\b|health/i],
  ['Ignore', /ignore/i],
  ['Immune', /immune/i],
  ['Kill', /\bkill\b/i],
  ['Knockback', /knockback/i],
  ['Level', /level/i],
  ['Lightning', /lightning|shock/i],
  ['Link Rune', /link rune/i],
  ['Mana', /mana|\bmp\b/i],
  ['Melee', /melee/i],
  ['Minion', /minion/i],
  ['Movement', /movement|speed/i],
  ['Penetration', /penetration/i],
  ['Physical', /physical/i],
  ['Pierce', /pierce/i],
  ['Poison', /poison/i],
  ['Potion', /potion/i],
  ['Projectile', /projectile/i],
  ['Range', /range/i],
  ['Recovery', /recovery|regen/i],
  ['Reflect', /reflect/i],
  ['Regeneration', /regen/i],
  ['Resistance', /resistance/i],
  ['Rune Knight', /rune knight/i],
  ['Seal', /\bseal\b/i],
  ['Sentry', /sentry|bowgun/i],
  ['Shield', /shield/i],
  ['Shock', /shock/i],
  ['Shout', /shout/i],
  ['Skill Rune', /skill rune/i],
  ['Speed', /speed/i],
  ['Spell', /spell/i],
  ['Stat', /strength|dexterity|intelligence|stat/i],
  ['Status', /status/i],
  ['Stun', /stun/i],
  ['Totem', /totem/i],
  ['Trap', /trap/i],
  ['Weapon', /weapon/i],
  ['Wound', /wound/i],
];

function inferTags(section, detail, entry) {
  if (!['authority', 'uniques', 'runemaster'].includes(section)) {
    return [];
  }

  const text = [
    entry.title,
    entry.description,
    ...(detail.properties || []).flatMap((property) => [property.label, property.value]),
    ...(detail.tiles || []).flatMap((block) => [block.heading, ...(block.lines || [])]),
  ].join(' ');

  return inferredTagRules
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);
}

function sectionFromHref(href) {
  if (!href) {
    return '';
  }

  try {
    const url = new URL(href, origin);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] !== locale) {
      return '';
    }

    return segments[1] || '';
  } catch {
    return '';
  }
}

function sectionRecord(section, listPage, sortOrder) {
  return {
    source_key: keyForSection(section),
    locale,
    slug: section,
    title: sanitize(listPage.meta.title.replace(/\s*-\s*Undecember\s*$/i, '')) || titleFromSection(section),
    description: sanitize(listPage.meta.description),
    hero_image_url: '',
    icon_image_url: '',
    theme_token: '',
    sort_order: sortOrder,
    status: 'published',
    source_path: listPage.meta.path,
    source_url: listPage.meta.path,
  };
}

function placeholderSectionRecord(section, title, description, sortOrder) {
  return {
    source_key: keyForSection(section),
    locale,
    slug: section,
    title: sanitize(title) || titleFromSection(section),
    description: sanitize(description),
    hero_image_url: '',
    icon_image_url: '',
    theme_token: '',
    sort_order: sortOrder,
    status: 'published',
    source_path: `/${locale}/${section}/`,
    source_url: `/${locale}/${section}/`,
  };
}

function entryRecord(section, detail, summary, sortOrder) {
  const properties = Object.fromEntries((detail.properties || []).map((item) => [item.label, item.value]));

  return {
    source_key: keyForEntry(section, summary.slug),
    locale,
    section_slug: section,
    entry_type: summary.type || section,
    list_stat: sanitize(summary.stat),
    list_props: (summary.props || []).map(sanitize).filter(Boolean).join(' '),
    slug: summary.slug,
    title: sanitize(detail.title || summary.title),
    subtitle: '',
    description: sanitize(detail.description || summary.description),
    image_url: toLocalUrl(detail.image || summary.image),
    video_url: '',
    rarity: sanitize(properties['Min. rarity'] || summary.rarity),
    acquisition_method: sanitize(properties['How to get'] || ''),
    weapon_requirement: sanitize(properties['Weapon'] || ''),
    sort_order: sortOrder,
    status: 'published',
    seo_title: sanitize(detail.meta.title),
    seo_description: sanitize(detail.meta.description),
    source_path: detail.meta.path,
    source_url: detail.meta.path,
  };
}

function navigationRecords(homePage) {
  return (homePage.navigation || []).map((item, index) => ({
    source_key: `${locale}:nav:${index + 1}`,
    locale,
    group_name: index < 5 ? 'main' : 'resources',
    label: item.label,
    href: item.href,
    open_in_new_tab: false,
    sort_order: index + 1,
  }));
}

function downloadLinkRecords(homePage) {
  return (homePage.downloads || []).map((item, index) => ({
    source_key: `${locale}:download:${item.platform || index + 1}`,
    locale,
    platform: sanitize(item.platform),
    label: sanitize(item.label || item.platform),
    href: item.href,
    icon_url: '',
    sort_order: index + 1,
  }));
}

function homeSlideRecords(homePage) {
  return (homePage.slides || []).map((item, index) => ({
    source_key: `${locale}:home:slide:${item.position || index + 1}`,
    locale,
    title: sanitize(item.title),
    subtitle: sanitize(item.subtitle),
    image_url: toLocalUrl(item.image),
    background_css: sanitize(item.background_css),
    href: item.href,
    sort_order: item.position || index + 1,
  }));
}

function homeCardRecords(homePage) {
  return (homePage.cards || []).map((item, index) => ({
    source_key: `${locale}:home:card:${item.card_size}:${item.position || index + 1}`,
    locale,
    card_size: sanitize(item.card_size || 'tile'),
    title: sanitize(item.title),
    subtitle: sanitize(item.subtitle),
    image_url: toLocalUrl(item.image),
    background_css: sanitize(item.background_css),
    href: item.href,
    sort_order: item.position || index + 1,
  }));
}

function dedupe(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

const seed = {
  meta: {
    generatedAt: new Date().toISOString(),
    locale,
    source: 'local-mirror',
    sections: sectionsToExport,
  },
  site_settings: [
    {
      site_name: 'Undecember',
      default_locale: locale,
      logo_text: 'Undecember',
      copyright_text: '© 2022 thein.ru',
      reference_url: `/${locale}/`,
    },
  ],
  navigation_links: [],
  download_links: [],
  home_slides: [],
  home_featured_cards: [],
  content_sections: [],
  content_entries: [],
  entry_tags: [],
  entry_properties: [],
  entry_stat_blocks: [],
  entry_stat_lines: [],
  entry_awakening_groups: [],
  entry_awakening_lines: [],
};

const homePage = await fetchPage(`/${locale}/`);
seed.navigation_links = navigationRecords(homePage);
seed.download_links = downloadLinkRecords(homePage);
seed.home_slides = homeSlideRecords(homePage);
seed.home_featured_cards = homeCardRecords(homePage);

const homeSections = new Set(sectionsToExport);
let homeSectionOffset = sectionsToExport.length;

for (const card of homePage.cards || []) {
  const section = sectionFromHref(card.href);
  if (!section || homeSections.has(section)) {
    continue;
  }

  homeSectionOffset += 1;
  seed.content_sections.push(
    placeholderSectionRecord(section, card.title, card.subtitle, homeSectionOffset),
  );
  homeSections.add(section);
}

for (const [index, section] of sectionsToExport.entries()) {
  process.stdout.write(`export ${section}\n`);
  const listPage = await fetchSection(section);
  seed.content_sections.push(sectionRecord(section, listPage, index + 1));

  const items = listPage.items || [];
  for (const [entryIndex, item] of items.entries()) {
    const slug = item.slug || item.href.split('/').filter(Boolean).pop();
    if (!slug) {
      continue;
    }

    const detail = item.inlineDetail || await fetchSectionItem(section, slug);
    const entry = entryRecord(section, detail, { ...item, slug }, entryIndex + 1);
    seed.content_entries.push(entry);

    const tags = dedupe(
      [...(detail.tags || []), ...inferTags(section, detail, entry)]
        .map(sanitize)
        .filter(Boolean)
        .map((label, index) => ({ label, sort_order: index + 1 })),
      'label',
    );

    tags.forEach((tag, tagIndex) => {
      seed.entry_tags.push({
        source_key: `${entry.source_key}:tag:${tagIndex + 1}`,
        entry_source_key: entry.source_key,
        label: tag.label,
        sort_order: tagIndex + 1,
      });
    });

    (detail.properties || []).forEach((property, propertyIndex) => {
      seed.entry_properties.push({
        source_key: `${entry.source_key}:property:${propertyIndex + 1}`,
        entry_source_key: entry.source_key,
        label: property.label,
        value: property.value,
        sort_order: propertyIndex + 1,
      });
    });

    (detail.tiles || []).forEach((block, blockIndex) => {
      const blockKey = `${entry.source_key}:block:${blockIndex + 1}`;
      seed.entry_stat_blocks.push({
        source_key: blockKey,
        entry_source_key: entry.source_key,
        title: block.heading,
        variant: '',
        sort_order: blockIndex + 1,
      });

      (block.lines || []).forEach((line, lineIndex) => {
        seed.entry_stat_lines.push({
          source_key: `${blockKey}:line:${lineIndex + 1}`,
          block_source_key: blockKey,
          content: line,
          sort_order: lineIndex + 1,
        });
      });
    });

    (detail.awakenings || []).forEach((awakening, awakeningIndex) => {
      const awakeningKey = `${entry.source_key}:awakening:${awakeningIndex + 1}`;
      seed.entry_awakening_groups.push({
        source_key: awakeningKey,
        entry_source_key: entry.source_key,
        code: awakening.code,
        title: awakening.title,
        sort_order: awakeningIndex + 1,
      });

      (awakening.lines || []).forEach((line, lineIndex) => {
        seed.entry_awakening_lines.push({
          source_key: `${awakeningKey}:line:${lineIndex + 1}`,
          awakening_source_key: awakeningKey,
          content: line,
          sort_order: lineIndex + 1,
        });
      });
    });
  }
}

seed.download_links = dedupe(seed.download_links, 'source_key');
seed.home_slides = dedupe(seed.home_slides, 'source_key');
seed.home_featured_cards = dedupe(seed.home_featured_cards, 'source_key');
seed.content_sections = dedupe(seed.content_sections, 'source_key');
seed.content_entries = dedupe(seed.content_entries, 'source_key');
seed.entry_tags = dedupe(seed.entry_tags, 'source_key');
seed.entry_properties = dedupe(seed.entry_properties, 'source_key');
seed.entry_stat_blocks = dedupe(seed.entry_stat_blocks, 'source_key');
seed.entry_stat_lines = dedupe(seed.entry_stat_lines, 'source_key');
seed.entry_awakening_groups = dedupe(seed.entry_awakening_groups, 'source_key');
seed.entry_awakening_lines = dedupe(seed.entry_awakening_lines, 'source_key');

await mkdir(outputDir, { recursive: true });
await writeFile(
  path.join(outputDir, 'reference-seed.json'),
  JSON.stringify(seed, null, 2),
  'utf8',
);

process.stdout.write(`seed written to ${path.join(outputDir, 'reference-seed.json')}\n`);
