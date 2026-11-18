import {Base} from "../auto/base";
import {UserEx} from "./module/userEx";
import {CmdEx} from "./module/cmdEx";
import {setTime} from "../utils/tool";
import {Vip} from "../vip";
import {Chest} from "../auto/chest";
import {HoldChest1} from "../utils/holdChest1";
import {TowerReward} from "../auto/towerReward";
import {Strength} from "../auto/strength";
import {Task} from "../auto/task";
import {Gold} from "../auto/gold";
import {StrengthReward} from "../auto/strengthReward";
import {Jiaofei} from "../auto/jiaofei";
import {Story} from "../auto/story";
import {Legion} from "../auto/legion";
import {Enlist} from "../auto/enlist";
import {CheckVip} from "../auto/checkVip";
import {TowerFight} from "../auto/towerFight";
import {HoldChest2} from "../utils/holdChest2";
import {Free} from "../auto/free";
import {LegionBoss} from "../auto/legionBoss";
import {Patrol} from "../auto/patrol";
import {Share} from "../auto/share";
import {PassThrough} from "../auto/passThrough";
import {Challenge} from "../auto/challenge";
import {Interior} from "../auto/interior";
import {Shop} from "../auto/shop";
import {decode, encode} from "@msgpack/msgpack";
import {InnRecruit} from "../auto/innRecruit";
import {Sweep} from "../auto/sweep";
import {ExchangeGold} from "../auto/exchangeGold";
import {OnSweep} from "../auto/onSweep";
import {ReceiveStrength} from "../auto/receiveStrength";
import {Jhqx} from "../auto/jhqx";
import {Arena} from "../auto/arena";
import {PracticeEx} from "../auto/practiceEx";
import {Through} from "../auto/through";
import {ShareTreasure} from "../auto/shareTreasure";
import {getOnceWork} from "../utils/http";
import {Snake} from "../auto/snake";
import {TidyHero} from "../auto/tidyHero";
import {Mail} from "../auto/mail";
import {Trophy} from "../auto/trophy";
import {Slg} from "../auto/slg";
import {Official} from "../auto/official";
import {Answer} from "../auto/answer";
import {Exchange} from "../auto/exchange";
import {Donate} from "../auto/donate";
import {RedBag} from "../auto/redBag";
import {BooksDraw} from "../auto/booksDraw";
import {Quenching} from "../auto/quenching";
import {Adventure} from "../auto/adventure";
import {Melee} from "../auto/melee";

// 失败重试的时间列表
let vecFailTime = [];

export class WorkEx extends Base {

