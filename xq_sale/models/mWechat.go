package models

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"github.com/wechatpay-apiv3/wechatpay-go/core"
	"github.com/wechatpay-apiv3/wechatpay-go/core/option"
	"github.com/wechatpay-apiv3/wechatpay-go/services/payments/native"
	"github.com/wechatpay-apiv3/wechatpay-go/utils"
	"io/ioutil"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

// 这是之前用的Id和key
//const AppId = "CHANGEME"                   // 这是公众号的appId
//const AppSecret = "CHANGEME" // 这是公众号的appSecret

// 微信支付的操作安全密码是 ub00.com
var AppId = os.Getenv("JDXQ_WECHAT_APP_ID")         // 这是公众号的appId
var AppKey = os.Getenv("JDXQ_WECHAT_APP_KEY")       // 这是在商户平台中生成的key
var AppSecret = os.Getenv("JDXQ_WECHAT_APP_SECRET") // 这是公众号的appSecret
var MchId = os.Getenv("JDXQ_WECHAT_MCH_ID")         // 这是微信支付绑定的商户号

type WechatPayRet struct {
	// 公众号相关的内容
	PappId     interface{} `json:"appId,omitempty"`
	PtimeStamp interface{} `json:"timeStamp,omitempty"`
	PnonceStr  interface{} `json:"nonceStr,omitempty"`
	Ppackage   interface{} `json:"package,omitempty"`
	PsignType  interface{} `json:"signType,omitempty"`
	PpaySign   interface{} `json:"paySign,omitempty"`
}

// WechatPay 微信充值(openId不为空表示公众号充值)
func WechatPay(productInfo, recordId, ip, openId string, money, count int) (ret WechatPayRet, err error) {

	// 生成随机字符串md5(time+userId)
	m := md5.New()
	m.Write([]byte(strconv.FormatInt(time.Now().Unix(), 10)))
	m.Write([]byte(openId))
	nonce := m.Sum(nil)
	nonceStr := hex.EncodeToString(nonce)

	// 生成需要发给微信的内容
	mm := GenInfo2Wechat(nonceStr, fmt.Sprintf("%v × %v", productInfo, count), ip, openId, recordId, money*count)

	// 通知微信并获取prepay_id
	var prepayId string
	if prepayId, err = SendOrderToWx(mm); err != nil {
		log.Error("通知微信并获取prepay_id:", err.Error())
		return
	}

	// 生成给前端的返回值
	mapInfo := make(map[string]string)
	timeString := strconv.FormatInt(time.Now().Unix(), 10)

	// 公众号充值
	ret.PappId = AppId
	ret.PtimeStamp = timeString
	ret.PnonceStr = nonceStr
	ret.Ppackage = "prepay_id=" + prepayId
	ret.PsignType = "MD5"
	mapInfo["appId"] = AppId
	mapInfo["timeStamp"] = timeString
	mapInfo["nonceStr"] = nonceStr
	mapInfo["package"] = "prepay_id=" + prepayId
	mapInfo["signType"] = "MD5"
	mapInfo["key"] = AppKey
	ret.PpaySign = GenWxSign(mapInfo)
	return
}

var ApiV3Key = os.Getenv("JDXQ_WECHAT_API_V3_KEY") // APIV3密钥
var ApiV3CertSN = os.Getenv("JDXQ_WECHAT_CERT_SERIAL")

