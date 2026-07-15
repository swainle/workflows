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
git submodule add -b latest <仓库地址> docs/workflows
python docs/workflows/install.py
pnpm docs:workflows:check
```

## 更新 workflows

```bash
git submodule update --remote docs/workflows
python docs/workflows/install.py
```

第二次运行安装器不会覆盖已经修改的项目文档。
