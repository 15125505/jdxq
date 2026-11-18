import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Patrol extends Base {

    constructor(work) {
        super('城门巡逻', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Patrol');
    }

    /**
     * 当前这轮任务开始
     */
    workStart() {
        this.realWork().catch(e => {
            this.err('出现错误：', e);
            this.workFinished(300);
        });
    }

    async realWork() {

        // 用户参数
        let param = {
            state: 0,   // 1.可以巡逻 2.已经有boss出现 3.需要等待冷却
            nextDelay: 0,   // 下次执行的时间
        };

        // 查看城门状态
        const result = await new Promise((ok, err) => this.cmd.do_inMyTown(res => ok(res), () => err('查看城门状态超时')));

        // 如果当前不可以巡逻
        if (result.patrol.patrol === 3) {
            this.workFinished(result.patrol.nextPatrolTime - getTime());
            return;
        }

        // 如果当前可以巡逻
        if (result.patrol.patrol === 1) {
            this.info('开始巡逻...');
            const result2 = await new Promise((ok, err) => this.cmd.do_executePatrol(res => ok(res), () => err('城门巡逻超时')));
            this.nextDelay(0);
            this.workFinished();
            return;
        }

        // 如果当前有boss出现
        if (result.patrol.patrol === 2) {

            // 检查当前可用的体力
            const result3 = await new Promise((ok, err) => this.cmd.doStrengthInfo(res => ok(res), () => err('获取当前体力超时')));
            const curStrength = result3.datamergeIncr.user.user_strength;
            const minStrength = this.work.configInfo.boss?.strength ?? 100;
            let count = Math.floor((curStrength - minStrength) / 10);
            if (count <= 0) {
                this.info('当前体力为', curStrength, '，设置的打boss保留的体力值', minStrength, '，当前体力不足以打boss');
                this.workFinished(300);
                return;
            }
            if (count > 20) {
                count = 20;
            }

            // 查看小镇数据
            const result4 = await new Promise((ok, err) => this.cmd.getTownInfo(this.user.getRoleId(), res => ok(res), () => err('查看boss信息超时')));
            const bossId = result4.town.bossId?.[0]?.uniqueBossId;
            if (!bossId) {
                this.warn('门口的Boss不见了！');
                this.nextDelay(0);
                this.workFinished();
                return;
            }

            // 获取阵容
            const result5 = await new Promise((ok, err) => this.cmd.getAllTroop(res => ok(res), () => err('获取战斗阵容超时')));
            const troop = result5.troop.rob_defense_0;
            const tacticId = this.user.uinfo.userTactic.rob_defense_0;

            // 开始挑战boss
            this.info('开始挑战城门boss！');
            await new Promise((ok, err) => this.cmd.do_sweepBoss(bossId, this.user.getRoleId(), count, troop, tacticId, res => ok(res), () => err('挑战boss超时！')));
            this.nextDelay(0);
            this.workFinished();
            return;
        }

        this.workFinished(300);
    }
}
