package models

import (
	"crypto/md5"
	"database/sql"
	"fmt"
	"github.com/15125505/zlog/log"
	"math/rand"
	"time"
)

// 微信支付成功的处理
func WxPaySuccess(recordId, openid, bank_type, transaction_id, timeEnd string) (err error) {

	log.Info("来自微信的充值回调 -- recordId:", recordId, "openid:", openid, "bank_type:", bank_type, "transaction_id:", transaction_id, "timeEnd:", timeEnd)

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("连接数据库：", err.Error())
		return
	}

	// 启动事务
	tx, err := db.Begin()
	if err != nil {
		log.Error("启动事务：", err.Error())
		return
	}
	defer tx.Rollback() // 如果操作成功了，再Rollback一次也没啥事情

	// 查询数据库对应的记录
	var q struct {
		id        int
		TotalTime int
		Count     int
		state     int
		wxUserId  int
	}
	row := tx.QueryRow("SELECT id, total_time, count, state, wx_user_id FROM xq.wx_record WHERE record_id = ? for update", recordId)
	if err = row.Scan(&q.id, &q.TotalTime, &q.Count, &q.state, &q.wxUserId); err != nil {
		log.Error("查询数据库：", err.Error())
		return
	}

	// 合法性校验
	if q.state != 0 {
		log.Error("该订单已经被处理过，无需重复处理！")
		//err = errors.New("同样的数据不允许重复发送") 不返回错误信息了
		return
	}

	// 更新记录信息表
	_, err = tx.Exec("UPDATE `xq`.`wx_record` SET `bank_type` = ?, `wx_transaction_id` = ?, time_end = ?, `update_time` = current_timestamp, state = 1 WHERE `id` = ?", bank_type, transaction_id, timeEnd, q.id)
	if err != nil {
		log.Error("更新记录信息表：", err.Error())
		return
	}

	// 创建注册码
	err = createSn(q.wxUserId, q.id, q.TotalTime, q.Count, tx)
	if err != nil {
		log.Error("创建注册码失败：", err)
		return
	}

	// 提交事务
	_ = tx.Commit()

	return
}

// 创建指定数量的sn
func createSn(wxUserId, wxRecordId, vipTime, count int, tx *sql.Tx) (err error) {
	for j := 0; j < count; j++ {
		timeString := time.Now().Format("060102150405")
		strLen := len(timeString)
		randString := genString(strLen)
		sn := ""
		for i := 0; i < strLen; i++ {
			sn += randString[i : i+1]
			sn += timeString[i : i+1]
		}
		_, err = tx.Exec("insert xq.sn (sn, wx_user_id, record_id, total_time) VALUE (?, ?, ?, ?)",
			sn, wxUserId, wxRecordId, vipTime)
		if err != nil {
			log.Error("创建注册码失败：", err)
			return
		}
	}
	return
}

// 生成指定长度的随机字符串
func genString(size int) (strRet string) {
	const BASE = "ABCDEFGHIJKMNPRSTUWXY"
	for i := 0; i < size; i++ {
		strRet += string(BASE[rand.Int()%len(BASE)])
	}
	return
}

// 登录
func Login(loginCode string) (code int, errMsg string, token string) {

	// 访问微信服务器，获取openId，昵称等信息
	openId, nick, avatar, err := GetOpenId(loginCode)
	if err != nil {
		log.Error("微信授权失败：", err)
		return 1, err.Error(), ""
	}

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("连接数据库：", err.Error())
		return 2, err.Error(), ""
	}

	// 创建token并存储到数据库中
	token, err = createToken(openId, nick, avatar, db)
	if err != nil {
		log.Error("创建token失败：", err.Error())
		return 3, err.Error(), ""
	}
	return
}

