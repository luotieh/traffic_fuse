# IAM 业务子系统后端模板

基于 **core/web + core/db + core/cache + IAM SDK + Wire DI** 的业务后端脚手架。
与 IAM 共享同一套基础设施，开发者只需写业务代码。

## 目录结构

```
├── cmd/server/main.go              # 启动入口
├── config.toml                      # 配置（TOML，qcfg 加载）
├── boot/
│   ├── build.go                     # 产品信息 + 构建信息（ldflags 注入）
│   ├── cache.go                     # LoadCache（Redis / 内存自动回退）
│   ├── config.go                    # LoadConfig（qcfg）
│   ├── database.go                  # LoadDB（core/db）
│   ├── iam.go                       # LoadIAM（IAM SDK）
│   └── web.go                       # LoadWeb（core/web）
├── di/
│   ├── handlers.go                  # Handlers 聚合体 + RouteLoad + Shutdown
│   ├── wire.go                      # Wire 注入声明
│   └── wire_gen.go                  # Wire 生成代码
├── model/
│   └── example.go                   # ★ 业务 Model
├── example/                         # ★ 示例业务模块
│   ├── example-contract/            #   接口定义
│   │   └── contract.go
│   ├── example.go                   #   模块入口 + RoutesWithGroup
│   ├── example-handler.go           #   Handler（使用 web.Resp/ValidationJson）
│   ├── example-service.go           #   Service 实现
│   └── wire.go                      #   WireSet
├── Makefile
├── Dockerfile
└── go.mod
```

## 核心设计

### 与 IAM 共享基础设施

| 能力 | 来源 | 说明 |
|------|------|------|
| Web 框架 | `core/web` | 自带 CORS/Recovery/RequestID/Security，`ListenAndServeWithSignal` 优雅关闭 |
| 数据库 | `core/db` | GORM 封装，支持 MySQL/PostgreSQL/SQLite |
| 缓存 | `core/cache` | Redis 优先，自动回退内存缓存 |
| 配置 | `core/os/qcfg` | TOML 配置加载 |
| 产品信息 | `core/product` | 进程/系统信息采集 |
| 响应格式 | `core/web` | `web.Resp` / `web.RespContent` / `web.RespContentWithNum` |
| 参数校验 | `core/web` | `web.ValidationJson` / `web.ValidationUri` |
| 认证授权 | `IAM SDK` | 中间件 + 权限校验 + 数据权限过滤 |

### 模块化单体

```
order/
├── order-contract/contract.go    # ServiceOrder interface
├── order.go                      # NewOrder + RoutesWithGroup
├── order-handler.go              # Handler
├── order-service.go              # Service（依赖 *db.DB）
└── wire.go                       # WireSet
```

### Wire DI

添加模块只需 3 步：
1. 创建模块 + `wire.go`（WireSet）
2. `di/wire.go` → `wire.Build()` 追加 WireSet
3. `di/handlers.go` → `Handlers` struct + `RouteLoad` 追加模块
4. `wire ./di/...`

## 快速开始

```toml
# config.toml
[web]
host  = "0.0.0.0"
port  = 8090
debug = true

[db]
driver   = "mysql"
host     = "127.0.0.1"
port     = 3306
user     = "root"
password = "123456"
database = "my_biz"

[iam]
base_url      = "http://localhost:8080"
client_id     = "your-client-id"
client_secret = "your-client-secret"
```

```bash
make run            # 运行
make build          # 编译（注入构建信息）
make wire           # 重新生成 Wire
make docker-build   # Docker
```

## 完整鉴权能力

### 全局中间件层（RouteLoad 已自动注册）

| 中间件 | 作用 | 说明 |
|--------|------|------|
| `Authentication()` | Token 内省 → 注入 `CurrentUser` + `DataScope` | 每次请求自动完成 |
| `Authorization()` | 接口级授权（路径匹配） | 根据 IAM 后台配置的后端接口权限，自动拦截无权路径 |

### 接口权限工作机制

**无需手动维护权限码**。模板采用 `Authorization()` 中间件 + `SyncBackends()` 自动注册的方式：

