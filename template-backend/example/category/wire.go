package category

import "github.com/google/wire"

var WireSet = wire.NewSet(
	NewServiceCategory,
	NewHandlerCategory,
	wire.Bind(new(ServiceCategory), new(*serviceCategory)),
)