// 创建一个随机的token
func createToken(openId, nick, avatar string, db *sql.DB) (token string, err error) {

	// 启动事务
	tx, err := db.Begin()
	if err != nil {
		log.Error("启动事务失败：", err)
		return
	}
	defer tx.Rollback()

	// 查找openId对应的记录
	var id int64
	err = tx.QueryRow("select id from xq.wx_user where open_id = ?", openId).Scan(&id)
	if err == sql.ErrNoRows {
		result, _ := tx.Exec("insert xq.wx_user (open_id) VALUE (?)", openId)
		id, err = result.LastInsertId()
		if err != nil {
			log.Error("获取刚刚插入的Id失败", err)
			return
		}
	}

	// 更新token信息
	token, err = genToken(tx)
	if err != nil {
		log.Error("创建token失败：", err)
		return
	}

	// 更新用户信息
	_, _ = tx.Exec("update xq.wx_user set token = ?, nick = ?, avatar = ?, update_time = current_timestamp where id = ?", token, nick, avatar, id)

	// 提交事务
	_ = tx.Commit()

	return
}

// 创建一个没有被使用过的token
func genToken(tx *sql.Tx) (token string, err error) {

	// 生成一个随机的token
	token = fmt.Sprintf("%x", md5.Sum([]byte(fmt.Sprint("token", time.Now().Unix(), rand.Float64()))))

	// 如果token没有被使用过，直接返回
	var count = 0
	err = tx.QueryRow("select count(0) from xq.wx_user where token = ?", token).Scan(&count)
	if err != nil {
		log.Error("查询token失败：", err)
		return
	}
	if count == 0 {
		return
	}

	// 否则尝试继续生成token
	return genToken(tx)
}

// 获取产品列表
type Product struct {
	ProductId   string //: "wxmp_01",
	ProductInfo string //: "VIP 7天卡",
	Money       int    //: 1000,
	Count       int    // 当前剩余数量
}

// 获取商品列表
type ProductsRet struct {
	UserType int
	Products []Product
}

// 获取商品列表
func Products(token string) (code int, errMsg string, ret ProductsRet) {

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("连接数据库：", err)
		return 1, err.Error(), ret
	}

	// 获取用户类型 0.普通用户 1.渠道用户 2.系统管理员
	var channel string
	err = db.QueryRow("select user_type, IFNULL(channel, '') from xq.wx_user where token = ?", token).Scan(&ret.UserType, &channel)
	if err != nil {
		log.Error("token校验失败：", err)
		return 2, "token校验失败", ret
	}
	if ret.UserType == 1 {
		ret.UserType = 2
	} else if len(channel) > 0 {
		ret.UserType = 1
	}

	// 获取商品列表
	rows, err := db.Query("select product_id, product_info, money, max_day_count from xq.price")
	if err != nil {
		log.Error("查询数据库失败：", err)
		return 3, err.Error(), ret
	}
	ret.Products = make([]Product, 0)
	for rows.Next() {
		var node Product
		err = rows.Scan(&node.ProductId, &node.ProductInfo, &node.Money, &node.Count)
		if err != nil {
			log.Error("查询数据库失败：", err)
			return 4, err.Error(), ret
		}
		ret.Products = append(ret.Products, node)
	}

	// 每一个商品，减去已经销售的记录
	var soldCount = 0
	var sellingCount = 0
	for index, node := range ret.Products {

		// 如果价格超过1元，不检查销量
		if node.Money > 100 {
			continue
		}

		// 获取已经完成的交易
		var today = time.Now().Format("2006-01-02 00:00:00")
		err = db.QueryRow("select count(0) from xq.wx_record where product_id = ? and state = 1 && price > 10 and create_time >= ?",
			node.ProductId, today).Scan(&soldCount)
		if err != nil {
			log.Error("查询销售记录失败：", err)
			return 5, err.Error(), ret
		}

		// 获取5分钟内创建但未完成的交易
		var timeBefore5Min = time.Now().Add(-5 * time.Minute).Format("2006-01-02 15:04:05")
		if timeBefore5Min < today {
			timeBefore5Min = today
		}
		err = db.QueryRow("select count(0) from xq.wx_record where product_id = ? and state = 0 && price > 10 and create_time >= ?",
			node.ProductId, timeBefore5Min).Scan(&sellingCount)
		if err != nil {
			log.Error("查询销售记录失败：", err)
			return 6, err.Error(), ret
		}

		log.Debug("当前已售：", soldCount, "当前正在进行中：", sellingCount)

		node.Count -= soldCount
		node.Count -= sellingCount
		if node.Count < 0 {
			node.Count = 0
		}
		if node.Count > 100 {
			node.Count = 100
		}
		ret.Products[index] = node
	}
	return
}

