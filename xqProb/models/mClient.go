package models

import (
	"encoding/json"
	"errors"
	"github.com/15125505/zlog/log"
	"github.com/gorilla/websocket"
	"github.com/vmihailenco/msgpack/v5"
	"net/url"
	"time"
)

type UserData struct {
	Server     string `json:"server"`
	RoleId     int64  `json:"roleId"`
	ClientId   string `json:"clientId"`
	DeviceId   string `json:"deviceId"`
	AuthorCode string `json:"authorCode"`
	UserId     int    `json:"userId"`
	GameId     int    `json:"gameId"`
	Platform   string `json:"platform"`
	ClientVer  string `json:"clientVer"`
	ServerId   int    `json:"serverId"`
	Name       string `json:"name"`
}

type MClient struct {
	send     chan []byte
	recv     chan []byte
	stop     chan bool
	userData *UserData
}

// NewClient 初始化
func NewClient(userData *UserData) *MClient {
	return &MClient{
		send:     make(chan []byte, 10),
		recv:     make(chan []byte, 10),
		stop:     make(chan bool),
		userData: userData,
	}
}

func (m *MClient) Start() (roleId int64, err error) {

	defer func() {
		if err := recover(); err != nil {
			log.Error("运行过程中出现严重异常:", err)
		}
	}()

	// 显示用户输入的信息
	bin, _ := json.Marshal(m.userData)
	log.Debug("---开始解析：", string(bin))

	// 开始任务
	go m.Run()

	// 结束并退出
	defer func() {
		m.stop <- true
	}()

	// 绑定用户
	var bindUser struct {
		Cmd    string `msgpack:"cmd"`
		Params struct {
			UserId     int         `msgpack:"userId"`
			GameId     int         `msgpack:"gameId"`
			ClientId   string      `msgpack:"clientId"`
			RoleId     interface{} `msgpack:"roleId"`
			AuthorCode string      `msgpack:"authorCode"`
		} `msgpack:"params"`
	}
	bindUser.Cmd = "bind_user"
	bindUser.Params.UserId = m.userData.UserId
	bindUser.Params.GameId = 9999
	bindUser.Params.ClientId = m.userData.ClientId
	bindUser.Params.RoleId = nil
	bindUser.Params.AuthorCode = m.userData.AuthorCode
	b, _ := msgpack.Marshal(bindUser)
	m.send <- b

	// 等待bind_user反馈
	buff, err := m.Proc("user_info", 100)
	if err != nil {
		log.Error("获取bind_user反馈失败：", err)
		return
	}
	var bindUserRet = struct {
		Cmd    string `msgpack:"cmd"`
		Result struct {
			UserId int `msgpack:"userId"`
			Udata  struct {
				Name string `msgpack:"name"`
				Purl string `msgpack:"purl"`
			} `msgpack:"udata"`
		} `msgpack:"result"`
	}{}
	err = msgpack.Unmarshal(buff, &bindUserRet)
	if err != nil {
		log.Error("解析bind_user反馈信息失败：", err)
		return
	}
	log.Info("bind_user数据反馈：", bindUserRet)

	// 进入游戏
	enter := struct {
		Cmd    string `msgpack:"cmd"`
		Params struct {
			Action     string      `msgpack:"action"`
			GameId     int         `msgpack:"gameId"`
			UserId     int         `msgpack:"userId"`
			RoleId     interface{} `msgpack:"roleId"`
			ClientId   string      `msgpack:"clientId"`
			AuthorCode string      `msgpack:"authorCode"`
			GameVer    string      `msgpack:"gameVer"`
			Code       string      `msgpack:"code"`
		} `msgpack:"params"`
	}{}
	enter.Cmd = "game"
	enter.Params.Action = "enter"
	enter.Params.GameId = 129
	enter.Params.UserId = m.userData.UserId
	enter.Params.RoleId = nil
	enter.Params.ClientId = m.userData.ClientId
	enter.Params.AuthorCode = m.userData.AuthorCode
	enter.Params.GameVer = m.userData.ClientVer
	b, _ = msgpack.Marshal(enter)
	m.send <- b

	// 等待数据返回
	var enterRet struct {
		Cmd    string `msgpack:"cmd"`
		Result struct {
			GameId int `msgpack:"gameId"`
			UserId int `msgpack:"userId"`
			Gdata  struct {
				ServerTimestamp int    `msgpack:"serverTimestamp"`
				LastRoleId      int64  `msgpack:"lastRoleId"`
				ServerId        int    `msgpack:"serverId"`
				PartitionId     int    `msgpack:"partitionId"`
				PartitionName   string `msgpack:"partitionName"`
			} `msgpack:"gdata"`
		} `msgpack:"result"`
	}
	buff, err = m.Proc("game_data", 200)
	if err != nil {
		log.Error("获取enter反馈失败：", err)
		return
	}
	err = msgpack.Unmarshal(buff, &enterRet)
	if err != nil {
		log.Error("解析enter反馈信息失败：", err)
		return
	}
	log.Info("enter反馈：", enterRet)
	if enterRet.Result.Gdata.LastRoleId == 0 {
		err = errors.New("未能获取用户的角色ID")
		return
	}

	// 接下来完成数据库的录入
	if enterRet.Result.Gdata.LastRoleId > 0 {
		m.userData.ServerId = enterRet.Result.Gdata.ServerId
		m.userData.RoleId = enterRet.Result.Gdata.LastRoleId
		err = createCloudUser(m.userData, enterRet.Result.Gdata.PartitionId)
		if err != nil {
			log.Error("为用户在数据库创建账号失败：", err)
			return
		}
	}

	roleId = enterRet.Result.Gdata.LastRoleId
	return
}