// NativePay 微信充值(openId不为空表示公众号充值)
func NativePay(productInfo, recordId string, money int64) (err error) {

	var (
		mchID                      string = MchId       // 商户号
		mchCertificateSerialNumber string = ApiV3CertSN // 商户证书序列号
		mchAPIv3Key                string = ApiV3Key    // 商户APIv3密钥
	)

	// 使用 utils 提供的函数从本地文件中加载商户私钥，商户私钥会用来生成请求的签名
	mchPrivateKey, err := utils.LoadPrivateKeyWithPath("./apiclient_key.pem")
	if err != nil {
		log.Error("load merchant private key error")
	}

	// 使用商户私钥等初始化 client，并使它具有自动定时获取微信支付平台证书的能力
	ctx := context.Background()
	opts := []core.ClientOption{
		option.WithWechatPayAutoAuthCipher(mchID, mchCertificateSerialNumber, mchPrivateKey, mchAPIv3Key),
	}
	client, err := core.NewClient(ctx, opts...)
	if err != nil {
		log.Error("new wechat pay client err:%s", err)
		return
	}

	svc := native.NativeApiService{Client: client}
	resp, result, err := svc.Prepay(ctx,
		native.PrepayRequest{
			Appid:       core.String(AppId),
			Mchid:       core.String(MchId),
			Description: core.String(productInfo),
			OutTradeNo:  core.String(recordId),
			NotifyUrl:   core.String("https://server-4.example.invalid/pay/nativePayCallback"),
			Amount: &native.Amount{
				Currency: core.String("CNY"),
				Total:    core.Int64(money),
			},
		},
	)

	if err != nil {
		// 处理错误
		log.Error("call Prepay err:%s", err)
	} else {
		// 处理返回结果
		log.Error("status=%d resp=%s", result.Response.StatusCode, resp)
	}

	return
}

// GetQR 生成需要发给微信的内容，如果openId不为空，则为公众号充值
func GetQR(productDesc, recordId string, money int) (qr string, err error) {

	jsonString := `{
	"mchid": "_mchid_",
	"out_trade_no": "_out_trade_no_",
	"appid": "_appid_",
	"description": "_description_",
	"notify_url": "_notify_url_",
	"amount": {
		"total": _total_,
		"currency": "CNY"
	}
}`
	jsonString = strings.Replace(jsonString, "_mchid_", MchId, 1)
	jsonString = strings.Replace(jsonString, "_out_trade_no_", recordId, 1)
	jsonString = strings.Replace(jsonString, "_appid_", AppId, 1)
	jsonString = strings.Replace(jsonString, "_mchid_", MchId, 1)
	jsonString = strings.Replace(jsonString, "_description_", productDesc, 1)
	jsonString = strings.Replace(jsonString, "_notify_url_", "https://server-4.example.invalid/pay/nativePayCallback", 1)
	jsonString = strings.Replace(jsonString, "_total_", strconv.Itoa(money), 1)

	// 文档地址 https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
	retBody, err := httpPost("https://api.mch.weixin.qq.com/v3/pay/transactions/native", jsonString)
	if err != nil {
		log.Error("读取微信反馈失败：", err)
		return
	}

	fmt.Println("微信支付返回的结果：", string(retBody))

	return
}

// GenInfo2Wechat 生成需要发给微信的内容，如果openId不为空，则为公众号充值
func GenInfo2Wechat(nonce, productDesc, ip, openId, recordId string, money int) map[string]string {

	// 需要加入的签名的字段列表
	m := make(map[string]string)
	m["appid"] = AppId                   // 微信开放平台审核通过的应用APPID
	m["mch_id"] = MchId                  // 微信支付分配的商户号
	m["nonce_str"] = nonce               // 随机字符串
	m["body"] = productDesc              // 商品描述（用户在支付窗口看到的商品描述）
	m["out_trade_no"] = recordId         // 订单号
	m["total_fee"] = strconv.Itoa(money) // 总金额（单位为分）
	m["spbill_create_ip"] = ip           // 终端IP
	m["notify_url"] = "https://server-4.example.invalid/pay/wxmpPayCallback"
	m["trade_type"] = "JSAPI"
	m["key"] = AppKey
	m["openid"] = openId

	log.Debug("回调地址: ", m["notify_url"])

	// 计算签名
	sign := GenWxSign(m)
	m["sign"] = sign
	return m
}

