package traffic

import (
	"context"
	"log"
	"net/http"
	"strings"

	"my-biz-backend/traffic/internal/client"
	"my-biz-backend/traffic/internal/config"
	"my-biz-backend/traffic/internal/httpapi"
	"my-biz-backend/traffic/internal/mq"
	"my-biz-backend/traffic/internal/service"
	"my-biz-backend/traffic/internal/store"
	"my-biz-backend/traffic/internal/worker"

	"code.yt-security.com/public/sdk/authorize"
	"github.com/gin-gonic/gin"
)

// Traffic is the DeepSOC/traffic-analysis business module mounted into the
// IAM backend template. Its original compatibility APIs are exposed under
// /traffic, for example /traffic/api/event/create.
type Traffic struct {
	handler http.Handler
	queue   mq.Queue
}

func NewTraffic() *Traffic {
	cfg := config.Load()
	httpClient := &http.Client{Timeout: cfg.HTTPTimeout}
	llmHTTPClient := &http.Client{Timeout: cfg.LLMTimeout}

	st := loadStore(cfg)
	queue := loadQueue(cfg, st)

	services := service.Services{
		Store: st,
		DeepSOC: client.DeepSOCClient{
			BaseURL:  cfg.DeepSOCBaseURL,
			APIKey:   cfg.DeepSOCAPIKey,
			Username: cfg.DeepSOCUsername,
			Password: cfg.DeepSOCPassword,
			HTTP:     httpClient,
		},
		FlowShadow: client.FlowShadowClient{
			BaseURL: cfg.FlowShadowBaseURL,
			APIKey:  cfg.FlowShadowAPIKey,
			HTTP:    httpClient,
		},
		LLM: client.LLMClient{
			BaseURL: cfg.LLMBaseURL,
			APIKey:  cfg.LLMAPIKey,
			Model:   cfg.LLMModel,
			HTTP:    llmHTTPClient,
		},
		Queue: queue,
	}

	return &Traffic{
		handler: httpapi.New(cfg, services).Handler(),
		queue:   queue,
	}
}

func loadStore(cfg config.Config) store.Store {
	switch strings.ToLower(cfg.StoreBackend) {
	case "postgres":
		pg, err := store.NewPostgresStore(context.Background(), cfg.DatabaseURL, cfg.AutoMigrate)
		if err != nil {
			log.Printf("traffic: init postgres store failed, falling back to memory: %v", err)
			return store.NewMemoryStore()
		}
		return pg
	default:
		return store.NewMemoryStore()
	}
}

func loadQueue(cfg config.Config, st store.Store) mq.Queue {
	if strings.ToLower(cfg.MQBackend) != "rabbitmq" {
		return mq.NoopQueue{}
	}
	rabbit, err := mq.NewRabbitMQ(context.Background(), mq.RabbitConfig{
		URL:      cfg.RabbitMQURL,
		Exchange: cfg.RabbitMQExchange,
		Queue:    cfg.RabbitMQEventQueue,
	})
	if err != nil {
		log.Printf("traffic: init rabbitmq failed, using noop queue: %v", err)
		return mq.NoopQueue{}
	}
	worker.StartRabbitEventWorker(context.Background(), cfg, st)
	return rabbit
}

func (m *Traffic) RoutesWithGroup(e *gin.RouterGroup) []authorize.BackendItem {
	proxy := gin.WrapH(http.StripPrefix("/traffic", m.handler))
	return authorize.RegisterRoutes(e.Group("/traffic"), []authorize.Route{
		{
			Name:    "DeepSOC安全运营",
			Enabled: true,
			Children: []authorize.Route{
				{Name: "DeepSOC GET兼容接口", Path: "/*path", Method: "GET", Handler: proxy, Enabled: true},
				{Name: "DeepSOC POST兼容接口", Path: "/*path", Method: "POST", Handler: proxy, Enabled: true},
				{Name: "DeepSOC PUT兼容接口", Path: "/*path", Method: "PUT", Handler: proxy, Enabled: true},
				{Name: "DeepSOC DELETE兼容接口", Path: "/*path", Method: "DELETE", Handler: proxy, Enabled: true},
				{Name: "DeepSOC OPTIONS兼容接口", Path: "/*path", Method: "OPTIONS", Handler: proxy, Enabled: true},
			},
		},
	})
}

func (m *Traffic) Shutdown() {
	if m.queue != nil {
		_ = m.queue.Close()
	}
}
