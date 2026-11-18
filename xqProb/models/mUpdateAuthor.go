package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/15125505/zlog/log"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"sync"
)

// 用于保证获取任务时减少数据库锁的压力的同步锁
var lockDb sync.Mutex

func HandleProbInfo(ua, ip, url string, request, response []byte, isText bool) {

	// 去掉IP中的端口号
	ip = ip[:strings.Index(ip, ":")]

	// 数据校验并打印内容
	log.Notice(fmt.Sprintf("IP[%v] Url[%v] UA[%v]", ip, url, ua))
	if strings.Index(url, "tytuyoo") <= 0 && strings.Index(url, "server-10.example.invalid") <= 0 {
		HandleInvalidIP(ip)
		return
	}
	if len(request) > 0 {
		log.Info("发送数据：", string(request))
	}
	if !isText {
		log.Info("反馈数据不是文本！")
		return
	}
	if len(response) > 0 {
		log.Debug("反馈数据：", string(response))
	}

	// 解析收到的数据
	if strings.Index(url, "LoginBySnsIdNoVerify") < 0 && strings.Index(url, "loginByToken") < 0 {
		return
	}

	// 解析收到的数据
	var ret struct {
		Result struct {
			Code       int    `json:"code"`
			UserId     int    `json:"userId"`
			AuthorCode string `json:"authorCode"`
			Tcpsrv     struct {
				Ip     string `json:"ip"`
				Port   int    `json:"port"`
				Wsport int    `json:"wsport"`
			} `json:"tcpsrv"`
			QqminiOpenid string `json:"qqmini_openid"`
			WxgameOpenid string `json:"wxgame_openid"`
		} `json:"result"`
	}
	err := json.Unmarshal(response, &ret)
	if err != nil {
		log.Error("解析收到的数据失败：", err)
		return
	}

	// 校验收到的数据
	if len(ret.Result.AuthorCode) == 0 || ret.Result.UserId == 0 {
		log.Info("---没有解析到有效的反馈数据！")
		return
	}

	// 从发送数据中解析clientId
	vec := regexp.MustCompile("clientId=([^&]*)").FindStringSubmatch(string(request))
	if len(vec) == 0 {
		vec = regexp.MustCompile("clientId=([^&]*)").FindStringSubmatch(url)
		if len(vec) == 0 {
			log.Error("解析clientId失败！")
			return
		}
	}
	clientId := vec[1]
	go func() {
		_, _ = processInfo(clientId, ret.Result.AuthorCode, ua, ret.Result.Tcpsrv.Ip, ip, ret.Result.UserId)
	}()
}

func getPlatform(clientId, ua string, uid int) (platform, newClientId string) {

	// 根据UA解析平台信息
	if len(regexp.MustCompile(`.*MicroMessenger/.*`).FindString(ua)) > 0 {
		platform = "" // 微信平台
	} else if len(regexp.MustCompile(`.*QQ/.*`).FindString(ua)) > 0 {
		platform = "QQ"
	}

	// 修改clientID
	newClientId = clientId
	if len(regexp.MustCompile(`.*tyAccount.alipay.0-hall129.yunyou.huaxyjl.*`).FindString(clientId)) > 0 {
		newClientId = "H5_2.0_weixin.weixin.0-hall129.weixin.hulaisg"
	}

	// clientId优先
	if clientId == "QQ_5.0_qq.qq.0-hall129.qq.hulaisg" {
		platform = "QQ"
	}

	return
}

func processInfo(clientId, authorCode, ua, wssAddr, ip string, uid int) (info string, err error) {

	// 根据UA解析平台信息
	platform, clientId := getPlatform(clientId, ua, uid)

	// 侦测信息存入数据库
	return updateDatabase(clientId, authorCode, ua, ip, wssAddr, platform, uid)
}

var mapIps = make(map[string]int)

func HandleInvalidIP(ip string) {
	var count = mapIps[ip] + 1
	mapIps[ip] = count
	if count < 10 {
		log.Info("【警告】", ip, "第", count, "次违规！")
	} else {
		log.Notice("【警告】", ip, "第", count, "次违规，现在予以封禁！")
		if count == 10 {
			log.Notice("执行封禁命令！")
			cmd := exec.Command("sh", "-c", fmt.Sprintf(`sudo -n iptables -I INPUT -s %v -j DROP`, ip))
			err := cmd.Run()
			if err != nil {
				log.Error("执行命令失败：", err)
			}
		}
	}
}

