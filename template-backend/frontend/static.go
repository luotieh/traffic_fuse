package frontend

import (
	"io"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

func init() {
	mime.AddExtensionType(".mjs", "application/javascript")
}

func fileSystem() fs.FS {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return nil
	}
	return sub
}

func hasIndexHTML() bool {
	fsys := fileSystem()
	if fsys == nil {
		return false
	}
	f, err := fsys.Open("index.html")
	if err != nil {
		return false
	}
	f.Close()
	return true
}

// SetupSPA 注册嵌入式前端静态文件服务和 SPA fallback。
// 若 dist 中无 index.html（开发模式），则不注册任何路由。
func SetupSPA(engine *gin.Engine, notFoundHandler gin.HandlerFunc) {
	if !hasIndexHTML() {
		if notFoundHandler != nil {
			engine.NoRoute(notFoundHandler)
		}
		return
	}

	fsys := fileSystem()
	httpFS := http.FS(fsys)
	indexData := mustReadIndex(fsys)

	engine.NoRoute(func(c *gin.Context) {
		urlPath := c.Request.URL.Path

		if strings.HasPrefix(urlPath, "/api/") || urlPath == "/api" ||
			strings.HasPrefix(urlPath, "/sso/") || urlPath == "/callback" {
			if notFoundHandler != nil {
				notFoundHandler(c)
			} else {
				c.Status(http.StatusNotFound)
			}
			return
		}

		cleaned := strings.TrimPrefix(urlPath, "/")
		if cleaned == "" {
			serveIndex(c, indexData)
			return
		}

		f, err := httpFS.Open(cleaned)
		if err == nil {
			defer f.Close()
			stat, _ := f.Stat()
			if stat != nil && !stat.IsDir() {
				setCacheHeaders(c, cleaned)
				http.ServeContent(c.Writer, c.Request, stat.Name(), stat.ModTime(), f)
				return
			}
		}

		if path.Ext(urlPath) != "" {
			if notFoundHandler != nil {
				notFoundHandler(c)
			} else {
				c.Status(http.StatusNotFound)
			}
			return
		}

		serveIndex(c, indexData)
	})
}

func mustReadIndex(fsys fs.FS) []byte {
	f, err := fsys.Open("index.html")
	if err != nil {
		return nil
	}
	defer f.Close()
	data, _ := io.ReadAll(f)
	return data
}

func serveIndex(c *gin.Context, data []byte) {
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Data(http.StatusOK, "text/html; charset=utf-8", data)
}

func setCacheHeaders(c *gin.Context, filePath string) {
	if strings.HasPrefix(filePath, "assets/") {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
	}
}
