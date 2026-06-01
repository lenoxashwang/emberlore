# Manual Setup Checklist

这个清单用于你们把 Directus 实例起好以后，在后台里手工把数据模型建出来。

参考官方文档：

- [Directus Quickstart](https://docs.directus.io/getting-started/quickstart)
- [Collections](https://docs.directus.io/reference/system/collections)
- [Fields](https://docs.directus.io/reference/system/fields)

## 1. 创建项目

1. 起一个新的 Directus 项目。
2. 建一个管理员账号。
3. 在项目设置里确认时区、语言、文件存储策略。

## 2. 建 Collections

按下面顺序创建：

1. `site_settings`
2. `maintenance_guide`
3. `navigation_links`
4. `download_links`
5. `home_slides`
6. `home_featured_cards`
7. `content_sections`
8. `content_entries`
9. `terminology_entries`
10. `entry_tags`
11. `entry_properties`
12. `entry_stat_blocks`
13. `entry_stat_lines`
14. `entry_awakening_groups`
15. `entry_awakening_lines`

字段定义直接按 `collections.json`。

## 3. 建字段时的建议

- `source_key`：设为唯一。
- `description`、`background_css`、`content`：用 textarea / text。
- `status`：可以用 select，下拉值建议 `draft`, `published`, `archived`。
- `sort_order`：用 integer。
- `image_url`：当前仍是 string 字段，但后台界面应配置成 `file` 选择器，实际保存 Directus 文件 ID。

## 4. 角色和权限

Directus 默认 Public 无权限。参考官方 Quickstart，需要显式开放读权限。

建议：

- `Public`
  只给前端公开读的 collections 开 `read`
- `Editor`
  给内容运营同学，开内容 collections 的 `create/update/read`
- `Admin`
  保持默认

前端公开读取建议开放这些 collections 的 `read`：

- `site_settings`
- `navigation_links`
- `download_links`
- `home_slides`
- `home_featured_cards`
- `content_sections`
- `content_entries`
- `terminology_entries`
- `terminology_entries_translations`
- `entry_tags`
- `entry_properties`
- `entry_stat_blocks`
- `entry_stat_lines`
- `entry_awakening_groups`
- `entry_awakening_lines`

## 5. 导入初始数据

1. 先运行 `directus/seed/generate-reference-seed.mjs`
2. 再运行 `directus/seed/import-to-directus.mjs`
3. 再运行 `directus/seed/sync-terminology-from-fallback.mjs`
4. 再运行 `directus/seed/sync-public-images-to-directus.mjs`
5. 再运行 `directus/seed/upsert-maintenance-guide.mjs`

## 6. 手工新增一条符文

1. 在 `content_entries` 新增一条 `section_slug = runes` 的记录。
2. `source_key` 建议填 `en:runes:YourRuneSlug`。
3. `slug` 填 `YourRuneSlug`。
4. 补 `title`、`description`、`image_url`、`rarity` 等。
5. `image_url` 建议直接在后台文件选择器里选图，不再手工填路径。
6. 去 `entry_tags` 增加标签。
7. 去 `entry_properties` 增加属性。
8. 去 `entry_stat_blocks` 和 `entry_stat_lines` 补数值。

## 7. 维护固定术语

像 `Attack -> 攻击`、`Weapon -> 武器` 这种固定术语，不建议分散填在每一条内容里。

建议：

1. 英文基准词放在 `terminology_entries`
2. 各语言翻译放在 `terminology_entries_translations`
3. 前端统一读取这张术语表做固定字段翻译

## 8. 可选优化

- 给所有 collection 配置更友好的 icon。
- 给 `status`、`section_slug`、`entry_type` 配 select choices。
- 给编辑团队配置 Presets / Bookmarks。
- 后续如果需要更强的结构化关系，再把 `image_url` / `icon_url` 升级成真正的 `directus_files` relation。

## 9. 给运营同学的后台说明页

- `maintenance_guide` 是一个单例集合。
- 建议放中文说明，明确告诉编辑同学：
  - 标题/简介去 `content_entries_translations`
  - 标签去 `entry_tags_translations`
  - 头部属性去 `entry_properties_translations`
  - 等级数值去 `entry_stat_lines_translations`
  - 觉醒说明去 `entry_awakening_lines_translations`
  - 固定术语去 `terminology_entries_translations`