    /**
     * @param {Object} userInfo
     * @param {string} userInfo.platform 用户平台
     * @param {number} userInfo.userId
     * @param {number} userInfo.roleId
     * @param {string} userInfo.authorCode
     * @param {string} userInfo.code
     * @param {number} userInfo.gameId
     * @param {string} userInfo.clientId
     * @param {string} userInfo.clientVer
     * @param {string} userInfo.deviceId
     * @param {string} userInfo.server  服务器地址
     *
     * @param {Object} configInfo 用户配置参数
     * @param {Array.<string>} configInfo.vecEnable 当前使能的功能
     * @param {{findInFriend:boolean, findInRank:boolean, findInSub: boolean, vecSubs: Array}} configInfo.chest 挖矿相关配置
     * @param {{fei1:boolean, fei2:boolean, fei3:boolean, feiLevel: number, friendFeiLevel: number, maxStrength: number}} configInfo.jiaofei 剿匪相关配置
     * @param {{vec:[], freeRefresh:boolean, moneyRefresh:boolean}} configInfo.shop 珍宝阁相关配置
     * @param {data.ShopExParam} configInfo.shopEx 珍宝阁武将结晶相关配置
     * @param {{count:number}} configInfo.legionBoss 军团boss相关设置
     * @param {any} configInfo.boss 城门boss相关设置
     * @param {any} configInfo.towerReward 试炼塔奖励
     * @param {any} configInfo.sweep 试炼扫荡
     * @param {any} configInfo.onSweep 名将扫荡
     * @param {any} configInfo.donate 军团祈愿
     * @param {any} configInfo.enlist 招贤纳士
     * @param {any} configInfo.adventure 南征北战
     * @param {any} configInfo.melee 军团大乱斗
     * @param {any} configInfo.slg 中军帐
     * @param {function} pfnUpdateUser
     * @param {function} pfnUpdateUserState
     * @param {function} pfnUpdateUserInfo
     * @param {function(reason: string)} pfnLogout
     * @param {function()} pfnStop
     * @param {function()} pfnReport
     */
    constructor(userInfo, configInfo, pfnUpdateUser, pfnUpdateUserState = null, pfnUpdateUserInfo = null, pfnLogout = null, pfnStop = null, pfnReport = null) {

        super('努力工作', null, userInfo.platform + userInfo.roleId);

        if (userInfo.platform.indexOf('QQ') >= 0 && userInfo.clientId === 'H5_2.0_weixin.weixin.0-hall129.weixin.hulaisg') {
            userInfo.clientId = 'QQ_5.0_qq.qq.0-hall129.qq.hulaisg';
        }

        /**
         * 账号信息
         */
        this.userInfo = userInfo;

        /**
         * 该账号的配置信息
         */
        this.configInfo = configInfo;

        /**
         * 属臣库更新的回调
         */
        this.pfnUpdateUser = pfnUpdateUser;

        /**
         * 用户信息更新的回调
         */
        this.pfnUpdateUserInfo = pfnUpdateUserInfo;

        /**
         * 用户状态更新的回调
         */
        this.pfnUpdateUserState = pfnUpdateUserState;

        /**
         * 用户登出的回调
         */
        this.pfnLogout = pfnLogout;

        /**
         * 意外停止的回调函数
         */
        this.pfnStop = pfnStop;

        /**
         * 状态上报的回调函数
         */
        this.pfnReport = pfnReport;
        this.isReporting = false;

        /**
         * 是否允许断线重连，如果收到了服务器的外部登录消息，或者是用户手动停止的，那么不允许断线重连
         * @type {boolean}
         */
        this.canRetry = true;

        // 开始任务流程
        this.init();
    }

    getRoleInfo() {
        return this.userInfo.platform + this.userInfo.roleId;
    }

