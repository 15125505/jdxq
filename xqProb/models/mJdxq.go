package models

import (
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"strconv"
	"time"
)

type RecentUserRet struct {
	C int    // 这个时间之内，侦测到的用户数量
	P string // 用户对应的Platform
	U string // 用户uid
}

func RecentUser(startTime int, ip string) (code int, errString string, ret RecentUserRet) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 获取用户时间，如果时间过于久远，直接返回失败
	var now = int(time.Now().Unix())
	if now > startTime+300 {
		return 2, "时间太久，无法查询", ret
	}
	var start = time.Unix(int64(startTime), 0)

	// 获取数据库连接
	db, err := getDb()
	if err != nil {
		log.Error("获取数据库连接失败：", err)
		return
	}

	// 获取这个时间之后所侦测到的用户数量
	err = db.QueryRow("select count(0), ifnull(platform, ''), ifnull(uid, 0) from xq.proxy_user where update_time > ? and ip = ?",
		start.Format("2006-01-02 15:04:05"),
		ip,
	).Scan(&ret.C, &ret.P, &ret.U)
	if err != nil {
		log.Error("获取侦测到的用户信息失败：", err)
		return
	}

	return
}

type GetRoleIdRet struct {
	R string
	K string
}

func GetRoleId(startTime int, ip, platform, uid string) (code int, errString string, ret GetRoleIdRet) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 获取用户时间，如果时间过于久远，直接返回失败
	var now = int(time.Now().Unix())
	if now > startTime+300 {
		return 2, "时间太久，无法查询", ret
	}
	var start = time.Unix(int64(startTime), 0)

	// 获取数据库连接
	db, err := getDb()
	if err != nil {
		log.Error("获取数据库连接失败：", err)
		return
	}

	// 获取这个时间之后所侦测到的用户数量
	var userData UserData
	err = db.QueryRow("select wss_addr, client_id, author_code from xq.proxy_user where update_time > ? and ip = ? and platform = ? and uid = ?",
		start.Format("2006-01-02 15:04:05"),
		ip, platform, uid,
	).Scan(&userData.Server, &userData.ClientId, &userData.AuthorCode)
	if err != nil {
		log.Error("没有找到目标用户：", err)
		if err == sql.ErrNoRows {
			err = errors.New("没有找到刚才侦测到的用户")
		}
		return
	}

	// 获取该用户的RoleId
	userData.UserId, _ = strconv.Atoi(uid)
	userData.GameId = 129
	userData.Platform = platform
	userData.ClientVer = "v6.0.4"
	roleId, err := NewClient(&userData).Start()
	if err != nil {
		log.Error("获取用户角色Id失败：", err)
		return
	}

	ret.R = fmt.Sprint(roleId)
	ret.K = fmt.Sprintf("%x", md5.Sum([]byte(platform+"xq"+ret.R)))
	return
}

func Up(ip string, body []byte) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 解析收到的数据
	var recv struct {
		Au  string
		Uid int
		Ci  string
		Ua  string
		Wss string
	}
	err = json.Unmarshal(body, &recv)
	if err != nil {
		log.Error("解析收到的数据失败：", err)
		return
	}

	log.Info("用户上传数据：", string(body))

	// 校验收到的数据
	if recv.Au == "" || recv.Ci == "" || recv.Ua == "" || recv.Wss == "" || recv.Uid == 0 {
		code = 1
		errString = "数据不合法"
		log.Error(errString)
		return
	}

	// 然后调用实际处理模块进行处理
	ret, err = processInfo(recv.Ci, recv.Au, recv.Ua, recv.Wss, ip, recv.Uid)
	return
}

type AppUpRet struct {
	R int64  // roleId
	K string // key
	P string // platform
	S int    // server
	U string // userName
	N string // nickName
}

