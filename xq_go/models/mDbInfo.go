package models

import (
	"database/sql"
	"github.com/15125505/zlog/log"
	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/ssh"
	"io"
	"net"
	"os"
	"strings"
	"time"
	"xq/conf"
)

// 全局mysql数据库连接
var gDb *sql.DB

// 获取数据库连接
func getDb() (*sql.DB, error) {
	startLocalDb()
	db, err := getDbByString(conf.Config.Db, gDb)
	gDb = db
	return db, err
}

// 获取指定的数据库连接
func getDbByString(dbString string, db *sql.DB) (*sql.DB, error) {
	// 打开远程数据库
	var err error
	if db == nil {
		db, err = sql.Open("mysql", dbString)
		if err != nil {
			log.Error("打开数据库失败：", err.Error())
			return nil, err
		}
		db.SetConnMaxLifetime(time.Hour)
		db.SetMaxIdleConns(50)
		db.SetMaxOpenConns(50)
	}
	return db, nil
}

var isLocalStarted = false

// 配置端口转发
func startLocalDb() {

	// 防止重复启动
	if isLocalStarted {
		return
	}
	isLocalStarted = true

	// 如果配置了本地端口
	if !strings.Contains(conf.Config.Db, "127.0.0.1:30456") {
		return
	}

	dbServerAddr := "192.0.2.1:3306"
	remoteAddr := "server-1.example.invalid:60022"
	localAddr := "127.0.0.1:30456"
	log.Notice("开始启动本地转发服务-- dbServer:", dbServerAddr, "remoteAddr:", remoteAddr, "localAddr:", localAddr)

	// ssh配置
	config := &ssh.ClientConfig{
		User: "maintainer",
		Auth: []ssh.AuthMethod{
			ssh.Password(os.Getenv("JDXQ_SSH_PASSWORD")),
		},
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return nil
		},
	}

	// 连接远程服务器
	log.Info("Start connecting ssh server....")
	conn, err := ssh.Dial("tcp", remoteAddr, config)
	if err != nil {
		log.Error("Connect to my server failed:", err)
		return
	}
	//defer conn.Close()

	// 从本地连接服务器
	log.Info("Start connecting database Server from ssh Server...")
	remote, err := conn.Dial("tcp", dbServerAddr)
	if err != nil {
		log.Error("Connect to database server failed: ", err)
		return
	}
	//defer remote.Close()

	// 创建本地连接
	log.Info("Listen at 30456...")
	local, err := net.Listen("tcp", localAddr)
	if err != nil {
		log.Error("Create Listening failed:", err)
		return
	}
	//defer local.Close()

	// 转发本地的连接到到远程
	log.Info("开始转发本地连接...")
	go func() {
		for {
			l, err := local.Accept()
			if err != nil {
				log.Error("listen Accept failed：", err)
				return
			}

			go func() {
				_, err := io.Copy(l, remote)
				if err != nil {
					log.Error("io.Copy failed", err)
					return
				}
			}()

			go func() {
				_, err := io.Copy(remote, l)
				if err != nil {
					log.Error("io.Copy failed", err)
					return
				}
			}()
		}
	}()

}
