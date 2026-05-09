package category

import (
	"code.yt-security.com/public/sdk/authorize"
)

// Routes 返回分类子模块的声明式路由定义。
//
// 由父模块（example.go）嵌入到自己的 Children 中，
// 实现模块化组合 + 自动路由注册。
func (h *HandlerCategory) Routes() []authorize.Route {
	return []authorize.Route{
		{Name: "分类列表", Method: "GET", Handler: h.List, Enabled: true},
		{Name: "创建分类", Method: "POST", Handler: h.Create, Enabled: true},
		{Name: "更新分类", Path: ":id", Method: "PUT", Handler: h.Update, Enabled: true},
		{Name: "删除分类", Path: ":id", Method: "DELETE", Handler: h.Delete, Enabled: true},
	}
}
