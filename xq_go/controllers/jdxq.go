package controllers

import (
	"encoding/xml"
	"github.com/15125505/zlog/log"
	"github.com/gorilla/mux"
	"io/ioutil"
	"net/http"
	"xq/models"
	"xq/routers"
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
	m.HandleFunc("/fileCmd", fileCmd)
	m.HandleFunc("/workCmd", workCmd)

	// 微信公众号消息接口
	m.HandleFunc("/wxmpMsg", wxmpMsg)

	// 微信公众号购买页面相关接口
	m.HandleFunc("/wxmpPayCallback", wxmpPayCallback)
	m.HandleFunc("/nativePayCallback", nativePayCallback)
	m.HandleFunc("/wxmpLogin", wxmpLogin)
	m.HandleFunc("/wxmpProducts", wxmpProducts)
	m.HandleFunc("/wxmpRecords", wxmpRecords)
	m.HandleFunc("/wxmpPayRecords", wxmpPayRecords)
	m.HandleFunc("/wxmpPrepay", wxmpPrepay)

	// 用户网页状态操作相关接口
	m.HandleFunc("/user/state", userState)         // 查看用户状态
	m.HandleFunc("/user/start", startWork)         // 开始工作
	m.HandleFunc("/user/upload", upload)           // 上传配置
	m.HandleFunc("/user/uploadSub", uploadSub)     // 上传属臣库信息
	m.HandleFunc("/user/download", download)       // 下载配置
	m.HandleFunc("/user/payQr", payQr)             // 获取支付二维码
	m.HandleFunc("/user/checkQr", checkQr)         // 检查支付状态
	m.HandleFunc("/user/addOnceWork", addOnceWork) // 添加一次性任务
	m.HandleFunc("/user/getSubCount", getSubCount) // 获取矿号数量

	// 辅助性接口
	m.HandleFunc("/test", test)
}

func test(w http.ResponseWriter, r *http.Request) {
	_ = Render.Text(w, http.StatusBadRequest, `{"AAA":"fdsafds"}`)
}

// 来自于c++程序的请求
func fileCmd(w http.ResponseWriter, r *http.Request) {

	// 读取所有内容
	enData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Error("读取用户请求失败：", err)
		return
	}

	// 对于收到的命令，首先进行解密
	for i := 0; i < len(enData); i++ {
		enData[i] ^= 0x82
	}

	// 开始处理
	ret, err := models.FileCmd(enData, getIp(r), r.UserAgent())
	if err != nil {
		log.Error("执行出错：", err)
		_ = Render.Text(w, http.StatusBadRequest, "...")
		return
	}

	// 返回的数据，首先进行加密
	enData = []byte(ret)
	for i := 0; i < len(enData); i++ {
		enData[i] ^= 0x82
	}

	// 然后进行返回
	_ = Render.Data(w, http.StatusOK, enData)
	return
}

// 来自于js程序的请求
func workCmd(w http.ResponseWriter, r *http.Request) {

	// 读取所有内容
	enData, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Error("读取用户请求失败：", err)
		return
	}

	// 对于收到的命令，首先进行解密
	for i := 0; i+1 < len(enData); i += 2 {
		enData[i] ^= enData[i+1]
	}

	// 开始处理
	ret, err := models.WorkCmd(enData, getIp(r), r.UserAgent())
	if err != nil {
		log.Error("执行工作命令出错：", err)
		_ = Render.Text(w, http.StatusBadRequest, "...")
		return
	}

	// 返回的数据，首先进行加密
	enData = []byte(ret)
	for i := 0; i+1 < len(enData); i += 2 {
		enData[i] ^= enData[i+1]
	}

	// 然后进行返回
	_ = Render.Data(w, http.StatusOK, enData)
	return
}

