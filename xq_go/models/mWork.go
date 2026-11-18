package models

import (
	"bytes"
	"compress/gzip"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"io"
	"time"
)

// 命令分发函数
func handleWork(cmdName string, db *sql.DB, data []byte) (ret interface{}, err error) {
	switch cmdName {
	case "getUserInfo":
		return getUserInfo(db, data)
	case "updatePlayer":
		return updatePlayer(db, data)
	case "updateTowerCount":
		return updateTowerCount(db, data)
	case "updateChestCount":
		return updateChestCount(db, data)
	case "useSn":
		return useSn(db, data)
	case "uploadInfo":
		return uploadInfo(db, data)
	case "downloadInfo":
		return downloadInfo(db, data)
	case "downloadUserInfo":
		return downloadUserInfo(db, data)
	case "payQr":
		return payQr(db, data)
	case "checkQr":
		return checkQr(db, data)
	case "getOnceWork":
		return getOnceWork(db, data)
	}
	return nil, errors.New("不合法的命令：" + cmdName)
}

// 获取用户信息
type UserNode struct {
	UserId string
	Level  int
}
type GetUserInfoRet struct {
	VipLevel   int
	TowerCount int
	ChestCount int
	LeftTime   int // 今天的剩余时间：秒，客户端在这个时间之后，需要重置爬塔和挖矿次数
	Players    []UserNode
	VipTime    string
}

