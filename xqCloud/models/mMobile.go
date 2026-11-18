package models

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"strings"
)

// 上传信息
func UploadInfo(data []byte) (code int, errMsg string) {

	var err error
	defer func() {
		if err != nil {
			code = 1
			errMsg = err.Error()
		}
	}()

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 解析收到的数据
	var strSrc = string(data)
	pos := strings.LastIndex(strSrc, "}")
	if pos < 0 {
		err = errors.New("数据不合法")
		return
	}
	var jsonString = strSrc[:pos+1]
	var crcString = strSrc[pos+1:]

	// 对内容进行校验
	var check = 19911209
	for _, v := range jsonString {
		check += int(v)
	}
	check *= 17
	if fmt.Sprint(check) != crcString {
		err = errors.New("数据校验失败")
		return
	}

	// 读取其中的相关信息
	var param struct {
		Platform   string // 平台名称
		RoleId     int64  // 角色名称
		AuthorCode string // 授权码
	}
	err = json.Unmarshal([]byte(jsonString), &param)
	if err != nil {
		log.Error("读取用户参数失败：", err)
		return
	}

	// 解析其中授权码中的uid
	authData, err := base64.StdEncoding.DecodeString(param.AuthorCode)
	if err != nil {
		log.Error("解析用户AuthCode失败", err)
		return
	}
	log.Debug("authData:", string(authData))
	var uInfo struct {
		Uid int64 // 用户Id
	}
	err = json.Unmarshal(authData, &uInfo)
	if err != nil {
		log.Error("提取userId失败：", err)
		return
	}

	// 将数据库中的信息，加入userId字段
	var userInfo = jsonString[:len(jsonString)-1] + fmt.Sprintf(`,"userId":%v}`, uInfo.Uid)

	// 启动事务
	tx, err := db.Begin()
	if err != nil {
		log.Error("启动事务：", err.Error())
		return
	}
	defer tx.Rollback() // 如果操作成功了，再Rollback一次也没啥事情

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
			_, err = tx.Exec("insert xq.cloud (platform, uid, role_id, user_info, config_info, sub_info) VALUE (?, ?, ?, ?, ?, ?)",
				param.Platform, uInfo.Uid, param.RoleId, userInfo, "", make([]byte, 0))
			if err != nil {
				log.Error("创建新的云用户失败：", err)
				return
			}
		}
	}

	// 对数据进行更新
	if id > 0 {
		_, err = tx.Exec("update xq.cloud set update_time = current_timestamp , user_info = ?, user_info_err = '', user_info_time = current_timestamp where id = ?", userInfo, id)
		if err != nil {
			log.Error("更新用户信息失败：", err)
			return
		}
	}

	// 提交事务
	_ = tx.Commit()
	log.Info("用户信息上传成功：", param.Platform, param.RoleId)

	return
}