    // 开始
    init() {

        WorkEx.updateButton(true);
        this.canRetry = true;

        // 开始
        this.info(this.userInfo.platform, '用户', this.userInfo.userId, this.userInfo.roleId, '的工作已经被启动...');

        // 初始化用户模块和命令模块
        this.user = new UserEx(this.userInfo, {
            pfnUpdateTimestamp: time => setTime(time),
            pfnUpdateGameConfig: config => this.saveGameConfig(this.userInfo.platform, config),
            pfnUpdateUserInfo: (platform, roleId, serverId, name) => {
                this.userInfo.serverId = serverId;
                this.userInfo.name = name;
                this.pfnUpdateUserInfo && this.pfnUpdateUserInfo(platform, roleId, serverId, name);
            },
        }, this.loadGameConfig(this.userInfo.platform));
        this.cmd = new CmdEx(this.user, {
            initOK: () => this.onInit(),
            logout: (reason) => {
                this.canRetry = false;
                clearTimeout(this.timerRetry);

                console.log('异常登出消息....', reason);


                // node模式之下一定有pfnLogout，否则是本地模式
                if (this.pfnLogout) {
                    this.pfnLogout(reason);
                } else if (reason.includes('系统管理员禁止登录')) {


                    // 删除十分钟之前的记录
                    let vec = [];
                    vecFailTime.forEach(value => (new Date() - value < 10 * 60 * 1000) && vec.push(value));
                    vecFailTime = vec;

                    // 如果之前异常次数已经达到指定次数，那么放弃重试
                    if (vec.length >= 5) {
                        this.err("十分钟之内连续被封禁的次数超过", vec.length, "次，暂停重试，请手动重新开始。");
                        return;
                    }

                    // 开始重试
                    vecFailTime.push(new Date());
                    this.info("5秒钟后开始第", vecFailTime.length, "次重试...");
                    setTimeout(() => this.init(), 5000);
                }
            },
            sendCmd: cmd => this.send(cmd),
            updateTimestamp: time => {
                setTime(time);
                this.report();
            },
            onRob: () => this.hChest1.onConfigOK(),
            taskChange: () => this.task?.startNow(),
            onBossKilled: () => this.patrol.startNowOnSet('Patrol'),
        });

        // 确定服务器地址
        let wssUrl = 'wss://server-18.example.invalid/?base64=0&mask=0&binary=1';
        if (this.userInfo.deviceId.indexOf('qq') >= 0) {
            wssUrl = 'wss://server-19.example.invalid/?base64=0&mask=0&binary=1';
        }
        if (this.userInfo.server) {
            wssUrl = `wss://${this.userInfo.server}/?base64=0&mask=0&binary=1`;
        }

        // window下加入一个命令记录模块
        if (WorkEx.isWindowMode()) {
            window.vecCmd = [];
        } else {
            this.log('开始访问服务器...');
        }

        // websocket失败处理
        let onWsClose = () => {

            !WorkEx.isWindowMode() && this.log('连接已经关闭');

            // 这个判断很重要，如果wss服务器异常，那么这个函数可能会触发多次，那么需要防止重复操作
            if (!this.ws) {
                return;
            }

            this.warn('--连接已断开，如因网络异常所致，1分钟后将自动重连...');
            this.release();
            if (!this.canRetry) {
                return;
            }
            this.timerRetry = setTimeout(() => {
                if (this.canRetry) {
                    if (!WorkEx.isWindowMode()) {
                        this.err('服务器模式之下不进行自动重连！');
                        this.pfnStop && this.pfnStop();
                        this.pfnStop = null;
                        return;
                    }
                    this.init();
                }
            }, 60000);
        };

        // todo: 此处创建一个定时器，如果30秒没有成功连接，那么直接进入失败处理

        // 创建websocket
        if (WorkEx.isWindowMode()) {
            this.ws = new WebSocket(wssUrl);
            this.ws.onopen = this.onWsOpen.bind(this);
            this.ws.onmessage = this.onWsMessage.bind(this);
            this.ws.onclose = onWsClose;
        } else {
            let ws = require('ws')
            this.ws = new ws(wssUrl);
            this.ws.on('open', this.onWsOpen.bind(this));
            this.ws.on('message', this.onWsMessage.bind(this));
            this.ws.on('close', onWsClose);
            this.ws.on('error', onWsClose);
        }
    }

    // 是否是在windows浏览器之下工作
    static isWindowMode() {
        return typeof window === 'object';
    }

    // 释放资源
    release() {

        // 关闭websocket
        this.ws && this.ws.close();
        this.ws = null;

        WorkEx.updateButton(false);

        // 停止所有正在自动操作的模块
        this.vip && this.vip.release();
        this.stopNode(this.legionBoss);
        this.stopNode(this.chest);
        this.stopNode(this.hChest1);
        this.stopNode(this.hChest2);
        this.stopNode(this.towerReward);
        this.stopNode(this.strength);
        this.stopNode(this.task);
        this.stopNode(this.gold);
        this.stopNode(this.strengthReward);
        this.stopNode(this.jiaofei);
        this.stopNode(this.shop);
        this.stopNode(this.sweep);
        this.stopNode(this.innRecruit);
        this.stopNode(this.receiveStrength);
        this.stopNode(this.exchangeGold);
        this.stopNode(this.onSweep);
        this.stopNode(this.story);
        this.stopNode(this.legion);
        this.stopNode(this.enlist);
        this.stopNode(this.free);
        this.stopNode(this.answer);
        this.stopNode(this.jhqx);
        this.stopNode(this.patrol);
        this.stopNode(this.arena);
        this.stopNode(this.slg);
        this.stopNode(this.redBag);
        this.stopNode(this.booksDraw);
        this.stopNode(this.donate);
        this.stopNode(this.official);
        this.stopNode(this.practiceEx);
        this.stopNode(this.tidyHero);
        this.stopNode(this.through);
        this.stopNode(this.snake);
        this.stopNode(this.trophy);
        this.stopNode(this.shareTreasure);
        this.stopNode(this.mail);
        this.stopNode(this.adventure);
        this.stopNode(this.melee);

        // 停止心跳定时器
        clearInterval(this.timerHeartBeat);

        this.info(this.userInfo.platform, '用户', this.userInfo.roleId, "已停止工作...");
    }

