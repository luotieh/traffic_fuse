# 业务子系统模板

基于 **IAM 统一身份认证平台** 的全栈业务子系统模板。  
前后端合并为单一 Go 二进制，开箱即用：认证、授权、SSO、菜单管理全部内置。

## Traffic Fuse 业务模块

本仓库按模板的“业务模块”方式接入 DeepSOC/traffic-analysis 后端能力：

- 模板后端原有 `boot/`、`di/`、`cmd/server/`、IAM 中间件和 Wire DI 结构保持不变。
- 业务模块位于 `template-backend/traffic/`。
- 模块在 `template-backend/di/handlers.go` 中注册，并挂载到 `/traffic/*path`。
- 原 DeepSOC 兼容接口路径整体保留在 `/traffic` 前缀下，例如 `/traffic/api/event/create`、`/traffic/internal/event/push`。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Naive UI + Vite + Pinia + TailwindCSS |
| 后端 | Go + Gin + GORM + Wire DI |
| 认证 | IAM SDK（OAuth2 + SSO Token Relay + PKCE） |
| 构建 | 前端 `//go:embed` 嵌入后端，一个二进制部署 |

## 快速开始

### 1. 创建项目

```bash
# 克隆模板
git clone https://code.yt-security.com/public/template.git my-biz
cd my-biz

# 移除模板 git 历史，初始化自己的仓库
rm -rf .git
git init
```

### 2. 重命名模块

将目录和 Go module 名替换为你的项目名（以 `order-system` 为例）：

```bash
# 重命名目录
mv template-backend order-backend
mv template-frontend order-frontend

# 替换 Go module 名
cd order-backend
# 将 go.mod 中 my-biz-backend 替换为你的 module 路径
# 例如：code.yt-security.com/your-org/order-backend
# 然后全局替换代码中的 import path
```

需要替换的关键标识：

| 位置 | 原值 | 替换为 |
|------|------|--------|
| `order-backend/go.mod` | `my-biz-backend` | 你的 module 路径 |
| `order-backend/` 所有 `.go` 文件 | `"my-biz-backend/...` | `"你的module/...` |
| `order-frontend/apps/web/.env` | `VITE_APP_TITLE` | 你的应用标题 |
| `order-frontend/apps/web/.env` | `VITE_APP_NAMESPACE` | 你的应用命名空间 |
| `order-frontend/apps/web/vite.config.mts` | `outDir` 路径 | 指向你的后端目录 |
| `Makefile` / `build.ps1` | `FRONTEND_DIR` / `BACKEND_DIR` | 你的目录名 |
| `.gitea/workflows/dev.yaml.template` | `__*__` 占位符 | 你的实际值 |

### 3. 在 IAM 注册应用

登录 IAM 管理后台 → **应用管理** → **新建应用**：

| 字段 | 值 |
|------|-----|
| 应用名称 | 你的业务系统名 |
| Client ID | 自定义（如 `order-system`） |
| Client Secret | 自动生成 |
| 回调地址 | `http://localhost:8090/callback`（本地） |

将生成的 `client_id` 和 `client_secret` 填入后端 `config.toml`。

### 4. 配置后端

编辑 `order-backend/config.toml`：

```toml
[web]
host  = "0.0.0.0"
port  = 8090          # 你的本地端口
debug = true

[db]
driver   = "mysql"
host     = "127.0.0.1"
port     = 3306
user     = "root"
password = "123456"
database = "order_db"  # 你的数据库

[iam]
base_url      = "http://localhost:8080"     # IAM 地址
client_id     = "order-system"              # ← 第 3 步的 Client ID
client_secret = "your-secret"               # ← 第 3 步的 Client Secret

[sso]
callback_uri             = "http://localhost:8090/callback"
success_redirect         = "http://localhost:8090/auth/sso-callback"
cookie_secret            = "at-least-16-bytes-secret-key!!"
token_relay_callback_uri = "http://localhost:8090/callback"
```

### 5. 安装依赖 & 启动

**前端开发模式**（HMR，API 代理到后端）：

```bash
cd order-frontend
pnpm install
pnpm dev        # 默认 http://localhost:5889
```

**后端**（需要先建数据库）：

```bash
cd order-backend
go run ./cmd/server/
```

**一键构建**（前后端合为单一二进制）：

```bash
# Linux / macOS
make all
./server

# Windows PowerShell
.\build.ps1 all
.\server.exe
```

### 6. 同步菜单到 IAM

启动后访问 **系统管理 → 系统初始化**，点击「同步菜单到 IAM」。  
然后在 IAM 后台 → **角色管理** → **菜单权限** 中为各角色分配可见菜单。

## 项目结构

