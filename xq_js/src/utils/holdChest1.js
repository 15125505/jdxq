/**
 * 挖矿模块
 */

import {Base} from "../auto/base";
import {getTime} from "./tool";
import {formatTime} from "../pack";

export class HoldChest1 extends Base {

    /**
     * 构造函数
     * @param {WorkEx} work
     */
    constructor(work) {
        super('自动采矿', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        let cfg = work.configInfo.chest;
        this.param = cfg;
        this.info(`当前已探测属臣${cfg.vecSubs.length}个。`);
        if (!cfg.findInFriend && !cfg.findInRank && !cfg.findInSub) {
            this.err("当前并未进行任何采矿设置，采矿已停止。如需自动采矿请先进行相关设置。")
        } else {
            this.startOnSet('HoldChest1');
        }
    }

    /**
     * 刚刚配置完成后的消息响应
     */
    onConfigOK() {
        if (this.isWorking) {
            this.startNow();
        } else {
            this.startOnSet('HoldChest1');
        }
    }

    /**
     * 当前这轮任务开始
     */
    workStart() {

        // 获取配置信息
        let param = {
            findInFriend: this.param.findInFriend,      // 是否在好友中找矿
            findInRank: this.param.findInRank,          // 是否在排行榜中找矿
            findInSub: this.param.findInSub,            // 是否在属臣库中找矿
            vecSubs: this.param.vecSubs,                // 当前属臣库列表
            vecUser: [],    // 当前找矿的备选用户列表
            job: [],        // 当前需要找的矿
        };

        // 属臣列表加入到用户列表中
        if (param.findInSub) {
            param.vecSubs.forEach(v => this.addUser(param, v.u, v.l));
            // this.log("本次将会在", param.vecUser.length, "个属臣库中找矿....");
        }

        // 工作流程
        new Promise((ok, err) => {
            // 首先获取小镇内容，查看需要采矿的内容
            this.getChestInfo(ok, err, param);
        }).then(() => new Promise((ok, err) => {
            // 获取好友列表加入到用户列表中
            this.getFriends(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            // 获取排行榜列表加入到用户列表中
            this.getRanks(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            // 遍历用户并完成占矿
            param.vecUser.sort((a, b) => (a.userLevel - b.userLevel));
            this.holdChest(ok, err, param);
        })).then(() => {
            // 检查所有的矿是不是已经填满了，如果没有，那么10分钟后重试，如果满了2小时之后重试
            this.workFinished(param.job.length ? 600 : 7200);
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }


    // 获取当前矿产信息
    getChestInfo(ok, err, param) {
        param.job = [
            {t: 0, userId: 0},
            {t: 1, userId: 0},
            {t: 2, userId: 0},
        ];

        // 请求小镇信息，并返回结果
        let roleId = this.user.getRoleId();
        this.cmd.getTownInfo(roleId, (result) => {

            // 标识出所有已有的矿
            let myChest = result.town.myChest;
            for (let i = 0; i < myChest.length; i++) {
                let node = myChest[i];
                param.job[node.chestTypeId].userId = node.townId;
                let leftTime = node.timestamp - getTime();
                let leftTimeString = '';
                if (leftTime < 0) {
                    leftTimeString = "(过期)";
                    leftTime = -leftTime;
                }
                (leftTime >= 3600) && (leftTimeString += Math.floor(leftTime / 3600) + '小时');
                (leftTime >= 60) && (leftTimeString += Math.floor(leftTime % 3600 / 60) + '分');
                leftTimeString += Math.floor(leftTime % 60) + '秒';
                this.log('家里已经有了一个',
                    this.work.chest.getChestName(node.chestTypeId),
                    formatTime(node.timestamp * 1000, 'hh:mm:ss'),
                    '可以领取， 剩余时间',
                    leftTimeString);
            }

            // 从需求中删除这些已有的矿
            for (let i = 0; i < param.job.length; i++) {
                if (param.job[i].userId !== 0) {
                    param.job.splice(i--, 1);
                }
            }

            ok();
        }, () => err('查询自家小镇超时'));
    }

    // 获取好友列表并加入到用户列表中
    getFriends(ok, err, param) {

        // 首先检查是否查找好友
        if (!param.findInFriend || param.job.length === 0) {
            ok();
            return;
        }

        // 查询好友列表
        this.cmd.doGetFriend((result) => {
            Object.keys(result.datamerge.friends).forEach(k => {
                let v = result.datamerge.friends[k];
                v.uid > 0 && this.addUser(param, v.uid, v.level);
            });
            this.log("包括自己的好友，本次将会在", param.vecUser.length, "个用户家中找矿....");
            ok();
        }, () => err('获取好友列表超时'));
    }

    // 获取排行榜列表并加入到用户列表中
    getRanks(ok, err, param) {

        // 检查是否查找排行榜
        if (!param.findInRank || param.job.length === 0) {
            ok();
            return;
        }

        // 查询排行榜
        this.cmd.doGetTowerLeaderboard((result) => {
            result.users.forEach(v => v.uid > 0 && this.addUser(param, v.uid, v.level));
            this.log("包括本服试炼排行榜，本次将会在", param.vecUser.length, "个用户家中找矿....");
            ok();
        }, () => err('获取排行榜超时'));
    }

    // 遍历用户并完成占矿
    holdChest(ok, err, param) {

        // 检查所有任务是否已经完成
        if (param.job.length === 0) {
            ok();
            return;
        }

        // 从第一个用户家里，找到需要的矿
        if (param.vecUser.length === 0) {
            this.warn('找遍所有的用户，也没有找够需要的矿！');
            ok();
            return;
        }
        let user = param.vecUser.shift();

        // 在用户家中找找
        this.cmd.getTownInfo(user.userId, (result) => {
                let chest = result.town.chest;
                let name = result.town.user.name;

                // 如果没有矿，直接下一轮继续找
                if (!chest.chestId) {
                    this.log(user.userLevel, '级用户(', name, ')家木有矿...');
                    this.holdChest(ok, err, param);
                    return;
                }

                // 如果矿被人占了，也直接下一轮
                if (Object.keys(chest.currentHolder).length > 0) {
                    this.log(user.userLevel, '级用户(', name, ')家有一个', this.work.chest.getChestName(chest.chestTypeId), "已被人占了。");
                    this.holdChest(ok, err, param);
                    return;
                }

                // 检查是否是需要的矿
                let job2do;
                for (let i = 0; i < param.job.length; i++) {
                    let job = param.job[i];
                    if (job.userId !== 0 || job.t !== chest.chestTypeId) {
                        continue;
                    }
                    param.job.splice(i, 1);
                    job.userId = result.town.user.uid;
                    job.chestId = chest.chestId;
                    job.name = name;
                    this.info(user.userLevel, '级用户(', name, ')家有一个我们想要的', this.work.chest.getChestName(chest.chestTypeId), "！");
                    job2do = job;
                    break;
                }
                if (!job2do) {
                    this.info(user.userLevel, '级用户(', name, ')家的', this.work.chest.getChestName(chest.chestTypeId), "我们不需要...");
                    this.holdChest(ok, err, param);
                    return;
                }

                // 获取战斗阵容
                this.cmd.getAllTroop((result) => {
                    this.log('占据(', job2do.name, ")家的", this.work.chest.getChestName(job2do.t));
                    let troop = result.troop['rob_defense_' + job2do.t];
                    if (!troop) {
                        err("没有设置对应的占矿阵容");
                        return;
                    }
                    this.cmd.holdChest(job2do.userId, result.troop['rob_defense_' + job2do.t], job2do.t, (ret) => {
                        this.work.vip.addChestCount();
                        this.warn('占矿成功，体力变更为：', ret.datamergeIncr.user.user_strength);
                        this.work.chest.startNow();
                        this.startNow();
                        this.holdChest(ok, err, param);
                    }, () => err('占矿失败，可能原因有：\n    1.体力不够；\n    2.没有设置占矿阵容（请前往城门设置防守阵容）;\n    3.占矿阵容中的某个武将正在被其它矿使用（请修改占矿阵容，或者手动放弃正在使用那个武将的矿）'));
                }, () => err('获取战斗阵容超时'));
            }, () => err('查询人家小镇超时')
        );
    }

    // 向目标用户列表中添加数据
    addUser(param, userId, userLevel) {
        !param.vecUser.find(u => u.userId === userId) && param.vecUser.push({userId: userId, userLevel: userLevel});
    }

}
