# Web 项目

安装方法见 [install.md](../install.md)。

建议在 `issue/issue.md` 中用反引号写出页面和组件路径：

```md
- 登录页：`apps/web/src/pages/login/page.tsx`
- 表单组件：`packages/ui/src/login-form.tsx`
```

也可以执行 Prompt 时手动加入：

```bash
pnpm -s work:frontend:web \
  --include apps/web/src/pages/booking \
  --include packages/ui/src
```

前端阶段检查默认、加载、空、失败、禁用、响应式和交互状态。接口设计放在 API 阶段，服务端授权放在 Permission 阶段。
