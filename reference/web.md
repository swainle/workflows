# Web

使用 Next.js 在 `apps/web` 创建 Web 项目。

## 快速开始

在 monorepo 根目录执行：

```bash
pnpm create next-app@latest apps/web --use-pnpm --disable-git
cd apps/web
pnpm dev
```

浏览器打开 `http://localhost:3000`。Next.js 开发服务器已经包含热更新，不需要额外安装调试 CLI。

## 命令

- `pnpm dev`：启动本地开发服务器。
- `pnpm build`：执行生产构建。
- `pnpm lint`：执行代码检查。

## 作用

创建带有 `package.json` 的 Next.js 应用，pnpm workspace 和 Turborepo 会自动识别 `apps/web`。

参考：[Next.js create-next-app CLI](https://nextjs.org/docs/pages/api-reference/cli/create-next-app)。