// GenWxSign 计算微信签名
func GenWxSign(mapItem map[string]string) (sign string) {

	// 找出所有的key并进行排序
	var stringA string
	keys := make([]string, len(mapItem))
	i := 0
	for k := range mapItem {
		keys[i] = k
		i++
	}
	sort.Strings(keys)

	// 按照key=value&key=value的样式进行衔接，但是key为“key”的放在最后
	for _, key := range keys {
		if key == "key" {
			continue
		}
		stringA += key
		stringA += "="
		stringA += mapItem[key]
		stringA += "&"
	}
	stringSignTemp := stringA + "key=" + mapItem["key"]

	// 计算签名
	mm := md5.New()
	mm.Write([]byte(stringSignTemp))
	sign = strings.ToUpper(hex.EncodeToString(mm.Sum(nil)))
	return
}

// SendOrderToWx 向微信服务器发送订单
func SendOrderToWx(m map[string]string) (prepayId string, err error) {

	// 生成xml
	type SendXml struct {
		XMLName          xml.Name    `xml:"xml"`
		Appid            string      `xml:"appid"`
		Mch_id           string      `xml:"mch_id"`
		Nonce_str        string      `xml:"nonce_str"`
		Body             string      `xml:"body"`
		Out_trade_no     string      `xml:"out_trade_no"`
		Total_fee        string      `xml:"total_fee"`
		Spbill_create_ip string      `xml:"spbill_create_ip"`
		Notify_url       string      `xml:"notify_url"`
		Trade_type       string      `xml:"trade_type"`
		OpenId           interface{} `xml:"openid,omitempty"`
		Sign             string      `xml:"sign"`
	}
	v := &SendXml{
		Appid:            m["appid"],
		Mch_id:           m["mch_id"],
		Nonce_str:        m["nonce_str"],
		Body:             m["body"],
		Out_trade_no:     m["out_trade_no"],
		Total_fee:        m["total_fee"],
		Spbill_create_ip: m["spbill_create_ip"],
		Notify_url:       m["notify_url"],
		Trade_type:       m["trade_type"],
		Sign:             m["sign"],
	}
	openId, isWxmp := m["openid"]
	if isWxmp {
		// 公众号充值
		v.OpenId = openId
	}
	xmlData, _ := xml.MarshalIndent(v, "", "  ")
	xmlString := xml.Header + string(xmlData)

	// 发送到微信服务器
	url := "https://api.mch.weixin.qq.com/pay/unifiedorder"
	body, err := httpPost(url, xmlString)
	if err != nil {
		log.Error("解析返回值:", err.Error(), "返回值<", string(body), ">")
		return
	}

	// 解析返回值
	type RecvXml struct {
		XMLName      xml.Name `xml:"xml"`
		Return_code  string   `xml:"return_code"`
		Return_msg   string   `xml:"return_msg"`
		Appid        string   `xml:"appid"`
		Mch_id       string   `xml:"mch_id"`
		Nonce_str    string   `xml:"nonce_str"`
		Sign         string   `xml:"sign"`
		Result_code  string   `xml:"result_code"`
		Prepay_id    string   `xml:"prepay_id"`
		Trade_type   string   `xml:"trade_type"`
		Err_code     string   `xml:"err_code"`
		Err_code_des string   `xml:"err_code_des"`
	}
	ret := RecvXml{}
	err = xml.Unmarshal(body, &ret)
	if err != nil {
		log.Error("解析返回值:", err.Error(), "返回值<", string(body), ">")
		return
	}

	// 检查返回值
	if ret.Return_code != "SUCCESS" {
		// 通信标记位失败
		err = errors.New(ret.Return_msg)
		log.Error("和微信服务器通信失败:", err.Error())
		return
	}
	if ret.Result_code != "SUCCESS" {
		// 微信请求失败
		err = errors.New(ret.Err_code_des)
		log.Error("微信请求失败：", err.Error())
		return
	}

	prepayId = ret.Prepay_id
	return
}