// 获取购买记录
type RecordsRet struct {
	Sn            string //: 'J2Y0I0I6H0M5D1Y9I2G3K3T5D1',       // 注册码
	CreateTime    string //: '2020-06-05 19:23:35',      // 创建时间
	UseTime       string //: '',                            // 使用时间（如果未使用，则为空字符串）
	Platform      string // 平台名称
	UseRoleId     string //: '',                          // 使用者角色Id（如果未使用，则为空字符串）
	TotalTime     int    //: 1,                       // 注册码包含时间(天)
	TransactionId string //: 89054325111,             // 微信交易单号（如果是回收的，那么为0）
	Money         int    //: 3000,                            // 花费的钱（人民币：分）
}

// 获取购买记录
func Records(token string) (code int, errMsg string, ret []RecordsRet) {

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("连接数据库：", err)
		return 1, err.Error(), ret
	}

	// 根据token查询到这个用户的用户Id
	wxUserId, err := Token2UserId(token, db)
	if err != nil {
		log.Error("token校验失败：", err)
		return 2, "token校验失败", ret
	}

	// 根据用户Id查询该用户数据
	var isUse int
	rows, err := db.Query(`select if(t1.use_time = '', 0, 1) as u, t1.sn, t1.create_time, t1.use_time, t1.platform, t1.role_id, t1.total_time, ifnull(t2.wx_transaction_id, '早期订单'), ifnull(t2.price, 0) from xq.sn as t1
    			left join xq.wx_record as t2 on t1.record_id = t2.id where t1.wx_user_id = ? order by u, t1.create_time desc `, wxUserId)
	if err != nil {
		log.Error("查询数据库失败：", err)
		return 3, err.Error(), ret
	}
	ret = make([]RecordsRet, 0)
	for rows.Next() {
		var node RecordsRet
		err = rows.Scan(&isUse, &node.Sn, &node.CreateTime, &node.UseTime, &node.Platform, &node.UseRoleId, &node.TotalTime, &node.TransactionId, &node.Money)
		if err != nil {
			log.Error("查询数据库失败：", err)
			return 4, err.Error(), ret
		}
		ret = append(ret, node)
	}

	return
}

// 获取购买统计信息
type PayRecordsRet struct {
	RetType   int
	LastMonth interface{} `json:"LastMonth,omitempty"`
	ThisMonth interface{} `json:"ThisMonth,omitempty"`
}

// 获取购买统计信息
func PayRecords(token string) (code int, errMsg string, ret PayRecordsRet) {

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("连接数据库：", err)
		return 1, err.Error(), ret
	}

	// 获取用户类型以及渠道信息
	var channel string
	var userType int
	err = db.QueryRow("select user_type, IFNULL(channel, '') from xq.wx_user where token = ?", token).Scan(&userType, &channel)
	if err != nil {
		log.Error("token校验失败：", err)
		return 2, "token校验失败", ret
	}

	// 日期
	var timeNow = time.Now()
	var lastMonth = timeNow.AddDate(0, -1, 0).Format("2006-01")
	var thisMonth = timeNow.Format("2006-01")
	var nextMonth = timeNow.AddDate(0, 1, 0).Format("2006-01")

	// 如果当前是系统管理员，那么返回所有渠道的统计信息
	if userType == 1 {
		ret.RetType = 2
		ret.LastMonth, err = getChannelsRecords(db, lastMonth, thisMonth)
		if err != nil {
			log.Error("获取上个月的销量失败：", err)
			return 3, err.Error(), ret
		}
		ret.ThisMonth, err = getChannelsRecords(db, thisMonth, nextMonth)
		if err != nil {
			log.Error("获取本月的销量失败：", err)
			return 4, err.Error(), ret
		}
		return
	}

	// 如果当前是渠道用户，那么返回该渠道的销售记录
	if len(channel) > 0 {
		ret.RetType = 1
		ret.LastMonth, err = getChannelRecords(db, channel, lastMonth, thisMonth)
		if err != nil {
			log.Error("获取上个月的销量失败：", err)
			return 3, err.Error(), ret
		}
		ret.ThisMonth, err = getChannelRecords(db, channel, thisMonth, nextMonth)
		if err != nil {
			log.Error("获取本月的销量失败：", err)
			return 4, err.Error(), ret
		}
		return
	}

	// 普通用户不返回任何信息
	return
}

