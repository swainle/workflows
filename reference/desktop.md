# 桌面端

使用 Tauri 在 `apps/desktop` 创建桌面应用。

## 快速开始

先按 Tauri 官方前置要求安装 Rust 和当前系统的构建工具，再在 monorepo 根目录执行：

```bash
rustc --version
cargo --version
pnpm create tauri-app apps/desktop
cd apps/desktop
pnpm install
pnpm tauri dev
```

初始化时按提示选择前端语言和框架。`pnpm tauri dev` 会启动开发服务器、编译 Rust 并打开桌面窗口。

## 命令

- `pnpm tauri dev`：启动桌面应用并支持开发调试。
- `pnpm tauri build`：生成当前平台的安装包。
- `rustc --version`、`cargo --version`：检查 Rust 工具链。

## 作用

创建包含前端项目和 `src-tauri` 原生壳层的桌面应用；Tauri CLI 已作为项目依赖安装，不需要全局安装。

参考：[Tauri 创建项目](https://v2.tauri.app/start/create-project/)。
