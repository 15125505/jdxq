import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Legion extends Base {

    constructor(work) {
        super('军团', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Legion');
    }

    workStart() {

        // 当前参数信息
        let param = {
            canSign: false,    // 是否可以签到
            canGetTask: false,  // 是否可以获取任务
            level: 0,           // 军团等级
            nextDelay: 86400,   // 下次执行时间
            taskIds: [],        // 需要完成的任务Id
            needUpIds: [],      // 需要升级军机处的任务Id
        };

        // 如果没有当前没有军团，无需处理
        if (!this.cmd.legionId) {
            this.err("当前并没有加入任何军团！");
            this.workFinished(86400);
            return;
        }

        // 任务流程
        new Promise((ok, err) => {
            this.getPanel(ok, err, param);
        }).then(() => new Promise((ok, err) => {
            this.sign(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            if (param.level < 8) {
                this.log("当前军团等级只有", param.level, "级，无需检查军机处。");
                ok();
                return;
            }
            this.junjichuIn(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.getTask(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.taskUp(ok, err, param);
        })).then(() => new Promise((ok, err) => {
            this.taskStart(ok, err, param);
        })).then(() => {
            this.workFinished(param.nextDelay);
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });

    }

    // 获取军团面板信息
    getPanel(ok, err, param) {
        this.cmd.doGetPanelInfo((result) => {
            param.canSign = getTime() > result.selfInfo.signRewardTs;
            param.level = result.legion.level;
            ok();
        }, () => err("获取军团信息超时"))
    }

    // 执行军团签到
    sign(ok, err, param) {
        let cur = new Date(getTime() * 1000);
        param.nextDelay = 86450 - cur.getHours() * 3600 - cur.getMinutes() * 60 - cur.getSeconds() + Math.floor(100 * Math.random());
        if (!param.canSign) {
            ok();
            return;
        }
        if (cur.getHours() < 10) {
            this.info("当前时间不到10点，暂时不签到。。。");
            param.nextDelay = 3600;
            ok();
            return;
        }
        this.cmd.doGetSignReward(() => {
            this.info("完成军团签到");
            ok();
        }, () => err("执行军团签到超时"));
    }

    // 进入军机处
    junjichuIn(ok, err, param) {
        this.cmd.doJunjichuIn((result) => {
            param.canGetTask = result.junjichu.taskNum === 0 && result.junjichu.rTime === 0;
            if (param.canGetTask) {
                ok();
                return;
            }
            this.onJunjichu(result.junjichu, param);
            ok();
        }, () => err("查看军机处超时"));
    }

    // 处理军机处任务
    onJunjichu(junjichu, param) {
        this.checkTime(junjichu.rTime, param);
        junjichu.tasks.forEach(v => {
            if (v.start) {
                this.checkTime(v.rTime, param);
            } else {
                this.checkTime(getTime() + v.hour * 3600, param);
                param.taskIds.push(v.id);
                v.up && param.needUpIds.push(v.id);
            }
        });
    }

    // 根据时间戳更新当前时间
    checkTime(taskTime, param) {
        if (taskTime < getTime()) {
            return;
        }
        let delay = taskTime - getTime() + Math.floor(50 * Math.random());
        if (delay < param.nextDelay) {
            param.nextDelay = delay;
        }
    }

    // 领取任务
    getTask(ok, err, param) {
        if (!param.canGetTask) {
            ok();
            return;
        }
        this.cmd.doJunjichuTaskGet(result => {
            this.onJunjichu(result.junjichu, param);
            ok();
        }, () => err("领取军机处任务超时"));
    }

    // 升级任务
    taskUp(ok, err, param) {
        ok();
    }

    // 执行任务
    taskStart(ok, err, param) {

        // 如果没有需要执行的任务，直接返回
        if (param.taskIds.length === 0) {
            ok();
            return;
        }

        // 取出一个任务并执行
        let taskId = param.taskIds.shift();
        this.cmd.doJunjichuTaskStart(taskId, result => {
            this.info(`开始执行一个${result.junjichu.star}星任务...`);
            this.checkTime(result.junjichu.rTime, param);
            if (param.taskIds.length === 0) {
                ok();
                return;
            }
            setTimeout(() => this.taskStart(ok, err, param), 1000);
        }, () => err("执行军机处任务超时"));
    }

}
