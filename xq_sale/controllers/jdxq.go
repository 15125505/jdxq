package controllers

import (
	"encoding/xml"
	"github.com/15125505/zlog/log"
	"github.com/gorilla/mux"
	"io/ioutil"
	"net/http"
	"xq_sale/models"
	"xq_sale/routers"
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

	// 微信公众号消息接口
	m.HandleFunc("/wxmpMsg", wxmpMsg)

	// 微信公众号购买页面相关接口
	m.HandleFunc("/wxmpPayCallback", wxmpPayCallback)
	m.HandleFunc("/wxmpLogin", wxmpLogin)
	m.HandleFunc("/wxmpProducts", wxmpProducts)
	m.HandleFunc("/wxmpRecords", wxmpRecords)
	m.HandleFunc("/wxmpOldRecords", wxmpOldRecords)
	m.HandleFunc("/wxmpPayRecords", wxmpPayRecords)
	m.HandleFunc("/wxmpPrepay", wxmpPrepay)

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

// 获取购买记录
func wxmpOldRecords(w http.ResponseWriter, r *http.Request) {
	ret := RetInfo{}
	ret.Code, ret.Err, ret.Msg = models.OldRecords(getString(r, "tId"))
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