    stopNode(node) {
        node && node.stop();
    }

    // node模式下进行状态上报
    report(isFirst = false) {

        // 没有回调函数，那么无需处理
        if (!this.pfnReport) {
            return;
        }

        // 如果是首次上报，那么进入上报状态，不在上报状态不进行上报
        if (isFirst) {
            this.isReporting = true;
            this.lastTime = new Date().getTime() - 50000;
        }
        if (!this.isReporting) {
            return;
        }

        // 如果距离上次上报时间小于30秒，那么不进行上报
        if (new Date().getTime() - this.lastTime < 30000) {
            return;
        }

        // 上报且进行更新时间
        this.lastTime = new Date().getTime();
        this.pfnReport();
    }

    /**
     * websocket连接成功消息
     * @param evt
     */
    onWsOpen(evt) {

        // 用户绑定
        this.send(this.user.make_bind_user());

        // 每隔3秒发送心跳
        this.timerHeartBeat = setInterval(() => this.send(this.user.make_heart_beat()), 3000);
    }

    /**
     * websocket消息
     * @param evt
     */
    onWsMessage(evt) {

        // 原始数据的处理函数
        let onBinData = binData => {
            let ret = decode(binData.slice(4));
            this.cmd.onServerCmd(ret);
            this.addCmdHistory(ret);
        };

        // 分情况读取数据
        if (WorkEx.isWindowMode()) {
            let reader = new FileReader();
            reader.readAsArrayBuffer(evt.data);
            reader.onload = () => onBinData(reader.result);
        } else {
            onBinData(evt);
        }
    }


    /**
     * 进入大厅，数据准备就绪了
     */
    onInit() {

        // 此处进行第一次状态上报
        this.report(true);

        // 开始一次性任务
        this.checkOnceWork().catch(e => console.error('开始一次性任务失败：', e));

        // 处理结果
        let fnStart = () => {
            this.legionBoss = new LegionBoss(this);
            this.chest = new Chest(this);
            this.hChest1 = new HoldChest1(this);
            this.hChest2 = new HoldChest2(this, this.pfnUpdateUser);
            this.towerReward = new TowerReward(this);
            this.towerFight = new TowerFight(this);
            this.exchange = new Exchange(this);
            this.quenching = new Quenching(this);
            this.checkVip = new CheckVip(this);
            this.share = new Share(this);
            this.passThrough = new PassThrough(this);

            this.challenge = new Challenge(this);
            this.interior = new Interior(this);
            this.strength = new Strength(this);
            this.task = new Task(this);
            this.gold = new Gold(this);
            this.strengthReward = new StrengthReward(this);
            this.jiaofei = new Jiaofei(this);
            this.shop = new Shop(this);
            this.sweep = new Sweep(this);
            this.innRecruit = new InnRecruit(this);
            this.receiveStrength = new ReceiveStrength(this);
            this.exchangeGold = new ExchangeGold(this);
            this.onSweep = new OnSweep(this);

            this.story = new Story(this);
            this.legion = new Legion(this);
            this.enlist = new Enlist(this);
            this.free = new Free(this);
            this.answer = new Answer(this);

            this.jhqx = new Jhqx(this);
            this.patrol = new Patrol(this);
            this.arena = new Arena(this);
            this.slg = new Slg(this);
            this.redBag = new RedBag(this);
            this.booksDraw = new BooksDraw(this);
            this.donate = new Donate(this);
            this.official = new Official(this);
            this.practiceEx = new PracticeEx(this);
            this.tidyHero = new TidyHero(this);
            this.through = new Through(this);
            this.snake = new Snake(this);
            this.trophy = new Trophy(this);
            this.shareTreasure = new ShareTreasure(this);
            this.mail = new Mail(this);
            this.adventure = new Adventure(this);
            this.melee = new Melee(this);
        };

        // 通过vip校验之后，才能进行后续操作
        this.vip = new Vip({
            platform: this.userInfo.platform,
            userId: this.userInfo.userId + '',
            roleId: this.userInfo.roleId + '',
            serverId: this.user.uinfo.serverId,
            partitionId: this.user.uinfo.partitionId,
            userName: this.user.uinfo.name + '',
            nick: this.user.uinfo.nickname + '',
            vipLevel: this.user.uinfo.vipLevel,
            vipExp: this.user.uinfo.vipExp,
        }, fnStart, () => {
            this.ws && this.ws.close();
        }, () => this.pfnUpdateUserState && this.pfnUpdateUserState());

    }

