import { resolveLocale, type SupportedLocale } from '@/lib/i18n';
import type { ContentEntry, EntryAwakeningGroup, EntryProperty, EntryStatBlock, EntryTag } from '@/lib/cms';
import zhTwTermMap from '@/lib/generated/zh-tw-term-map.json';

export type TerminologyMap = Record<string, string>;
const ZH_CN_EXTRA_TERM_MAP: TerminologyMap = {
  'Mana Cost': '消耗魔力',
  Cooldown: '冷却时间',
  'Triggers Immediately': '立即发动',
  'Physical Element': '物理属性',
  'Fire Element': '火焰属性',
  'Cold Element': '冰霜属性',
  'Lightning Element': '闪电属性',
  'Resource Cost Amplification': '资源消耗增幅',
  'Base Speed Dampening': '基础速度减幅',
  'Physical DMG': '物理伤害',
  'Fire DMG': '火焰伤害',
  'Cold DMG': '冰霜伤害',
  'Lightning DMG': '闪电伤害',
  'Melee DMG': '近战伤害',
  Gain: '获得',
  Effect: '效果',
  Dampening: '减幅',
  'Cannot link': '无法连接',
  'DMG Amplification': '伤害增幅',
  'DMG Dampening': '伤害减幅',
  'Attack Speed Amplification': '攻击速度增幅',
  'Attack Speed': '攻击速度',
  'Attack Critical DMG': '攻击暴击伤害',
  'Attack Hit Rate': '攻击命中率',
  'Hit Rate': '命中率',
  'Critical Chance': '暴击率',
  'Armor Penetration': '护甲穿透',
  'Element Penetration': '元素穿透',
  'Fire Penetration': '火焰穿透',
  'Chill Chance': '寒冷几率',
  'Shock Chance': '触电几率',
  'Stun Chance': '眩晕几率',
  'Stun Rate': '眩晕率',
  'Max Use Count': '最大使用次数',
  'Shout Range': '战吼范围',
  'Shout Duration': '战吼持续时间',
  'No equipped weapon range': '武器范围攻击',
  'Fire Explosion Fire DMG': '火焰爆炸火焰伤害',
  'Fire Explosion Debuff Stacks on hitting a boss': '火爆减益命中首领时叠加',
  'Fire Explosion Debuff Stacks on hit': '火爆减益命中时叠加',
  'Fire Explosion Debuff Stacks': '火爆减益叠加',
  'Strike DMG Multiplier Amplification per stack': '每层打击伤害乘数增幅',
  'Strike DMG Multiplier': '打击伤害乘数',
  s: '秒',
};
const ZH_TW_EXTRA_TERM_MAP: TerminologyMap = {
  'Mana Cost': '消耗魔力',
  Cooldown: '冷卻時間',
  'Triggers Immediately': '立即發動',
  'Physical Element': '物理屬性',
  'Fire Element': '火焰屬性',
  'Cold Element': '冰霜屬性',
  'Lightning Element': '閃電屬性',
  'Resource Cost Amplification': '資源消耗增幅',
  'Base Speed Dampening': '基礎速度減幅',
  'Physical DMG': '物理傷害',
  'Fire DMG': '火焰傷害',
  'Cold DMG': '冰霜傷害',
  'Lightning DMG': '閃電傷害',
  'Melee DMG': '近戰傷害',
  Gain: '獲得',
  Effect: '效果',
  Dampening: '減幅',
  'Cannot link': '無法連接',
  'DMG Amplification': '傷害增幅',
  'DMG Dampening': '傷害減幅',
  'Attack Speed Amplification': '攻擊速度增幅',
  'Attack Speed': '攻擊速度',
  'Attack Critical DMG': '攻擊暴擊傷害',
  'Attack Hit Rate': '攻擊命中率',
  'Hit Rate': '命中率',
  'Critical Chance': '暴擊率',
  'Armor Penetration': '護甲穿透',
  'Element Penetration': '元素穿透',
  'Fire Penetration': '火焰穿透',
  'Chill Chance': '惡寒機率',
  'Shock Chance': '觸電機率',
  'Stun Chance': '暈眩機率',
  'Stun Rate': '暈眩率',
  'Max Use Count': '最大使用次數',
  'Shout Range': '吶喊範圍',
  'Shout Duration': '吶喊持續時間',
  'No equipped weapon range': '武器範圍攻擊',
  'Fire Explosion Fire DMG': '火焰爆炸火焰傷害',
  'Fire Explosion Debuff Stacks on hitting a boss': '火爆減益命中首領時疊加',
  'Fire Explosion Debuff Stacks on hit': '火爆減益命中時疊加',
  'Fire Explosion Debuff Stacks': '火爆減益疊加',
  'Strike DMG Multiplier Amplification per stack': '每層打擊傷害乘數增幅',
  'Strike DMG Multiplier': '打擊傷害乘數',
  s: '秒',
};

