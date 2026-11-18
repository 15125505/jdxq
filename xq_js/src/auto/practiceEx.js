import {Base} from "./base";
import {getTime} from "../utils/tool";


export class PracticeEx extends Base {
    constructor(work) {
        super('武神竞技', work.configInfo, work.getRoleInfo());

        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.startOnSet('PracticeEx');
    }

    /**
     * 刚刚配置完成后的消息响应
     */
    onConfigOK() {
        if (this.isWorking) {
            this.startNow();
        } else {
            this.startOnSet('PracticeEx');
        }
    }

    /**
     * 一次性任务
     */
    once(param) {
        console.log('开始一次性任务：', param);
        this.onceWork(param.count).catch(e => this.err(`出现错误：`, e))
    }

    async onceWork(count) {

        // 检查当前阵容是否OK，如果没有配置阵容，那么首先将进行阵容配置
        const rankResult = await new Promise((ok, err) => this.cmd.do_practice_arena_in(result => ok(result), () => err("获取排行榜信息超时")));
        if (!rankResult?.troopEnough) {
            this.info('当前战斗阵容不完整，下面将使用城门防守3阵容设置当前武神阵容...');
            const troops = await new Promise((ok, err) => this.cmd.getAllTroop(result => ok(result), () => err('获取战斗阵容超时')));
            for (let i = 0; i < 3; i++) {
                await new Promise((ok, err) =>
                    this.cmd.do_practice_arena_troop_set(troops.troop[`rob_defense_${i}`], this.user.uinfo.userTactic[`rob_defense_${i}`], i, result => ok(result), () => err(`设置阵容${i + 1}失败`)));
            }
        }

        // 获取防守阵容
        const defence = await new Promise((ok, err) => this.cmd.do_practice_arena_troop_get(this.work.userInfo.roleId, 0, result => ok({
            troops: result.troops, tactic: result.tactic, fps: result.fps
        }), () => err('获取我方防守阵容超时')));

        // 按照指定次数进行武神任务
        for (let i = 0; i < count; i++) {

            // 检查时间
            const now = new Date(getTime() * 1000);
            if (now.getDay() === 5 && now.getHours() === 22) {
                this.err("赛季结算前1个小时内，自动武神功能暂停使用！");
                break;
            }

            // 刷新武神对手
            const sign = await new Promise((ok, err) => this.cmd.do_practice_arena_mate(result => {
                ok(result?.sign);
            }, () => err('刷新武神竞技超时')));

            // 发起武神战斗
            await new Promise((ok, err) => this.cmd.do_practice_arena_fight(defence.troops, {
                "userId": 0,
                "name": "陈金英",
                "head": "https://resource.example.invalid/REDACTED",
                "userLevel": 30,
                "fp": 1038038,
                "towerLevel": 50,
                "scores": 1000,
                "userInfo": {},
                "battleCost": 3,
                "type": "trial"
            }, defence.tactic, sign, result => {
                if (result.isWin) {
                    this.info('战斗胜利，获得', result.scoreChg, '分，当前敌我积分：', result.targetUserScore, result.userScore);
                } else {
                    this.err('战斗失败，分数', result.scoreChg, '分，当前敌我积分：', result.targetUserScore, result.userScore);
                }
                ok();
            }, () => err('战斗超时')));

            await this.sleep(2);
        }

        this.warn('自动武神已经完成！');
        this.onceWorkFinished();
    }


    /**
     * 当前这轮任务开始
     */
    workStart() {

        // 执行工作
        this.realWork().catch(e => {
            this.err('出现错误：', e);
            this.workFinished(300);
        });
    }

    async realWork() {

        // 检查时间
        const now = new Date(getTime() * 1000);
        if ([6, 7].includes(now.getDay()) || now.getDay() === 5 && now.getHours() >= 23) {
            this.log('当前不是武神有效战斗时间！');
            this.workFinished(3600);
            return;
        }

        // 检查是否已经进行过武神战斗
        const rankResult = await new Promise((ok, err) => this.cmd.do_practice_arena_in(result => ok(result), () => err("获取排行榜信息超时")));
        if (rankResult?.userInfo?.scores !== 1000) {
            this.info('本赛季武神已经参与过战斗，今日不再检查武神。');
            this.nextDay(120 + Math.floor(1000 * Math.random()));
            this.workFinished();
            return;
        }

        // 检查当前阵容是否OK，如果没有配置阵容，那么首先将进行阵容配置
        if (!rankResult?.troopEnough) {
            this.info('当前战斗阵容不完整，下面将使用城门防守3阵容设置当前武神阵容...');
            const troops = await new Promise((ok, err) => this.cmd.getAllTroop(result => ok(result), () => err('获取战斗阵容超时')));
            for (let i = 0; i < 3; i++) {
                await new Promise((ok, err) =>
                    this.cmd.do_practice_arena_troop_set(troops.troop[`rob_defense_${i}`], this.user.uinfo.userTactic[`rob_defense_${i}`], i, result => ok(result), () => err(`设置阵容${i + 1}失败`)));
            }
        }

        // 刷新武神对手
        const sign = await new Promise((ok, err) => this.cmd.do_practice_arena_mate(result => {
            ok(result?.sign);
        }, () => err('刷新武神竞技超时')));

        // 获取防守阵容
        const defence = await new Promise((ok, err) => this.cmd.do_practice_arena_troop_get(this.work.userInfo.roleId, 0, result => ok({
            troops: result.troops, tactic: result.tactic, fps: result.fps
        }), () => err('获取我方防守阵容超时')));

        // 发起武神战斗
        await new Promise((ok, err) => this.cmd.do_practice_arena_fight(defence.troops, {
            "userId": 0,
            "name": "陈金英",
            "head": "https://resource.example.invalid/REDACTED",
            "userLevel": 30,
            "fp": 1038038,
            "towerLevel": 50,
            "scores": 1000,
            "userInfo": {},
            "battleCost": 3,
            "type": "trial"
        }, defence.tactic, sign, result => {
            if (result.isWin) {
                this.info('战斗胜利，获得', result.scoreChg, '分，当前敌我积分：', result.targetUserScore, result.userScore);
            } else {
                this.err('战斗失败，分数', result.scoreChg, '分，当前敌我积分：', result.targetUserScore, result.userScore);
            }
            ok();
        }, () => err('战斗超时')));

        this.nextDay(120 + Math.floor(1000 * Math.random()));
        this.workFinished();
    }

}
