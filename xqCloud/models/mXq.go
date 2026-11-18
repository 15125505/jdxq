package models

import (
	"bytes"
	"compress/gzip"
	"database/sql"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

// 用于保证获取任务时减少数据库锁的压力的同步锁
var lockTask sync.Mutex

// 上次没有获得任务的时间
var lastIdleTime = time.Now().Add(-time.Second)

// 上次显示数据库条数的时间
var lastCountTime = time.Now().Add(time.Minute * -11)

// 获取任务
type GetTaskRet struct {
	Platform   string
	RoleId     string
	UserInfo   string // 用户信息
	ConfigInfo string // 用户配置
	SubInfo    string // 用户属臣库
}

// 获取任务
func GetTask(key, ip string) (code int, errMsg string, ret GetTaskRet) {

	var err error
	defer func() {
		if err != nil {
			code = 1
			errMsg = err.Error()
		}
	}()

	tmStart := time.Now()

	if expected := os.Getenv("JDXQ_TASK_KEY"); expected == "" || key != expected {
		err = errors.New("客户端校验失败")
		return
	}

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 加入本地锁，尽可能降低数据库并发压力
	lockTask.Lock()
	defer lockTask.Unlock()

	// 检查当前获得锁花费的时间
	tmGetLock := time.Now()
	if tmGetLock.Sub(tmStart) > time.Second*10 {
		log.Notice("注意：当前获得锁耗时太久，花费的时间:", tmGetLock.Sub(tmStart))
	}

	// 如果当前时间距离上次没有获得有效任务的时间，不到100ms，那么直接返回
	if tmGetLock.Sub(lastIdleTime) < time.Millisecond*100 {
		err = errors.New("没有符合条件的记录")
		return
	}

	// 每隔10分钟，检查一次数据库中有效期内任务条数
	if tmGetLock.Sub(lastCountTime) > time.Minute*10 {
		lastCountTime = tmGetLock
		var count = 0
		err = db.QueryRow("select count(0) from  xq.cloud where state = 1").Scan(&count)
		if err != nil {
			log.Error("查询数据库当前在线用户数量失败：", err)
			return
		}
		log.Notice("当前在线用户总量：", count)
	}

	// 启动事务
	tx, err := db.Begin()
	if err != nil {
		log.Error("启动事务：", err.Error())
		return
	}
	defer tx.Rollback() // 如果操作成功了，再Rollback一次也没啥事情

	// 查询数据
	var id int
	enData := make([]byte, 0)
	err = tx.QueryRow("select id, platform, role_id, user_info, config_info, sub_info from xq.cloud where state = 1 and work_time < ? order by work_time limit 1 for update ",
		time.Now().Add(-100*time.Second).Format("2006-01-02 15:04:05")).
		Scan(&id, &ret.Platform, &ret.RoleId, &ret.UserInfo, &ret.ConfigInfo, &enData)
	if err != nil {
		if err == sql.ErrNoRows {
			lastIdleTime = time.Now()
			err = errors.New("没有符合条件的记录")
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
		_, err := io.Copy(&out, r)
		if err == nil {
			ret.SubInfo = string(out.Bytes())
		}
		_ = r.Close()
	}

	// 更新记录状态
	_, err = tx.Exec("update xq.cloud set work_time = current_timestamp, work_ip = ? where id = ?", ip, id)
	if err != nil {
		log.Error("更新用户记录状态失败：", err)
		return
	}

	_ = tx.Commit()

	tmNow := time.Now()
	log.Info("任务获取成功：", ip, ret.Platform, ret.RoleId, tmGetLock.Sub(tmStart), "+", tmNow.Sub(tmGetLock), "=", tmNow.Sub(tmStart))

	return
}

// 全局的管理员禁止登录计数器
var gCountMap map[string][]time.Time

// 任务状态上报
func TaskReport(ok int, errMsg, platform, roleId, logs, ip string) (code int, errString, ret string) {

	var err error
	defer func() {
		if err != nil {
			code = 1
			errString = err.Error()
		} else {
			ret = "OK"
		}
	}()

	tmStart := time.Now()

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 管理员禁止登录
	tmWork := time.Now()
	if ok == 0 && strings.Contains(errMsg, "系统管理员禁止") {

		// 找出之前禁止登录的记录
		if gCountMap == nil {
			gCountMap = make(map[string][]time.Time)
		}
		userInfo := fmt.Sprint(platform, roleId)
		vec := gCountMap[userInfo]

		// 删除10分钟之前的记录形成新的记录
		var vecNew []time.Time
		for _, v := range vec {
			if v.After(time.Now().Add(-10 * time.Minute)) {
				vecNew = append(vecNew, v)
			}
		}
		log.Notice(ip, platform, roleId, errMsg, "出现第", len(vecNew)+1, "次管理员禁止登录！")

		// 如果之前异常次数已经达到指定次数，那么放弃重试
		if len(vecNew) >= 5 {
			gCountMap[userInfo] = nil
		} else {
			ok = 1
			vecNew = append(vecNew, time.Now())
			gCountMap[userInfo] = vecNew
			tmWork = time.Now().Add(-95 * time.Second)
			log.Info(userInfo, "暂且忽略这一次异常重试...")
		}
	}

	// 如果当前状态OK，那么更新工作时间即可（只有处于工作状态时进行处理）
	if ok > 0 {
		if len(logs) > 0 {
			_, _ = db.Exec("update xq.cloud set work_time = ?, user_info_err = ?, work_ip = ?, logs = ?, state = 1 where platform = ? and role_id = ?",
				tmWork.Format("2006-01-02 15:04:05"), errMsg, ip, logs, platform, roleId)
		} else {
			_, _ = db.Exec("update xq.cloud set work_time = ?, user_info_err = ?, work_ip = ?, state = 1 where platform = ? and role_id = ?",
				tmWork.Format("2006-01-02 15:04:05"), errMsg, ip, platform, roleId)
		}
		return
	}

	// 如果当前状态不OK，那么需要修改状态为停止，同时设置用户信息错误信息
	if len(logs) > 0 {
		_, _ = db.Exec("update xq.cloud set state = 0, user_info_err = ?, work_time = current_timestamp, work_ip = ?, logs = ? where platform = ? and role_id = ? and state = 1", errMsg, ip, logs, platform, roleId)
	} else {
		_, _ = db.Exec("update xq.cloud set state = 0, user_info_err = ?, work_time = current_timestamp, work_ip = ? where platform = ? and role_id = ? and state = 1", errMsg, ip, platform, roleId)
	}

	log.Info("任务节点停止：", ip, platform, roleId, errMsg, time.Since(tmStart))

	return
}
