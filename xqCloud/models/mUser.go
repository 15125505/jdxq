package models

import (
	"crypto/md5"
	"database/sql"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"strings"
	"time"
)

// 网页上获取用户状态
type UserStateRet struct {
	ErrMsg       string
	State        int    // 当前工作状态 0.停止 1.开始
	IsUserInfoOK bool   // 用户信息是否已经上传
	IsConfigOK   bool   // 配置信息是否已经上传
	IsSubOK      bool   // 属臣库是否已经上传
	UserInfoTime string // 用户信息上传的时间
	UserInfoErr  string // 如果用户信息已经上传，而且当前状态为停止，那么此处为停止原因
	WorkTime     string // 任务上次被接管的时间
	VipState     string // vip状态
}

// 网页上获取用户状态
func UserState(platform, roleId, key string) (code int, errString string, ret UserStateRet) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
		}
	}()

	// 校验key是否正确
	if !checkKey(platform, roleId, key) {
		ret.ErrMsg = "不合法的命令"
		return
	}

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 首先检查vip时间
	var vipTime string
	err = db.QueryRow("select vip_time from xq.vip where platform = ? and role_id = ? for update", platform, roleId).Scan(&vipTime)
	if err != nil {
		if err == sql.ErrNoRows {
			ret.VipState = "未曾注册为云用户"
		} else {
			return
		}
	}
	if vipTime < time.Now().Format("2006-01-02 15:04:05") {
		ret.VipState = fmt.Sprint("云有效时间已于", vipTime, "过期")
	} else {
		ret.VipState = fmt.Sprint("云有效时间可到", vipTime)
	}

	// 获取用户状态
	var userInfo, configInfo string
	subInfo := make([]byte, 0)
	err = db.QueryRow("select state, user_info, config_info, sub_info, user_info_err, user_info_time, work_time from xq.cloud where platform = ? and role_id = ?", platform, roleId).
		Scan(&ret.State, &userInfo, &configInfo, &subInfo, &ret.UserInfoErr, &ret.UserInfoTime, &ret.WorkTime)
	if err != nil {
		log.Error("查询用户状态失败：", err)
		return
	}
	ret.IsUserInfoOK = len(userInfo) > 0
	ret.IsConfigOK = len(configInfo) > 0
	ret.IsSubOK = len(subInfo) > 0

	return
}

// 校验key是否正确
func checkKey(platform, roleId, key string) bool {
	md5str := fmt.Sprintf("%x", md5.Sum([]byte(platform+"xq"+roleId)))
	if md5str != key {
		log.Error("非法请求：", platform, roleId, key, "正确的key应该是：", key)
		return false
	}
	return true
}

// 网页上请求开始工作
func StartWork(platform, roleId, key string) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			ret = err.Error()
		}
	}()

	// 校验key是否正确
	if !checkKey(platform, roleId, key) {
		ret = "不合法的命令"
		return
	}

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 启动事务
	tx, err := db.Begin()
	if err != nil {
		log.Error("启动事务：", err.Error())
		return
	}
	defer tx.Rollback() // 如果操作成功了，再Rollback一次也没啥事情

	// 首先检查是否在vip时间之内，否则直接返回错误
	var vipTime string
	err = tx.QueryRow("select vip_time from xq.vip where platform = ? and role_id = ? for update", platform, roleId).Scan(&vipTime)
	if err != nil {
		log.Error("查询vip时间失败：", err)
		if err == sql.ErrNoRows {
			err = errors.New("您不是云用户，请先注册为云用户")
		}
		return
	}
	if vipTime < time.Now().Format("2006-01-02 15:04:05") {
		ret = "您的云有效时间已经过期，请续期"
		return
	}

	// 获取该用户的状态
	var state, id int
	var userInfo, configInfo, userInfoErr string
	subInfo := make([]byte, 0)
	err = tx.QueryRow("select id, state, user_info, config_info, sub_info, user_info_err from xq.cloud where platform = ? and role_id = ?", platform, roleId).Scan(&id, &state, &userInfo, &configInfo, &subInfo, &userInfoErr)
	if err != nil {
		log.Error("查询用户状态失败：", err)
		return
	}

	// 首先检查当前状态是否正在工作中，如果正在工作中，那么直接返回
	if state == 1 {
		ret = "您当前已经在开始状态了"
		return
	}

	// 然后检查当前用户状态，如果用户状态还没上传，直接返回
	if len(userInfo) == 0 {
		ret = "您暂未上传登录信息，请先上传登录信息"
		return
	}

	// 如果用户的错误状态不是在其它地方登录，那么返回错误
	if len(userInfoErr) != 0 && userInfoErr != "SYS_LOGOUT_OTHER_LOGIN" {
		ret = "您的登录信息已经失效，原因是：" + userInfoErr + "（请重新上传登录信息）"
		return
	}

	// 如果配置信息还没上传，那么返回错误
	if len(configInfo) == 0 {
		ret = "您暂未上传配置信息，请先上传配置信息"
		return
	}

	// 如果配置信息勾选了属臣库中找矿，但属臣库没有上传，那么返回错误
	if strings.Contains(configInfo, `"findInSub":true`) && len(subInfo) == 0 {
		ret = "您并未上传属臣库，请先上传属臣库"
		return
	}

	// 修改状态为开始，修改工作时间为2019年
	_, err = tx.Exec("update xq.cloud set state = 1, work_time = '2019-01-01 00:00:00' where id = ?", id)
	if err != nil {
		log.Error("更新用户信息状态失败：", err)
		return
	}

	// 用户数据更新
	_ = tx.Commit()
	ret = "您已经成功开始"

	return
}
