package models

import (
	"context"
	"database/sql"
	"errors"
	"github.com/15125505/zlog/log"
	"github.com/wechatpay-apiv3/wechatpay-go/core"
	"github.com/wechatpay-apiv3/wechatpay-go/core/auth/verifiers"
	"github.com/wechatpay-apiv3/wechatpay-go/core/downloader"
	"github.com/wechatpay-apiv3/wechatpay-go/core/notify"
	"github.com/wechatpay-apiv3/wechatpay-go/core/option"
	"github.com/wechatpay-apiv3/wechatpay-go/services/payments"
	"github.com/wechatpay-apiv3/wechatpay-go/services/payments/native"
	"github.com/wechatpay-apiv3/wechatpay-go/utils"
	"net/http"
	"os"
	"strings"
)

var ApiV3Key = os.Getenv("JDXQ_WECHAT_API_V3_KEY") // APIV3密钥
var ApiV3CertSN = os.Getenv("JDXQ_WECHAT_CERT_SERIAL")

const PemFilePath = "./models/apiclient_key.pem"

// NativeQR 获取支付二维码
func NativeQR(platform, roleId string, priceId int, db *sql.DB) (qr string, id int, err error) {

	// 正式发布的时候，需要进行校验，priceId为1的时候，直接返回失败
	if priceId == 1 {
		err = errors.New("商品不合法")
		return
	}

	var (
		mchID                      string = MchId       // 商户号
		mchCertificateSerialNumber string = ApiV3CertSN // 商户证书序列号
		mchAPIv3Key                string = ApiV3Key    // 商户APIv3密钥
	)

	// 连接数据库
	if db == nil {
		db, err = getDb()
		if err != nil {
			log.Error("连接数据库：", err.Error())
			return
		}
	}

	// 首先查询该用户对应的Id
	var userId int64
	err = db.QueryRow("select id from xq.user where platform = ? and role_id = ?", platform, roleId).Scan(&userId)
	if err != sql.ErrNoRows && err != nil {
		log.Error("查询用户信息失败：", err)
		return
	}

	// 如果该用户不存在，那么首先创建这个用户
	if err == sql.ErrNoRows {
		var result sql.Result
		result, err = db.Exec("insert xq.user (code, platform, role_id, uid, server_id, partition_id, user_name, nick, tower_date, chest_date) VALUE (?, ?, ?, ?, ?, ?, ?, ?, curdate(), curdate())",
			"", platform, roleId, "", 0, 0, "", "")
		if err != nil {
			log.Error("添加用户失败：", err)
			return
		}
		userId, _ = result.LastInsertId()
	}

	// 然后根据priceId，获取价格
	var productInfo string
	var money, vipTime int
	err = db.QueryRow("select product_info, money, vip_time from xq.price where id = ?", priceId).Scan(&productInfo, &money, &vipTime)
	if err != nil {
		log.Error("查询数据库失败：", err)
		return
	}

	// 在数据库中创建订单
	orderId, recordId, err := wxPrepay(db, platform+"-"+roleId, "", 0, 1, money, vipTime)
	if err != nil {
		log.Error("创建内部订单失败：", err)
		return
	}

	// 使用 utils 提供的函数从本地文件中加载商户私钥，商户私钥会用来生成请求的签名
	mchPrivateKey, err := utils.LoadPrivateKeyWithPath(PemFilePath)
	if err != nil {
		log.Error("加载商户私钥失败：", err)
		return
	}

	// 使用商户私钥等初始化 client，并使它具有自动定时获取微信支付平台证书的能力
	ctx := context.Background()
	opts := []core.ClientOption{
		option.WithWechatPayAutoAuthCipher(mchID, mchCertificateSerialNumber, mchPrivateKey, mchAPIv3Key),
	}
	client, err := core.NewClient(ctx, opts...)
	if err != nil {
		log.Error("创建支付Client失败：", err)
		return
	}
	svc := native.NativeApiService{Client: client}
	resp, _, err := svc.Prepay(ctx,
		native.PrepayRequest{
			Appid:       core.String(AppId),
			Mchid:       core.String(MchId),
			Description: core.String(productInfo),
			OutTradeNo:  core.String(recordId),
			NotifyUrl:   core.String("https://server-3.example.invalid/pay/nativePayCallback"),
			Amount: &native.Amount{
				Currency: core.String("CNY"),
				Total:    core.Int64(int64(money)),
			},
		},
	)
	if err != nil {
		log.Error("发起Native预支付失败：", err)
		return
	}

	// 返回二维码链接
	qr = *resp.CodeUrl
	id = int(orderId)
	return
}

func NativePayCallback(request *http.Request) (err error) {

	var (
		mchID                      string = MchId       // 商户号
		mchCertificateSerialNumber string = ApiV3CertSN // 商户证书序列号
		mchAPIv3Key                string = ApiV3Key    // 商户APIv3密钥
	)

	// 使用 utils 提供的函数从本地文件中加载商户私钥，商户私钥会用来生成请求的签名
	mchPrivateKey, err := utils.LoadPrivateKeyWithPath(PemFilePath)
	if err != nil {
		log.Error("加载商户私钥失败：", err)
		return
	}

	// 1. 使用 `RegisterDownloaderWithPrivateKey` 注册下载器
	ctx := context.Background()
	err = downloader.MgrInstance().RegisterDownloaderWithPrivateKey(ctx, mchPrivateKey, mchCertificateSerialNumber, mchID, mchAPIv3Key)
	if err != nil {
		log.Error("注册下载器失败：", err)
		return
	}

	// 2. 获取商户号对应的微信支付平台证书访问器
	certificateVisitor := downloader.MgrInstance().GetCertificateVisitor(mchID)

	// 3. 使用证书访问器初始化 `notify.Handler`
	handler := notify.NewNotifyHandler(mchAPIv3Key, verifiers.NewSHA256WithRSAVerifier(certificateVisitor))

	// 解析回调内容
	transaction := new(payments.Transaction)
	_, err = handler.ParseNotifyRequest(context.Background(), request, transaction)
	if err != nil {
		log.Error("解析回调失败：", err)
		return
	}

	recordId := *transaction.OutTradeNo
	bank_type := *transaction.BankType
	transaction_id := *transaction.TransactionId
	timeEnd := *transaction.SuccessTime

	log.Info("来自Native的充值回调 -- recordId:", recordId, "bank_type:", bank_type, "transaction_id:", transaction_id, "timeEnd:", timeEnd)

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
	defer func(tx *sql.Tx) {
		_ = tx.Rollback()
	}(tx) // 如果操作成功了，再Rollback一次也没啥事情

	// 查询数据库对应的记录
	var q struct {
		id        int
		TotalTime int
		state     int
		productId string
	}
	row := tx.QueryRow("SELECT id, total_time, state, product_id FROM xq.wx_record WHERE record_id = ? for update", recordId)
	if err = row.Scan(&q.id, &q.TotalTime, &q.state, &q.productId); err != nil {
		log.Error("查询数据库：", err.Error())
		return
	}
	log.Info("当前支付记录状态：", q)

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

	// 解析用户平台信息
	vec := strings.Split(q.productId, "-")
	if len(vec) != 2 {
		err = errors.New("获取用户所在平台信息失败")
		log.Error(err)
		return
	}

	// 为用户加时间
	vipTime, err := addUserTime(vec[0], vec[1], q.TotalTime, tx)
	if err != nil {
		log.Error("为用户加时间失败：", err)
		return
	}
	log.Info("用户的vip时间被更新到：", vipTime)

	// 提交事务
	_ = tx.Commit()
	return
}
