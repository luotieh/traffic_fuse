package traffic

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

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

type Config struct {
	StoreBackend            string `json:"store_backend" toml:"store_backend"`
	DatabaseURL             string `json:"database_url" toml:"database_url"`
	AutoMigrate             bool   `json:"auto_migrate" toml:"auto_migrate"`
	InternalAPIKey          string `json:"internal_api_key" toml:"internal_api_key"`
	FlowShadowBaseURL       string `json:"flowshadow_base_url" toml:"flowshadow_base_url"`
	FlowShadowAPIKey        string `json:"flowshadow_api_key" toml:"flowshadow_api_key"`
	DeepSOCBaseURL          string `json:"deepsoc_base_url" toml:"deepsoc_base_url"`
	DeepSOCUsername         string `json:"deepsoc_username" toml:"deepsoc_username"`
	DeepSOCPassword         string `json:"deepsoc_password" toml:"deepsoc_password"`
	DeepSOCAPIKey           string `json:"deepsoc_api_key" toml:"deepsoc_api_key"`
	LLMBaseURL              string `json:"llm_base_url" toml:"llm_base_url"`
	LLMAPIKey               string `json:"llm_api_key" toml:"llm_api_key"`
	LLMModel                string `json:"llm_model" toml:"llm_model"`
	LLMTimeoutSeconds       int    `json:"llm_timeout_seconds" toml:"llm_timeout_seconds"`
	SyncBatchSize           int    `json:"sync_batch_size" toml:"sync_batch_size"`
	SyncLookbackSeconds     int    `json:"sync_lookback_seconds" toml:"sync_lookback_seconds"`
	SyncMaxRetries          int    `json:"sync_max_retries" toml:"sync_max_retries"`
	HTTPTimeoutSeconds      int    `json:"http_timeout_seconds" toml:"http_timeout_seconds"`
	MQBackend               string `json:"mq_backend" toml:"mq_backend"`
	RabbitMQURL             string `json:"rabbitmq_url" toml:"rabbitmq_url"`
	RabbitMQExchange        string `json:"rabbitmq_exchange" toml:"rabbitmq_exchange"`
	RabbitMQEventQueue      string `json:"rabbitmq_event_queue" toml:"rabbitmq_event_queue"`
	RabbitMQConsumerEnabled bool   `json:"rabbitmq_consumer_enabled" toml:"rabbitmq_consumer_enabled"`
}

func NewTraffic(moduleCfg Config) *Traffic {
	cfg := moduleCfg.toInternal()
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

func (c Config) toInternal() config.Config {
	cfg := config.Load()
	if c.StoreBackend != "" {
		cfg.StoreBackend = strings.ToLower(c.StoreBackend)
	}
	if c.DatabaseURL != "" {
		cfg.DatabaseURL = c.DatabaseURL
	}
	cfg.AutoMigrate = c.AutoMigrate
	if c.InternalAPIKey != "" {
		cfg.InternalAPIKey = c.InternalAPIKey
	}
	if c.FlowShadowBaseURL != "" {
		cfg.FlowShadowBaseURL = c.FlowShadowBaseURL
	}
	if c.FlowShadowAPIKey != "" {
		cfg.FlowShadowAPIKey = c.FlowShadowAPIKey
	}
	if c.DeepSOCBaseURL != "" {
		cfg.DeepSOCBaseURL = c.DeepSOCBaseURL
	}
	if c.DeepSOCUsername != "" {
		cfg.DeepSOCUsername = c.DeepSOCUsername
	}
	if c.DeepSOCPassword != "" {
		cfg.DeepSOCPassword = c.DeepSOCPassword
	}
	if c.DeepSOCAPIKey != "" {
		cfg.DeepSOCAPIKey = c.DeepSOCAPIKey
	}
	if c.LLMBaseURL != "" {
		cfg.LLMBaseURL = c.LLMBaseURL
	}
	if c.LLMAPIKey != "" {
		cfg.LLMAPIKey = c.LLMAPIKey
	}
	if c.LLMModel != "" {
		cfg.LLMModel = c.LLMModel
	}
	if c.LLMTimeoutSeconds > 0 {
		cfg.LLMTimeout = time.Duration(c.LLMTimeoutSeconds) * time.Second
	}
	if c.SyncBatchSize > 0 {
		cfg.SyncBatchSize = c.SyncBatchSize
	}
	if c.SyncLookbackSeconds > 0 {
		cfg.SyncLookbackSeconds = c.SyncLookbackSeconds
	}
	if c.SyncMaxRetries > 0 {
		cfg.SyncMaxRetries = c.SyncMaxRetries
	}
	if c.HTTPTimeoutSeconds > 0 {
		cfg.HTTPTimeout = time.Duration(c.HTTPTimeoutSeconds) * time.Second
	}
	if c.MQBackend != "" {
		cfg.MQBackend = strings.ToLower(c.MQBackend)
	}
	if c.RabbitMQURL != "" {
		cfg.RabbitMQURL = c.RabbitMQURL
	}
	if c.RabbitMQExchange != "" {
		cfg.RabbitMQExchange = c.RabbitMQExchange
	}
	if c.RabbitMQEventQueue != "" {
		cfg.RabbitMQEventQueue = c.RabbitMQEventQueue
	}
	cfg.RabbitMQConsumerEnabled = c.RabbitMQConsumerEnabled
	return cfg
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
