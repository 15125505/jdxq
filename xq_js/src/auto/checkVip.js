import {Base} from "./base";

export class CheckVip extends Base {

    constructor(work) {
        super('试炼排行榜', null, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    /**
     * 开始一次性任务
     */
    once() {
        let param = {vecUser: []};
        new Promise((ok, err) => {
            this.cmd.doGetTowerLeaderboard((result) => {
                result.users.forEach(v => v.uid > 0 && param.vecUser.push({
                    uid: v.uid,
                    towerLevel: v.towerLevel,
                }));
                ok();
            }, () => err('获取排行榜超时'));
        }).then(() => new Promise((ok, err) => {
            this.checkUserInfo(ok, err, param);
        })).then(() => {
            this.onceWorkFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.onceWorkFinished();
        });
    }

    checkUserInfo(ok, err, param) {
        if (param.vecUser.length === 0) {
            ok();
            return;
        }
        let user = param.vecUser.shift();
        this.cmd.getTownInfo(user.uid, (result) => {
            this.log(result.town.user.uid, '\t', result.town.user.name, '\t', user.towerLevel, '\t', result.town.user.vipLevel, '\t', result.town.user.level);
            setTimeout(() => this.checkUserInfo(ok, err, param), 1000);
        }, errMsg => err(errMsg));
    }

}