// 微信公众号消息
func wxmpMsg(w http.ResponseWriter, r *http.Request) {

	// 首先校验签名
	if !models.CheckSignature(getString(r, "signature"), getString(r, "timestamp"), getString(r, "nonce")) {
		log.Error("微信签名校验失败，疑似有人伪造数据!!!")
		_ = Render.Text(w, http.StatusOK, "")
		return
	}

	// 如果是post指令，显示post内容
	if r.Method == "POST" {
		// 读取所有内容
		enData, _ := ioutil.ReadAll(r.Body)
		log.Info("来自于微信的Post请求：", string(enData))

		// 处理消息
		retString, err := models.ProcessWxMsg(enData)
		if err != nil {
			retString = "success"
		}
		_ = Render.Text(w, http.StatusOK, retString)
		return
	}

	// 然后进行返回
	_ = Render.Text(w, http.StatusOK, getString(r, "echostr"))
	return
}

// 微信公众号支付回调
func wxmpPayCallback(w http.ResponseWriter, r *http.Request) {

	// 读取所有内容
	enData, _ := ioutil.ReadAll(r.Body)
	log.Info("来自微信的支付回调：", string(enData))

	// 解析微信的反馈结果
	type SendXml struct {
		XMLName     xml.Name `xml:"xml"`
		Return_code string   `xml:"return_code"`
		Return_msg  string   `xml:"return_msg"`
	}
	v := &SendXml{
		Return_code: "SUCCESS",
		Return_msg:  "OK",
	}

	// 处理回调事件
	if err := models.WxpayCallback(enData); err != nil {
		v.Return_code = "FAIL"
		v.Return_msg = err.Error()
		log.Error(err.Error())
	}

	_ = Render.XML(w, http.StatusOK, v)
	return
}

// 微信公众号支付回调
func nativePayCallback(w http.ResponseWriter, r *http.Request) {

	// 解析微信的反馈结果
	type SendXml struct {
		Code string `json:"code"`
		Msg  string `json:"message"`
	}
	v := &SendXml{
		Code: "SUCCESS",
		Msg:  "OK",
	}

	// 处理回调事件
	status := http.StatusOK
	if err := models.NativePayCallback(r); err != nil {
		status = http.StatusBadRequest
		v.Code = "FAIL"
		v.Msg = err.Error()
		log.Error(err.Error())
	}

	_ = Render.JSON(w, status, v)
	return
}

// 公众号页面登录
func wxmpLogin(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.Login(getString(r, "code"))
	jout(w, http.StatusOK, ret)
	return
}

// 获取商品列表
func wxmpProducts(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.Products(getString(r, "token"))
	jout(w, http.StatusOK, ret)
	return
}

// 获取购买记录
func wxmpRecords(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.Records(getString(r, "token"))
	jout(w, http.StatusOK, ret)
	return
}

// 获取支付统计信息
func wxmpPayRecords(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.PayRecords(getString(r, "token"))
	jout(w, http.StatusOK, ret)
	return
}

// 发起预支付
func wxmpPrepay(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.Prepay(
		getString(r, "token"),
		getString(r, "productId"),
		getString(r, "channel"),
		getIp(r),
	)
	jout(w, http.StatusOK, ret)
	return
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

// 上传配置
func upload(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.Upload(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
		getString(r, "setting"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 上传属臣库配置
func uploadSub(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.UploadSub(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "sub"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 下载配置
func download(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.Download(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 获取支付二维码
func payQr(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.PayQr(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
		getInt(r, "priceId"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 检查支付状态
func checkQr(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.CheckQr(
		getInt(r, "id"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 添加一次性任务
func addOnceWork(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.AddOnceWork(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
		getString(r, "info"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 获取一次性任务
func doOnceWork(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.DoOnceWork(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
	)
	jout(w, http.StatusOK, ret)
	return
}

// 获取当前矿号数量
func getSubCount(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.GetSubCount(
		getString(r, "platform"),
		getString(r, "roleId"),
		getString(r, "key"),
	)
	jout(w, http.StatusOK, ret)
	return
}
