// 自动比武

/**
 * 查看日常任务
 * send = {
 *     "cmd": "task",
 *     "params": {
 *         "taskType": 1,
 *         "action": "get_list",
 *         "gameId": 129,
 *         "userId": 1000001,
 *         "roleId": 1000001,
 *         "clientId": "H5_2.0_weixin.weixin.0-hall129.weixin.hulaisg"
 *     }
 * };
 *
 日常任务反馈

 */

import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Arena extends Base {

    constructor(work) {
        super('比武场', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Arena');
    }

    /**
     * 一次性任务
     */
    once(param) {
        console.log('开始一次性任务：', param);
        this.onceWork(param.count).catch(e => this.err(`出现错误：`, e))
    }


    async onceWork(count) {
        for (let i = 0; i < count; i++) {

            // 检查时间
            const now = new Date(getTime() * 1000);
            if (now.getDay() === 0) {
                this.err("为了游戏的公平，周日无法使用本功能！");
                break;
            }

            // 获取战斗阵容信息
            const troop = await new Promise((ok, err) => this.cmd.getAllTroop(result => ok(result?.troop), () => err('获取战斗阵容超时')));

            // 执行战斗
            const result = await new Promise((ok, err) => {
                this.cmd.do_arena_battle(
                    troop.defense,
                    this.user.uinfo.userTactic?.defense ?? '',
                    {
                        "name": "米兰",
                        "head": "https://resource.example.invalid/REDACTED",
                        "userId": 0,
                        "towerLevel": 20,
                        "userLevel": 20,
                        "fp": 103473,
                        "scores": 1000,
                        "userInfo": {},
                        "battleCost": 1,
                        "type": "one"
                    }, result => ok(result), () => err('获取战斗结果超时'));
            });
            this.info('比武场战斗结果：', result.combatResult ? '胜利' : '失败', "得分：", result.scoreChg);
        }
        this.onceWorkFinished();
    }

    workStart() {
        this.realWork().catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        // 首先检查时间
        let tmNow = new Date(getTime() * 1000);
        const randomDelay = Math.floor(Math.random() * 60);
        if (tmNow.getHours() < 8) {
            this.info('当前不在比武时段！');
            this.workFinished(8 * 3600 - tmNow.getHours() * 3600 - tmNow.getMinutes() * 60 - tmNow.getSeconds());
            return;
        } else if (tmNow.getHours() >= 22) {
            this.info('当前不在比武时段！');
            this.workFinished(8 * 3600 + 86400 + randomDelay - tmNow.getHours() * 3600 - tmNow.getMinutes() * 60 - tmNow.getSeconds());
            return;
        }


        // 首先检查每日任务的比武是否完成
        const getListResult = await new Promise((ok, err) => {
            this.cmd.do_get_list(1, result => ok(result), () => err("获取每日任务完成情况超时"));
        });

        // 获取比武场情况
        const taskInfo = getListResult?.datamerge?.task_1?.find(v => v.todo === 'pvp_one_rank');
        if (!taskInfo) {
            await Promise.reject('获取比武状态信息失败');
            return;
        }

        // 如果每日比武任务没有完成，那么执行比武，比武次数为当前剩余次数
        for (let i = taskInfo.progress; i < 3; i++) {

            // 获取战斗阵容信息
            const troop = await new Promise((ok, err) => this.cmd.getAllTroop(result => ok(result?.troop), () => err('获取战斗阵容超时')));

            // 执行战斗
            const result = await new Promise((ok, err) => {
                this.cmd.do_arena_battle(
                    troop.defense,
                    this.user.uinfo.userTactic?.defense ?? '',
                    {
                        "name": "米兰",
                        "head": "https://resource.example.invalid/REDACTED",
                        "userId": 0,
                        "towerLevel": 20,
                        "userLevel": 20,
                        "fp": 103473,
                        "scores": 1000,
                        "userInfo": {},
                        "battleCost": 1,
                        "type": "one"
                    }, result => ok(result), () => err('获取战斗结果超时'));
            });
            this.info('比武场战斗结果：', result.combatResult ? '胜利' : '失败', "得分：", result.scoreChg);
        }

        // 如果每日比武任务已经完成，那么第二天凌晨再次重试
        tmNow = new Date(getTime() * 1000);
        this.log('今天比武已经完成，明天8点后随机1分钟内进行下一次检查');
        this.workFinished(8 * 3600 + 86400 + randomDelay - tmNow.getHours() * 3600 - tmNow.getMinutes() * 60 - tmNow.getSeconds());
    }
}
