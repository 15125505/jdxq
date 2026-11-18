package controllers

import (
	"github.com/gorilla/mux"
	"net/http"
	"xq_sale/routers"
)

// ExampleController todo: 定义一个自己的Controller类
type ExampleController struct {
}

// 初始化
func init() {
	// todo: 此处需要设置子路由的前缀
	routers.AddController(&ExampleController{}, "/example")
}

// Handle todo: 为自己的类添加一个这样的Handle函数，注意名称不能随意改动
func (c *ExampleController) Handle(m *mux.Router, tpl string) {

	sub := m.PathPrefix(tpl).Subrouter()

	// todo: 本函数演示了使用绝对路由的方式
	m.HandleFunc("/path1", absolutePath)

	// todo: 本函数演示了使用相对路由的方式
	sub.HandleFunc("/path2", relativePath).Methods("POST")
}

// todo: 访问 http://localhost:5000/path1 将触发本函数的反馈
func absolutePath(w http.ResponseWriter, r *http.Request) {

	// todo:本函数演示了json的输出方法
	ret := RetInfo{}
	ret.Code = 0
	ret.Msg = "OK..."
	_ = Render.JSON(w, http.StatusOK, ret)
	return
}

// todo: 使用POST方式访问 http://localhost:5000/example/path2 将触发本函数的反馈
func relativePath(w http.ResponseWriter, r *http.Request) {
	_, _ = w.Write([]byte("This is a relative path."))
	return
}
