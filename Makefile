# ★ 请根据实际项目调整以下变量
FRONTEND_DIR := template-frontend
BACKEND_DIR  := template-backend
BACKEND_MOD  := my-biz-backend
BINARY       := server

.PHONY: all frontend backend build build-linux build-windows clean dev help

help: ## 显示帮助
	@grep -E '^[a-z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*## "}{printf "  %-16s %s\n",$$1,$$2}'

all: frontend backend ## 构建前端 + 后端

frontend: ## 构建前端（产物输出到后端 embed 目录）
	cd $(FRONTEND_DIR) && pnpm install --frozen-lockfile && pnpm run build:prod

backend: ## 构建后端（当前平台）
	cd $(BACKEND_DIR) && go build -trimpath -o ../$(BINARY) ./cmd/server/

build: all ## 等同于 all

build-linux: frontend ## 交叉编译 Linux amd64
	cd $(BACKEND_DIR) && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -o ../$(BINARY)-linux-amd64 ./cmd/server/

build-windows: frontend ## 交叉编译 Windows amd64
	cd $(BACKEND_DIR) && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -o ../$(BINARY)-windows-amd64.exe ./cmd/server/

dev: ## 仅启动后端（前端用 pnpm dev 单独启动）
	cd $(BACKEND_DIR) && go run ./cmd/server/

clean: ## 清理构建产物
	rm -f $(BINARY) $(BINARY)-* $(BINARY).exe
	rm -rf $(BACKEND_DIR)/frontend/dist/*
	touch $(BACKEND_DIR)/frontend/dist/.gitkeep
