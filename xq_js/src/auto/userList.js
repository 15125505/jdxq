/**
 * 用户模块
 */
import {Base} from "./base";

export class UserList extends Base {

    constructor(work) {
        super('玩家', null, work.getRoleInfo());
        this.work = work;
        this.cmd = work.cmd;
        this.loadUser();
    }


    /**
     * 从本地缓冲中读取用户
     */
    loadUser() {
        this.vecUser = [];
        let configName = this.getConfigName();
        if (!configName) {
            return;
        }
        let config = localStorage[configName];
        if (!config) {
            return;
        }
        this.vecUser = JSON.parse(config);
    }

    /**
     * 保存用户到本地缓存
     */
    saveUser() {
        let configName = this.getConfigName();
        if (!configName) {
            return;
        }
        this.vecUser.sort((a, b) => a.userLevel - b.userLevel);
        localStorage[configName] = JSON.stringify(this.vecUser);
    }

    /**
     * 获取本地配置名称
     */
    getConfigName() {
        let pID = this.work.user.uinfo.partitionId;
        if (!pID) {
            return;
        }
        return `userOf${this.work.param.platform}${pID}`;
    }

    /**
     * 发现用户
     */
    once() {

        // 参数信息
        let param = {
            refreshCount: 3,
            vecUser: this.vecUser,
        };

        // 开始干活
        new Promise((ok, err) => {
            this.refreshArena(ok, err, param);
        }).then(() => new Promise((ok, err) => {
            this.getFriend(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.getSubUser(ok, err, param);
        })).then(()=>{
            this.saveUser();
            this.info('探测用户结束！');
            this.onceWorkFinished();
        }).catch((e) => {
            this.err('探测过程出现错误：', e);
            this.saveUser();
            this.info('探测用户结束！');
            this.onceWorkFinished();
        });
    }

    /**
     * 刷新竞技场
     */
    refreshArena(ok, err, param) {
        if (param.refreshCount-- === 0) {
            this.info('竞技场刷新结束');
            ok();
            return;
        }
        this.info('刷新竞技场，剩余次数：', param.refreshCount);
        this.cmd.refreshArena((userList) => {

            // 如果列表获取为空，那么很可能是因为不在比武时段
            if (userList.length === 0) {
                this.warn('没能获取到竞技场用户（可能是不在竞技时段）');
                ok();
                return;
            }

            // 发现的用户加入到当前用户列表
            userList.forEach(v => {
                if (v.userId <= 0) {
                    return;
                }
                let user = param.vecUser.find(u => u.userId === v.userId);
                if (user) {
                    user.userLevel = v.userLevel;
                    user.name = v.name;
                    return;
                }
                param.vecUser.push({
                    userId: v.userId,
                    name: v.name,
                    userLevel: v.userLevel,
                });
                this.log(v.userLevel, '级用户(', v.name, ")被发现，累计发现", this.vecUser.length, '个用户');
            });
            setTimeout(() => this.refreshArena(ok, err, param), 2000);
        }, () => ok());
    }

    getFriend(ok, err, param) {
        this.cmd.doGetFriend(result => {
            Object.keys(result.datamerge.friends).forEach(k => {
                let v = result.datamerge.friends[k];
                if (v.uid <= 0) {
                    return;
                }
                let user = param.vecUser.find(u => u.userId === v.uid);
                if (user) {
                    user.userLevel = v.level;
                    user.name = v.name;
                    return;
                }
                this.log('我的好友', v.level, '级用户(', v.name, ")被发现，累计发现", this.vecUser.length + 1, '个用户');
                param.vecUser.push({
                    userId: v.uid,
                    name: v.name,
                    userLevel: v.level,
                });
            });
            ok();
        }, () => err('获取好友列表超时'));
    }

    /**
     * 获取属臣信息
     */
    getSubUser(ok, err, param) {

        // 找到一个需要去确认属臣的用户
        let user = param.vecUser.find(u => !u.isChecked);
        if (!user) {
            this.info('已经找到了所有用户的属臣');
            ok();
            return;
        }
        this.log('开始获取(', user.name, ')的属臣...');

        // 如果用户没有等级，那么首先需要更新等级
        new Promise((ok1, err1) => {
            if (user.userLevel) {
                ok1();
                return;
            }
            this.cmd.getTownInfo(user.userId, (result) => {
                user.userLevel = result.town.user.level;
                this.log('(', user.name, ')等级为:', user.userLevel);
                ok1();
            }, () => err1('获取用户等级超时'));
        }).then(() => {
            this.cmd.getSubs(user.userId, (result) => {
                user.isChecked = true;
                result.subordinate.forEach(u => {
                    if (u.uid <= 0 || param.vecUser.find(v => v.userId === u.uid)) {
                        return;
                    }
                    param.vecUser.push({
                        userId: u.uid,
                        name: u.name,
                        isChecked: false,
                    });
                    this.log('发现新用户: (', user.name, ')的属臣(', u.name, ')，当前用户数：', param.vecUser.length);
                });
                setTimeout(() => this.getSubUser(ok, err, param), 2000);
            }, () => err('获取用户属臣超时'));
        }).catch(e => err(e));
    }
}