// 指定渠道的信息
type ChannelsRecords struct {
	Nick        string //: '张三',
	Avatar      string //: 'http://resource.example.invalid/REDACTED',
	ChannelName string //: 'aaa',
	Count       int    //: 10,
	Money       int    //: 40000,
}

// 获取指定时间范围的渠道统计数据
func getChannelsRecords(db *sql.DB, startTime, endTime string) (ret []ChannelsRecords, err error) {
	log.Debug("开始统计：", startTime, endTime, "之间的数据")
	ret = make([]ChannelsRecords, 0)
	rows, err := db.Query(`select t2.nick, t2.avatar, t2.channel, count(*), sum(t1.price * t1.count) from xq.wx_record as t1 join xq.wx_user as t2 on t1.channel = t2.channel 
			where t1.update_time > ? and t1.update_time < ? and t1.state = 1 and t1.channel != '' group by t1.channel`, startTime, endTime)
	if err != nil {
		log.Error("查询记录失败：", err)
		return
	}
	for rows.Next() {
		var node ChannelsRecords
		err = rows.Scan(&node.Nick, &node.Avatar, &node.ChannelName, &node.Count, &node.Money)
		if err != nil {
			log.Error("查询记录失败：", err)
			return
		}
		ret = append(ret, node)
	}
	return
}

// 指定渠道的信息
type ChannelRecords struct {
	Nick    string //: '李四',
	Avatar  string //: 'http://resource.example.invalid/REDACTED',
	Money   int    //: 3000,
	SnTime  int    //: 30,
	PayTime string //: '2012-02-03 12:00:45',
}

// 获取指定时间范围的渠道统计数据
func getChannelRecords(db *sql.DB, channel, startTime, endTime string) (ret []ChannelRecords, err error) {
	ret = make([]ChannelRecords, 0)
	rows, err := db.Query(`select t2.nick, t2.avatar, t1.price * t1.count, t1.total_time, t1.update_time  from xq.wx_record as t1 join xq.wx_user as t2 on t1.wx_user_id = t2.id 
			where t1.update_time > ? and t1.update_time < ? and t1.state = 1 and t1.channel = ?`, startTime, endTime, channel)
	if err != nil {
		log.Error("查询记录失败：", err)
		return
	}
	for rows.Next() {
		var node ChannelRecords
		err = rows.Scan(&node.Nick, &node.Avatar, &node.Money, &node.SnTime, &node.PayTime)
		if err != nil {
			log.Error("查询记录失败：", err)
			return
		}
		ret = append(ret, node)
	}
	return
}

