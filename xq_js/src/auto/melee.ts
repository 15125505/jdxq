// Create by maintainer
// Description: 南征北战
// Date: 2023-08-12 18:02

import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";

export class Melee extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('军团大乱斗', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Melee');
    }

    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        // 获取军团乱斗参数
        const cfg = (this.work.configInfo.melee ?? {
            buyLevel: 1,
            fightType: 0,
            useItem: false,
        }) as data.MeleeParam;

        console.log('军团大乱斗参数：', cfg);

        // 获取军团大乱斗信息
        const info = await this.cmd.do_legion_melee_main_info();
        const groupId = info.mainInfo.groupId;
        if (!groupId) {
            this.warn('当前没有加入军团大乱斗，今日不再检查');
            this.nextDay(0);
            return;
        }

        // 获取身上的匹配令个数
        const name = this.user.getItemName(info.mainInfo.matchItem);
        const count = this.cmd.gameUser[info.mainInfo.matchItem];

        // 检查是否需要进行匹配
        if (!info.mainInfo.challengeLegionId) {

            if (info.mainInfo.freeMatchCnt == 0) {
                if (!cfg.useItem) {
                    this.warn('当前匹配次数已经用完，而且当前设置为不使用匹配令，稍后再试');
                    this.nextDelay(600);
                    return;
                }
                if (!count) {
                    this.warn('当前匹配次数已经用完，而且当前身上没有匹配令，稍后再试');
                    this.nextDelay(600);
                    return;
                }
            }
            this.info('开始进行一次匹配...');
            const match = await this.cmd.do_legion_melee_match(groupId);
            this.info(`匹配成功，对手是${match.matchInfo.target.legion.serverId}区的(${match.matchInfo.target.legion.name})`)
        }

        // 进行军团大乱斗
        while (true) {

            // 进入军团大乱斗
            const enter = await this.cmd.do_legion_melee_reenter(groupId);
            this.warn(`进入挑战，当前增益${enter.matchInfo.self.addition}% 胜利${enter.matchInfo.self.winCnt}次 精力${enter.matchInfo.self.power} 战力${(enter.matchInfo.self.fp / 10000).toFixed(0)}万`);

            // 进行状态购买
            if (!enter.matchInfo.self.addition) {
                const buy = await this.cmd.do_legion_melee_buy_addition(groupId, cfg.buyLevel);
                const vecLevel = ['免费', '60元宝购买50%', '200元宝购买100%'];
                this.info(`选择增益${vecLevel[(cfg.buyLevel - 1) % 3]}成功`);
            }

            const players = enter.matchInfo.target.players;
            players.forEach((player) => {
                this.info(`    对手(${player.name})：等级${player.level} 积分${player.matchScore} 战力${(player.fp / 10000).toFixed(0)}万`)
            });

            // 根据策略选择对手
            let vec = [];
            if (cfg.fightType == 0) {
                this.info('当前策略：在战力比自己低的对手中，选择积分最高的');
                vec = players.filter((player) => player.fp < enter.matchInfo.self.fp).sort((a, b) => b.matchScore - a.matchScore);
            } else {
                this.info('当前策略：在等级比自己低的对手中，选择积分最高的');
                vec = players.filter((player) => player.level < enter.matchInfo.self.level).sort((a, b) => b.matchScore - a.matchScore);

            }

            // 如果没有符合条件的对手，则选择积分最低的对手
            if (!vec.length) {
                this.info('没有符合策略的对手，将选择积分最低的进行挑战');
                vec = players.sort((a, b) => a.matchScore - b.matchScore);
            }

            // 进行一次挑战
            const player = vec[0];
            this.info(`    开始挑战(${player.name})：等级${player.level} 积分${player.matchScore} 战力${(player.fp / 10000).toFixed(0)}万`)
            const fight = await this.cmd.do_legion_melee_challenge(groupId, vec[0].userId);
            if (fight.combatResult) {
                this.info('战斗获胜！');
            } else {
                this.err('不幸战败！');
                break;
            }
            if (fight.winRecoverHp) {
                this.info('连续获胜，获得30%的生命恢复！');
            }

            await this.sleep(3)
        }


        this.nextDelay(1000);
    }
}
