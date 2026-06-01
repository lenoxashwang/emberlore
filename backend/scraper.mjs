import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isRemoteSectionSupported,
  normalizeContentPath,
  parseContentPath,
} from './sections.mjs';

const ORIGIN = 'https://undecember.thein.ru';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultMirrorRoot = path.resolve(__dirname, '..', 'frontend', 'public');
const sourceMode = process.env.UNDECEMBER_SOURCE || 'remote';
const mirrorRoot = process.env.UNDECEMBER_MIRROR_ROOT
  ? path.resolve(process.env.UNDECEMBER_MIRROR_ROOT)
  : defaultMirrorRoot;
const DOWNLOAD_LABELS = {
  floor: 'FLOOR',
  app_store: 'App Store',
  google_play: 'Google Play',
  steam: 'STEAM',
};

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x60;/g, '`');
}

function stripHtml(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function slugify(value) {
  return String(value || '')
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : '';
}

function extractPropLines(block) {
  return block
    .split('<span data-class="prop">')
    .slice(1)
    .map((part) => part.replace(/<\/span>\s*$/i, ''))
    .map((part) => stripHtml(part))
    .map((part) => part.replace(/\s*© 2022[\s\S]*$/i, '').trim())
    .filter(Boolean);
}

function extractAll(text, pattern, mapper) {
  const items = [];

  for (const match of text.matchAll(pattern)) {
    items.push(mapper(match));
  }

  return items;
}

function extractStyleValue(styleText, property = 'background') {
  const text = decodeHtml(styleText || '').trim();

  if (!text) {
    return '';
  }

  if (new RegExp(`^${property}\\s*:\\s*$`, 'i').test(text)) {
    return '';
  }

  const matcher = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
  const match = text.match(matcher);
  if (match) {
    return match[1].trim();
  }

  return text.replace(/;$/, '').trim();
}

function uniquePropBlockTitle(propType) {
  const normalized = String(propType || '').trim().toLowerCase();

  if (normalized === 'main') {
    return 'Base Stats';
  }

  if (normalized === 'sub') {
    return 'Special Effect';
  }

  if (normalized === 'options') {
    return 'Option';
  }

  return normalized
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function propValues(html) {
  return extractAll(
    html,
    /<span data-prop="([^"]+)"[^>]*>([\s\S]*?)<\/span>/g,
    (propMatch) => {
      const label = decodeHtml(propMatch[1]);
      const value = stripHtml(propMatch[2]);
      return value ? `${label} ${value}` : label;
    },
  );
}

async function fetchHtml(pathname) {
  if (sourceMode === 'local') {
    const localFile = toLocalMirrorPath(pathname);

    try {
      return await readFile(localFile, 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const url = new URL(normalizeContentPath(pathname), ORIGIN);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function toLocalMirrorPath(pathname) {
  const normalized = normalizeContentPath(pathname);
  const segments = normalized.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
  return path.join(mirrorRoot, ...segments, 'index.html');
}

function parseMeta(html, pathname) {
  return {
    path: normalizeContentPath(pathname),
    title: decodeHtml(getMatch(html, /<title>([^<]+)<\/title>/i)),
    description: decodeHtml(getMatch(html, /<meta name="description" content="([^"]*)"/i)),
    ogImage: decodeHtml(getMatch(html, /<meta property="og:image" content="([^"]*)"/i)),
    locale: decodeHtml(getMatch(html, /<html[^>]+lang="([^"]+)"/i)) || 'en',
  };
}

function parseNavigation(html) {
  return extractAll(
    html,
    /<a[^>]+class="Header_menu_point__[^"]*"[^>]+href="([^"]+)"[^>]*><span[^>]*>([^<]+)<\/span><\/a>/g,
    (match) => ({
      href: decodeHtml(match[1]),
      label: stripHtml(match[2]),
    }),
  );
}

function parseListPage(html, pathname) {
  const { section } = parseContentPath(pathname);

  if (section === 'runemaster') {
    return parseRunemasterListPage(html, pathname);
  }

  if (section === 'tags') {
    return parseTagsListPage(html, pathname);
  }

  const items = extractAll(
    html,
    /<li class="content_list_item"([^>]*)><a href="([^"]+)">([\s\S]*?)<\/a><\/li>/g,
    (match) => {
      const authTitle = stripHtml(getMatch(match[3], /Elem_list_item_auth_title__[^"]*">([\s\S]*?)<\/span>/i));
      const god = getMatch(match[3], /data-god="([^"]+)"/i);
      const equip = getMatch(match[3], /data-equip="([^"]+)"/i);
      const title = stripHtml(getMatch(match[3], /Elem_list_item_title__[^"]*">([\s\S]*?)<\/span>/i));

      return {
        id: getMatch(match[1], /data-id="([^"]+)"/i) || getMatch(match[3], /data-id="([^"]+)"/i),
        stat: getMatch(match[1], /data-stat="([^"]+)"/i),
        href: decodeHtml(match[2]),
        title: title || authTitle || [god, equip].filter(Boolean).join(' '),
        rarity: getMatch(match[3], /data-rarity="([^"]+)"/i),
        type: getMatch(match[3], /data-type="([^"]+)"/i) || equip,
        image: decodeHtml(getMatch(match[3], /<img[^>]+src="([^"]+)"/i)),
        props: section === 'authority' ? [god, equip].filter(Boolean) : propValues(match[3]),
      };
    },
  );

  return {
    kind: 'list',
    meta: parseMeta(html, pathname),
    navigation: parseNavigation(html),
    items,
  };
}

