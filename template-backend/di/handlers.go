package di

import (
	"context"
	"log/slog"
	"time"

	"my-biz-backend/boot"
	"my-biz-backend/example"
	"my-biz-backend/frontend"
	"my-biz-backend/traffic"

	"code.yt-security.com/public/core/v2/cache"
	"code.yt-security.com/public/core/v2/db"
	"code.yt-security.com/public/core/v2/product"
	"code.yt-security.com/public/core/v2/web"
	iamsdk "code.yt-security.com/public/sdk"
	"code.yt-security.com/public/sdk/authorize"
)

// Handlers 聚合所有模块 + 基础设施
type Handlers struct {
	Config  *boot.Config
	Web     *web.Web
	DB      *db.DB
	Cache   cache.Cache
	Product *product.SystemProduct
	IAM     *iamsdk.Client
	Example *example.Example
	Traffic *traffic.Traffic

	// ★ 追加新模块字段
	// Order   *order.Order
}

// RouteLoad 注册全局中间件 + 通用路由 + 模块路由
func (h *Handlers) RouteLoad() {
	engine := h.Web.GetRawWeb()
	engine.Use(web.MiddlewareRequestResponse())

	authGroup := engine.Group("/",
		h.IAM.Middleware().Authentication(),
		h.IAM.Middleware().Authorization(),
	)

	var ssoOpts *iamsdk.SSORoutesOptions
	if h.Config.SSO.CallbackURI != "" {
		ssoOpts = &iamsdk.SSORoutesOptions{
			CallbackURI:           h.Config.SSO.CallbackURI,
			SuccessRedirect:       h.Config.SSO.SuccessRedirect,
			CookieSecret:          []byte(h.Config.SSO.CookieSecret),
			TokenRelayCallbackURI: h.Config.SSO.TokenRelayCallbackURI,
		}
	}
	h.IAM.RegisterDefaultRoutes(engine, authGroup, iamsdk.DefaultRoutesOptions{
		SSO: ssoOpts,
		Audit: &iamsdk.AuditMiddlewareOptions{
			Domain:  h.Product.GetCode(),
			Enabled: true,
		},
	})

	var backends []authorize.BackendItem
	backends = append(backends, h.Example.RoutesWithGroup(authGroup)...)
	backends = append(backends, h.Traffic.RoutesWithGroup(authGroup)...)

	// ★ 追加新模块路由
	// backends = append(backends, h.Order.RoutesWithGroup(authGroup)...)

	h.syncBackends(backends)

	frontend.SetupSPA(engine, web.MiddlewareNotFound())
}

func (h *Handlers) syncBackends(backends []authorize.BackendItem) {
	if len(backends) == 0 || h.Config.IAM.ClientID == "" {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := h.IAM.Authorize.SyncBackends(ctx, h.Config.IAM.ClientID, backends); err != nil {
		slog.Error("sync backends to IAM failed", "err", err)
		return
	}
	slog.Info("[+] 后端接口已同步到 IAM", "count", len(backends))
}

// Shutdown 优雅关闭
func (h *Handlers) Shutdown() {
	if h.Traffic != nil {
		h.Traffic.Shutdown()
	}
	h.IAM.Close()
}
