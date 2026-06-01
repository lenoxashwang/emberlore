const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

const guide = {
  title: '内容维护说明',
  summary:
    '这个页面用于告诉编辑同学：技能、遗物、精华等详情页的标题、简介、标签、头部属性、等级数值、觉醒说明，以及固定术语，分别应该去 Directus 的哪个集合修改。',
  content: `一、先记住一个原则
1. 英文原文改英文主表。
2. 简中、繁中、法语、日语、俄语、韩语等语言改对应的 translations 表。
3. 固定词汇尽量走 terminology_entries / terminology_entries_translations，不要在每条内容里重复维护。

二、技能/装备详情页常改位置
1. 页面标题、简介、稀有度、获取方式、限制武器
   - 英文：content_entries
   - 其他语言：content_entries_translations
   - 常改字段：title、description、rarity、acquisition_method、weapon_requirement
2. 详情页标签（例如 Attack、Projectile、Fire）
   - 英文：entry_tags
   - 其他语言：entry_tags_translations
   - 字段：label
3. 详情页头部属性对（例如 等级、属性、购买章节、限制武器 等）
   - 英文：entry_properties
   - 其他语言：entry_properties_translations
   - 字段：label、value
4. 等级/品阶/数值描述区块
   - 区块标题（例如 Rune Level 1 / Rune Level 45 / Rune Grade）
     * 英文：entry_stat_blocks
     * 其他语言：entry_stat_blocks_translations
     * 字段：title
   - 区块里的逐行说明
     * 英文：entry_stat_lines
     * 其他语言：entry_stat_lines_translations
     * 字段：content
5. 觉醒效果
   - 分组标题 Source / Origin / Verity 由系统按 code 自动生成，不建议手工改标题。
   - 觉醒逐行说明
     * 英文：entry_awakening_lines
     * 其他语言：entry_awakening_lines_translations
     * 字段：content

三、图片文件维护
1. 技能图标、装备图标、横幅图等，统一放在 Directus Files 里维护。
2. 当前系统会把本地 public/image 下的图片同步进 Directus 文件库。
3. 图片文件管理位置：
   - Directus 左侧 Files
   - 推荐查看文件夹：Emberlore Assets
4. 内容表中的 image_url / icon_url / hero_image_url 现在保存的是 Directus 文件 ID，并且后台字段使用文件选择器，不再手工输入字符串。
5. 前台会自动把这个文件 ID 转成可访问的图片地址。
6. 如果你重新导入了英文基础数据，记得再执行一次图片同步脚本，确保图片字段重新指向 Directus Files。

四、固定术语维护
1. 固定标签、属性标题、筛选词、稀有度、武器类型等，优先维护 terminology_entries / terminology_entries_translations。
2. 示例：
   - Attack -> 攻击 / 攻擊
   - Ancient -> 古代 / 古代
   - Source -> 本源 / 本源
3. 如果一个词会在很多页面重复出现，优先入术语表，不要分散到每条内容里单独翻译。

五、推荐维护顺序
1. 先在英文主表确认 base_source_key 对应的英文记录。
2. 再去对应 translations 表选择 locale。
3. locale 选择语言，base_source_key 选择英文主记录，source_key 会自动生成。
4. 改完以后刷新前台页面检查效果。

六、常见问题
1. 某个语言页面还有英文残留：先查 translations 表是否有对应记录，再查术语表是否已经补齐。
2. 等级 1 有翻译、等级 45 没翻译：优先补 entry_stat_lines_translations；如果只是数字不同，前端会尽量复用翻译模板。
3. 觉醒标题不对：检查 code 是否为 s / o / v，不要直接手改 title。
4. 想改技能详情页标题下面那段简介：去 content_entries_translations.description。`,
};

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

await request('/items/maintenance_guide', {
  method: 'PATCH',
  body: JSON.stringify(guide),
});

process.stdout.write('maintenance guide upsert completed\n');
