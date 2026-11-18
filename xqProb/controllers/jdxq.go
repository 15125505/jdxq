package controllers

import (
	"github.com/gorilla/mux"
	"io"
	"net/http"
	"xqProb/models"
	"xqProb/routers"
)

// JdxqController 定义一个自己的Controller类
type JdxqController struct {
}

// 初始化
func init() {
	routers.AddController(&JdxqController{}, "/xq")
}

// Handle 为自己的类添加一个这样的Handle函数，注意名称不能随意改动
func (c *JdxqController) Handle(m *mux.Router, tpl string) {

	m.HandleFunc("/user/recentUser", recentUser)  // 获取最近侦测到的用户
	m.HandleFunc("/user/getRoleId", getRoleId)    // 获取角色Id
	m.HandleFunc("/up", up)                       // 上传用户信息
	m.HandleFunc("/appUp", appUp).Methods("POST") // app上传用户信息
	m.HandleFunc("/ro", ro)                       // 获取角色Id

	m.HandleFunc("/appUp", func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusOK)
		_ = Render.Text(writer, http.StatusOK, "OK")
	}).Methods("OPTIONS")

}

// 获取最近侦测到的用户
func recentUser(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.RecentUser(
		getInt(r, "t"),
		getIp(r),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 获取角色Id
func getRoleId(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.GetRoleId(
		getInt(r, "t"),
		getIp(r),
		getString(r, "p"),
		getString(r, "u"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 上传用户信息
func up(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	body, _ := io.ReadAll(r.Body)
	_ = r.Body.Close()
	models.Bin(&body)
	ret.Code, ret.Err, ret.Msg = models.Up(getIp(r), body)
	bout(w, http.StatusOK, ret)
	return
}

// app上传用户信息
func appUp(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	body, _ := io.ReadAll(r.Body)
	_ = r.Body.Close()
	models.Bin(&body)
	ret.Code, ret.Err, ret.Msg = models.AppUp(getIp(r), body)
	bout(w, http.StatusOK, ret)
	return
}

// 获取角色Id
func ro(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	body, _ := io.ReadAll(r.Body)
	_ = r.Body.Close()
	models.Bin(&body)
	ret.Code, ret.Err, ret.Msg = models.Ro(body)
	bout(w, http.StatusOK, ret)
	return
}
