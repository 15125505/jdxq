/**
 * 自动爬塔模块
 */
import {Base} from "./base";
import {WorkEx} from "../work/workEx";

export class TowerFight extends Base {

    constructor(work) {
        super('爬塔', null, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    /**
     * 开始一次性任务
     * @param param
     */
    once(param) {

        new Promise((ok, err) => {
            this.cmd.getAllTroop((result) => {
                param.troop = result.troop;
                ok();
            }, () => err('获取战斗阵容超时'));
        }).then(() => new Promise((ok, err) => {
            this.fightTower(ok, err, param)
        })).then(() => {
            this.onceWorkFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.onceWorkFinished();
        });
    }

    fightTower(ok, err, param) {

        param.isVip = false;
        console.log('当前用户vip状态：', param.isVip);

        // 执行一次爬塔
        if (!this.work.vip.canTower()) {
            this.info("您今天的试炼挑战次数已经用尽，请明天继续或升级为江东小乔VIP。");
            ok();
            return;
        }

        // 检查剩余爬塔次数
        if (param.count-- <= 0) {
            ok();
            return;
        }
        this.log('开始一次爬塔，剩余次数：', param.count);
        if (this.user.uinfo.towerLevel > 68000) {
            this.warn('您已经圆满了，剩下的路，请自己走。');
            ok();
            return;
        }

        this.cmd.doFightTower(param.troop, (result) => {
            if (result.combatResult) {
                this.warn('经过', result.battleData.record.rounds.length, '轮鏖战，挑战试炼塔', this.user.uinfo.towerLevel, "层成功！！！");
                this.user.uinfo.towerLevel = result.level + 1;
            } else {
                this.info('经过', result.battleData.record.rounds.length, '轮鏖战，挑战试炼塔', this.user.uinfo.towerLevel, "层还是失败了...");
            }
            !param.isVip && this.work.vip.addTowerCount(param.count <= 0);

            let timeout = 10000;

            if (param.isVip) {
                timeout = 1000;
            }
            setTimeout(() => this.fightTower(ok, err, param), timeout);
        }, () => err('爬塔超时'))
    }


}
