# OpenFGA 本地预览

从宿主项目根目录启动：

```bash
docker compose -f docs/workflows/packages/openfga/compose.yml up -d
```

- Playground：<http://localhost:3000/playground>
- Playground 直达地址：<https://play.fga.dev/sandbox/?fga_api_host=127.0.0.1%3A8080&fga_api_scheme=http&fga_api_token=>
- HTTP API：<http://127.0.0.1:8080>

若 Edge 显示 `net::ERR_FAILED`，请允许 `https://play.fga.dev` 访问本地网络后刷新页面。
