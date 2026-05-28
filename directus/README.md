# Directus Backend Blueprint

这个目录放的是面向 Directus 的后端设计和落地辅助脚本。

当前机器没有 `npm`、`pnpm`、`yarn`，也没有 Docker，所以我没法在这里直接把 Directus 实例跑起来；但初始化所需的模型、种子数据导出脚本、导入脚本，以及前端对接方式都已经准备好了。

## 官方初始化方式

Directus 官方文档提供两种常见方式：

- Docker 自托管快速开始：
  [Self-Hosting Quickstart](https://docs.directus.io/self-hosted/quickstart)
- CLI / NPM 方式：
  [Quickstart Guide](https://docs.directus.io/getting-started/quickstart)

Directus 也支持通过 schema snapshot/apply 在环境之间迁移模型：

- [Directus CLI Schema Commands](https://docs.directus.io/self-hosted/cli)

## 目录

- `schema/collections.json`
  机器可读的内容模型定义
- `schema/content-model.md`
  内容模型设计说明
- `schema/manual-setup-checklist.md`
  在 Directus 后台手工建模的清单
- `seed/generate-reference-seed.mjs`
  根据参考站导出适合 Directus 的种子 JSON
- `seed/import-to-directus.mjs`
  把种子 JSON 导入到 Directus Items API

## 推荐落地方式

1. 先用官方方式起一个新的 Directus 项目。
2. 按 `schema/manual-setup-checklist.md` 建 collection 和字段。
3. 给 Public 或前端专用角色开只读权限。
4. 运行 `seed/generate-reference-seed.mjs` 生成种子文件。
5. 运行 `seed/import-to-directus.mjs` 导入参考站数据。
6. 前端 `web/` 直接通过 Directus REST API 读取数据。

## 环境变量

导入脚本需要：

- `DIRECTUS_URL`
- `DIRECTUS_STATIC_TOKEN`

示例：

```bash
DIRECTUS_URL=http://127.0.0.1:8055 \
DIRECTUS_STATIC_TOKEN=your-admin-token \
node directus/seed/import-to-directus.mjs
```

## 模型原则

- 优先保证手工录入和批量导入都简单。
- 所有内容都带 `source_key`，便于幂等导入和后续迁移。
- 首版用字符串键连接子表，避免 Directus 关系建模没完成前卡住录入流程。
- 后续如果你们希望编辑体验更强，可以把 `entry_source_key` / `block_source_key` 升级成正式关系字段。

