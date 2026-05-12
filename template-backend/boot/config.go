package boot

import (
	"log/slog"

	"code.yt-security.com/public/core/v2/db"
	"code.yt-security.com/public/core/v2/os/qcfg"
	"code.yt-security.com/public/core/v2/web"

	"my-biz-backend/traffic"
)

type IAMConfig struct {
	BaseURL      string `json:"base_url" toml:"base_url"`
	ClientID     string `json:"client_id" toml:"client_id"`
	ClientSecret string `json:"client_secret" toml:"client_secret"`
	PathPrefix   string `json:"path_prefix" toml:"path_prefix"`
}

type CacheConfig struct {
	Host     string `json:"host" toml:"host"`
	Port     int    `json:"port" toml:"port"`
	Username string `json:"username" toml:"username"`
	Password string `json:"password" toml:"password"`
	DB       int    `json:"db" toml:"db"`
	Prefix   string `json:"prefix" toml:"prefix"`
}

type SSOConfig struct {
	CallbackURI           string `json:"callback_uri" toml:"callback_uri"`
	SuccessRedirect       string `json:"success_redirect" toml:"success_redirect"`
	CookieSecret          string `json:"cookie_secret" toml:"cookie_secret"`
	TokenRelayCallbackURI string `json:"token_relay_callback_uri" toml:"token_relay_callback_uri"`
}

type Config struct {
	Web     web.Config     `json:"web" toml:"web"`
	DB      db.Config      `json:"db" toml:"db"`
	Cache   CacheConfig    `json:"cache" toml:"cache"`
	IAM     IAMConfig      `json:"iam" toml:"iam"`
	SSO     SSOConfig      `json:"sso" toml:"sso"`
	Traffic traffic.Config `json:"traffic" toml:"traffic"`
}

func LoadConfig() *Config {
	slog.Info("[+] ========== 配置初始化 ==========")
	c1 := qcfg.New()
	c1 = c1.SetConfigPath("config.toml")
	err := c1.Load()
	if err != nil {
		slog.Error("[!] 配置文件加载失败", "error", err)
		panic("配置文件加载失败: " + err.Error())
	}
	slog.Info("[+] 配置文件加载成功")

	var mConfig Config
	err = c1.Unmarshal(&mConfig)
	if err != nil {
		slog.Error("[!] 配置文件解析失败", "error", err)
		panic("配置文件解析失败: " + err.Error())
	}
	slog.Info("[+] ========== 配置初始化结束 ==========")
	return &mConfig
}
