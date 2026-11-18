package main

import (
	"github.com/15125505/zlog/log"
	"github.com/gorilla/mux"
	"github.com/urfave/negroni"
	"net/http"
	_ "xq_sale/controllers" // 这个是为了保证这个包被引入，否则不会调用init函数
	"xq_sale/routers"
)

func init() {
	log.Log.SetLogFile("logs/xq_sale")
	log.Log.SetFileColor(true)
	log.Log.SetAdditionalErrorFile(true)
	log.Log.SetLogLevel(log.LevelDebug)
}

func main() {
	r := mux.NewRouter()
	routers.CreateHandle(r)
	n := negroni.New(negroni.NewRecovery(), negroni.NewStatic(http.Dir("public")), negroni.HandlerFunc(routers.PreProcess))
	n.UseHandler(r)
	n.Run(":7063")
}
