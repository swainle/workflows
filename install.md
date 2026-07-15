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
python docs/workflows/install.py
pnpm docs:workflows:check
```

## 更新 workflows

```bash
python docs/workflows/install.py
```

安装器会自动切换到 `latest` 分支，并通过 fast-forward 拉取其最新提交。

第二次运行安装器不会覆盖已经修改的项目文档。
