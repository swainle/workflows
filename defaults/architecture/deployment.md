# 部署设计

应用的启动、停止、迁移、构建和发布命令默认使用 `pnpm`；宿主项目已有其他包管理器时沿用现状。

## Development

- 使用 `docker/compose.yml` 和 `docker/dev.env`。
- 支持本地构建、调试和开发数据初始化。

## Test

- 使用 `docker/compose.yml` 和 `docker/test.env`。
- 使用隔离数据执行集成、迁移和回归测试。

## Production

- 使用 `docker/compose.yml` 和 `docker/prod.env`。
- 部署锁定版本的镜像，并在发布后检查健康状态。

## 迁移

数据库和权限变化必须说明执行顺序、兼容窗口、备份、失败停止条件和恢复方法。

## 回滚

保留上一个稳定版本。健康检查失败时回滚应用。数据库变化必须说明恢复方法。

## 安全

只记录环境变量名称，不记录真实密钥。
