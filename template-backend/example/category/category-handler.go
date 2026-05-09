package category

import (
	"my-biz-backend/model"
	"strconv"

	"code.yt-security.com/public/core/v2/web"
	"github.com/gin-gonic/gin"
)

type HandlerCategory struct {
	svc ServiceCategory
}

func NewHandlerCategory(svc ServiceCategory) *HandlerCategory {
	return &HandlerCategory{svc: svc}
}

func (h *HandlerCategory) List(c *gin.Context) {
	items, err := h.svc.List()
	if err != nil {
		web.Resp(c, web.InternalError)
		return
	}
	web.RespContent(c, web.Success, items)
}

type createCategoryReq struct {
	Name    string `json:"name" binding:"required"`
	Sort    int    `json:"sort"`
	Enabled *bool  `json:"enabled"`
}

func (h *HandlerCategory) Create(c *gin.Context) {
	var req createCategoryReq
	if !web.ValidationJson(c, &req) {
		return
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	item := model.Category{
		Name:    req.Name,
		Sort:    req.Sort,
		Enabled: enabled,
	}
	if err := h.svc.Create(&item); err != nil {
		web.Resp(c, web.InternalError)
		return
	}
	web.RespContent(c, web.Success, item)
}

type updateCategoryReq struct {
	Name    *string `json:"name"`
	Sort    *int    `json:"sort"`
	Enabled *bool   `json:"enabled"`
}

func (h *HandlerCategory) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		web.Resp(c, web.ParamsMissingRequired)
		return
	}
	var req updateCategoryReq
	if !web.ValidationJson(c, &req) {
		return
	}
	updates := make(map[string]any)
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Sort != nil {
		updates["sort"] = *req.Sort
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}
	if len(updates) == 0 {
		web.Resp(c, web.ParamsMissingRequired)
		return
	}
	if err := h.svc.Update(uint(id), updates); err != nil {
		web.Resp(c, web.InternalError)
		return
	}
	web.Resp(c, web.Success)
}

func (h *HandlerCategory) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		web.Resp(c, web.ParamsMissingRequired)
		return
	}
	if err := h.svc.Delete(uint(id)); err != nil {
		web.Resp(c, web.InternalError)
		return
	}
	web.Resp(c, web.Success)
}
