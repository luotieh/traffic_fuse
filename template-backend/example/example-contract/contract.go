package exampleContract

import (
	"my-biz-backend/model"

	"gorm.io/gorm"
)

type ExampleQuery struct {
	Page     int    `form:"page"`
	PageSize int    `form:"page_size"`
	Keyword  string `form:"keyword"`
}

type ServiceExample interface {
	List(query ExampleQuery, scopes ...func(*gorm.DB) *gorm.DB) ([]model.Example, int64, error)
	GetByID(id uint) (*model.Example, error)
	Create(item *model.Example) error
	Update(id uint, updates map[string]any) error
	Delete(id uint) error
}
