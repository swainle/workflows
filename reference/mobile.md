# 移动端

使用 Flutter 在 `apps/mobile` 创建移动应用。

## 快速开始

先安装 Flutter SDK 和目标平台工具链，再在 monorepo 根目录执行：

```bash
flutter doctor
flutter create apps/mobile
cd apps/mobile
flutter devices
flutter run
```

`flutter doctor` 会报告缺失的 Android、iOS 或桌面开发工具；`flutter run` 会提示选择可用设备并提供热重载和调试能力。

## 命令

- `flutter doctor`：检查 Flutter 和平台工具链。
- `flutter devices`：列出模拟器和已连接设备。
- `flutter run`：启动应用并进入调试模式。
- `flutter analyze`：执行静态检查。
- `flutter test`：运行测试。

## 作用

创建 Flutter 原生项目。它可以放在 monorepo 的 `apps/mobile`，但不需要伪装成 pnpm workspace 包，日常命令直接使用 Flutter CLI。

参考：[Flutter CLI](https://docs.flutter.dev/reference/flutter-cli)。
