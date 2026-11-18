import {Base} from "./base";
import {getTime} from "../utils/tool";

export class LegionBoss extends Base {

    constructor(work) {
        super('军团BOSS', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('LegionBoss');
    }

    workStart() {

        // 当前参数信息
        let param = {
            bossNo: 0,
            bossInfo: null,
            cfg: this.work.configInfo.legionBoss,
        };
        if (!param.cfg) {
            param.cfg = {count: 2};
        }
        this.log("当前设置挑战军团boss的次数：", param.cfg.count);

        // 如果没有当前没有军团，无需处理
        if (!this.cmd.legionId) {
            this.err("当前并没有加入任何军团！");
            this.workFinished(86400);
            return;
        }

        // 153的两个小团不允许打boss
        if ((this.user.uinfo.serverId === 153
            || this.user.uinfo.serverId === 145 || this.user.uinfo.serverId === 150)
            && (this.cmd.legionId === 72218
                || this.cmd.legionId === 72944
                || this.cmd.legionId === 66446
                || this.cmd.legionId === 79819
                || this.cmd.legionId === 83427
                || this.cmd.legionId === 84798
                || this.cmd.legionId === 84994
                || this.cmd.legionId === 84803
                || this.cmd.legionId === 88332
                || this.cmd.legionId === 67004  // 150小团
            )) {
            this.info('跳过不需要打的军团BOSS！');
            this.workFinished(3600);
            return;
        }

        // 任务流程
        new Promise((ok, err) => {
            this.getBossId(ok, err, param);
        }).then(() => new Promise((ok, err) => {
            this.fight(ok, err, param);
        })).then(() => {
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });

    }

    // 获取bossId
    getBossId(ok, err, param) {
        this.cmd.do_get_all_legion_boss(result => {
            param.bossNo = result.curStage;
            ok();
        }, () => err('获取军团BOSS列表失败'));
    }

    // 打军团boss
    fight(ok, err, param) {

        // 查看boss信息
        if (!param.bossInfo) {
            this.cmd.do_get_attack_boss_info(param.bossNo, result => {
                param.bossInfo = {
                    reviveStamp: result.reviveStamp,
                    reviveConsume: result.reviveConsume,
                    canFight: result.canFight,
                };
                this.fight(ok, err, param);
            }, () => err('获取军团BOSS状态失败'));
            return;
        }

        // 计算当前是第次
        let count = 1;
        if (param.bossInfo.reviveConsume === 0) {
            count = 2;
        } else if (param.bossInfo.reviveConsume === 40) {
            count = 3;
        } else if (param.bossInfo.reviveConsume === 80) {
            count = 4;
        }

        // 如果不能打boss，或者冷却时间大于0
        if (!param.bossInfo.canFight || count > param.cfg.count) {
            this.nextDelay(param.bossInfo.reviveStamp - getTime());
            ok();
            return;
        }

        // 获取战斗阵容
        if (!param.troop) {
            this.cmd.getAllTroop(result => {
                param.troop = result.troop['rob_defense_0'];
                this.fight(ok, err, param);
            }, () => err('获取战斗阵容超时'));
            return;
        }

        // 确定战斗阵容
        if (!param.troop || param.troop.length === 0) {
            this.warn('当前并没有设置左边城门防守阵容，无法挑战军团BOSS！');
            this.nextDelay(3600);
            ok();
            return;
        }
        let tacticId = '';
        if (this.user.uinfo.userTactic && this.user.uinfo.userTactic['rob_defense_0']) {
            tacticId = this.user.uinfo.userTactic['rob_defense_0'];
        }

        // 开始挑战boss
        this.info('开始挑战第', param.bossNo, '个军团BOSS...');
        this.cmd.do_legion_boss_fight(
            param.bossNo,
            param.troop,
            tacticId,
            result => {
                let output = 0;
                result.battleData.output.troop2.forEach(v => v && (output += v.beAttacked));
                this.info(`与军团BOSS鏖战 ${result.battleData.record.rounds.length} 轮，输出 ${(output / 1000000).toFixed(2)}M 伤害。`);
                param.bossInfo = null;  // 强制让下次进来的时候重新检查boss信息
                this.fight(ok, err, param);
            }, () => err('挑战军团BOSS超时'));
    }


}
