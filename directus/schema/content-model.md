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
4. 去 `entry_tags` 添加标签。
5. 去 `entry_properties` 添加顶部属性。
6. 去 `entry_stat_blocks` 新增 `Rune Level 1`、`Rune Level 45` 等块。
7. 去 `entry_stat_lines` 给每个块补逐行信息。
8. 如果有觉醒，再去 `entry_awakening_groups` 和 `entry_awakening_lines` 录入。

## Future Upgrade Path

首版模型优先保证能快速导入和手工维护。后续可以升级：

- 把 `section_slug` 改成正式 relation
- 把 `entry_source_key` / `block_source_key` 改成 M2O/O2M
- 把 `image_url` 改成 `directus_files` 关系
- 增加 `translations`、`draft/publish`、`revision` 和审核流

