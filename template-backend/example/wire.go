package example

import (
	"my-biz-backend/example/category"
	exampleContract "my-biz-backend/example/example-contract"

	"github.com/google/wire"
)

var WireSet = wire.NewSet(
	NewServiceExample,
	NewHandlerExample,
	NewExample,
	wire.Bind(new(exampleContract.ServiceExample), new(*serviceExample)),
	category.WireSet,
)
