/**
 * 自动采矿模块
 */
import {Base} from "./base";

export class Jiaofei extends Base {

    /**
     * 构造函数
     */
    constructor(work) {
        super('剿匪', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        let param = work.configInfo.jiaofei;
        if (param.maxStrength === 10000) {
            this.err("当前并未进行合理的剿匪设置，剿匪已停止。如需自动剿匪请先进行相关设置。")
        } else {
            this.startOnSet('Jiaofei');
        }
    }

    /**
     * 刚刚配置完成后的消息响应
     */
    onConfigOK() {
        if (this.isWorking) {
            this.startNow();
        } else {
            this.start();
        }
    }


    workStart() {

        // 相关参数
        let param = {
            fightCount: 0,  // 需要消灭的匪徒个数（根据体力计算）
            vecUser: [],    // 满足要求的目标用户
            vecTarget: [],  // 需要击败的匪徒列表
            cfg: this.work.configInfo.jiaofei,
        };

        new Promise((ok, err) => {
            this.getFightCount(ok, err, param);
        }).then(() => new Promise((ok, err) => {
            this.getTroop(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.getFriend(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.getUser(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.fightInUser(ok, err, param);
        })).then(() => {
            this.workFinished(3600);
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    /**
     * 获取当前需要战斗的次数
     */
    getFightCount(ok, err, param) {
        this.cmd.doStrengthInfo((result) => {
            try {
                let strength = result.datamergeIncr.user.user_strength;
                param.fightCount = Math.floor((strength - param.cfg.maxStrength) / 10);
                param.fightCount < 0 && (param.fightCount = 0);
                this.info('设置保留体力为', param.cfg.maxStrength, '当前体力', strength, '需要剿匪', param.fightCount, '次。');
                let strTarget = '';
                param.cfg.fei1 && (strTarget += '黄巾兵  ');
                param.cfg.fei2 && (strTarget += '山贼 ');
                param.cfg.fei3 && (strTarget += '流寇');
                this.info(`当前剿匪目标：<b>${strTarget}</b>，好友盗贼不低于${param.cfg.friendFeiLevel}级，陌生人盗贼不低于${param.cfg.feiLevel}级`);
                ok();
            } catch (e) {
                err('获取体力信息失败');
            }
        }, () => err('获取体力信息超时'));
    }

    // 获取战斗阵容
    getTroop(ok, err, param) {
        if (param.fightCount === 0) {
            ok();
            return;
        }
        this.cmd.getAllTroop((result) => {
            param.troop = result.troop;
            ok();
        }, () => err('获取战斗阵容超时'));
    }

    // 获取好友列表
    getFriend(ok, err, param) {
        if (param.fightCount <= 0) {
            ok();
            return;
        }
        this.cmd.doGetFriend(result => {
            Object.keys(result.datamerge.friends).forEach(k => {
                let v = result.datamerge.friends[k];
                v.uid > 0 && v.level + 5 >= param.cfg.friendFeiLevel && param.vecUser.push({
                    userId: v.uid,
                    name: v.name,
                    userLevel: v.level,
                    isFriend: true,
                });
            });
            param.vecUser.sort((a, b) => b.userLevel - a.userLevel);
            ok();
        }, () => err('获取好友列表超时'));
    }

    // 获取试炼排行榜
    getUser(ok, err, param) {
        if (param.fightCount <= 0) {
            ok();
            return;
        }
        let vec = [];
        this.cmd.doGetTowerLeaderboard(result => {
            result.users.forEach(v => {
                v.uid > 0 && v.level + 5 >= param.cfg.feiLevel && vec.push({
                    userId: v.uid,
                    name: v.name,
                    userLevel: v.level,
                    isFriend: false,
                });
            });
            vec.sort((a, b) => b.userLevel - a.userLevel);
            param.vecUser = param.vecUser.concat(vec);
            ok();
        }, () => err('获取试炼排行榜超时'));
    }

    feiName(typeId) {
        switch (typeId) {
            case 'Hero_HuangJinBing_Qun':
                return '黄巾兵';
            case 'Hero_ShanZei_Qun':
                return '山贼';
            case 'Hero_LiuKou_Qun':
                return '流寇';
            default:
                return '未知盗匪';
        }
    }

    // 在用户列表中找到需要的目标并进行战斗
    fightInUser(ok, err, param) {

        if (param.fightCount <= 0) {
            ok();
            return;
        }
        if (param.vecUser.length === 0) {
            this.err('已经在所有的好友和排行榜中进行了寻觅，但没找到足够符合要求的盗匪！');
            ok();
            return;
        }

        // 消灭该用户家里的盗匪
        let user = param.vecUser.shift();

        // 获取用户家里的盗匪
        new Promise((ok1, err1) => {
            this.cmd.getTownInfo(user.userId, (result) => {
                try {
                    let userType = user.isFriend ? '好友' : '陌生人';
                    let minLevel = user.isFriend ? param.cfg.friendFeiLevel : param.cfg.feiLevel;
                    let monster = result.town.monster;
                    monster.length === 0 && this.log(user.userLevel, '级', userType, '(', user.name, ')家没有盗贼...');
                    param.vecTarget = [];
                    for (let i = 0; i < monster.length; i++) {
                        if (param.fightCount <= 0) {
                            continue;
                        }
                        let m = monster[i];
                        if (m.typeId === 'Hero_HuangJinBing_Qun' && !param.cfg.fei1 ||
                            m.typeId === 'Hero_ShanZei_Qun' && !param.cfg.fei2 ||
                            m.typeId === 'Hero_LiuKou_Qun' && !param.cfg.fei3) {
                            this.log(user.userLevel, '级', userType, '(', user.name, ')家的', this.feiName(m.typeId), '兵种不符，跳过。');
                            continue;
                        }
                        if (m.level < minLevel) {
                            this.log(user.userLevel, '级', userType, '(', user.name, ')家的', m.level, "级", this.feiName(m.typeId), '等级太低，跳过。');
                            continue;
                        }
                        param.fightCount--;
                        param.vecTarget.push({
                            userId: user.userId,
                            mType: m.typeId,
                            level: m.level,
                            monsterId: m.monsterId,
                        });
                        this.info('在', user.userLevel, '级', userType, '(', user.name, ')家中找到', m.level, '级', this.feiName(m.typeId), '一个。');
                    }
                    ok1();
                } catch (e) {
                    err1('查看好友(', user.name, ')家的盗匪信息失败');
                }
            });
        }).then(() => new Promise((ok1, err1) => {
            this.fight(ok1, err1, param);
        })).then(() => {
            setTimeout(() => this.fightInUser(ok, err, param), 3000);
        }).catch(e => err(e));
    }


    // 执行战斗
    fight(ok, err, param) {

        // 有剿匪目标时才需要剿匪
        if (param.vecTarget.length <= 0) {
            ok();
            return;
        }

        // 执行剿匪
        let target = param.vecTarget.shift();
        this.cmd.doKillMonster(target.userId, target.mType, param.troop.attack, target.monsterId, this.user.uinfo.userTactic ? this.user.uinfo.userTactic.attack : '', (result) => {
            try {
                this.info('和', target.level, '级', this.feiName(target.mType), '的战斗', result.combatResult ? '胜利' : '失败', '剩余体力：', result.datamergeIncr.user.user_strength);
            } catch (e) {
                this.warn('和', target.level, '级', this.feiName(target.mType), '的战斗出现错误', e);
            }
            setTimeout(() => this.fight(ok, err, param), 2000);
        }, () => {
            setTimeout(() => this.fight(ok, err, param), 2000);
        });
    }

}
