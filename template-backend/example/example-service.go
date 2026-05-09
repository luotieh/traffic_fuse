package example

import (
	exampleContract "my-biz-backend/example/example-contract"
	"my-biz-backend/model"

	"code.yt-security.com/public/core/v2/db"
	"gorm.io/gorm"
)

type serviceExample struct {
	db *db.DB
}

func NewServiceExample(database *db.DB) *serviceExample {
	return &serviceExample{db: database}
}

func (s *serviceExample) session() *gorm.DB {
	session, _ := s.db.GetDBSession()
	return session
}

func (s *serviceExample) List(query exampleContract.ExampleQuery, scopes ...func(*gorm.DB) *gorm.DB) ([]model.Example, int64, error) {
	var items []model.Example
	var count int64

	tx := s.session().Model(&model.Example{}).Scopes(scopes...)

	if query.Keyword != "" {
		tx = tx.Where("name LIKE ?", "%"+query.Keyword+"%")
	}

	if err := tx.Count(&count).Error; err != nil {
		return nil, 0, err
	}

	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}

	offset := (query.Page - 1) * query.PageSize
	if err := tx.Offset(offset).Limit(query.PageSize).Order("id DESC").Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, count, nil
}

func (s *serviceExample) GetByID(id uint) (*model.Example, error) {
	var item model.Example
	if err := s.session().First(&item, id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *serviceExample) Create(item *model.Example) error {
	return s.session().Create(item).Error
}

func (s *serviceExample) Update(id uint, updates map[string]any) error {
	return s.session().Model(&model.Example{}).Where("id = ?", id).Updates(updates).Error
}

func (s *serviceExample) Delete(id uint) error {
	return s.session().Delete(&model.Example{}, id).Error
}