func getUserInfo(db *sql.DB, data []byte) (ret GetUserInfoRet, err error) {

	// 用户参数
	var param struct {
		Code        string
		Platform    string
		UserId      string //: '1111',
		RoleId      string //: '2222',
		ServerId    int    //: 153,
		PartitionId int    //: 8,
		UserName    string //: '微信名称',
		Nick        string //: '昵称'
		VipExp      int    //: vip经验
		VipLevel    int    //: vip等级
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	log.Info(fmt.Sprintf("Player[%v%v] %vS%v [%v %v] VIP%v EXP%v",
		param.Platform, param.RoleId, param.Platform, param.ServerId, param.UserName, param.Nick, param.VipLevel, param.VipExp/10))

	// 查询用户
	var userId int
	var towerDate, chestDate string
	err = db.QueryRow("select id, tower_count, chest_count, tower_date, chest_date from xq.user where platform = ? and role_id = ?", param.Platform, param.RoleId).
		Scan(&userId, &ret.TowerCount, &ret.ChestCount, &towerDate, &chestDate)
	if err != sql.ErrNoRows && err != nil {
		log.Error("查询用户信息失败：", err)
		return
	}

	// 更新用户表，如果没有就添加
	if err == sql.ErrNoRows {
		err = nil
		_, _ = db.Exec("insert xq.user (code, platform, role_id, uid, server_id, partition_id, user_name, nick, tower_date, chest_date) VALUE (?, ?, ?, ?, ?, ?, ?, ?, curdate(), curdate())",
			param.Code, param.Platform, param.RoleId, param.UserId, param.ServerId, param.PartitionId, param.UserName, param.Nick)
	} else {
		_, _ = db.Exec("update xq.user set update_time = current_timestamp, code = ?, uid = ?, server_id = ?, partition_id = ?,  user_name = ?, nick = ? where id = ?",
			param.Code, param.UserId, param.ServerId, param.PartitionId, param.UserName, param.Nick, userId)
	}
	var curDate = time.Now().Format("2006-01-02")
	if curDate != towerDate {
		ret.TowerCount = 0
	}
	if curDate != chestDate {
		ret.ChestCount = 0
	}

	// 今日剩余时间
	ret.LeftTime = 86400 - time.Now().Hour()*3600 - time.Now().Minute()*60 - time.Now().Second()

	// 获取vip等级
	ret.VipLevel, ret.VipTime, err = getVipLevel(param.Platform, param.RoleId, db)
	if err != nil {
		log.Error("获取vip等级失败", err)
		return
	}

	ret.Players = make([]UserNode, 0)
	//// 如果vip等级为超级vip，那么还需要加入用户信息  -- 这块以后再说吧，还得想想怎么做
	//if ret.VipLevel < 2 {
	//	return
	//}
	//rows, err := db.Query("select uid, level from xq.player where partition_id = ? order by level desc limit 100", param.PartitionId)
	//if err != nil {
	//	log.Error("获取玩家列表失败", err)
	//	return
	//}
	//for rows.Next() {
	//	var node UserNode
	//	err = rows.Scan(&node.UserId, &node.Level)
	//	if err != nil {
	//		log.Error("获取玩家列表失败", err)
	//		return
	//	}
	//	ret.Players = append(ret.Players, node)
	//}
	//rows, err = db.Query("select uid, level from xq.player where partition_id = ? order by level limit 100", param.PartitionId)
	//if err != nil {
	//	log.Error("获取玩家列表失败", err)
	//	return
	//}
	//for rows.Next() {
	//	var node UserNode
	//	err = rows.Scan(&node.UserId, &node.Level)
	//	if err != nil {
	//		log.Error("获取玩家列表失败", err)
	//		return
	//	}
	//	ret.Players = append(ret.Players, node)
	//}
	return
}

// 获取用户的vip等级（如果该用户不存在，那么创建这个vip用户并赠送2周时间）
func getVipLevel(platform, roleId string, db *sql.DB) (vipLevel int, vipTime string, err error) {

	return 0, "2030-12-31 00:00:00", nil
}

// 更新爬塔次数，返回当前次数
func updateTowerCount(db *sql.DB, data []byte) (ret int, err error) {

	// 用户参数
	var param struct {
		Platform string
		RoleId   string //: '2222',
		NewCount int    //: 2,
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}
	ret = param.NewCount

	// 查询当前情况
	var userId, towerCount int
	var towerDate string
	err = db.QueryRow("select id, tower_count, tower_date from xq.user where platform = ? and role_id = ?", param.Platform, param.RoleId).
		Scan(&userId, &towerCount, &towerDate)
	if err != nil {
		log.Error("查询用户信息失败：", err)
		return
	}

	// 计算次数，如果和数据库中的日期是同一天，那么需要加上之前的次数
	var curDate = time.Now().Format("2006-01-02")
	if curDate == towerDate {
		ret += towerCount
	}
	_, _ = db.Exec("update xq.user set update_time = current_timestamp, tower_count = ?, tower_date = curdate() where id = ?",
		ret, userId)

	return
}

// 更新采矿次数，返回当前次数
func updateChestCount(db *sql.DB, data []byte) (ret int, err error) {

	// 用户参数
	var param struct {
		Platform string
		RoleId   string //: '2222',
		NewCount int    //: 2,
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}
	ret = param.NewCount

	// 查询当前情况
	var userId, oldCount int
	var oldDate string
	err = db.QueryRow("select id, chest_count, chest_date from xq.user where platform = ? and role_id = ?", param.Platform, param.RoleId).
		Scan(&userId, &oldCount, &oldDate)
	if err != nil {
		log.Error("查询用户信息失败：", err)
		return
	}

	// 计算次数，如果和数据库中的日期是同一天，那么需要加上之前的次数
	var curDate = time.Now().Format("2006-01-02")
	if curDate == oldDate {
		ret += oldCount
	}
	_, _ = db.Exec("update xq.user set update_time = current_timestamp, chest_count = ?, chest_date = curdate() where id = ?",
		ret, userId)

	return
}

// 更新玩家信息，返回新增的玩家信息
func updatePlayer(db *sql.DB, data []byte) (ret int, err error) {

	// 用户参数
	var param struct {
		Players []struct {
			Platform    string
			Uid         string //: '2222',
			PartitionId int
			Level       int //: 2,
		}
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 依次更新数据
	for i := 0; i < len(param.Players); i++ {
		node := param.Players[i]
		_, err = db.Exec("insert xq.player (platform, partition_id, uid, level) value (?, ?, ?, ?)", node.Platform, node.PartitionId, node.Uid, node.Level)
		if err == nil {
			ret++
			continue
		}
		_, err = db.Exec("update xq.player set partition_id = ?, level = ? where platform = ? and uid = ?", node.PartitionId, node.Level, node.Platform, node.Uid)
		if err != nil {
			log.Error("更新失败：", err)
			continue
		}
	}
	err = nil
	return
}

// 使用注册码
type UseSnRet struct {
	ErrMsg  string
	VipTime string
}

// 使用注册码
func useSn(db *sql.DB, data []byte) (ret UseSnRet, err error) {

	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
			err = nil
		}
	}()

	// 用户参数
	var param struct {
		Sn       string
		Platform string
		RoleId   string //: '2222',
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 启动事务
	tx, err := db.Begin()
	if err != nil {
		log.Error("启动事务：", err.Error())
		return
	}
	defer tx.Rollback() // 如果操作成功了，再Rollback一次也没啥事情

	// 查询注册码状态
	var snId, totalTime int
	var roleId string
	err = tx.QueryRow("select id, role_id, total_time from xq.sn where sn = ? for update", param.Sn).Scan(&snId, &roleId, &totalTime)
	if err == sql.ErrNoRows {
		err = errors.New("无效的注册码")
		log.Error("无效的注册码：", param)
		return
	}
	if err != nil {
		log.Error("查询注册码状态失败", err)
		return
	}
	if len(roleId) > 0 {
		err = errors.New("注册码已经被使用过")
		log.Error(err)
		return
	}

	// 为用户增加时间
	ret.VipTime, err = addUserTime(param.Platform, param.RoleId, totalTime, tx)
	if err != nil {
		log.Error("为用户增加时间失败：", err)
		return
	}

	// 更新注册码状态为已经使用
	_, err = tx.Exec("update xq.sn set platform = ?, role_id = ?, use_time = current_timestamp where id = ?", param.Platform, param.RoleId, snId)
	if err != nil {
		log.Error("更新注册码状态失败：", err)
		return
	}

	// 提交事务
	_ = tx.Commit()

	return
}

// 为用户加时间
func addUserTime(platform, roleId string, days int, tx *sql.Tx) (vipTime string, err error) {
	// 为用户增加时间
	var vipId int
	err = tx.QueryRow("select id, vip_time from xq.vip where platform = ? and role_id = ?", platform, roleId).Scan(&vipId, &vipTime)
	if err != nil {
		if err != sql.ErrNoRows {
			err = errors.New("查询用户状态失败：" + err.Error())
			log.Error(err)
			return
		}

		// 运行到此处，说明没有查询到记录，那么首先插入一条记录
		var result sql.Result
		vipTime = time.Now().Format("2006-01-02 15:04:05")
		result, err = tx.Exec("insert xq.vip (platform, role_id, vip_time) value (?, ?, ?)",
			platform, roleId, vipTime)
		if err != nil {
			err = errors.New("创建用户失败：" + err.Error())
			log.Error(err)
			return
		}
		id, _ := result.LastInsertId()
		vipId = int(id)
	}
	tmVip, err := time.ParseInLocation("2006-01-02 15:04:05", vipTime, time.Local)
	if err != nil {
		log.Error("解析VIP时间失败：", err)
		return
	}
	if tmVip.Before(time.Now()) {
		vipTime = time.Now().AddDate(0, 0, days).Format("2006-01-02 15:04:05")
	} else {
		vipTime = tmVip.AddDate(0, 0, days).Format("2006-01-02 15:04:05")
	}
	_, err = tx.Exec("update xq.vip set vip_time = ?, update_time = current_timestamp where id = ?", vipTime, vipId)
	if err != nil {
		log.Error("为用户增加时间失败：", err)
		return
	}
	return
}

// 上传信息
type UploadInfoRet struct {
	ErrMsg string
}

// 上传信息
func uploadInfo(db *sql.DB, data []byte) (ret UploadInfoRet, err error) {

	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
			err = nil
		}
	}()

	// 用户参数
	var param struct {
		UserInfo   string // 用户信息
		ConfigInfo string // 用户配置
		SubInfo    string // 用户属臣库
		Platform   string // 平台名称
		RoleId     string // 角色名称
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 启动事务
	tx, err := db.Begin()
	if err != nil {
		log.Error("启动事务：", err.Error())
		return
	}
	defer tx.Rollback() // 如果操作成功了，再Rollback一次也没啥事情

	// 对属臣库进行压缩
	subInfo := make([]byte, 0)
	if len(param.SubInfo) > 0 { // 对数据进行压缩（压缩过程不可能出错，因此跳过异常检查）
		var input bytes.Buffer
		g := gzip.NewWriter(&input)
		_, _ = g.Write([]byte(param.SubInfo))
		_ = g.Close()
		subInfo = input.Bytes()
	}

	// 找到对应的用户，如果没有，就创建一个用户
	var id int
	err = tx.QueryRow("select id from xq.cloud  where platform = ? and role_id = ? for update ", param.Platform, param.RoleId).Scan(&id)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Error("查询云用户信息失败：", err)
			return
		}
		if err == sql.ErrNoRows {
			log.Notice("创建一个新的云用户", param.Platform, param.RoleId)
			_, err = tx.Exec("insert xq.cloud (platform, role_id, user_info, config_info, sub_info) VALUE (?, ?, ?, ?, ?)",
				param.Platform, param.RoleId, param.UserInfo, param.ConfigInfo, subInfo)
			if err != nil {
				log.Error("创建新的云用户失败：", err)
				return
			}
		}
	}

	// 对数据进行更新
	if id > 0 {
		sqlString := "update xq.cloud set update_time = current_timestamp"
		sqlParam := make([]interface{}, 0)
		if len(param.UserInfo) > 0 {
			sqlString += ", user_info = ?, user_info_err = '', user_info_time = current_timestamp"
			sqlParam = append(sqlParam, param.UserInfo)
		}
		if len(param.ConfigInfo) > 0 {
			sqlString += ", config_info = ?"
			sqlParam = append(sqlParam, param.ConfigInfo)
		}
		if len(subInfo) > 0 {
			sqlString += ", sub_info = ?"
			sqlParam = append(sqlParam, subInfo)
		}
		sqlString += " where id = ?"
		sqlParam = append(sqlParam, id)
		_, err = tx.Exec(sqlString, sqlParam...)
		if err != nil {
			log.Error("更新用户信息失败：", err)
			return
		}
	}

	// 提交事务
	_ = tx.Commit()

	return
}

