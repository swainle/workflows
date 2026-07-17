# 移动端项目

适用于原生 iOS、原生 Android、React Native、Flutter 等项目。

在 `issue/issue.md` 中写出页面、导航、平台配置和共享模块路径。通过 `--include` 加入 iOS、Android 或跨端源码。前端阶段要分别检查权限请求、弱网、离线、前后台切换和不同屏幕尺寸。

使用 `pnpm -s work:frontend:mobile` 生成移动端实现 Prompt。

平台构建、签名变量名称和发布说明放在 Deployment 阶段。文档不得记录真实证书和密钥。
