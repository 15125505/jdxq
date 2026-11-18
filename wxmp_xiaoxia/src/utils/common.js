/**
 * 测试模式下的操作延时
 * @type {number}
 */
import {GetQueryString, zReq} from "./utils";

const DelayTest = 3;

export const ServerAddr = "https://server-4.example.invalid/pay";
// export const ServerAddr = "http://192.0.2.1:5000";

// 测试模式标志位
export const isTestMode = false;


/**
 * 登录函数
 * @param code  -- 微信授权得到的code
 * @param ok    -- 登录成功的回调
 * @param err   -- 登录失败的回调
 */
export function login(code, ok, err) {

    if (!isTestMode) {
        zReq("wxmpLogin", {code: code}, (token) => {
            zReq("wxmpProducts", {token: token}, (ret) => {
                ok && ok({token: token, prices: ret.Products, userType: ret.UserType});
            }, err)
        }, err);
        return;
    }

    let ret = {
        token: 'abc',      // 用户token
        userType: 1,
        prices: [{
            ProductId: "wxmp_01",
            ProductInfo: "云功能30天卡",
            Money: 66,
            Count: 12,
        }],     // 价格列表
    };

    if (code === 'abc') {
        setTimeout(() => ok && ok(ret), DelayTest);
        return;
    }

    setTimeout(() => err && err("code无效"), DelayTest);
}

/**
 * 获取用户购买记录
 * @param token
 * @param {function} ok
 * @param err
 */
export function records(token, ok, err) {

    if (!isTestMode) {
        zReq("wxmpRecords", {token: token}, (records) => {
            ok && ok(records)
        }, err);
        return;
    }

    let ret = [{
        Sn: 'J2Y0I0I6H0M5D1Y9I2G3K3T5D1',       // 注册码
        CreateTime: '2020-06-05 19:23:35',      // 创建时间
        UseTime: '',                            // 使用时间（如果未使用，则为空字符串）
        UseRoleId: '',                          // 使用者角色Id（如果未使用，则为空字符串）
        TotalTime: 86400,                       // 注册码包含时间(天)
        TransactionId: 0,             // 微信交易单号（如果是回收的，那么为0）
        Money: 3000,                            // 花费的钱（人民币：分）
    }, {
        Sn: 'J2Y0I0I6H0M5D1Y9I2G3K3T5D1',       // 注册码
        CreateTime: '2020-06-05 19:23:35',      // 创建时间
        UseTime: '2020-06-05 19:23:35',         // 使用时间（如果未使用，则为空字符串）
        UseRoleId: '1000001',                   // 使用者角色Id（如果未使用，则为空字符串）
        TotalTime: 86400,                       // 注册码包含时间(秒)
        TransactionId: 0,             // 微信交易单号（如果是回收的，那么为0）
        Money: 3000,                            // 花费的钱（人民币：分）
    }, {
        Sn: 'J2Y0I0I6H0M5D1Y9I2G3K3T5D1',       // 注册码
        CreateTime: '2020-06-05 19:23:35',      // 创建时间
        UseTime: '2020-06-05 19:23:35',         // 使用时间（如果未使用，则为空字符串）
        UseRoleId: '1000001',                   // 使用者角色Id（如果未使用，则为空字符串）
        TotalTime: 86400,                       // 注册码包含时间(秒)
        TransactionId: 0,             // 微信交易单号（如果是回收的，那么为0）
        Money: 3000,                            // 花费的钱（人民币：分）
    }, {
        Sn: 'J2Y0I0I6H0M5D1Y9I2G3K3T5D1',       // 注册码
        CreateTime: '2020-06-05 19:23:35',      // 创建时间
        UseTime: '2020-06-05 19:23:35',         // 使用时间（如果未使用，则为空字符串）
        UseRoleId: '1000001',                   // 使用者角色Id（如果未使用，则为空字符串）
        TotalTime: 86400,                       // 注册码包含时间(秒)
        TransactionId: 0,             // 微信交易单号（如果是回收的，那么为0）
        Money: 3000,                            // 花费的钱（人民币：分）
    }, {
        Sn: 'J2Y0I0I6H0M5D1Y9I2G3K3T5D1',       // 注册码
        CreateTime: '2020-06-05 19:23:35',      // 创建时间
        UseTime: '2020-06-05 19:23:35',         // 使用时间（如果未使用，则为空字符串）
        UseRoleId: '1000001',                   // 使用者角色Id（如果未使用，则为空字符串）
        TotalTime: 86400,                       // 注册码包含时间(秒)
        TransactionId: 0,             // 微信交易单号（如果是回收的，那么为0）
        Money: 3000,                            // 花费的钱（人民币：分）
    }, {
        Sn: 'J2Y0I0I6H0M5D1Y9I2G3K3T5D1',       // 注册码
        CreateTime: '2020-06-05 19:23:35',      // 创建时间
        UseTime: '2020-06-05 19:23:35',         // 使用时间（如果未使用，则为空字符串）
        UseRoleId: '1000001',                   // 使用者角色Id（如果未使用，则为空字符串）
        TotalTime: 86400,                       // 注册码包含时间(秒)
        TransactionId: 0,             // 微信交易单号（如果是回收的，那么为0）
        Money: 3000,                            // 花费的钱（人民币：分）
    }];

    if (token === 'abc') {
        setTimeout(() => ok && ok(ret), DelayTest);
        return;
    }

    setTimeout(() => err && err("token无效"), DelayTest);
}

