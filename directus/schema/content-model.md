# Content Model

## Goal

这个模型不是单纯为“抓站”设计的，而是为了让 Directus 成为后续正式内容后台：

- 可以手工新增符文、材料、金币、药水等内容
- 可以从参考站批量导入初始数据
- 可以让 Next 前端只依赖 Directus API
- 后续官方 API 接好之后，仍然可以把 Directus当作运营后台

## Why `source_key`

所有 collection 都带 `source_key`，原因有三个：

1. 参考站批量导入时可以幂等 upsert。
2. 手工内容和抓取内容可以共存。
3. 后续切到官方 API 时，迁移对照简单。

`source_key` 建议格式：

- section: `en:runes`
- entry: `en:runes:AbsorbEnergy`
- tag: `en:runes:AbsorbEnergy:tag:1`
- property: `en:runes:AbsorbEnergy:property:1`
- stat block: `en:runes:AbsorbEnergy:block:1`

## Collections

### `site_settings`

单例，全站级配置。

主要字段：

- `site_name`
- `default_locale`
- `logo_text`
- `copyright_text`
- `reference_url`

### `maintenance_guide`

单例，给 Directus 后台编辑人员看的中文维护说明页。

主要字段：

- `title`
- `summary`
- `content`

建议内容：

- 技能/装备标题与简介去哪里改
- 标签去哪里改
- 顶部属性对去哪里改
- 等级区块和逐行数值去哪里改
- 觉醒效果去哪里改
- 固定术语应该走术语表，不要分散维护

### `navigation_links`

导航菜单项。

主要字段：

- `group_name`
  例如 `main`, `resources`
- `label`
- `href`
- `open_in_new_tab`
- `sort_order`

### `download_links`

首页下载按钮。

主要字段：

- `platform`
  例如 `steam`, `app_store`, `google_play`, `floor`
- `label`
- `href`
- `icon_url`
- `sort_order`

### `home_slides`

首页主轮播。

主要字段：

- `title`
- `subtitle`
- `image_url`
- `background_css`
- `href`
- `sort_order`

### `home_featured_cards`

首页大卡片和网格卡片。

主要字段：

- `card_size`
  建议值：`wide`, `tile`
- `title`
- `subtitle`
- `image_url`
- `background_css`
- `href`
- `sort_order`

### `content_sections`

栏目定义。对应参考站里的：

- runes
- essences
- coins
- potions
- materials
- runecast
- authority
- uniques
- runemaster
- tags

主要字段：

- `slug`
- `title`
- `description`
- `hero_image_url`
- `icon_image_url`
- `theme_token`
- `sort_order`
- `status`

### `content_entries`

所有详情页内容的主表。用一张通用表承接不同类型内容。

主要字段：

- `section_slug`
- `entry_type`
  例如 `rune`, `essence`, `coin`, `material`
- `slug`
- `title`
- `subtitle`
- `description`
- `image_url`
- `video_url`
- `rarity`
- `acquisition_method`
- `weapon_requirement`
- `seo_title`
- `seo_description`
- `status`

说明：

- 当前图片字段仍是字符串字段，但后台界面已配置成文件选择器，实际保存 Directus 文件 ID。
- 对现有 `web/public/image` 资源，可以通过 `directus/seed/sync-public-images-to-directus.mjs` 批量同步到 Directus Files。

### `terminology_entries`

固定术语主表。用于维护全站复用的标签、属性标题、筛选标题、稀有度、武器类型等。

主要字段：

- `term_key`
  稳定的术语标识，例如 `attack`、`rune-type`
- `group_name`
  例如 `ui`、`property`、`detail`、`term`
- `base_value`
  英文基准值，例如 `Attack`
- `note`
- `sort_order`

### `terminology_entries_translations`

固定术语翻译表。

主要字段：

- `base_source_key`
- `locale`
- `value`

### `entry_tags`

详情页标签。

字段：

- `entry_source_key`
- `label`
- `sort_order`

### `entry_properties`

详情页顶部属性对。

字段：

- `entry_source_key`
- `label`
- `value`
- `sort_order`

### `entry_stat_blocks`

详情页的大块内容。

示例：

- `Rune Level 1`
- `Rune Level 45`
- `Rune Grade`

字段：

- `entry_source_key`
- `title`
- `variant`
- `sort_order`

### `entry_stat_lines`

每个 stat block 下的逐行内容。

字段：

- `block_source_key`
- `content`
- `sort_order`

### `entry_awakening_groups`

觉醒分组。

示例：

- `Source`
- `Origin`
- `Verity`

字段：

- `entry_source_key`
- `code`
- `title`
- `sort_order`

### `entry_awakening_lines`

觉醒组里的逐行内容。

字段：

- `awakening_source_key`
- `content`
- `sort_order`

## Manual Entry Workflow

以“手工新增一个符文”为例：

1. 在 `content_entries` 新增一条记录。
2. `section_slug` 设为 `runes`。
3. 填 `slug`、`title`、`description`、`image_url`、`rarity` 等主字段。
4. 如果图片来自本地素材目录，建议先同步到 Directus Files，再在后台文件选择器里直接选图。
5. 去 `entry_tags` 添加标签。
6. 去 `entry_properties` 添加顶部属性。
7. 去 `entry_stat_blocks` 新增 `Rune Level 1`、`Rune Level 45` 等块。
8. 去 `entry_stat_lines` 给每个块补逐行信息。
9. 如果有觉醒，再去 `entry_awakening_groups` 和 `entry_awakening_lines` 录入。

## Terminology Workflow

当一个词是“固定复用术语”而不是某个条目的自由文案时，优先放进 `terminology_entries`：

- 标签，例如 `Attack`、`Melee`
- 属性标题，例如 `How to get`、`Weapon`
- 筛选标题，例如 `Rune type`、`Option tags`
- 觉醒标题，例如 `Source`、`Origin`、`Verity`

这样新增语言时，只需要为术语补一条翻译，不需要在每个技能、装备里重复录入。

## Future Upgrade Path

首版模型优先保证能快速导入和手工维护。后续可以升级：

- 把 `section_slug` 改成正式 relation
- 把 `entry_source_key` / `block_source_key` 改成 M2O/O2M
- 把 `image_url` 改成真正的 `directus_files` 关系
- 增加 `translations`、`draft/publish`、`revision` 和审核流
