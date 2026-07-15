# 通用安装

## 需要什么

- Git
- Python 3.10+
- Node.js 20+
- pnpm 9+
- GitHub CLI `gh`

`gh` 需要人工安装并登录：

```bash
gh auth login
```

## 安装 workflows

在业务项目根目录执行：

```bash
git submodule add -b latest https://github.com/swainle/workflows.git docs/workflows
python docs/workflows/install.py --branch latest
pnpm docs:workflows:check
```

## 更新 workflows

```bash
python docs/workflows/install.py --branch latest
```

通过 `--branch <分支>` 指定 workflows 分支；省略时默认使用 `latest`。安装器会切换分支、通过 fast-forward 拉取最新提交，并同步宿主项目 `.gitmodules` 中的分支设置。

例如改用 `main`：

```bash
python docs/workflows/install.py --branch main
```

第二次运行安装器不会覆盖已经修改的项目文档。