// AppUp 手机app上传用户信息
func AppUp(ip string, body []byte) (code int, errString string, ret AppUpRet) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 解析收到的数据
	var recv struct {
		Au  string // authorCode
		Uid int    // uid
		Ci  string // clientId
		Ua  string // ua
		Wss string // wss

		// 以下是选填内容，根据roleId判定，如果不为0，表示选填内容有效
		Name   string // name
		Nick   string // name
		Server int    // server
		Ro     int64  // roleId
	}
	err = json.Unmarshal(body, &recv)
	if err != nil {
		log.Error("app", "解析收到的数据失败：", err)
		return
	}

	log.Info("app", "用户上传数据：", string(body))

	// 校验收到的数据
	if recv.Au == "" || recv.Ci == "" || recv.Ua == "" || recv.Wss == "" || recv.Uid == 0 {
		code = 1
		errString = "数据不合法"
		log.Error(errString)
		return
	}

	// 根据UA解析平台信息
	var platform string
	platform, recv.Ci = getPlatform(recv.Ci, recv.Ua, recv.Uid)

	// 获取数据库连接
	db, err := getDb()
	if err != nil {
		log.Error("获取数据库连接失败：", err)
		return
	}

	// 如果这个uid对应的记录存在，那么返回该记录的详情
	var id int
	err = db.QueryRow(`select id, role_id, server_id, user_name, nick from xq.app_user where platform = ? and uid = ?`, platform, recv.Uid).
		Scan(&id, &ret.R, &ret.S, &ret.U, &ret.N)
	if err != sql.ErrNoRows && err != nil {
		log.Error("app", "查询app_user失败：", err)
		return
	}
	ret.P = platform

	// 如果当前已经传入了信息，那么以传入的数据为准
	if recv.Ro != 0 {
		ret.R = recv.Ro
		ret.S = recv.Server
		ret.U = recv.Name
		ret.N = recv.Nick
	}
	ret.K = genKey(platform, fmt.Sprint(ret.R))

	// 当前没有查到记录
	if err == sql.ErrNoRows {

		// 而且用户没有传入信息，那么直接返回
		if recv.Ro == 0 {
			err = nil
			ret.K = ""
			log.Notice("app", "该用户需要进一步提供信息！")
			return
		}

		// 如果当前传入了信息，那么需要创建这个用户
		_, err = db.Exec(`insert xq.app_user (platform, role_id, uid, client_id, wss_addr, ip, author_code, user_agent, server_id, user_name, nick) VALUE (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			platform, recv.Ro, recv.Uid, recv.Ci, recv.Wss, ip, recv.Au, recv.Ua, recv.Server, recv.Name, recv.Nick)
		if err != nil {
			log.Error("app", "创建app_user失败：", err)
			return
		}
		log.Notice("app", "创建app_user成功：", recv)

	} else {

		// 更新app_user表的内容
		if recv.Ro != 0 {
			_, err = db.Exec(`update xq.app_user set update_time = current_timestamp, ip = ?, author_code = ?, user_agent = ?, user_name = ?, nick = ?, role_id = ?, client_id =?, wss_addr = ?, server_id = ? where id = ?`,
				ip, recv.Au, recv.Ua, recv.Name, recv.Nick, recv.Ro, recv.Ci, recv.Wss, recv.Server, id)
			log.Info("app", "用户强制获取云链接", recv)
		} else {
			_, err = db.Exec(`update xq.app_user set update_time = current_timestamp, ip = ?, author_code = ?, user_agent = ?, client_id =?, wss_addr = ? where id = ?`,
				ip, recv.Au, recv.Ua, recv.Ci, recv.Wss, id)
		}
		if err != nil {
			log.Error("app", "更新app_user失败", err)
			return
		}
		log.Notice("app", "更新app_user成功：", recv)
	}

	// 获取云用户对应的记录
	var userInfo = genUserInfo(recv.Wss, recv.Ci, recv.Au, platform, ret.S, recv.Uid, ret.R)
	err = db.QueryRow("select id from xq.cloud where platform = ? and role_id = ?", platform, ret.R).Scan(&id)
	if err == sql.ErrNoRows {

		// 添加一条云用户记录
		_, err = db.Exec("insert xq.cloud (platform, uid, role_id, user_info) VALUE (?, ?, ?, ?)", platform, recv.Uid, ret.R, userInfo)
		if err != nil {
			log.Error("app", "添加云用户失败：", err)
			return
		}
		log.Info("app", "添加云用户成功")
		return
	}
	if err != nil {
		log.Error("app", "查询云用户失败：", err)
		return
	}

	// 更新用户的云信息
	_, err = db.Exec(`update xq.cloud set uid = ?, user_info = ?, user_info_time = current_timestamp, user_info_err = '' where id = ?`, recv.Uid, userInfo, id)
	if err != nil {
		log.Error("更新用户云信息失败：", err)
		return
	}
	log.Info("app", "更新云用户信息成功！")

	return
}

type RoRet struct {
	R string
	K string
	P string
}

func Ro(body []byte) (code int, errString string, ret RoRet) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 解析收到的数据
	var recv struct {
		Au  string
		Uid int
		Ci  string
		Ua  string
		Wss string
	}
	err = json.Unmarshal(body, &recv)
	if err != nil {
		log.Error("解析收到的数据失败：", err)
		return
	}

	log.Info("用户上传数据：", string(body))

	// 校验收到的数据
	if recv.Au == "" || recv.Ci == "" || recv.Ua == "" || recv.Wss == "" || recv.Uid == 0 {
		code = 1
		errString = "数据不合法"
		log.Error(errString)
		return
	}

	// 获取该用户的RoleId
	var userData UserData
	userData.Server = recv.Wss
	userData.ClientId = recv.Ci
	userData.AuthorCode = recv.Au

	userData.UserId = recv.Uid
	userData.GameId = 129
	userData.Platform, userData.ClientId = getPlatform(recv.Ci, recv.Ua, recv.Uid)
	userData.ClientVer = "v6.0.4"
	roleId, err := NewClient(&userData).Start()
	if err != nil {
		log.Error("获取用户角色Id失败：", err)
		return
	}

	ret.R = fmt.Sprint(roleId)
	ret.K = genKey(userData.Platform, ret.R)
	ret.P = userData.Platform

	return
}

func genKey(platform, roleId string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(platform+"xq"+roleId)))
}

func Bin(data *[]byte) {
	for i := 0; i < len(*data); i++ {
		(*data)[i] ^= 0x64
	}
}
