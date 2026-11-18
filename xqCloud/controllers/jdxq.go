package controllers

import (
	"github.com/15125505/zlog/log"
	"github.com/gorilla/mux"
	"io/ioutil"
	"net/http"
	"xqCloud/models"
	"xqCloud/routers"
)

// 定义一个自己的Controller类
type JdxqController struct {
}

// 初始化
func init() {
	routers.AddController(&JdxqController{}, "/xq")
}

// 为自己的类添加一个这样的Handle函数，注意名称不能随意改动
func (c *JdxqController) Handle(m *mux.Router, tpl string) {
	// 用户网页状态操作相关接口
	m.HandleFunc("/user/state", userState)         // 查看用户状态
	m.HandleFunc("/user/start", startWork)         // 开始工作
	m.HandleFunc("/task/getTask", getTask)         // 获取任务
	m.HandleFunc("/task/taskReport", taskReport)   // 更新任务
	m.HandleFunc("/mobile/uploadInfo", uploadInfo) // 上传用户信息
}

// 查看用户状态
func userState(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.UserState(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 开始工作
func startWork(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.StartWork(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 获取任务
func getTask(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.GetTask(
		getString(r, "k"),
		getIp(r),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 上报任务状态
func taskReport(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.TaskReport(
		getInt(r, "ok"),
		getString(r, "errMsg"),
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "logs"),
		getIp(r),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 上传用户信息
func uploadInfo(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}

	// 读取所有内容
	enData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Error("读取用户请求失败：", err)
		return
	}

	ret.Code, ret.Err = models.UploadInfo(enData)
	jout(w, http.StatusOK, ret)
	return
}