// GetOpenId 根据code获取微信openid
func GetOpenId(code string) (openid, nick, avatar string, err error) {

	// 发送到微信服务器
	url := "https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code"
	url = strings.Replace(url, "APPID", AppId, 1)
	url = strings.Replace(url, "SECRET", AppSecret, 1)
	url = strings.Replace(url, "CODE", code, 1)
	resp, err := http.Get(url)
	if err != nil {
		log.Error("获取微信反馈失败：", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println(url)

	// 解析返回值(json)
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Error("读取微信反馈信息失败：", err)
		return
	}
	log.Info("微信反馈: \n", string(body))
	type Result struct {
		Access_token  string `json:"access_token"`
		Expires_in    int    `json:"expires_in"`
		Refresh_token string `json:"refresh_token"`
		Openid        string `json:"openid"`
		Scope         string `json:"scope"`
		Errcode       int    `json:"errcode"`
		Unionid       string `json:"unionid"`
		Errmsg        string `json:"errmsg"`
	}
	r := Result{}
	err = json.Unmarshal(body, &r)
	if err != nil {
		log.Error("解析微信反馈失败：", err)
		return
	}
	if r.Errcode != 0 {
		err = errors.New(r.Errmsg)
		log.Error("微信返回错误：", r.Errmsg)
		return
	}

	// 用于接收反馈信息的结构体
	type RetInfo struct {
		Openid     string `json:"openid"`
		Nickname   string `json:"nickname"`
		Sex        int    `json:"sex"`
		Province   string `json:"province"`
		City       string `json:"city"`
		Country    string `json:"country"`
		Headimgurl string `json:"headimgurl"`
		Unionid    string `json:"unionid"`
	}
	rr := RetInfo{}

	// 获取用户微信昵称 https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
	url = fmt.Sprintf("https://api.weixin.qq.com/sns/userinfo?access_token=%v&openid=%v&lang=zh_CN", r.Access_token, r.Openid)
	retBody, err := httpGet(url)
	if err != nil {
		log.Error("获取微信昵称反馈失败：", err)
		return
	}
	err = json.Unmarshal(retBody, &rr)
	if err != nil {
		log.Error("解析微信反馈失败：", err)
		return
	}
	if r.Errcode != 0 {
		err = errors.New(r.Errmsg)
		log.Error("微信返回错误：", r.Errmsg)
		return
	}

	openid = r.Openid
	nick = rr.Nickname
	avatar = rr.Headimgurl

	log.Info("获得的当前登录的微信信息为：", openid, nick, avatar)
	return
}

// WxpayCallback 处理微信回调
func WxpayCallback(xmlData []byte) (err error) {

	// 读取xml文件并解析第二层的内容到map中
	m1 := make(map[string]string)
	level := 0   // 当前xml层次
	var k string // 当前xml层次所在的token名称
	decoder := xml.NewDecoder(strings.NewReader(string(xmlData)))
	for t, err := decoder.Token(); err == nil; t, err = decoder.Token() {
		switch token := t.(type) {
		case xml.StartElement:
			level++
			k = token.Name.Local
		case xml.EndElement:
			level--
		case xml.CharData:
			if level == 2 {
				m1[k] = string([]byte(token))
			}
		default:
		}
	}

	// 对签名进行检查(将除了sign字段之外的其余字段，加上key，计算签名之后并与签名进行比对)
	m2 := make(map[string]string)
	for k, v := range m1 {
		if k != "sign" {
			m2[k] = v
		}
	}
	if m1["appid"] == AppId {
		// 公众号充值
		m2["key"] = AppKey
	} else {
		// appid不可能匹配错误
		err = errors.New("不是来自于平台的订单: " + m1["appid"])
		log.Error(err.Error())
		return
	}
	sign := GenWxSign(m2)
	if sign != m1["sign"] {
		err = errors.New("签名校验不通过")
		log.Error(err.Error())
		return
	}

	// 检查反馈结果
	if m1["return_code"] != "SUCCESS" {
		// 通信标记位失败
		err = errors.New(m1["return_msg"])
		log.Error("微信通信失败：", err.Error())
		return
	}
	if m1["result_code"] != "SUCCESS" {
		// 微信请求失败
		err = errors.New(m1["err_code_des"])
		log.Error("微信请求失败:", err.Error())
		return
	}
	err = WxPaySuccess(
		m1["out_trade_no"],
		m1["openid"],
		m1["bank_type"],
		m1["transaction_id"],
		m1["time_end"])
	if err != nil {
		log.Error("处理微信订单失败", err.Error())
		return
	}
	return
}