/**
 * 获取用户购买记录
 * @param tId
 * @param {function} ok
 * @param err
 */
export function oldRecords(tId, ok, err) {
    zReq("wxmpOldRecords", {tId}, (records) => {
        ok && ok(records)
    }, err);
}

/**
 * 微信预支付
 * @param token
 * @param productId
 * @param ok
 * @param err
 */
export function wxPrePay(token, productId, ok, err) {

    if (!isTestMode) {
        zReq("wxmpPrepay", {token: token, productId: productId, channel: GetQueryString('state')}, (ret) => {
            ok && ok(ret)
        }, err);
        return;
    }

    let ret = {
        appId: "CHANGEME",     //公众号名称，由商户传入
        timeStamp: "1395712654",         //时间戳，自1970年以来的秒数
        nonceStr: "00000000000000000000000000000000", //随机串
        package: "prepay_id=u802345jgfjsdfgsdg888",
        signType: "MD5",         //微信签名方式：
        paySign: "0000000000000000000000000000000000000000" //微信签名
    };

    if (token === 'abc') {
        setTimeout(() => ok && ok(ret), DelayTest);
        return;
    }

    setTimeout(() => err && err("token无效"), DelayTest);
}

/**
 * 获取渠道销售记录
 * @param token
 * @param ok
 * @param err
 */
export function payRecords(token, ok, err) {

    if (!isTestMode) {
        zReq("wxmpPayRecords", {token: token}, (ret) => {
            ok && ok(ret)
        }, err);
        return;
    }

    // 如果是普通用户，返回这个
    let retUser = {
        RetType: 0,
    };

    // 如果是渠道用户，返回这个
    let ret = {
        RetType: 1,
        LastMonth: [{
            Nick: '张三',
            Avatar: 'http://resource.example.invalid/REDACTED',
            Money: 3000,
            SnTime: 30,
            PayTime: '2012-02-03 12:00:45',
        }, {
            Nick: '李四',
            Avatar: 'http://resource.example.invalid/REDACTED',
            Money: 3000,
            SnTime: 30,
            PayTime: '2012-02-03 12:00:45',
        }],
        ThisMonth: [{
            Nick: '张三',
            Avatar: 'http://resource.example.invalid/REDACTED',
            Money: 3000,
            SnTime: 30,
            PayTime: '2012-02-03 12:00:45',
        }, {
            Nick: '李四',
            Avatar: 'http://resource.example.invalid/REDACTED',
            Money: 3000,
            SnTime: 30,
            PayTime: '2012-02-03 12:00:45',
        }],
    };

    // 如果是系统管理员，返回这个
    let retAdmin = {
        RetType: 2,
        LastMonth: [{
            Nick: '张三',
            Avatar: 'http://resource.example.invalid/REDACTED',
            ChannelName: 'aaa',
            Count: 10,
            Money: 40000,
        }, {
            Nick: '李四',
            Avatar: 'http://resource.example.invalid/REDACTED',
            ChannelName: 'bbb',
            Count: 10,
            Money: 40000,
        }],
        ThisMonth: [{
            Nick: '张三',
            Avatar: 'http://resource.example.invalid/REDACTED',
            ChannelName: 'ccc',
            Count: 10,
            Money: 40000,
        }, {
            Nick: '李四',
            Avatar: 'http://resource.example.invalid/REDACTED',
            ChannelName: 'ddd',
            Count: 10,
            Money: 40000,
        }],
    };


    if (token === 'abc') {
        setTimeout(() => ok && ok(ret), DelayTest);
    } else if (token === 'admin') {
        setTimeout(() => ok && ok(retAdmin), DelayTest);
    } else if (token === 'user') {
        setTimeout(() => ok && ok(retUser), DelayTest);
    } else {
        setTimeout(() => err && err("token无效"), DelayTest);
    }
}
