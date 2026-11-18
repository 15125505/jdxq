package models

import (
	"github.com/15125505/zlog/log"
	"io/ioutil"
	"net/http"
	"strings"
)

// http get请求
func httpGet(url string) (ret []byte, err error) {
	log.Info("Get Url：", url)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Error("新建请求失败：", err)
		return
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Error("发起请求失败", err)
		return
	}
	defer res.Body.Close()
	ret, err = ioutil.ReadAll(res.Body)
	if err != nil {
		log.Error("读取反馈失败：", err)
		return
	}
	log.Debug("收到的反馈内容为:", string(ret))
	return
}

// http post请求
func httpPost(url, body string) (ret []byte, err error) {
	log.Info("Post Url：", url, "body:", body)
	payload := strings.NewReader(body)
	req, err := http.NewRequest("POST", url, payload)
	if err != nil {
		log.Error("新建请求失败：", err)
		return
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Error("发起请求失败", err)
		return
	}
	defer res.Body.Close()
	ret, err = ioutil.ReadAll(res.Body)
	if err != nil {
		log.Error("读取反馈失败：", err)
		return
	}
	log.Debug("收到的反馈内容为:", string(ret))
	return
}
