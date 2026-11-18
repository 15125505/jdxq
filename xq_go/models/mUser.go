package models

import (
	"bytes"
	"compress/gzip"
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"io"
	"strings"
	"time"
)

func ClearCmd() {

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	for i := 0; i < 10000; i++ {
		tmNow := time.Now()
		result, err := db.Exec(`delete from xq.cmd where id < ?`, 49930000+i*5000)
		if err != nil {
			return
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return
		}
		log.Info("日志删除条数", affected, time.Now().Sub(tmNow))
		time.Sleep(time.Second)
	}

}

// 网页上获取用户状态
type UserStateRet struct {
	ErrMsg       string
	State        int     // 当前工作状态 0.停止 1.开始
	IsUserInfoOK bool    // 用户信息是否已经上传
	IsConfigOK   bool    // 配置信息是否已经上传
	IsSubOK      bool    // 属臣库是否已经上传
	UserInfoTime string  // 用户信息上传的时间
	UserInfoErr  string  // 如果用户信息已经上传，而且当前状态为停止，那么此处为停止原因
	WorkTime     string  // 任务上次被接管的时间
	VipState     string  // vip状态
	Logs         string  // 最近日志
	VipTime      string  // vip时间 为空表示不是vip
	LeftDays     float64 // 剩余天数 小于0表示已经过期
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
	err = db.QueryRow("select vip_time from xq.vip where platform = ? and role_id = ? for update", platform, roleId).Scan(&ret.VipTime)
	if err != nil {
		if err == sql.ErrNoRows {
			ret.VipTime = time.Now().AddDate(0, 0, 3).Format("2006-01-02 15:04:05")
			ret.VipState = fmt.Sprint("新用户赠送3天VIP")
			ret.LeftDays = 3
			_, err = db.Exec("insert xq.vip (platform, role_id, vip_time) value (?, ?, ?)",
				platform, roleId, ret.VipTime)
			if err != nil {
				log.Error("新用户注册失败：", err)
				return
			}
		} else {
			return
		}
	}

	// 如果曾经成为云用户，那么需要计算vip时间
	if len(ret.VipState) == 0 {
		tmVip, err := time.Parse("2006-01-02 15:04:05", ret.VipTime)
		if err != nil {
			ret.VipTime = ""
		} else {
			delay := tmVip.Sub(time.Now())
			if delay > 0 {
				ret.VipState = fmt.Sprint("云有效时间可到", ret.VipTime)
			} else {
				ret.VipState = fmt.Sprint("云有效时间已于", ret.VipTime, "过期")
			}
			ret.LeftDays = float64(delay/time.Second) / 86400
		}
	}

	// 获取用户状态
	var userInfo, configInfo string
	subInfo := make([]byte, 0)
	err = db.QueryRow("select state, user_info, config_info, sub_info, user_info_err, user_info_time, work_time, logs from xq.cloud where platform = ? and role_id = ?", platform, roleId).
		Scan(&ret.State, &userInfo, &configInfo, &subInfo, &ret.UserInfoErr, &ret.UserInfoTime, &ret.WorkTime, &ret.Logs)
	if err != nil {
		if sql.ErrNoRows == err {
			log.Notice("当前用户不是云用户")
			err = errors.New("当前用户不是云用户")
			return
		}
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
			code = 1
			errString = err.Error()
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
		if err == sql.ErrNoRows {
			err = errors.New("您不是云用户，请先注册为云用户")
		} else {
			log.Error("查询vip时间失败：", err)
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
		if err == sql.ErrNoRows {
			err = errors.New("您还没有上传用户信息")
			return
		}
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
	if len(userInfoErr) != 0 && userInfoErr != "SYS_LOGOUT_OTHER_LOGIN" && !strings.Contains(userInfo, "维护") {
		ret = "您的登录信息已经失效，原因是：" + userInfoErr + "（请重新上传登录信息）"
		return
	}

	// 如果配置信息还没上传，那么返回错误
	if len(configInfo) == 0 {
		ret = "您暂未上传配置信息，请先上传配置信息"
		return
	}

	// 如果配置信息勾选了属臣库中找矿，但属臣库没有上传，那么返回错误
	//if strings.Contains(configInfo, `"findInSub":true`) && len(subInfo) == 0 {
	//	ret = "您并未上传属臣库，请先上传属臣库"
	//	return
	//}

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

// Upload 网页上请求上传配置
func Upload(platform, roleId, key, setting string) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
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

	// 获取配置拼接成json
	var param struct {
		ConfigInfo string // 用户配置
		Platform   string // 平台名称
		RoleId     string // 角色名称
	}
	param.ConfigInfo = setting
	param.Platform = platform
	param.RoleId = roleId
	marshal, _ := json.Marshal(param)
	_, err = uploadInfo(db, marshal)
	if err != nil {
		return
	}

	ret = "配置信息上传成功"

	return
}

// UploadSub 网页上请求上传配置
func UploadSub(platform, roleId, sub string) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 获取配置拼接成json
	var param struct {
		Platform string // 平台名称
		RoleId   string // 角色名称
		SubInfo  string // 用户属臣库
	}
	param.SubInfo = sub
	param.Platform = platform
	param.RoleId = roleId
	marshal, _ := json.Marshal(param)
	_, err = uploadInfo(db, marshal)
	if err != nil {
		return
	}

	ret = "属臣库信息上传成功"
	return
}

// Download 网页上请求下载配置
func Download(platform, roleId, key string) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
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

	// 用户参数
	var param struct {
		ConfigInfo bool // 是否获取用户配置
		Platform   string
		RoleId     string //: '2222',
	}
	param.ConfigInfo = true
	param.Platform = platform
	param.RoleId = roleId
	marshal, _ := json.Marshal(param)
	retInfo, err := downloadInfo(db, marshal)
	if err != nil {
		return
	}

	ret = retInfo.ConfigInfo
	return
}

