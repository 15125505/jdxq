package models

import (
	"crypto/sha1"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"os"
	"sort"
	"strings"
	"time"
)

// WxToken 这是公众号测试用的
var WxToken = os.Getenv("JDXQ_WECHAT_TOKEN")

// 调用开放接口的域名 server-4.example.invalid

func CheckSignature(signature, timestamp, nonce string) bool {
	var vec []string
	vec = append(vec, WxToken)
	vec = append(vec, timestamp)
	vec = append(vec, nonce)
	sort.Strings(vec)
	var tmpStr = strings.Join(vec, "")
	s := fmt.Sprintf("%x", sha1.Sum([]byte(tmpStr)))
	log.Info("当前计算的签名为：", s)
	return s == signature
}

// 本地的accessToken，用于避免频繁向微信服务器获取
var accessToken struct {
	value      string
	updateTime time.Time
}

// GetAccessToken /**
func GetAccessToken(refresh bool) (ret string, err error) {

	// 如果当前已经有值，而且该值在一个小时之内更新的，那么直接返回当前值
	if !refresh && len(accessToken.value) > 0 && time.Now().Before(accessToken.updateTime.Add(time.Hour)) {
		return accessToken.value, nil
	}

	// 更新accessToken
	reqUrl := "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET"
	reqUrl = strings.Replace(reqUrl, "APPID", AppId, 1)
	reqUrl = strings.Replace(reqUrl, "APPSECRET", AppSecret, 1)
	retData, err := httpGet(reqUrl)
	if err != nil {
		log.Error("获取微信公众号accessToken失败：", err)
		return
	}

	// 解析反馈结果{"access_token":"ACCESS_TOKEN","expires_in":7200}
	var retInfo struct {
		Access_token string
		Expires_in   int
		Errcode      int
		Errmsg       string
	}
	err = json.Unmarshal(retData, &retInfo)
	if err != nil {
		log.Error("获取微信公众号accessToken，解析反馈失败：", err)
		return
	}
	if retInfo.Errcode != 0 {
		err = errors.New(retInfo.Errmsg)
		log.Error("微信服务器反馈错误：", retInfo.Errcode, retInfo.Errmsg)
		return
	}
	accessToken.value = retInfo.Access_token
	accessToken.updateTime = time.Now()

	return retInfo.Access_token, nil
}

// GetNews 获取图文消息
func GetNews() (err error) {

	// 获取token
	token, err := GetAccessToken(false)
	if err != nil {
		log.Error("获取accessToken失败：", err)
		return
	}

	// 准备需要发送的数据
	sendInfo := `
{
  	"type":"news",
	"offset":0,
	"count":10
}
`

	// 向微信服务器发送请求
	reqUrl := "https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=ACCESS_TOKEN"
	reqUrl = strings.Replace(reqUrl, "ACCESS_TOKEN", token, 1)
	retData, err := httpPost(reqUrl, sendInfo)
	if err != nil {
		log.Error("创建公众号菜单失败：", err)
		return
	}

	log.Info("反馈：", string(retData))

	return
}

// CreateMenu 创建菜单
func CreateMenu() (err error) {

	// 获取token
	token, err := GetAccessToken(false)
	if err != nil {
		log.Error("获取accessToken失败：", err)
		return
	}

	// 准备需要发送的数据
	sendInfo := `
{
    "button": [
        {
            "name": "辅助下载",
            "sub_button": 
            [
                {
                    "type":"click",
                    "name":"下载地址",
                    "key":"Menu_Download"
                }
            ]
        }, 
        {
            "name": "发现",
            "sub_button": 
            [
                {
                    "type":"view",
                    "name":"江东云注册码",
                    "url":"https://server-4.example.invalid"
                }
            ]
        }
    ]
}
`

	// 向微信服务器发送请求
	reqUrl := "https://api.weixin.qq.com/cgi-bin/menu/create?access_token=ACCESS_TOKEN"
	reqUrl = strings.Replace(reqUrl, "ACCESS_TOKEN", token, 1)
	retData, err := httpPost(reqUrl, sendInfo)
	if err != nil {
		log.Error("创建公众号菜单失败：", err)
		return
	}

	// 解析反馈结果{"errcode":0,"errmsg":"ok"}
	var retInfo struct {
		Errcode int
		Errmsg  string
	}
	err = json.Unmarshal(retData, &retInfo)
	if err != nil {
		log.Error("获取微信公众号accessToken，解析反馈失败：", err)
		return
	}
	if retInfo.Errcode != 0 {
		log.Error("创建公众号菜单失败，微信反馈错误：", retInfo.Errmsg)
		err = errors.New(retInfo.Errmsg)
		return
	}

	return
}

func ProcessWxMsg(binData []byte) (retString string, err error) {

	// 解析收到的数据
	recvInfo := struct {
		XMLName      xml.Name `xml:"xml"`
		ToUserName   string
		FromUserName string
		CreateTime   int64
		MsgType      string
		Content      string
		MsgId        int64

		Event    string
		EventKey string
	}{}
	err = xml.Unmarshal(binData, &recvInfo)
	if err != nil {
		log.Error("解析来自微信的消息失败：", err)
		return
	}

	// 返回的数据
	retInfo := struct {
		XMLName      xml.Name `xml:"xml"`
		ToUserName   string
		FromUserName string
		CreateTime   int64
		MsgType      string
		Content      string
	}{}
	retInfo.ToUserName = recvInfo.FromUserName
	retInfo.FromUserName = recvInfo.ToUserName
	retInfo.CreateTime = time.Now().Unix()
	retInfo.MsgType = "text"
	if recvInfo.MsgType == "text" {
		// 取消之前的自动回复
		//retInfo.Content = "您的消息小乔已经收到，如有必要，我们的管理人员将在看到消息后进行回复。"
		return "", nil
	} else if recvInfo.MsgType == "event" {
		switch recvInfo.Event {
		case "CLICK":
			switch recvInfo.EventKey {
			case "Menu_Download":
				retInfo.Content = `辅助软件只能在电脑上运行，请复制链接后在电脑上下载。
链接： http://server-9.example.invalid/ax/xiaoqiao.7z`
			case "Menu_Video":
				retInfo.Content = `这是微风大神在B站为大家拍摄的江东小乔的简单使用教程：
https://resource.example.invalid/REDACTED`
			}

		case "VIEW":
			return "", nil
		default:
			log.Notice("公众号指令不能识别：\n" + recvInfo.Event + "\n" + recvInfo.EventKey)
			return "", nil

		}
	}

	binSend, _ := xml.Marshal(retInfo)
	retString = string(binSend)
	log.Info("发送的数据：", retString)

	return
}
