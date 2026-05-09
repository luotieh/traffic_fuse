# traffic_fuse

基于 `https://code.yt-security.com/public/template` 创建的 Traffic Fuse 项目。

当前版本将 `traffic-go` / DeepSOC 自动驾驶后端重构放入模板后端目录 `template-backend/`，保留模板前端目录 `template-frontend/` 和根构建入口。

## 目录

- `template-backend/`: 当前可运行的 Go 后端，包含 DeepSOC 多 agent 自动驾驶、安全事件、聊天、RabbitMQ、PostgreSQL、ly_server 兼容接口等功能。
- `template-frontend/`: 模板前端工程，后续可在此接入业务页面。
- `Makefile`: 根构建入口，后端目标已指向 `template-backend/cmd/traffic-api`。

## 后端启动

```bash
cd template-backend
scripts/restart-local-api.sh
```

脚本使用本地 Go 编译，不构建 `traffic-go` Docker 镜像，只启动依赖容器 `postgres` 和 `rabbitmq`，避免 BuildKit 解析远端 metadata。

默认服务地址：

```text
http://127.0.0.1:9010/healthz
```

## 根目录构建

```bash
make backend
make dev
```

`make backend` 会使用 vendor 依赖构建后端二进制 `traffic-api`。
`make dev` 会进入 `template-backend` 并调用本地重启脚本。

## 版本来源

迁移来源提交：`trafficAnalysis/codex@00b236a`
标签：`v0.7.0-deepsoc-ai-analysis`