// 下载信息
type DownloadInfoRet struct {
	UserInfo   string // 用户信息
	ConfigInfo string // 用户配置
	SubInfo    string // 用户属臣库
	ErrMsg     string
}

// 下载信息
func downloadInfo(db *sql.DB, data []byte) (ret DownloadInfoRet, err error) {

	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
			err = nil
		}
	}()

	// 用户参数
	var param struct {
		UserInfo   bool // 是否获取用户信息
		ConfigInfo bool // 是否获取用户配置
		SubInfo    bool // 是否获取用户属臣库
		Platform   string
		RoleId     string //: '2222',
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 查询数据
	enData := make([]byte, 0)
	if param.SubInfo {
		err = db.QueryRow("select user_info, config_info, sub_info from xq.cloud where platform = ? and role_id = ?", param.Platform, param.RoleId).Scan(&ret.UserInfo, &ret.ConfigInfo, &enData)
	} else {
		err = db.QueryRow("select user_info, config_info from xq.cloud where platform = ? and role_id = ?", param.Platform, param.RoleId).Scan(&ret.UserInfo, &ret.ConfigInfo)
	}
	if err != nil {
		if err == sql.ErrNoRows {
			err = errors.New("用户从未上传过任何内容")
			return
		}
		log.Error("读取用户数据失败：", err)
		return
	}

	// 没有请求的数据，不进行返回
	if !param.UserInfo {
		ret.UserInfo = ""
	}
	if !param.ConfigInfo {
		ret.ConfigInfo = ""
	}

	// 对数据进行解压
	if len(enData) > 0 {
		var out bytes.Buffer
		var in bytes.Buffer
		in.Write(enData)
		r, _ := gzip.NewReader(&in)
		_, err := io.Copy(&out, r)
		if err == nil {
			ret.SubInfo = string(out.Bytes())
		}
		_ = r.Close()
	}

	return
}

