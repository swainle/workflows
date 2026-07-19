# 部署设计

## Development

- 使用 `docker/development.compose.yml` 和 `docker/development.env`。
- 支持本地构建、调试和开发数据初始化。

## Test

- 使用 `docker/test.compose.yml` 和 `docker/test.env`。
- 使用隔离数据执行集成、迁移和回归测试。

## Production

- 使用 `docker/production.compose.yml` 和 `docker/production.env`。
- 部署锁定版本的镜像，并在发布后检查健康状态。

## 迁移

数据库和权限变化必须说明执行顺序、兼容窗口、备份、失败停止条件和恢复方法。

## 回滚

保留上一个稳定版本。健康检查失败时回滚应用。数据库变化必须说明恢复方法。

## 安全

只记录环境变量名称，不记录真实密钥。
