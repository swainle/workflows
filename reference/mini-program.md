# 小程序

使用 Taro 在 `apps/mini-program` 创建微信小程序项目。

## 快速开始

先进入 monorepo 的 `apps` 目录，再初始化项目：

```bash
cd apps
pnpm dlx @tarojs/cli init mini-program
cd mini-program
pnpm install
pnpm dev:weapp
```

首次执行时按提示选择框架、语言和模板。构建完成后，使用微信开发者工具打开项目生成的微信小程序目录。

## 命令

- `pnpm dev:weapp`：监听文件并构建微信小程序开发版本。
- `pnpm build:weapp`：生成微信小程序生产版本。
- `pnpm dlx @tarojs/cli --version`：检查本次使用的 Taro CLI。

## 作用

无需全局安装 Taro CLI，直接创建可由微信开发者工具调试的小程序项目。

参考：[Taro 安装及使用](https://docs.taro.zone/docs/GETTING-STARTED)。