const ZH_CN_TERM_MAP = {
  '1-handed Axe': '单手斧',
  '1-handed Blunt': '单手钝器',
  '1-handed sword': '单手剑',
  '2-handed Axe': '双手斧',
  '2-handed Blunt': '双手钝器',
  '2-handed sword': '双手剑',
  'Area of Effect': '范围效果',
  'Attack Enhance': '攻击强化',
  'Authority Prefix Options': '权能前缀词条',
  'Authority Suffix Options': '权能后缀词条',
  'Authority Unique Options': '权能专属词条',
  'Auction house': '拍卖行',
  'Base Stats': '基础属性',
  'Black Market': '黑市',
  Blunt: '钝器',
  'Bosses': '首领',
  'Bowgun': '弩枪',
  'Buy for cash': '现金购买',
  'Buy for diamond': '钻石购买',
  Cards: '卡牌',
  'Cards type': '卡牌类型',
  'Chaos Dungeon': '混沌地下城',
  'Content reward': '内容奖励',
  'Crowd Control': '控制',
  Dagger: '匕首',
  'DMG by status': '异常伤害',
  'Drop Shop': '掉落 商店',
  Duration: '持续时间',
  'Enhance Potion': '强化药剂',
  Equipment: '装备',
  'Equipment type': '装备类型',
  Essences: '精华',
  'Essences type': '精华类型',
  'Event reward': '活动奖励',
  'Hardcore Mode': '硬核模式',
  'How to get': '获取方式',
  'Item sale': '道具出售',
  Link: '连接',
  'Link Rune': '连接符文',
  'Link Skill': '连接符文',
  'LinkSkill': '连接符文',
  'Max level': '最大等级',
  Materials: '材料',
  'Materials type': '材料类型',
  'Material type': '材料类型',
  'Min. rarity': '最低稀有度',
  'Move Attack': '移动攻击',
  'MP Potion': '法力药剂',
  Option: '词缀',
  'Option tags': '词缀标签',
  'Paid Shop': '付费商店',
  'Position': '部位',
  Potions: '药剂',
  'Potions type': '药剂类型',
  'Randome Bounty': '随机悬赏',
  Rarity: '稀有度',
  'Repeat DoT': '持续伤害重复',
  'Repeat Strike': '连击',
  'Rune Grade': '符文品阶',
  'Rune Knight': '符文骑士',
  Rune: '符文',
  'Rune master': '符文大师',
  'Rune stat': '符文属性',
  'Rune tags': '符文标签',
  'Rune type': '符文类型',
  Runes: '符文',
  'Seal and HP Potion': '封印与生命药剂',
  'Season Content': '赛季内容',
  'Skill Rune': '技能符文',
  Sort: '排序',
  'Sort.': '排序',
  'Sort...': '排序',
  Spaulders: '护肩',
  Scepter: '权杖',
  'Steel Bow': '钢弓',
  'Tag ID': '标签 ID',
  'To buy in': '可购买章节',
  'Trials of Power': '力量试炼',
  'Unique Dungeon': '独特地下城',
  Uniques: '独特装备',
  'Use on': '适用对象',
  'Weapon Range': '武器范围',
  'All weapons': '全部武器',
  Abyssling: '深渊体',
  Accuracy: '命中',
  Agility: '敏捷',
  Alchemy: '炼金',
  AlchemyMaterial: '炼金材料',
  Amplification: '增幅',
  Ancient: '远古',
  Aquilla: '天鹰',
  Area: '范围',
  Armor: '护甲',
  Attack: '攻击',
  Aura: '光环',
  Axe: '斧',
  Barrier: '屏障',
  Belt: '腰带',
  Bind: '束缚',
  Bleeding: '流血',
  Blindness: '致盲',
  Block: '格挡',
  Blow: '打击',
  Bow: '弓',
  Buff: '增益',
  Bounty: '悬赏',
  Burn: '点燃',
  Capri: '摩羯',
  Casthor: '仙后',
  Chain: '连锁',
  Chance: '几率',
  Channel: '引导',
  Channeling: '引导中',
  Chaos: '混沌',
  Chill: '冰缓',
  Coin: '货币',
  Cold: '寒冷',
  Common: '普通',
  Cooldown: '冷却',
  Cost: '消耗',
  Count: '数量',
  Crafting: '制造',
  Critical: '暴击',
  Damage: '伤害',
  Debuff: '减益',
  Decrease: '减益',
  Defense: '防御',
  'Defense Enhance': '防御强化',
  'Defense Seal': '防御封印',
  Descent: '降临',
  Dexterity: '敏捷',
  Diamond: '钻石',
  Disassemble: '分解',
  Dodge: '闪避',
  DoT: '持续伤害',
  Drop: '掉落',
  Dungeon: '地下城',
  Elemental: '元素',
  Energy: '能量',
  Enhance: '强化',
  Enchant: '附魔',
  Eunos: '尤诺斯',
  Eunos2: '尤诺斯',
  Fire: '火焰',
  Freeze: '冻结',
  Gear: '装备',
  Gem: '宝石',
  Gold: '金币',
  GrowthMaterial: '成长材料',
  Guild: '公会',
  Gloves: '手套',
  Hamal: '哈马尔',
  Helmet: '头盔',
  Hit: '命中',
  Holy: '神圣',
  HP: '生命',
  Immune: '免疫',
  Intellect: '智力',
  Intelligence: '智力',
  Kill: '击杀',
  Knockback: '击退',
  Legendary: '传奇',
  Leo: '狮子',
  Level: '等级',
  Lightning: '闪电',
  Magic: '魔法',
  Magazine: '弹匣',
  Mana: '法力',
  Market: '市场',
  Melee: '近战',
  Minion: '召唤物',
  Minion2: '召唤物',
  Mission: '任务',
  Miraseti: '米拉塞蒂',
  Mode: '模式',
  Movement: '移动',
  Necklace: '项链',
  Normal: '普通',
  Ore: '矿石',
  Origin: '起源',
  Overheat: '过热',
  PaidShop: '付费商店',
  Pass: '通行证',
  Pauldrons: '护肩',
  Penetration: '穿透',
  Physical: '物理',
  Pierce: '穿透',
  Poison: '毒素',
  Potion: '药剂',
  Position2: '位置',
  Projectile: '投射物',
  Quiver: '箭袋',
  Raid: '突袭',
  Range: '范围',
  Ranking: '排名',
  Rare: '稀有',
  Recovery: '恢复',
  Reflect: '反射',
  Regeneration: '再生',
  Requires: '需求属性',
  Resistance: '抗性',
  Ring: '戒指',
  S3hard: '第 3 赛季困难',
  S4hard: '第 4 赛季困难',
  S5hard: '第 5 赛季困难',
  sale: '出售',
  Seal: '封印',
  Sentry: '哨兵',
  Sephdar: '赛夫达',
  Shield: '盾牌',
  Shoes: '鞋子',
  Shop: '商店',
  Shadow: '暗影',
  Shock: '感电',
  Shout: '战吼',
  Skill: '技能',
  SkillSkin: '技能皮肤',
  Source: '本源',
  Speed: '速度',
  Spell: '法术',
  Spica: '角宿一',
  Staff: '法杖',
  Stat: '属性',
  Status: '异常',
  'Special Effect': '特殊效果',
  Strength: '力量',
  Strike: '打击',
  Stun: '眩晕',
  Sword: '剑',
  Synthesis: '合成',
  Tag: '标签',
  Tier: '阶级',
  Toggle: '切换',
  'Toggle DMG': '切换伤害',
  'Toggle Effect': '切换效果',
  Totem: '图腾',
  Trade: '交易',
  Trap: '陷阱',
  Type: '类型',
  Unique: '独特',
  UniqueDungeon: '独特地下城',
  Use: '使用',
  Verity: '真理',
  Vesper: '织女',
  Wand: '魔杖',
  Weapon: '武器',
  Weapons: '武器',
  Wound: '创伤',
} as const;

