package main

import (
	"github.com/15125505/zlog/log"
	"github.com/gorilla/mux"
	"github.com/lqqyt2423/go-mitmproxy/proxy"
	"github.com/urfave/negroni"
	"net/http"
	_ "xqProb/controllers" // 这个是为了保证这个包被引入，否则不会调用init函数
	"xqProb/models"
	"xqProb/routers"
)

func init() {
	log.Log.SetLogFile("logs/xqProb")
	log.Log.SetFileColor(true)
	log.Log.SetAdditionalErrorFile(true)
	log.Log.SetLogLevel(log.LevelDebug)
}

func main() {

	// 启动代理
	go startProxy()

	// 启动接口服务
	r := mux.NewRouter()
	routers.CreateHandle(r)
	n := negroni.New(negroni.NewRecovery(), negroni.NewStatic(http.Dir("public")), negroni.HandlerFunc(routers.PreProcess))
	n.UseHandler(r)
	n.Run(":5000")
}

type Check struct {
	proxy.BaseAddon
}

func (c *Check) Response(f *proxy.Flow) {

	// body解码之后再向下传递
	var body = f.Response.Body
	if f.Response.IsTextContentType() && len(f.Response.Body) > 0 {
		body, _ = f.Response.DecodedBody()
	}

	// 处理正常数据
	models.HandleProbInfo(f.Request.Raw().UserAgent(), f.Request.Raw().RemoteAddr, f.Request.URL.String(), f.Request.Body, body, f.Response.IsTextContentType())

}

// 启动代理服务器
func startProxy() {
	opts := &proxy.Options{
		Addr:              ":8000",
		StreamLargeBodies: 1024 * 1024 * 5,
	}

	p, err := proxy.NewProxy(opts)
	if err != nil {
		log.Error("代理服务器创建失败：", err)
		return
	}

	p.AddAddon(&Check{})

	err = p.Start()
	if err != nil {
		log.Error("代理服务器启动失败：", err)
		return
	}
}
