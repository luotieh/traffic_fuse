package category

import (
	"my-biz-backend/model"

	"code.yt-security.com/public/core/v2/db"
	"gorm.io/gorm"
)

type serviceCategory struct {
	db *db.DB
}

func NewServiceCategory(database *db.DB) *serviceCategory {
	return &serviceCategory{db: database}
}

func (s *serviceCategory) session() *gorm.DB {
	session, _ := s.db.GetDBSession()
	return session
}

func (s *serviceCategory) List() ([]model.Category, error) {
	var items []model.Category
	if err := s.session().Order("sort ASC, id ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *serviceCategory) Create(item *model.Category) error {
	return s.session().Create(item).Error
}

func (s *serviceCategory) Update(id uint, updates map[string]any) error {
	return s.session().Model(&model.Category{}).Where("id = ?", id).Updates(updates).Error
}

func (s *serviceCategory) Delete(id uint) error {
	return s.session().Delete(&model.Category{}, id).Error
}