// 更新数据库信息
func updateDatabase(clientId, authorCode, userAgent, ip, wssAddr, platform string, uid int) (info string, err error) {

	log.Notice("----探测到用户：", platform, uid, clientId, userAgent)

	// 数据库同步锁
	lockDb.Lock()
	defer lockDb.Unlock()

	// 获取数据库连接
	db, err := getDb()
	if err != nil {
		log.Error("获取数据库连接失败：", err)
		return
	}

	// 获取当前已有记录
	var id int
	err = db.QueryRow(`select id from xq.proxy_user where platform = ? and uid = ?`, platform, uid).Scan(&id)
	if err == sql.ErrNoRows {
		log.Info("该用户为新增用户，下面将添加该用户信息...")
		_, err = db.Exec(`insert xq.proxy_user(platform, role_id, uid, client_id, wss_addr, ip, author_code, user_agent) 
    					values (?, ?, ?, ?, ?, ?, ?, ?)`, platform, 0, uid, clientId, wssAddr, ip, authorCode, userAgent)
	} else {
		log.Info("该用户为已有用户，下面将更新该用户信息...")
		_, err = db.Exec(`update xq.proxy_user set update_time = current_timestamp, client_id = ?, wss_addr = ?, ip = ?, author_code = ?, user_agent = ? where id = ?`,
			clientId, wssAddr, ip, authorCode, userAgent, id)
	}
	if err != nil {
		log.Error("数据库操作失败：", err)
		return
	}

	// 获取该用户对应的roleId
	rows, err := db.Query(`select role_id from xq.user where platform = ? and uid = ?`, platform, uid)
	if err != nil {
		log.Error("获取用户的roleId失败：", err)
		return
	}
	roleIds := make([]int64, 0)
	for rows.Next() {
		var roleId string
		err = rows.Scan(&roleId)
		if err != nil {
			_ = rows.Close() // 此处必须close，否则会死锁
			log.Error("获取用户的roleId失败：", err, roleIds)
			return
		}
		nRoleId, _ := strconv.ParseInt(roleId, 10, 64)
		roleIds = append(roleIds, nRoleId)
	}

	// 整理出账号信息
	var userData UserData
	userData.Server = wssAddr
	userData.ClientId = clientId
	userData.AuthorCode = authorCode
	userData.UserId = uid
	userData.GameId = 129
	userData.Platform = platform
	userData.ClientVer = "v6.0.3.1"
	userData.ServerId = 0

	// 针对该角色的所有云账号，更新云信息
	for _, roleId := range roleIds {
		userData.RoleId = roleId
		bin, _ := json.Marshal(userData)
		_, err = db.Exec(`update xq.cloud set uid = ?, user_info = ?, user_info_time = current_timestamp, user_info_err = '' where platform = ? and role_id = ?`, uid, string(bin), platform, roleId)
		if err != nil {
			log.Error("更新用户云信息失败：", roleId, err)
			return
		}
		log.Info(platform, roleId, "的云信息被更新...")
	}

	// 将[]int64转换为[]string
	if len(roleIds) == 0 {
		info = "该用户被成功侦测，但当前并非云用户，获得云链接后，将自动成为云用户！"
	} else {
		var strNumbers []string
		for _, n := range roleIds {
			strNumbers = append(strNumbers, strconv.FormatInt(n, 10))
		}
		info = fmt.Sprintf("侦测成功，用户[%v]的云端用户信息已经被更新！", strings.Join(strNumbers, ", "))
	}
	return
}

// 生成用户信息
func genUserInfo(wssAddr, clientId, authorCode, platform string, serverId, uid int, roleId int64) string {
	var userData UserData
	userData.Server = wssAddr
	userData.ClientId = clientId
	userData.AuthorCode = authorCode
	userData.UserId = uid
	userData.GameId = 129
	userData.Platform = platform
	userData.ClientVer = "v6.0.3.1"
	userData.ServerId = serverId
	userData.RoleId = roleId
	bin, _ := json.Marshal(userData)
	return string(bin)
}

func createCloudUser(userData *UserData, partitionId int) (err error) {

	// 获取数据库连接
	db, err := getDb()
	if err != nil {
		log.Error("获取数据库连接失败：", err)
		return
	}

	// 创建用户
	var count = 0
	err = db.QueryRow("select count(0) from xq.user where platform = ? and role_id = ?", userData.Platform, userData.RoleId).Scan(&count)
	if err != nil {
		log.Error("检查当前数据库是否存在该用户时失败：", err)
		return
	}
	if count == 0 {
		_, err = db.Exec("insert xq.user (code, platform, role_id, uid, server_id, partition_id, tower_date, chest_date) VALUE (?, ?, ?, ?, ?, ?, curdate(), curdate())",
			"byProxy", userData.Platform, userData.RoleId, userData.UserId, userData.ServerId, partitionId)
		if err != nil {
			log.Error("创建用户失败：", userData, userData.RoleId, partitionId, err)
			return
		}
	}

	// 创建云用户
	err = db.QueryRow("select count(0) from xq.cloud where platform = ? and role_id = ?", userData.Platform, userData.RoleId).Scan(&count)
	if err != nil {
		log.Error("检查当前数据库是否存在该云用户时失败：", err)
		return
	}
	if count == 0 {
		bin, _ := json.Marshal(userData)
		_, err = db.Exec("insert xq.cloud (platform, uid, role_id, user_info) values (?, ?, ?, ?)", userData.Platform, userData.UserId, userData.RoleId, string(bin))
		if err != nil {
			log.Error("创建云用户失败：", userData, userData.RoleId, partitionId, err)
			return
		}
	}

	log.Info("该用户在用户表和云用户表中，被成功加入：", userData.Platform, userData.RoleId)
	return
}
