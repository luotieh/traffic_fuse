package model

import "time"

type Example struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	Name        string    `gorm:"type:varchar(200);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Status      int       `gorm:"default:1;comment:1=启用 0=禁用" json:"status"`
	CreatedBy   string    `gorm:"type:varchar(64)" json:"created_by"`
	OrganizeID  string    `gorm:"type:varchar(64);index" json:"organize_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Example) TableName() string {
	return "biz_example"
}
