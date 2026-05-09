package main

import (
	"log/slog"
	"os"

	"my-biz-backend/di"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	handlers := di.InitializeHandlers()
	handlers.RouteLoad()

	if err := handlers.Web.ListenAndServeWithSignal(); err != nil {
		slog.Error("[!] 服务退出", "error", err)
		os.Exit(1)
	}

	handlers.Shutdown()
	slog.Info("[+] 程序已安全退出")
}
