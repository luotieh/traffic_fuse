package category

import "my-biz-backend/model"

type ServiceCategory interface {
	List() ([]model.Category, error)
	Create(item *model.Category) error
	Update(id uint, updates map[string]any) error
	Delete(id uint) error
}