// 下载信息
type DownloadUserInfoRet struct {
	UserInfo string // 用户信息
	ErrMsg   string
}

// 下载信息
func downloadUserInfo(db *sql.DB, data []byte) (ret DownloadUserInfoRet, err error) {

	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
			err = nil
		}
	}()

	// 用户参数
	var param struct {
		Platform string
		RoleId   string //: '2222',
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 不在vip有效期的话，不返回用户数据
	//var count = 0
	//err = db.QueryRow("select count(0) from xq.vip where platform = ? and role_id = ? and vip_time >= current_timestamp", param.Platform, param.RoleId).Scan(&count)
	//if err != nil {
	//	log.Error("获取用户vip状态失败：", err)
	//	return
	//}
	//if count == 0 {
	//	err = errors.New("用户不在云有效期内")
	//	return
	//}

	// 查询数据
	err = db.QueryRow("select user_info from xq.cloud where platform = ? and role_id = ?", param.Platform, param.RoleId).Scan(&ret.UserInfo)
	if err != nil {
		if err == sql.ErrNoRows {
			err = errors.New("用户从未上传过侦测信息")
			return
		}
		log.Error("读取用户数据失败：", err)
		return
	}

	return
}

// PayQrRet 支付二维码
type PayQrRet struct {
	Qr     string // 支付二维码
	Id     int    // 支付订单号
	ErrMsg string
}