const EMPTY_TERM_MAP: TerminologyMap = {};

const TERM_MAP_BY_LOCALE: Partial<Record<SupportedLocale, TerminologyMap>> = {
  'zh-CN': {
    ...ZH_CN_TERM_MAP,
    ...ZH_CN_EXTRA_TERM_MAP,
  },
  'zh-TW': {
    ...(zhTwTermMap as TerminologyMap),
    ...ZH_TW_EXTRA_TERM_MAP,
  },
};

function isChineseLocale(locale: SupportedLocale) {
  return locale === 'zh-CN' || locale === 'zh-TW';
}

const TERM_ENTRIES_BY_LOCALE = Object.fromEntries(
  Object.entries(TERM_MAP_BY_LOCALE).map(([locale, termMap]) => [
    locale,
    Object.entries(termMap).sort((left, right) => {
      const leftWordCount = left[0].split(/\s+/).length;
      const rightWordCount = right[0].split(/\s+/).length;

      if (leftWordCount !== rightWordCount) {
        return rightWordCount - leftWordCount;
      }

      return right[0].length - left[0].length;
    }),
  ]),
) as Partial<Record<SupportedLocale, Array<[string, string]>>>;

const TERM_ENTRIES_CACHE = new WeakMap<TerminologyMap, Array<[string, string]>>();
const AWAKENING_TITLE_BY_CODE: Record<string, string> = {
  s: 'Source',
  source: 'Source',
  o: 'Origin',
  origin: 'Origin',
  v: 'Verity',
  verity: 'Verity',
};

