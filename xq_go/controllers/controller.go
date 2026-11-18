package controllers

import (
	"encoding/json"
	"github.com/15125505/zlog/log"
	"github.com/unrolled/render"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// 定义一个用于json或者xml等各种渲染的公共渲染模块
var Render *render.Render = render.New()

type RetInfo struct {
	Code int         `json:"code"`
	Err  interface{} `json:"err,omitempty"`
	Msg  interface{} `json:"msg,omitempty"`
}

// 获取请求者Ip
func getIp(r *http.Request) (ip string) {
	ip = "127.0.0.1"
	if forwards := r.Header.Get("X-Forwarded-For"); forwards != "" {
		ips := strings.Split(forwards, ",")
		if len(ips) > 0 {
			ip = ips[0]
		}
	} else {
		ip = r.RemoteAddr
	}
	ips := strings.Split(ip, ":")
	if len(ips) > 0 {
		ip = ips[0]
	}
	return
}

// 获取整形参数
func getInt(r *http.Request, key string) (ret int) {
	ret, _ = strconv.Atoi(r.Form.Get(key))
	return
}

// 获取字符串参数
func getString(r *http.Request, key string) (ret string) {
	ret = r.Form.Get(key)
	return
}

// Json返回结果
func jout(w io.Writer, status int, ret RetInfo) {

	// 输出显示给前端的内容
	if ret.Code != 0 {
		ret.Msg = nil
	} else {
		ret.Err = nil
	}
	data, _ := json.MarshalIndent(ret, "", "    ")
	if len(data) > 100 {
		data = data[:100]
	}
	log.Debug("接口反馈信息：\r\n" + string(data))

	// 渲染输出
	_ = Render.JSON(w, status, ret)
}