// Send 发送数据
func (m *MClient) Send(buff []byte) {
	m.send <- buff
}

// Proc 处理收到的数据
func (m *MClient) Proc(name string, minLen int) (cmdBuff []byte, err error) {
	timeout := time.After(time.Second * 3)
	type CmdRet struct {
		Cmd string `msgpack:"cmd"`
	}
	cmd := &CmdRet{}
	for {
		select {
		case buff := <-m.recv:
			err = msgpack.Unmarshal(buff[4:], &cmd)
			if err != nil {
				continue
			}
			cmdBuff = buff[4:]
			if name == cmd.Cmd && len(buff) > minLen {
				return
			}
		case <-timeout:
			err = errors.New("等待命令反馈超时")
			return
		}
	}
}

// Run 开始访问服务器
func (m *MClient) Run() {

	defer func() {
		if err := recover(); err != nil {
			log.Error("在websocket线程中出现严重异常:", err)
		}
	}()

	host := m.userData.Server
	path := "/?base64=0&mask=0&binary=1"

	// 准备连接字符串
	u := url.URL{Scheme: "wss", Host: host, Path: path}

	// 开始连接服务器
	log.Info("开始连接：", u.String())
	c, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		log.Error("访问出错：", err)
		return
	}
	defer func(c *websocket.Conn) {
		_ = c.Close()
		close(m.stop)
	}(c)

	done := make(chan struct{})

	go func() {
		defer close(done)
		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				log.Error("接收数据出错：", err)
				return
			}
			m.recv <- message
		}
	}()

	for {
		select {
		case <-done:
			return
		case buff := <-m.send:
			err := c.WriteMessage(websocket.BinaryMessage, buff)
			if err != nil {
				log.Error("发送数据出错：", err)
				return
			}
		case <-m.stop:
			log.Notice("请求中断")

			// 通过发送关闭消息然后等待服务器关闭连接，实现干净地退出
			err := c.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
			if err != nil {
				log.Error("关闭失败：", err)
				return
			}
			select {
			case <-done:
			case <-time.After(time.Second):
			}
			return
		}
	}
}