// PayQr 获取支付二维码
func PayQr(platform, roleId, key string, priceId int) (code int, errString string, ret PayQrRet) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 校验key是否正确
	if !checkKey(platform, roleId, key) {
		return 1, "不合法的命令", ret
	}

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 用户参数
	var param struct {
		Platform string
		RoleId   string //: '2222',
		PriceId  int
	}
	param.Platform = platform
	param.RoleId = roleId
	param.PriceId = priceId
	marshal, _ := json.Marshal(param)
	retInfo, err := payQr(db, marshal)
	if err != nil {
		return
	}

	ret = retInfo
	return
}

// CheckQr 检查支付状态
func CheckQr(id int) (code int, errString string, ret CheckQrRet) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 用户参数
	var param struct {
		Id int
	}
	param.Id = id
	marshal, _ := json.Marshal(param)
	retInfo, err := checkQr(db, marshal)
	if err != nil {
		return
	}

	ret = retInfo
	return
}

// AddOnceWork 网页上发起一次性任务请求
func AddOnceWork(platform, roleId, key, workInfo string) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		}
	}()

	// 校验key是否正确
	if !checkKey(platform, roleId, key) {
		ret = "不合法的命令"
		return
	}

	log.Info("请求添加一次性任务：", platform, roleId, workInfo)

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 找到对应的任务ID
	var id int
	var detail string
	err = db.QueryRow("select id, work_info from xq.once_work where platform = ? and role_id = ?", platform, roleId).Scan(&id, &detail)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Error("获取当前一次性任务出现错误：", err)
			return
		}
	}

	// 如果没有记录
	if id == 0 {
		_, err = db.Exec("insert xq.once_work (work_info, platform, role_id) values (?, ?, ?)", workInfo, platform, roleId)
		if err != nil {
			log.Error("添加一次性任务失败：", err)
			return
		}
	} else {
		if len(detail) > 0 {
			detail = detail + ";" + workInfo
		} else {
			detail = workInfo
		}
		_, err = db.Exec("update xq.once_work set update_time = current_timestamp, work_info = ? where id = ?", detail, id)
		if err != nil {
			log.Error("更新一次性任务失败：", err)
			return
		}
	}

	return
}

// DoOnceWork 网页上发起一次性任务请求
func DoOnceWork(platform, roleId, key string) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
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

	// 找到对应的任务ID
	var id int
	err = db.QueryRow("select id, work_info from xq.once_work where platform = ? and role_id = ?", platform, roleId).Scan(&id, &ret)
	if err != nil {
		if err == sql.ErrNoRows {
			err = nil
			return 0, "", ""
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

// GetSubCount 获取属臣库数量
func GetSubCount(platform, roleId, key string) (code int, errString string, ret string) {

	// 如果有错误，直接反馈错误信息
	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
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

	// 查询数据
	enData := make([]byte, 0)
	err = db.QueryRow("select sub_info from xq.cloud where platform = ? and role_id = ?", platform, roleId).Scan(&enData)
	if err != nil {
		if err == sql.ErrNoRows {
			err = nil
			ret = "0"
			return
		}
		log.Error("读取用户数据失败：", err)
		return
	}

	// 对数据进行解压
	if len(enData) > 0 {
		var out bytes.Buffer
		var in bytes.Buffer
		in.Write(enData)
		r, _ := gzip.NewReader(&in)
		_, err = io.Copy(&out, r)
		if err != nil {
			log.Error("解压数据失败")
			_ = r.Close()
			return
		}
		var vec = make([]interface{}, 0)
		_ = json.Unmarshal(out.Bytes(), &vec)
		ret = fmt.Sprint(len(vec))
		_ = r.Close()
	}

	return
}