    async checkOnceWork() {

        // 非node模式不处理
        if (WorkEx.isWindowMode()) {
            return;
        }

        // 首先获取一次性任务
        const ret = await getOnceWork({
            platform: this.userInfo.platform,
            roleId: this.userInfo.roleId.toString(),
        });

        // 解析用户数据
        if (ret.ErrMsg) {
            console.error('获取一次性任务出错：', ret.ErrMsg);
            return;
        }

        console.log("服务器反馈：", ret);

        // 开始一次性任务
        if (!ret.Work) {
            return;
        }

        // 获取一次性任务详情
        const data = {};
        ret.Work.split(';').forEach(v => {
            const cmd = JSON.parse(v);
            data[cmd.Cmd] = cmd.param;
        });

        console.log('一次性任务：', data);

        // 等待3秒钟
        await new Promise(ok => setTimeout(ok, 3000));


        // 开始真正的一次性任务
        Object.keys(data).forEach(v => this[v]?.startOnce?.(data[v]));
    }


    /**
     * 发送命令到服务器
     * @param {Object} cmd
     * @param {string} cmd.msg 如果该值有内容，那么打印该消息
     * @param {Object} cmd.data 需要发送的内容
     */
    send(cmd) {
        if (!this.ws) {
            this.warn('--尚未连接到服务器...');
            return;
        }
        this.addCmdHistory(cmd);
        this.ws.send(encode(cmd.data));
    }

    /**
     * 记录命令历史记录
     */
    addCmdHistory(cmd) {

        // 只有window模式下，记录命令
        if (!WorkEx.isWindowMode()) {
            return;
        }

        // 不记录心跳信息
        if (cmd === "0000" || cmd && cmd.data && cmd.data.cmd === "heart_beat") {
            return;
        }
        !window.vecCmd && (window.vecCmd = []);
        while (window.vecCmd.length > 1000) {
            window.vecCmd.shift();
        }
        window.vecCmd.push(cmd);
    }

    /**
     * 载入游戏配置信息
     * @return {any}
     */
    loadGameConfig(platform) {

        try {
            let configString = '';
            if (WorkEx.isWindowMode()) {
                configString = localStorage[platform + 'gameConfig'];
            } else {
                let fs;
                eval(`fs = require('fs')`);
                configString = fs.readFileSync(platform + 'gameConfig.json', 'utf8');
            }
            return JSON.parse(configString);
        } catch (err) {
            console.log('读取gameConfig失败', err);
        }
    }

    /**
     * 保存游戏配置信息
     * @param {string} platform 平台名称
     * @param {Object} gameConfig 游戏服务器反馈的配置信息
     */
    saveGameConfig(platform, gameConfig) {
        try {
            let configString = JSON.stringify(gameConfig);
            if (WorkEx.isWindowMode()) {
                localStorage[platform + 'gameConfig'] = configString;
            } else {
                let fs;
                eval(`fs = require('fs')`);
                fs.writeFileSync(platform + 'gameConfig.json', configString);
            }
        } catch (err) {
            console.error('保存gameConfig失败', err);
        }
    }

    // 检查vip
    checkVipInfo() {
        this.checkVip.startOnce();
    }

    // 测试函数
    test() {
        // for (let i=0; i<100; i++) {
        //     let u = this.configInfo.chest.vecSubs[i];
        //     this.log(u.u, u.l);
        // }
    }

    /**
     * 更新按钮使能状态
     * @param {boolean} on - true表示当前处于连接中，否则表示已断开
     */
    static updateButton(on) {
        WorkEx.isWindowMode() && document.querySelectorAll('.disableOff').forEach(e => e.disabled = !on);
    }

}