function sortTermEntries(termMap: TerminologyMap) {
  return Object.entries(termMap).sort((left, right) => {
    const leftWordCount = left[0].split(/\s+/).length;
    const rightWordCount = right[0].split(/\s+/).length;

    if (leftWordCount !== rightWordCount) {
      return rightWordCount - leftWordCount;
    }

    return right[0].length - left[0].length;
  });
}

function getTermEntries(locale: SupportedLocale, termMap: TerminologyMap) {
  const fallback = TERM_MAP_BY_LOCALE[locale];

  if (fallback && fallback === termMap) {
    return TERM_ENTRIES_BY_LOCALE[locale] || [];
  }

  const cached = TERM_ENTRIES_CACHE.get(termMap);
  if (cached) {
    return cached;
  }

  const entries = sortTermEntries(termMap);
  TERM_ENTRIES_CACHE.set(termMap, entries);
  return entries;
}

export function getFallbackTerminologyMap(locale: string): TerminologyMap {
  return TERM_MAP_BY_LOCALE[resolveLocale(locale)] || EMPTY_TERM_MAP;
}

function matchRuneLevel(locale: SupportedLocale, value: string) {
  if (!isChineseLocale(locale)) {
    return null;
  }

  const match = value.match(/^Rune Level\s+(\d+)$/);
  if (!match) {
    return null;
  }

  return locale === 'zh-TW' ? `符文等級 ${match[1]}` : `符文等级 ${match[1]}`;
}

function matchActToken(locale: SupportedLocale, value: string) {
  if (!isChineseLocale(locale)) {
    return null;
  }

  const match = value.match(/^Act\s?(\d+(?:-\d+)?)$/);
  return match ? `第${match[1]}章` : null;
}

function translatePhraseSequence(locale: SupportedLocale, value: string, termMap: TerminologyMap) {
  const termEntries = getTermEntries(locale, termMap);

  if (termEntries.length === 0) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const runeLevel = matchRuneLevel(locale, trimmed);
  if (runeLevel) {
    return runeLevel;
  }

  const actToken = matchActToken(locale, trimmed);
  if (actToken) {
    return actToken;
  }

  if (Object.prototype.hasOwnProperty.call(termMap, trimmed)) {
    return termMap[trimmed];
  }

  const tokens = trimmed.split(/\s+/);
  const output: string[] = [];

  for (let index = 0; index < tokens.length; ) {
    let matched = false;

    for (const [source, target] of termEntries) {
      const sourceTokens = source.split(/\s+/);
      const candidate = tokens.slice(index, index + sourceTokens.length).join(' ');

      if (candidate === source) {
        output.push(target);
        index += sourceTokens.length;
        matched = true;
        break;
      }
    }

    if (matched) {
      continue;
    }

    const directAct = matchActToken(locale, tokens[index]);
    output.push(directAct || tokens[index]);
    index += 1;
  }

  return output.join(' ');
}

export function localizeTerminology(locale: string, value?: string | null, terminologyMap?: TerminologyMap) {
  const resolvedLocale = resolveLocale(locale);
  const text = String(value || '').trim();

  if (!text || resolvedLocale === 'en') {
    return value || '';
  }

  return translatePhraseSequence(
    resolvedLocale,
    text,
    terminologyMap || getFallbackTerminologyMap(resolvedLocale),
  );
}

