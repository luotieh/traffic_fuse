//go:build wireinject

package di

import (
	"my-biz-backend/boot"
	"my-biz-backend/example"
	"my-biz-backend/traffic"

	"github.com/google/wire"
)

func InitializeHandlers() *Handlers {
	wire.Build(
		boot.LoadConfig,
		boot.LoadProduct,
		boot.LoadCache,
		boot.LoadWeb,
		boot.LoadDB,
		boot.LoadIAM,
		example.WireSet,
		wire.FieldsOf(new(*boot.Config), "Traffic"),
		traffic.WireSet,
		wire.Struct(new(Handlers), "Config", "Web", "DB", "Cache", "Product", "IAM", "Example", "Traffic"),
	)
	return nil
}