```
├── .gitea/workflows/dev.yaml.template  # CI/CD 模板（Gitea Actions）
├── Makefile                            # Linux/macOS 构建
├── build.ps1                           # Windows 构建
│
├── template-backend/                   # Go 后端
│   ├── cmd/server/main.go             # 启动入口
│   ├── config.toml                    # 配置文件
│   ├── boot/                          # 基础设施初始化
│   ├── di/                            # Wire 依赖注入
│   │   └── handlers.go               # 路由注册 + SPA 嵌入
│   ├── example/                       # ★ 示例业务模块（参照此模块新增）
│   ├── model/                         # 数据模型
│   └── frontend/                      # 前端嵌入
│       ├── embed.go                   # //go:embed
│       ├── static.go                  # SPA 路由 + 缓存控制
│       └── dist/                      # 前端构建产物（git 忽略）
│
└── template-frontend/                  # Vue 前端
    ├── apps/web/
    │   ├── .env                       # 通用环境变量
    │   ├── vite.config.mts            # 构建配置（outDir → 后端）
    │   └── src/
    │       ├── router/
    │       │   ├── access.ts          # 菜单获取 + 降级逻辑
    │       │   └── routes/modules/    # 路由模块定义
    │       ├── views/system/init.vue  # 菜单同步初始化页
    │       ├── composables/           # 路由收集器
    │       ├── api/authorize/         # 菜单同步 API
    │       ├── permissions/           # 声明式权限系统
    │       └── utils/sso.ts           # SSO（Token Relay + PKCE）
    └── packages/                      # Vben Admin 内部包
```

## 添加新业务模块

### 后端

1. 创建模块目录：

```
order/
├── order-contract/contract.go    # ServiceOrder 接口定义
├── order.go                      # NewOrder + RoutesWithGroup
├── order-handler.go              # HTTP Handler
├── order-service.go              # 业务逻辑
└── wire.go                       # Wire Provider Set
```

2. 在 `di/wire.go` 的 `wire.Build()` 中追加 `order.WireSet`
3. 在 `di/handlers.go` 的 `Handlers` struct 中追加字段，在 `RouteLoad()` 中注册路由
4. 运行 `wire ./di/...` 重新生成

### 前端

在 `apps/web/src/router/routes/modules/` 下新建路由文件：

```typescript
import type { RouteRecordRaw } from 'vue-router';
import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: { icon: 'lucide:package', order: 10, title: '订单管理' },
    name: 'Order',
    path: '/order',
    redirect: '/order/list',
    children: [
      {
        name: 'OrderList',
        path: 'list',
        component: () => import('#/views/order/list.vue'),
        meta: {
          title: '订单列表',
          icon: 'lucide:list',
          // 声明按钮级权限（自动推导权限码：order:list:create）
          perms: [
            { action: 'create', title: '新增订单' },
            { action: 'delete', title: '删除订单' },
          ],
        },
      },
    ],
  },
];

export default routes;
```

新增路由后，重新在 **系统初始化** 页面点击同步即可。

## 内置能力

### 认证与授权

| 能力 | 说明 |
|------|------|
| Token 认证 | IAM SDK 中间件自动完成，每次请求注入 `CurrentUser` |
| 接口授权 | `Authorization()` 中间件按 `path + method` 自动鉴权 |
| 数据权限 | `DataFilterScope` 按用户数据范围行级过滤 |
| SSO 登录 | 后端 Token Relay（零前端配置）+ 可选前端 PKCE |
| 按钮权限 | `v-perm` 指令 + 声明式 `meta.perms` |

### 登录模式

| 模式 | 行为 |
|------|------|
| **混合模式**（默认） | 直接访问显示本地登录页；从 IAM 跳转时自动走 SSO |
| 纯 SSO | 设置 `.env` 中 `VITE_AUTH_MODE=sso` |
| 纯本地 | 保持 `VITE_AUTH_MODE=local`，不配 SSO |

### 菜单管理

前端采用 `accessMode: 'backend'` 模式，菜单由 IAM 统一管理：

1. 前端路由模块定义菜单结构和按钮权限
2. 管理员在「系统初始化」页面点击同步 → 推送到 IAM
3. IAM 后台为不同角色分配可见菜单
4. 用户登录后从后端获取已分配的菜单

若后端尚未同步菜单，前端自动降级为本地路由模式，确保管理员仍可访问。

## 部署

### 本地一键构建

```bash
make all        # Linux/macOS
.\build.ps1 all # Windows

# 产物：单一 server 二进制
./server        # 前后端均由此服务
```

### CI/CD

使用 `.gitea/workflows/dev.yaml.template`，替换占位符后启用：

| 占位符 | 说明 | 示例 |
|--------|------|------|
| `__APP_DISPLAY_NAME__` | 显示名称 | 订单系统 |
| `__ORGANIZE__` | Gitea 组织 | your-org |
| `__APP_NAME__` | 应用标识 | order-system |
| `__FRONTEND_DIR__` | 前端目录 | order-frontend |
| `__BACKEND_DIR__` | 后端目录 | order-backend |
| `__MODULE__` | Go module | code.yt-security.com/your-org/order-backend |
| `__DEV_PORT__` | 开发端口 | 8090 |

### K8s + Istio

CI 自动构建多架构 Docker 镜像并部署到 K8s。  
通过域名区分服务，所有服务共用同一端口（8080），由 Istio Gateway 路由。

## 环境变量说明

### 前端（`.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_APP_TITLE` | 页面标题 | 我的业务系统 |
| `VITE_APP_NAMESPACE` | 缓存前缀 | my-biz-web |
| `VITE_GLOB_API_URL` | API 前缀 | `/api` |
| `VITE_AUTH_MODE` | 登录模式 | `local` |

### 后端（`config.toml`）

详见 `template-backend/config.toml`，关键段：

- `[web]` — 监听地址和端口
- `[db]` — 数据库连接
- `[iam]` — IAM SDK 配置
- `[sso]` — SSO 回调和密钥