1. 模块 `RoutesWithGroup()` 返回 `[]authorize.BackendItem`，声明所有接口
2. 应用启动时自动同步到 IAM（`/authorize/backends/sync`），IAM 按 `path + method` 注册
3. `Authorization()` 中间件每次请求自动匹配 `path + method`，查询当前用户是否有权访问
4. **业务开发者只需声明接口列表，权限分配在 IAM 管理后台完成**

如果需要在**同一接口内部**做更细粒度控制（罕见场景），可使用 `RequirePermission`：

```go
g.POST("/orders/batch", h.IAM.Middleware().RequirePermission("order:batch"), handler)
```

### 数据权限（行级过滤）

```go
// 在 Service 层自动按用户数据范围过滤
mapping := permission.DefaultFieldMapping
db.Scopes(iamsdk.DataFilterScope(c, mapping)).Find(&orders)
```

6 种数据范围：`self`（仅自己）、`department`（本部门）、`department_tree`（本部门及下级）、
`organize`（本组织）、`organize_tree`（本组织及下级）、`all`（全部）。

### SSO 路由（自动注册）

配置 `[sso]` 段后自动注册：

| 路由 | 说明 |
|------|------|
| `GET /sso/login` | 发起 SSO 登录，302 跳转 IAM 授权页 |
| `GET /sso/callback` | IAM 回调，用授权码换 token 后跳转前端 |
| `GET /callback` | 上级平台 Token Relay 回调（可选） |

### Me 路由（当前用户 API，自动注册）

| 路由 | 说明 |
|------|------|
| `GET /me/profile` | 当前用户聚合信息（user/roles/apps/orgs/depts/positions） |
| `GET /me/menus?app_id=` | 当前用户可见菜单（按应用分组） |
| `GET /me/routes?app_id=` | 通用前端路由记录（可直接喂给 Vue Router） |
| `GET /me/access-codes` | 权限码集合（用于 v-perm 按钮级控制） |
| `GET /me/notifications` | 通知列表 |
| `GET /me/unread-count` | 未读消息数 |

### 速查表

| 需求 | 代码 |
|------|------|
| 获取当前用户 | `user, _ := iamsdk.GetCurrentUser(c)` |
| 获取数据权限 | `scope, _ := iamsdk.GetDataScope(c)` |
| 数据权限过滤 | `db.Scopes(iamsdk.DataFilterScope(c, mapping))` |
| 接口级授权 | `Authorization()` 全局中间件自动按 path+method 鉴权，无需手写 |
| 参数校验 | `web.ValidationJson(c, &req)` |
| 成功响应 | `web.RespContent(c, web.Success, data)` |
| 分页响应 | `web.RespContentWithNum(c, web.Success, count, items)` |
| 同步后端接口 | 启动时自动同步，无需手动操作 |

## 减少与 IAM 的交互

### 当前交互频率

每个请求经 `Authentication()` 中间件时：
1. **Token 内省** → 调 IAM `/auth/oauth2/introspect`（每次）
2. **角色查询** → 调 IAM `/identity/users/{id}/roles`（SDK 缓存，TTL 内不重复）
3. **数据范围** → 调 IAM `/authorize/engine/data-scope`（SDK 缓存，TTL 内不重复）

### 优化手段

| 手段 | 效果 | 配置方式 |
|------|------|----------|
| **SDK 内部缓存** | 角色/数据范围/菜单/Profile 命中缓存后 0 次调用 | `CacheTTL` 默认 5min，可通过 SDK Config 调大 |
| **增大 CacheTTL** | 减少 2/3 轮询（角色+数据范围），代价是权限变更延迟 | `iamsdk.Config{CacheTTL: 15 * time.Minute}` |
| **JWKS 本地验签**（规划中） | Token 内省变为本地 JWT 验证，完全消除第 1 步 HTTP 调用 | 待 IAM 暴露 `/.well-known/jwks.json` 后，SDK 自动切换 |

**推荐配置**：对延迟不敏感的子系统，设 `CacheTTL: 10~30min`，可将 90% 以上的请求缩减到 0 次 IAM 调用。
