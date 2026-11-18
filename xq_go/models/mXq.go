package models

import (
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/15125505/zlog/log"
	"io/ioutil"
	"strconv"
	"strings"
	"xq/conf"
)

// 来自于c++程序的指令
func FileCmd(data []byte, ip, ua string) (ret string, err error) {

	// 解析命令名称
	var param struct {
		Name string
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("解析用户命令失败：", err)
		return
	}

	// 根据命令进行分发
	switch param.Name {
	case "GetCode":
		return getCode(data, ip, ua)
	case "GetFile":
		return getFile(data, ip, ua)
	}
	return "", errors.New("非法的文件命令：" + param.Name)
}

// WorkCmd 来自于js的指令
func WorkCmd(data []byte, ip, ua string) (ret string, err error) {

	// 解析hash字段
	var param struct {
		CK      string
		CmdName string
		Code    string
		TK      int64
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("解析客户端工作命令基础参数失败", err)
		return
	}
	log.Notice("--cmd", param.CmdName, ua)

	// 替换原始字段中的hash值，然后计算hash值
	calcCk := fmt.Sprintf("%x", md5.Sum([]byte(strings.Replace(string(data), param.CK, "@XQ_CK@", 1))))
	if calcCk != param.CK {
		err = errors.New("客户端工作命令hash值不正确")
		log.Error(err, ip, ua)
		return
	}

	// 处理数据
	workRet, err := onWorkCmd(param.Code, param.CmdName, param.TK, data)
	if err != nil {
		log.Error("处理用户命令失败：", err)
		return
	}

	// 返回的数据加上hash值
	retNode := struct {
		Data interface{}
		CK   string `json:"ck"`
		SK   string `json:"sk"`
	}{}
	retNode.CK = param.CK
	retNode.SK = "@xq_sk@"
	retNode.Data = workRet
	retData, _ := json.Marshal(retNode)
	sk := fmt.Sprintf("%x", md5.Sum(retData))
	ret = strings.Replace(string(retData), retNode.SK, sk, 1)
	if len(ret) > 500 {
		log.Info("--result", ret[:500])
	} else {
		log.Info("--result", ret)
	}

	return
}

// 处理用户命令
func onWorkCmd(code, cmdName string, tk int64, data []byte) (ret interface{}, err error) {

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 如果是内部code，直接跳过校验
	if code == "@XQ_CODE@" {
		ret, err = handleWork(cmdName, db, data)
		return
	}

	// 更新code
	var codeId int
	err = db.QueryRow("select id from xq.code where code = ?", code).Scan(&codeId)
	if err != nil {
		log.Error("查询code失败：", err)
		return
	}
	_, _ = db.Exec("update xq.code set update_time = current_timestamp where id = ?", codeId)

	// 临时取消对xq.cmd这个表的访问
	// 寻找当前存在的这条命令
	//var id, count int
	//err = db.QueryRow("select id, act_count from xq.cmd where code = ? and name = ? and tk = ?", code, cmdName, tk).Scan(&id, &count)
	//if err != nil && err != sql.ErrNoRows {
	//	log.Error("查询数据库失败：", err)
	//	return
	//}
	//if count >= 2 {
	//	err = errors.New("被重复执行的命令")
	//	log.Error(err)
	//	return
	//}
	//if id > 0 {
	//	_, _ = db.Exec("update xq.cmd set act_count = act_count + 1 where id = ?", id)
	//} else {
	//	_, _ = db.Exec("insert xq.cmd (code, name, tk) VALUE (?, ?, ?)", code, cmdName, tk)
	//}

	ret, err = handleWork(cmdName, db, data)
	return
}

// 获取code
func getCode(data []byte, ip, ua string) (ret string, err error) {

	// 解析用户参数
	var param struct {
		MachineId string
		Tick      string
		Check     string
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("解析用户命令失败：", err)
		return
	}
	log.Notice("--getCode", param, ua, ip)

	// 校验check信息
	key, _ := strconv.Atoi(param.Tick)
	myCheck := int(float64((key%10000)*1314+15125505) / 11.0 * 10)
	sn := param.MachineId + param.Tick
	for i := 0; i < len(sn); i++ {
		myCheck += int(sn[i])
	}
	if fmt.Sprint(myCheck) != param.Check {
		err = errors.New("校验失败")
		log.Error("有人试图伪造数据", ip, ua, param)
		return
	}

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 计算一个启动码
	ret = fmt.Sprintf("%x", md5.Sum([]byte(sn)))

	// 检查设备号和tick，判断是否重复请求
	count := 0
	err = db.QueryRow("select count(*) from xq.code where machine_id = ? and tick_count = ?", param.MachineId, param.Tick).Scan(&count)
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}
	if count > 0 {
		log.Error("重复请求，疑似有人试图伪造数据", ip, param)
		return
	}

	// 添加到数据库
	_, err = db.Exec("insert xq.code (ip, machine_id, tick_count, code) value (?, ?, ?, ?)", ip, param.MachineId, param.Tick, ret)
	if err != nil {
		log.Error("创建启动码失败", err)
		return
	}
	return
}

// 获取html源码
func getFile(data []byte, ip, ua string) (ret string, err error) {

	// 解析用户参数
	var param struct {
		Code     string
		FileName string
	}
	err = json.Unmarshal(data, &param)
	if err != nil {
		log.Error("解析用户命令失败：", err)
		return
	}
	log.Notice("--getFile", param.FileName, param.Code, ua, ip)

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 校验code是否在数据库中存在
	var codeId int
	err = db.QueryRow("select id from xq.code where code = ?", param.Code).Scan(&codeId)
	if err != nil {
		log.Error("访问数据库失败：", err)
		return
	}

	// 更新code表中，这个code的最近访问时间
	_, _ = db.Exec("update xq.code set update_time = current_timestamp where id = ?", codeId)

	// 找到文件并返回内容
	filePath := conf.Config.HtmlFolder + param.FileName
	fileData, err := ioutil.ReadFile(filePath)
	if err != nil {
		log.Error("读取文件失败：", err)
		return
	}
	ret = string(fileData)

	// 文件中加入code
	ret = strings.Replace(ret, "@XQ_CODE@", param.Code, 1)
	return
}
