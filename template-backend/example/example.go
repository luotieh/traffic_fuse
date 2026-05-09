package example

import (
	"my-biz-backend/example/category"
	"my-biz-backend/model"

	"code.yt-security.com/public/core/v2/db"
	"code.yt-security.com/public/sdk/authorize"
	"github.com/gin-gonic/gin"
)

// Example 模块聚合入口
type Example struct {
	handler         *HandlerExample
	categoryHandler *category.HandlerCategory
}

func NewExample(
	handler *HandlerExample,
	categoryHandler *category.HandlerCategory,
	database *db.DB,
) *Example {
	initModel(database)
	return &Example{
		handler:         handler,
		categoryHandler: categoryHandler,
	}
}

// RoutesWithGroup 声明式注册路由并收集 BackendItem。
//
// 使用 authorize.RegisterRoutes 一次声明同时完成：
//  1. Gin 路由注册
//  2. BackendItem 收集（用于同步到 IAM）
//
// 子功能模块（如 category）通过 Routes() 返回声明，由父模块组合嵌入。
func (m *Example) RoutesWithGroup(e *gin.RouterGroup) []authorize.BackendItem {
	return authorize.RegisterRoutes(e.Group("/example"), []authorize.Route{
		{
			Name: "示例模块", Enabled: true,
			Children: []authorize.Route{
				{Name: "示例列表", Path: "list", Method: "GET", Handler: m.handler.List, Enabled: true},
				{Name: "示例详情", Path: ":id", Method: "GET", Handler: m.handler.GetByID, Enabled: true},
				{Name: "创建示例", Method: "POST", Handler: m.handler.Create, Enabled: true},
				{Name: "更新示例", Path: ":id", Method: "PUT", Handler: m.handler.Update, Enabled: true},
				{Name: "删除示例", Path: ":id", Method: "DELETE", Handler: m.handler.Delete, Enabled: true},

				// ── 子功能模块：分类管理（独立目录、独立 handler/service） ──
				{
					Name: "示例分类", Path: "categories", Enabled: true,
					Children: m.categoryHandler.Routes(),
				},
			},
		},
	})
}

func initModel(database *db.DB) {
	session, _ := database.GetDBSession()
	_ = session.AutoMigrate(&model.Example{}, &model.Category{})
}
