# 技术选型

本文件记录宿主项目已经确认的技术选型、版本或型号及其用途。项目现有实现优先；准确版本以锁文件、运行时配置和镜像标签为准，不使用未经确认的 `latest`。

## 架构与设计模式

- 后端默认采用 DDD（领域驱动设计）：按 Bounded Context 划分聚合、实体、值对象、领域服务与仓储端口，应用服务编排用例，依赖方向由外向内
- API 必须作为独立应用服务，放在 `apps/api` workspace，独立构建与部署，不与 Web 或其他端共进程

## Web 与服务端

- Next.js
- Route Handlers
- Middleware
- shadcn/ui：Web 前端默认组件库

## 数据

- PostgreSQL
- Prisma
- Redis：缓存、分布式锁、限流和临时状态

## 异步处理

- BullMQ：后台任务、延迟任务、重试和 Worker
- RabbitMQ：按需用于跨服务消息路由、可靠投递和复杂消费拓扑

不要让 Redis 原生队列、BullMQ 和 RabbitMQ 重复承担同一种任务。消息代理只负责传递，长任务由独立 Worker 执行。

## 权限

- OpenFGA：细粒度授权
- 身份认证优先复用宿主项目现有方案；没有现有方案时，使用成熟认证服务或框架，由 Backend 维护可过期、可撤销的 Session
- Web 默认使用服务端设置的 `HttpOnly`、`Secure`、`SameSite` Cookie；Mobile 与 Desktop 使用系统浏览器登录和系统安全存储；Mini Program 使用平台临时 Code 由 Backend 换取身份
- 各平台身份统一映射到稳定内部 `user_id`；认证只确认身份，业务授权仍由服务端和 OpenFGA 判断
- 不自行实现 OAuth Server，不默认使用自签 JWT，不把 Access Token 或 Refresh Token 放入浏览器 `localStorage`

## 部署

- Docker Compose：本地或单机服务编排
- 动态升级必须配合健康检查、流量切换、兼容窗口和回滚方案

## 质量检查

从宿主项目现有脚本识别并运行语法检查、类型检查、测试和构建命令，不在文档中虚构工具或脚本。
