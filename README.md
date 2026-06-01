# Undecember Directus + Next

这是一个前后端分离项目：

- `directus/`：Directus 内容后台、schema 脚本、种子数据导入脚本。
- `web/`：Next.js 前端，所有页面内容通过 Directus REST API 读取。
- `web/public/image/`：本地静态资源库，前端运行时不再依赖参考站图片 URL。
- `backend/`、`scripts/`、`frontend/`：参考站抓取和镜像辅助工具，用于生成或更新种子数据。

## 本地启动

要求：

- Docker Desktop
- Node.js 20+
- npm

1. 准备环境变量

```bash
cp directus/.env.example directus/.env
cp web/.env.example web/.env.local
```

在 `directus/.env` 中设置自己的 `KEY`、`SECRET`、`ADMIN_PASSWORD`、`ADMIN_TOKEN`。

在 `web/.env.local` 中把 `DIRECTUS_STATIC_TOKEN` 设置为同一个 `ADMIN_TOKEN`。

2. 启动 Directus

```bash
docker compose up -d
```

后台地址：

```text
http://127.0.0.1:8055/admin
```

3. 创建 Directus 数据模型

```bash
DIRECTUS_URL=http://127.0.0.1:8055 \
DIRECTUS_STATIC_TOKEN=your-admin-token \
node directus/schema/apply-schema.mjs
```

4. 导入本地种子数据

```bash
DIRECTUS_URL=http://127.0.0.1:8055 \
DIRECTUS_STATIC_TOKEN=your-admin-token \
node directus/seed/import-to-directus.mjs
```

5. 同步固定术语词库到 Directus

```bash
DIRECTUS_URL=http://127.0.0.1:8055 \
DIRECTUS_STATIC_TOKEN=your-admin-token \
node directus/seed/sync-terminology-from-fallback.mjs
```

6. 启动前端

```bash
cd web
npm install
npm run build
npm run start -- --hostname 127.0.0.1 -p 3000
```

前端地址：

```text
http://127.0.0.1:3000/en
```

## 数据说明

- 内容数据保存在 Directus 数据库中。
- 首次初始化使用 `directus/seed/generated/reference-seed.json`。
- 固定术语保存在 `terminology_entries` / `terminology_entries_translations`，前端会优先读取 Directus 里的术语，代码词库只做兜底。
- 图片资源保存在 `web/public/image/`，例如 `/image/runes/Skill/Icon_Skill_BattleCry_01.png`。
- 运行时不需要从 `https://undecember.thein.ru` 读取图片或页面数据。

## 重新生成种子数据

如果需要重新从本地参考镜像生成 seed：

```bash
UNDECEMBER_SOURCE=local \
node directus/seed/generate-reference-seed.mjs runes authority uniques runemaster tags essences coins potions materials runecast
```

如果需要把已有 Directus 中的参考站绝对地址改成本地路径：

```bash
DIRECTUS_URL=http://127.0.0.1:8055 \
DIRECTUS_STATIC_TOKEN=your-admin-token \
node directus/seed/localize-reference-data.mjs
```

## GitHub 提交

当前项目已经配置 `.gitignore`，会排除：

- Directus 本地数据库和上传目录
- 本地 `.env` 密钥文件
- Next.js 构建缓存和 `node_modules`
- 调试截图和日志
- 可重新生成的参考站镜像目录

如果本机 Git 可用，可以执行：

```bash
git init
git add .
git commit -m "Initial Undecember Directus Next system"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
