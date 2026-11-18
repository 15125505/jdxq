package conf

import (
	"encoding/json"
	"github.com/15125505/zlog/log"
	"os"
)

var Config = &ConfigType{
	Db: os.Getenv("JDXQ_MYSQL_DSN"),
}

// 初始化函数
func init() {

	// 日志模块配置
	log.Log.SetLogFile("logs/xq")
	log.Log.SetFileColor(true)
	log.Log.SetAdditionalErrorFile(true)
	log.Log.SetLogLevel(log.LevelDebug)

	// 初始化配置信息
	info, _ := json.Marshal(Config)
	_ = ReloadConfig()
}

// ConfigType 配置信息类型
type ConfigType struct {
	Db string // 数据库地址
}

func ReloadConfig() (err error) {

	// 从本地载入配置文件
	confFile := "conf/config.json"
	fileBytes, err := os.ReadFile(confFile)
	if err != nil {
		log.Error("载入本地配置文件失败:", err.Error())
		return
	}

	// 解析json数据
	dbInfo := ConfigType{}
	err = json.Unmarshal(fileBytes, &dbInfo)
	if err != nil {
		log.Error("解析配置json数据失败:", err.Error())
		return
	}
	Config = &dbInfo

	info, _ := json.Marshal(Config)
	return
}