function runemasterType(text) {
  const rules = [
    ['Seal and HP Potion', /\bseal\b|hp potion/i],
    ['MP Potion', /\bmp potion|mana potion/i],
    ['Enhance Potion', /enhance potion/i],
    ['DMG by status', /status/i],
    ['Skill Rune', /skill rune/i],
    ['Penetration', /penetration/i],
    ['Resistance', /resistance/i],
    ['Movement', /movement|speed/i],
    ['Decrease', /decrease|dampening/i],
    ['Minion', /minion/i],
    ['Sentry', /sentry|bowgun/i],
    ['Shout', /shout/i],
    ['Totem', /totem/i],
    ['Trap', /trap/i],
    ['Spell', /spell/i],
    ['DoT', /\bdot\b/i],
    ['Stat', /\bstat\b|strength|dexterity|intelligence/i],
    ['Attack', /attack|critical|hit rate|dmg/i],
  ];

  return rules.find(([, pattern]) => pattern.test(text))?.[0] || 'Rune master';
}

function parseRunemasterListPage(html, pathname) {
  const items = html
    .split('<div class="Runemaster_list_item__')
    .slice(1)
    .map((part, index) => {
      const block = `<div class="Runemaster_list_item__${part}`;
      const position = stripHtml(getMatch(block, /Runemaster_list_item_pos__[^"]*">([\s\S]*?)<\/div>/i));
      const cost = stripHtml(getMatch(block, /Runemaster_list_item_cost__[^"]*">([\s\S]*?)<\/span>/i));
      const maxLevel = stripHtml(
        getMatch(block, /Runemaster_list_item_button__[^"]*" data-type="Max"[^>]*>([\s\S]*?)<\/span>/i),
      );
      const property = stripHtml(getMatch(block, /Runemaster_list_item_prop__[^"]*">([\s\S]*?)<\/div>/i));
      const type = runemasterType(property);
      const title = property || `Rune master node ${index + 1}`;
      const slug = `node-${String(index + 1).padStart(3, '0')}`;

      return {
        id: `runemaster-${index + 1}`,
        href: `${pathname}${slug}/`,
        slug,
        title,
        type,
        rarity: '',
        image: '',
        props: [type],
        inlineDetail: {
          kind: 'detail',
          meta: parseMeta(html, `${pathname}${slug}/`),
          navigation: parseNavigation(html),
          backLink: pathname,
          title,
          image: '',
          description: title,
          tags: [type],
          properties: [
            { label: 'Position', value: position },
            { label: 'Cost', value: cost },
            { label: 'Max level', value: maxLevel },
          ].filter((item) => item.value),
          tiles: [],
          awakenings: [],
        },
      };
    });

  return {
    kind: 'list',
    meta: parseMeta(html, pathname),
    navigation: parseNavigation(html),
    items,
  };
}

function parseTagsListPage(html, pathname) {
  const items = html
    .split('<div class="Default_item_item__')
    .slice(1)
    .map((part) => {
      const block = `<div class="Default_item_item__${part}`;
      const id = getMatch(block, /data-id="([^"]+)"/i);
      const titleHtml = getMatch(block, /Default_item_title__[^"]*">([\s\S]*?)<\/div>/i);
      const title = stripHtml(titleHtml.replace(/<a[\s\S]*$/i, ''));
      const description = stripHtml(getMatch(block, /Default_item_desc__[^"]*">([\s\S]*?)<\/div>/i));
      const slug = slugify(id || title);

      return {
        id,
        href: `${pathname}${slug}/`,
        slug,
        title,
        type: 'Tag',
        rarity: '',
        image: '',
        props: [],
        inlineDetail: {
          kind: 'detail',
          meta: parseMeta(html, `${pathname}${slug}/`),
          navigation: parseNavigation(html),
          backLink: pathname,
          title,
          image: '',
          description,
          tags: [],
          properties: [{ label: 'Tag ID', value: id }].filter((item) => item.value),
          tiles: [],
          awakenings: [],
        },
      };
    })
    .filter((item) => item.slug && item.title);

  return {
    kind: 'list',
    meta: parseMeta(html, pathname),
    navigation: parseNavigation(html),
    items,
  };
}

function parseHomePage(html, pathname) {
  const downloads = extractAll(
    html,
    /<a class="Index_download_button__[^"]*"[^>]*data-type="([^"]+)"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
    (match) => ({
      platform: decodeHtml(match[1]),
      href: decodeHtml(match[2]),
      label: stripHtml(getMatch(match[3], /<span>([\s\S]*?)<\/span>/i)) || DOWNLOAD_LABELS[match[1]] || match[1],
    }),
  );

  const slides = extractAll(
    html,
    /<div class="Slider_item__[^"]*"[^>]*data-position="([^"]+)"[^>]*>([\s\S]*?)<a class="Slider_item_link__[^"]*"[^>]*href="([^"]+)"[^>]*><\/a><\/div>/g,
    (match) => ({
      position: Number(match[1]) || 0,
      background_css: extractStyleValue(
        getMatch(match[2], /<span class="Slider_item_bg__[^"]*" style="([^"]+)"/i),
      ),
      image: decodeHtml(getMatch(match[2], /<img class="Slider_item_img__[^"]*" src="([^"]+)"/i)),
      title: stripHtml(getMatch(match[2], /<div class="Slider_item_title__[^"]*">([\s\S]*?)<\/div>/i)),
      subtitle: '',
      href: decodeHtml(match[3]),
    }),
  );

  const cards = [];
  const wideBanner = html.match(
    /<div class="Index_banner__[^"]*"[^>]*data-type="wide"[^>]*>([\s\S]*?)<a class="Index_banner_link__[^"]*"[^>]*href="([^"]+)"[^>]*><\/a><\/div>/i,
  );

  if (wideBanner) {
    cards.push({
      position: 0,
      card_size: 'wide',
      background_css: extractStyleValue(
        getMatch(wideBanner[1], /<span class="Index_banner_bg__[^"]*" style="([^"]+)"/i),
      ),
      image: decodeHtml(getMatch(wideBanner[1], /<img class="Index_banner_img__[^"]*" src="([^"]+)"/i)),
      title: stripHtml(getMatch(wideBanner[1], /<div class="Index_banner_title__[^"]*">([\s\S]*?)<\/div>/i)),
      subtitle: stripHtml(getMatch(wideBanner[1], /<div class="Index_banner_announce__[^"]*">([\s\S]*?)<\/div>/i)),
      href: decodeHtml(wideBanner[2]),
    });
  }

  cards.push(
    ...extractAll(
      html,
      /<a class="Index_index_item__[^"]*"[^>]*data-position="([^"]+)"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
      (match) => ({
        position: Number(match[1]) || 0,
        card_size: 'tile',
        background_css: extractStyleValue(
          getMatch(match[3], /<span class="Index_index_item_bg__[^"]*" style="([^"]+)"/i),
        ),
        image: decodeHtml(getMatch(match[3], /<img class="Index_index_item_image__[^"]*" src="([^"]+)"/i)),
        title: stripHtml(getMatch(match[3], /<span class="Index_index_item_title__[^"]*">([\s\S]*?)<\/span>/i)),
        subtitle: '',
        href: decodeHtml(match[2]),
      }),
    ),
  );

  return {
    kind: 'home',
    meta: parseMeta(html, pathname),
    navigation: parseNavigation(html),
    downloads,
    slides,
    cards,
  };
}

function parseDetailPage(html, pathname) {
  const authorityTitle = stripHtml(getMatch(html, /Elem_card_god_label__[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i));

  if (authorityTitle) {
    const tileBlocks = html
      .split('<div class="Elem_card_section__')
      .slice(1)
      .map((block) => {
        const heading = stripHtml(getMatch(block, /Elem_card_subtitle__[^"]*">([\s\S]*?)<\/div>/i));
        const lines = extractAll(
          block,
          /Elem_card_auth_prop_head_title__[^"]*">([\s\S]*?)<\/div>[\s\S]*?Elem_card_auth_prop_head_prc__[^"]*">([\s\S]*?)<\/div>/g,
          (match) => {
            const title = stripHtml(match[1]);
            const value = stripHtml(match[2]);
            return value ? `${title}: ${value}` : title;
          },
        );

        return { heading, lines };
      })
      .filter((block) => block.heading || block.lines.length > 0);

    return {
      kind: 'detail',
      meta: parseMeta(html, pathname),
      navigation: parseNavigation(html),
      backLink: decodeHtml(getMatch(html, /<a class="content_back" href="([^"]+)"/i)),
      title: authorityTitle,
      image: decodeHtml(getMatch(html, /<img class="Elem_image_icon__[^"]*" src="([^"]+)"/i)),
      description: `Authority options for ${authorityTitle}`,
      tags: [],
      properties: [],
      tiles: tileBlocks,
      awakenings: [],
    };
  }

  const tags = extractAll(
    html,
    /<div class="Elem_card_tags_item__[^"]*"[^>]*>([^<]+)<\/div>/g,
    (match) => stripHtml(match[1]),
  );

  const properties = extractAll(
    html,
    /<div class="Elem_card_main_prop__[^"]*"[^>]*><p>([^<]+)<\/p><span[^>]*>([\s\S]*?)<\/span><\/div>/g,
    (match) => ({
      label: stripHtml(match[1]).replace(/:\s*$/, ''),
      value: stripHtml(match[2]),
    }),
  );

  const tileBlocks = extractAll(
    html,
    /<div class="Elem_card_tiles_col(?:2)?__[^"]*">([\s\S]*?)<\/div><\/div>?/g,
    (match) => {
      const heading = stripHtml(getMatch(match[1], /<div class="Elem_card_props_lvl__[^"]*">([\s\S]*?)<\/div>/i));
      const lines = extractPropLines(match[1]);

      return {
        heading,
        lines,
      };
    },
  ).filter((block) => block.heading || block.lines.length > 0);

  const uniquePropBlocks = [];
  const propSegments = html.split(/<div class="Elem_card_props__[^"]*"[^>]*prop-type="([^"]+)"[^>]*>/g);

  for (let index = 1; index < propSegments.length; index += 2) {
    const propType = propSegments[index];
    const blockHtml = propSegments[index + 1] || '';
    const lines = extractPropLines(blockHtml);

    if (lines.length === 0) {
      continue;
    }

    uniquePropBlocks.push({
      heading: uniquePropBlockTitle(propType),
      lines,
    });
  }

  const awakenings = html
    .split('<div class="Elem_card_awakening_block___hH8A"')
    .slice(1)
    .map((block) => ({
      code: getMatch(block, /awakening="([^"]+)"/i),
      title: stripHtml(getMatch(block, /<div class="Elem_card_awakening_block_title__[^"]*"[^>]*>([\s\S]*?)<\/div>/i)),
      lines: extractPropLines(block),
    }))
    .filter((block) => block.code);

  return {
    kind: 'detail',
    meta: parseMeta(html, pathname),
    navigation: parseNavigation(html),
    backLink: decodeHtml(getMatch(html, /<a class="content_back" href="([^"]+)"/i)),
    title: stripHtml(getMatch(html, /<div class="Elem_card_title__[^"]*">([\s\S]*?)<\/div>/i)),
    image: decodeHtml(getMatch(html, /<img class="Elem_image_icon__[^"]*" src="([^"]+)"/i)),
    description: stripHtml(getMatch(html, /<div class="Elem_card_desc__[^"]*"><span[^>]*>([\s\S]*?)<\/span>/i)),
    tags,
    properties,
    tiles: [...uniquePropBlocks, ...tileBlocks],
    awakenings,
  };
}

export async function fetchRaw(pathname) {
  const html = await fetchHtml(pathname);
  return {
    path: normalizeContentPath(pathname),
    html,
  };
}

export async function fetchPage(pathname) {
  const normalizedPath = normalizeContentPath(pathname);
  const html = await fetchHtml(normalizedPath);
  const { section, slug } = parseContentPath(normalizedPath);

  if (!section) {
    return parseHomePage(html, normalizedPath);
  }

  if (section && isRemoteSectionSupported(section) && slug) {
    return parseDetailPage(html, normalizedPath);
  }

  if (section && isRemoteSectionSupported(section)) {
    return parseListPage(html, normalizedPath);
  }

  return {
    kind: 'page',
    meta: parseMeta(html, normalizedPath),
    navigation: parseNavigation(html),
  };
}

export async function fetchSection(section) {
  if (!isRemoteSectionSupported(section)) {
    throw new Error(`Unsupported section: ${section}`);
  }

  return fetchPage(`/en/${section}/`);
}

export async function fetchSectionItem(section, slug) {
  if (!isRemoteSectionSupported(section)) {
    throw new Error(`Unsupported section: ${section}`);
  }

  return fetchPage(`/en/${section}/${slug}/`);
}
