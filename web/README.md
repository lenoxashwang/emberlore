# Next Frontend

这个目录按 `create-next-app` 的 App Router 结构手工搭好了前端骨架，目标是只从 Directus 取数据。

官方 `create-next-app` 文档：

- [CLI: create-next-app](https://nextjs.org/docs/app/api-reference/create-next-app)

如果你们的环境里已经有 `npm`，建议用官方命令重新初始化一次，再把这里的 `src/` 覆盖进去：

```bash
npx create-next-app@latest web --ts --app --src-dir --use-npm --skip-install
```

之后把以下目录和文件保留：

- `src/`
- `package.json`
- `tsconfig.json`
- `next.config.ts`

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
NEXT_PUBLIC_DIRECTUS_URL=http://127.0.0.1:8055
DIRECTUS_STATIC_TOKEN=
```

如果 Public 角色已经开放读取权限，`DIRECTUS_STATIC_TOKEN` 可以不填。

