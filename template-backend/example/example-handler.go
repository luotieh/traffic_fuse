package example

import (
	"strconv"

	exampleContract "my-biz-backend/example/example-contract"
	"my-biz-backend/model"

	"code.yt-security.com/public/core/v2/web"
	iamsdk "code.yt-security.com/public/sdk"
	"code.yt-security.com/public/sdk/permission"
	"github.com/gin-gonic/gin"
)

type HandlerExample struct {
	svc exampleContract.ServiceExample
}

func NewHandlerExample(svc exampleContract.ServiceExample) *HandlerExample {
	return &HandlerExample{svc: svc}
}

func (h *HandlerExample) List(c *gin.Context) {
	var query exampleContract.ExampleQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		web.Resp(c, web.ParamsMissingRequired)
		return
	}

	scope := iamsdk.DataFilterScope(c, permission.DefaultFieldMapping)
	items, count, err := h.svc.List(query, scope)
	if err != nil {
		web.Resp(c, web.InternalError)
		return
	}

	web.RespContentWithNum(c, web.Success, count, items)
}

func (h *HandlerExample) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		web.Resp(c, web.ParamsMissingRequired)
		return
	}

	item, err := h.svc.GetByID(uint(id))
	if err != nil {
		web.Resp(c, web.NotFound)
		return
	}

	web.RespContent(c, web.Success, item)
}

type createExampleReq struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func (h *HandlerExample) Create(c *gin.Context) {
	var req createExampleReq
	if !web.ValidationJson(c, &req) {
		return
	}

	user, _ := iamsdk.GetCurrentUser(c)
	item := model.Example{
		Name:        req.Name,
		Description: req.Description,
		Status:      1,
		CreatedBy:   user.UserID,
		OrganizeID:  user.OrganizeID,
	}

	if err := h.svc.Create(&item); err != nil {
		web.Resp(c, web.InternalError)
		return
	}

	web.RespContent(c, web.Success, item)
}

type updateExampleReq struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Status      *int    `json:"status"`
}

func (h *HandlerExample) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		web.Resp(c, web.ParamsMissingRequired)
		return
	}

	var req updateExampleReq
	if !web.ValidationJson(c, &req) {
		return
	}

	updates := make(map[string]any)
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Status != nil {
		updates["status"] = *req.Status
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

func (h *HandlerExample) Delete(c *gin.Context) {
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
