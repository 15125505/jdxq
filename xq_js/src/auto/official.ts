// Create by maintainer
// Description: 中军帐功能
// Date: 2023-08-12 18:02


import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";
import * as pako from 'pako';
import {getTime, randomRangeInt} from "../utils/tool";

export class Official extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('官职任务（比武、点金）', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Official');
    }


    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        // 获取官职任务信息
        const info = await new Promise<any>((ok, err) => this.cmd.do_official_position_get_info((result: any) => ok(result), () => err('获取官职任务信息超时')));
        console.log('官职任务信息：', info);

        // 如果有比武任务，那么就去完成比武任务
        const fightTask = info.daily?.find(v => v.name.includes('比武'));
        if (fightTask?.progress < fightTask?.total) {

            this.info('当前需要比武：', fightTask.total - fightTask.progress, '次');

            // 获取战斗阵容信息
            const troop = await new Promise<any>((ok, err) => this.cmd.getAllTroop(result => ok(result?.troop), () => err('获取战斗阵容超时')));
            for (let i = fightTask.progress; i < fightTask.total; i++) {

                // 执行战斗
                const result = await new Promise<any>((ok, err) => {
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
        }


        // 如果有点金任务，那么就去完成点金任务
        const goldTask = info.daily?.find(v => v.name.includes('点金'));
        if (goldTask) {
            for (let i = goldTask.progress; i < goldTask.total; i++) {
                await new Promise<any>((ok, err) => this.cmd.do_exchange_gold((result: any) => ok(result), () => err('点金超时')));
                this.info('点金成功！');
            }
        }

        this.info('今日比武和点金日常已经完成！');
        this.nextDay(randomRangeInt(0, 60));
    }

}
