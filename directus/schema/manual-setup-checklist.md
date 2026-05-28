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
2. `navigation_links`
3. `download_links`
4. `home_slides`
5. `home_featured_cards`
6. `content_sections`
7. `content_entries`
8. `entry_tags`
9. `entry_properties`
10. `entry_stat_blocks`
11. `entry_stat_lines`
12. `entry_awakening_groups`
13. `entry_awakening_lines`

字段定义直接按 `collections.json`。

## 3. 建字段时的建议

- `source_key`：设为唯一。
- `description`、`background_css`、`content`：用 textarea / text。
- `status`：可以用 select，下拉值建议 `draft`, `published`, `archived`。
- `sort_order`：用 integer。
- `image_url`：首版先用 string；后续需要素材库时再改成 `directus_files`。

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
- `entry_tags`
- `entry_properties`
- `entry_stat_blocks`
- `entry_stat_lines`
- `entry_awakening_groups`
- `entry_awakening_lines`

## 5. 导入初始数据

1. 先运行 `directus/seed/generate-reference-seed.mjs`
2. 再运行 `directus/seed/import-to-directus.mjs`

## 6. 手工新增一条符文

1. 在 `content_entries` 新增一条 `section_slug = runes` 的记录。
2. `source_key` 建议填 `en:runes:YourRuneSlug`。
3. `slug` 填 `YourRuneSlug`。
4. 补 `title`、`description`、`image_url`、`rarity` 等。
5. 去 `entry_tags` 增加标签。
6. 去 `entry_properties` 增加属性。
7. 去 `entry_stat_blocks` 和 `entry_stat_lines` 补数值。

## 7. 可选优化

- 给所有 collection 配置更友好的 icon。
- 给 `status`、`section_slug`、`entry_type` 配 select choices。
- 给编辑团队配置 Presets / Bookmarks。
- 后续把 `image_url` 替换成真正文件字段。