function canonicalFieldValue(
  locale: SupportedLocale,
  baseValue?: string | null,
  displayValue?: string | null,
  terminologyMap?: TerminologyMap,
) {
  const baseText = String(baseValue || '').trim();
  const displayText = String(displayValue || '').trim();

  if (displayText && (!baseText || displayText !== baseText)) {
    return displayText;
  }

  const source = baseText || displayText;
  return source ? localizeTerminology(locale, source, terminologyMap) : displayValue || '';
}

export function localizeEntryTerminology(
  entry: ContentEntry,
  locale: string,
  terminologyMap?: TerminologyMap,
): ContentEntry {
  const resolvedLocale = resolveLocale(locale);

  if (resolvedLocale === 'en') {
    return entry;
  }

  return {
    ...entry,
    entry_type: localizeTerminology(resolvedLocale, entry.entry_type, terminologyMap),
    list_stat: canonicalFieldValue(resolvedLocale, entry.base_list_stat, entry.list_stat, terminologyMap),
    list_props: canonicalFieldValue(resolvedLocale, entry.base_list_props, entry.list_props, terminologyMap),
    rarity: canonicalFieldValue(resolvedLocale, entry.base_rarity, entry.rarity, terminologyMap),
    acquisition_method: canonicalFieldValue(
      resolvedLocale,
      entry.base_acquisition_method,
      entry.acquisition_method,
      terminologyMap,
    ),
    weapon_requirement: canonicalFieldValue(
      resolvedLocale,
      entry.base_weapon_requirement,
      entry.weapon_requirement,
      terminologyMap,
    ),
  };
}

export function localizeTagTerminology(tag: EntryTag, locale: string, terminologyMap?: TerminologyMap): EntryTag {
  const resolvedLocale = resolveLocale(locale);

  if (resolvedLocale === 'en') {
    return tag;
  }

  return {
    ...tag,
    label: canonicalFieldValue(resolvedLocale, tag.base_label, tag.label, terminologyMap),
  };
}

export function localizePropertyTerminology(
  property: EntryProperty,
  locale: string,
  terminologyMap?: TerminologyMap,
): EntryProperty {
  const resolvedLocale = resolveLocale(locale);

  if (resolvedLocale === 'en') {
    return property;
  }

  return {
    ...property,
    label: canonicalFieldValue(resolvedLocale, property.base_label, property.label, terminologyMap),
    value: canonicalFieldValue(resolvedLocale, property.base_value, property.value, terminologyMap),
  };
}

export function localizeBlockTerminology(
  block: EntryStatBlock,
  locale: string,
  terminologyMap?: TerminologyMap,
): EntryStatBlock {
  const resolvedLocale = resolveLocale(locale);

  if (resolvedLocale === 'en') {
    return block;
  }

  return {
    ...block,
    title: localizeTerminology(resolvedLocale, block.title, terminologyMap),
  };
}

export function localizeAwakeningTerminology(
  awakening: EntryAwakeningGroup,
  locale: string,
  terminologyMap?: TerminologyMap,
): EntryAwakeningGroup {
  const resolvedLocale = resolveLocale(locale);
  const canonicalTitle = resolveAwakeningTitle(awakening);

  if (!canonicalTitle) {
    return awakening;
  }

  return {
    ...awakening,
    title: resolvedLocale === 'en'
      ? canonicalTitle
      : localizeTerminology(resolvedLocale, canonicalTitle, terminologyMap),
  };
}

function resolveAwakeningTitle(awakening: EntryAwakeningGroup) {
  const code = String(awakening.code || '').trim().toLowerCase();
  if (code && AWAKENING_TITLE_BY_CODE[code]) {
    return AWAKENING_TITLE_BY_CODE[code];
  }

  const title = String(awakening.title || '').trim();
  if (!title) {
    return '';
  }

  const normalizedTitle = title.toLowerCase();
  return AWAKENING_TITLE_BY_CODE[normalizedTitle] || title;
}

export function localizeLineTerminology<T extends { content: string; base_content?: string }>(
  line: T,
  locale: string,
  terminologyMap?: TerminologyMap,
): T {
  const resolvedLocale = resolveLocale(locale);

  if (resolvedLocale === 'en') {
    return line;
  }

  return {
    ...line,
    content: canonicalFieldValue(resolvedLocale, line.base_content, line.content, terminologyMap),
  };
}
