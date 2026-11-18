import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Task extends Base {

    constructor(work) {
        super('任务', null, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.start();
    }

    workStart() {
        let param = {};
        new Promise((ok, err) => {
            this.info('检查日常任务...');
            this.cmd.do_get_list(1, result=>{
                ok();
            }, () => err("获取任务信息超时"));
        }).then(() => new Promise((ok, err) => {
            this.info('检查通关文书任务...');
            this.cmd.do_get_week_act_info('passCert', result => {
                ok();
            }, () => err("获取任务信息超时"));
        })).then(() => new Promise((ok, err) => {
            this.info('检查官职任务...');
            this.cmd.do_official_position_get_info(result => {
                // 获取俸禄
                if (result.salary) {
                    this.info('---领取每日俸禄...');
                    this.cmd.do_official_position_get_salary();
                }

                // 获取每日任务
                result.daily.forEach(v => {
                    if (v.state !== 1) {
                        return;
                    }
                    this.info('---完成官位任务：', v.name, '...');
                    this.cmd.do_official_position_get_task_reward(v.id);
                });
                ok();
            }, () => err("获取官位信息超时"));
        })).then(() => new Promise((ok, err) => {
            this.activityReward(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            if (!param.needShare) {
                ok();
                return;
            }
            this.cmd.send(this.user.make_cmd('game', 'share', {"shareId": "task_daily"}));
            setTimeout(() => ok(), 1000);
        })).then(() => {
            let tmNow = new Date(getTime() * 1000);
            let nextDelay = 86400 - tmNow.getHours() * 3600 - tmNow.getMinutes() * 60 - tmNow.getSeconds();
            if (nextDelay > 3600) {
                nextDelay = 3600;
            }
            this.nextDelay(nextDelay);
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    // 检查活跃奖励
    activityReward(ok, err, param) {

        // 检查任务状态
        if (!param.vecActivity) {
            param.vecActivity = [];
            this.info('检查活跃奖励...');
            this.cmd.do_get_list(1, (result) => {

                // 检查分享任务是否需要完成
                param.needShare = false;
                if (result.datamerge && result.datamerge.task_1) {
                    result.datamerge.task_1.forEach(v => v.todo === 'share' && v.state === 0 && (param.needShare = true));
                }

                // 检查哪些活跃奖励已经可以领取
                let weekActivity = result.datamergeIncr.character.weekActivity;
                let dayActivity = result.datamergeIncr.character.dayActivity;
                for (let i = 0; i < result.weekRewards.length; i++) {
                    let node = result.weekRewards[i];
                    if (weekActivity < node.point) {
                        break;
                    }
                    param.vecActivity.push({week: 1, index: i});
                }
                for (let i = 0; i < result.dayRewards.length; i++) {
                    let node = result.dayRewards[i];
                    if (dayActivity < node.point) {
                        break;
                    }
                    param.vecActivity.push({week: 0, index: i});
                }

                // 去掉那些已经领取过的奖励
                result.weekRewardsState.forEach(v => {
                    let index = param.vecActivity.findIndex(vv => vv.week === 1 && vv.index === v);
                    index >= 0 && param.vecActivity.splice(index, 1);
                });
                result.dayRewardsState.forEach(v => {
                    let index = param.vecActivity.findIndex(vv => vv.week === 0 && vv.index === v);
                    index >= 0 && param.vecActivity.splice(index, 1);
                });

                setTimeout(() => this.activityReward(ok, err, param), 1000);
            }, () => err('检查日常任务超时'));
            return;
        }

        // 领取活跃奖励
        if (param.vecActivity.length > 0) {
            let node = param.vecActivity.shift();
            this.info(`领取${node.week ? '周' : '日'}活跃奖励，第${node.index + 1}个...`);
            this.cmd.do_receive_activity_reward(node.week, node.index, (result) => {
                setTimeout(() => this.activityReward(ok, err, param), 1000);
            }, () => err('领取活跃奖励超时'));
            return;
        }

        ok();

    }
}