// 下载信息
func payQr(db *sql.DB, data []byte) (ret PayQrRet, err error) {

	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
			err = nil
		}
	}()

	// 用户参数
	var param struct {
		Platform string
		RoleId   string //: '2222',
		PriceId  int
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 生成二维码
	ret.Qr, ret.Id, err = NativeQR(param.Platform, param.RoleId, param.PriceId, db)
	if err != nil {
		log.Error("生成支付二维码失败：", err)
		return
	}

	return
}

// CheckQrRet 支付二维码
type CheckQrRet struct {
	Finished bool
	ErrMsg   string
}

// 检查二维码支付状态
func checkQr(db *sql.DB, data []byte) (ret CheckQrRet, err error) {

	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
			err = nil
		}
	}()

	// 用户参数
	var param struct {
		Id int
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 查询状态
	var state int
	err = db.QueryRow("select state from xq.wx_record where id = ?", param.Id).Scan(&state)
	if err != nil {
		log.Error("查询订单失败：", err)
		return
	}

	ret.Finished = state == 1
	return
}

// GetOnceWorkRet 支付二维码
type GetOnceWorkRet struct {
	Work   string
	ErrMsg string
}

// 获取一次性任务
func getOnceWork(db *sql.DB, data []byte) (ret GetOnceWorkRet, err error) {

	defer func() {
		if err != nil {
			ret.ErrMsg = err.Error()
			err = nil
		}
	}()

	// 用户参数
	var param struct {
		Platform string
		RoleId   string //: '2222',
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 找到对应的任务ID
	var id int
	err = db.QueryRow("select id, work_info from xq.once_work where platform = ? and role_id = ?", param.Platform, param.RoleId).Scan(&id, &ret.Work)
	if err != nil {
		if err == sql.ErrNoRows {
			err = nil
			return
		}
		log.Error("获取一次性任务出错：", err)
		return
	}

	// 清空任务
	_, err = db.Exec("update xq.once_work set update_time = current_timestamp, work_info = ? where id = ?", "", id)
	if err != nil {
		log.Error("清空一次性任务失败")
		return
	}

	return
}
