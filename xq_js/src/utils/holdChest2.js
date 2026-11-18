import {Base} from "../auto/base";

/**
 * 挖矿模块之更新属臣库模块
 */

export class HoldChest2 extends Base {

    /**
     * 构造函数
     * @param {WorkEx} work
     * @param {function} pfnUpdateUser
     */
    constructor(work, pfnUpdateUser) {
        super('用户库', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.pfnUpdateUser = pfnUpdateUser;
    }

    /**
     * 开始一次性任务
     * @param param
     */
    once(param) {
        param.vecUser = [];
        param.detectCount = 0;
        new Promise((ok, err) => {
            this.getFriend(ok, err, param);
        }).then(() => new Promise((ok, err) => {
            this.getRankUser(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.getSubs(ok, err, param);
        })).then(() => {
            this.onceWorkFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.onceWorkFinished();
        });
    }

    // 获取好友列表
    getFriend(ok, err, param) {
        if (!param.findInFriend) {
            ok();
            return;
        }
        this.cmd.doGetFriend(result => {
            Object.keys(result.datamerge.friends).forEach(k => {
                let v = result.datamerge.friends[k];
                this.addUser(param, v.uid, v.name, v.level);
            });
            ok();
        }, () => err('获取好友列表超时'));
    }

    // 获取试炼排行榜
    getRankUser(ok, err, param) {
        if (!param.findInRank) {
            ok();
            return;
        }
        this.cmd.doGetTowerLeaderboard(result => {
            result.users.forEach(v => this.addUser(param, v.uid, v.name, v.level));
            ok();
        }, () => err('获取试炼排行榜超时'));
    }

    // 获取属臣列表
    getSubs(ok, err, param) {

        // 每发现50个用户，就保存一下
        param.detectCount++;
        if (param.detectCount > 50) {
            this.saveUser(param.vecUser);
            param.detectCount = 0;
        }

        // 找到一个需要去确认属臣的用户
        let user = param.vecUser.find(u => !u.isChecked);
        if (!user) {
            let count = this.saveUser(param.vecUser);
            this.info('已经对符合要求的用户进行了遍历，本次属臣库更新累计发现用户个数：', count);
            ok();
            return;
        }

        // 如果用户没有等级，那么首先需要更新等级
        new Promise((ok1, err1) => {
            if (user.level) {
                ok1();
                return;
            }
            this.cmd.getTownInfo(user.userId, (result) => {
                user.level = result.town.user.level;
                this.info('(', result.town.user.name, ') 等级为:', user.level);
                ok1();
            }, () => err1('获取用户等级超时'));
        }).then(() => {
            //console.log('开始获取用户属臣：', user.name, user.userId);
            this.cmd.getSubs(user.userId, (result) => {
                user.isChecked = true;
                this.log(`(${user.name})有${(result.lord && result.lord.uid) ? '主公和' : ''}${result.subordinate.length}个属臣...`);
                result.subordinate.forEach(u => this.addUser(param, u.uid, u.name, 0, true));
                param.findInLord && result.lord && result.lord.uid && this.addUser(param, result.lord.uid, result.lord.name, 0, true);
                setTimeout(() => this.getSubs(ok, err, param), 5000);
            }, (e) => {
                console.error('获取用户属臣失败：', e);
                err('获取用户属臣超时')
            });
        }).catch(e => err(e));
    }

    // 向用户列表添加一个用户
    addUser(param, uid, name, level, showLog = false) {
        let newAdd = false;
        if (uid <= 0) {
            return newAdd;
        }
        let user = param.vecUser.find(node => node.userId === uid);
        if (!user) {
            user = {userId: uid};
            param.vecUser.push(user);
            newAdd = true;
            showLog && this.info('发现新用户：(', name, ')，当前用户数：', param.vecUser.length);
        }
        user.name = name;
        if (level) {
            user.level = level;
        }
        return newAdd;
    }

    // 保存用户库
    saveUser(vecUser) {
        let vec = [];
        vecUser.forEach(v => v.level > 0 && vec.push({u: v.userId, l: v.level}));
        this.pfnUpdateUser(vec);
        return vec.length;
    }


}