// 微信预支付
func Prepay(token, productId, channel, ip string) (code int, errMsg string, ret WechatPayRet) {

	// 连接数据库
	db, err := getDb()
	if err != nil {
		log.Error("连接数据库：", err)
		return 1, err.Error(), ret
	}

	// 根据token查询到这个用户的openId
	var openId string
	var userType, wxUserId int
	err = db.QueryRow("select id, open_id, user_type from xq.wx_user where token = ?", token).Scan(&wxUserId, &openId, &userType)
	if err != nil {
		log.Error("token校验失败：", err)
		return 2, "token校验失败", ret
	}

	// 获取商品的价格等信息
	var price, innerPrice, vipTime, count int
	var productInfo string
	err = db.QueryRow("select money, money_inner, vip_time, product_info, max_day_count from xq.price where product_id = ?", productId).Scan(&price, &innerPrice, &vipTime, &productInfo, &count)
	if err != nil {
		log.Error("获取商品价格失败：", err)
		return 3, "获取商品详情失败", ret
	}
	if userType == 1 {
		price = innerPrice
		log.Notice("当前是内部用户", wxUserId, "在购买商品", productId)
	} else if price < 100 { // 只有特价商品检查销量

		// 获取这个用户10天之内的购买数量
		var lastCount = 0
		err = db.QueryRow("select count(0) from xq.wx_record where product_id = ? and  wx_user_id = ? and state = 1 and create_time >= ?",
			productId, wxUserId, time.Now().AddDate(0, 0, -10).Format("2006-01-02")).Scan(&lastCount)
		if err != nil {
			log.Error("获取用户最近交易量失败：", err)
			return 4, "获取用户最近交易量失败", ret
		}
		if lastCount > 0 {
			return 5, "用户最近10天之内已经成功购买过注册码", ret
		}

		// 获取这个商品今天的销量
		var timeBefore5Min = time.Now().Add(-5 * time.Minute).Format("2006-01-02 15:04:05")
		var sold = 0
		var today = time.Now().Format("2006-01-02 00:00:00")
		if timeBefore5Min < today {
			timeBefore5Min = today
		}
		err = db.QueryRow("select count(0) from xq.wx_record as t1 where t1.product_id = ? && t1.price > 10 and ((t1.state = 1 and t1.create_time >= ?) or (t1.state = 0 and t1.create_time >= ? ))",
			productId, today, timeBefore5Min).Scan(&sold)
		if err != nil {
			log.Error("获取今日交易量失败：", err)
			return 8, "获取今日交易量失败", ret
		}
		fmt.Println("今日交易量：", sold)
		if count <= sold {
			return 9, "今日已售罄，请明日再来", ret
		}

		// 获取这个用户5分钟之内的未完成订单
		timeBefore5Min = time.Now().Add(-5 * time.Minute).Format("2006-01-02 15:04:05")
		err = db.QueryRow("select count(0) from xq.wx_record where product_id = ? and wx_user_id = ? and state = 0 and create_time >= ?",
			productId, wxUserId, timeBefore5Min).Scan(&lastCount)
		if err != nil {
			log.Error("获取用户最近交易量失败：", err)
			return 6, "获取用户最近交易量失败", ret
		}
		if lastCount > 0 {
			return 7, "您有一笔5分钟内创建且等待完成的订单", ret
		}
	}

	// 在数据库中创建订单
	_, recordId, err := wxPrepay(db, productId, channel, wxUserId, 1, price, vipTime)
	if err != nil {
		log.Error("创建内部订单失败：", err)
		return 8, "创建内部订单失败", ret
	}

	// 创建微信预支付需要的内容
	ret, err = WechatPay(productInfo, recordId, ip, openId, price, 1)
	if err != nil {
		log.Error("创建微信预支付信息失败：", err)
		return 9, "创建微信预支付信息失败", ret
	}

	return
}

// 在数据库中生成订单
func wxPrepay(db *sql.DB, productId, channel string, wxUserId, count, price, totalTime int) (orderId int64, recordId string, err error) {

	// 首先是生成订单记录
	result, err := db.Exec("insert xq.wx_record(product_id, channel, price, count, state, wx_user_id, total_time) VALUE (?, ?, ?, ?, 0, ?, ?)",
		productId, channel, price, count, wxUserId, totalTime)
	if err != nil {
		log.Error("生成订单：", err.Error())
		return
	}
	orderId, err = result.LastInsertId()
	if err != nil {
		log.Error("生成订单失败：", err.Error())
		return
	}
	log.Info("第", orderId, "条微信订单被创建")

	// 然后更新订单号
	recordId = fmt.Sprintf("%v-%v", time.Now().Format("20060102_150405"), orderId)
	_, err = db.Exec("update xq.wx_record set record_id = ? where id = ?", recordId, orderId)
	if err != nil {
		log.Error("更新订单号失败：", err.Error())
		return
	}
	return
}

func Token2UserId(token string, db *sql.DB) (userId int64, err error) {
	err = db.QueryRow("select id from xq.wx_user where token = ?", token).Scan(&userId)
	return
}
