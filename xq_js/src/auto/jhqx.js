import {Base} from "./base";
import {getTime} from "../utils/tool";

export class Jhqx extends Base {


    constructor(work) {
        super('剑会群雄', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.startOnSet('Jhqx');

    }

    workStart() {
        this.realWork().then(delay => this.workFinished(delay)).catch(e => {
            this.err('出现错误：', e);
            this.workFinished(300);
        })
    }

    async realWork() {

        // 首先检查剑会群雄是否已经设置了阵容
        const mainInfo = await new Promise((ok, err) => this.cmd.do_jhqx_main_info(res => ok(res), () => err('获取剑会群雄信息超时')));
        if (mainInfo?.troop?.length === 0) {
            this.info('当前剑会群雄还没有设置战斗阵容，下面将使用头像防守阵容对其进行设置');

            // 获取当前阵容
            const troops = await new Promise((ok, err) => this.cmd.getAllTroop(result => ok(result), () => err('获取战斗阵容超时')));

            // 设置战斗阵容
            await new Promise((ok, err) => this.cmd.do_jhqx_set_troop(res => ok(res), () => err('设置剑会群雄战斗阵容超时'),
                troops.troop['defense'], this.user.uinfo.userTactic['defense']));
        }

        // 检查是否有任务可以领取
        let result = await new Promise((ok, err) => this.cmd.do_jhqx_get_task_list(result => ok(result), () => err('获取任务列表超时')));
        let notFinish = !!result.taskList.find(v => v.daily === 1 && v.state !== 2);
        for (let v of result.taskList) {
            if (v.state !== 1) {
                continue;
            }
            this.info('完成任务：', v.name)
            result = await new Promise((ok, err) => this.cmd.do_jhqx_finish_task(v.id, result => ok(result), () => err('获取任务列表超时')));
        }

        // 如果已经完成所有日常任务，那么今天不再继续
        if (!notFinish) {
            this.warn('今天的日常任务已经全部完成！');
            let tmNow = new Date(getTime() * 1000);
            return 86400 - tmNow.getHours() * 3600 - tmNow.getMinutes() * 60 - tmNow.getSeconds() + 10;
        }

        // 首先获取当前剑会群雄的对手
        result = await new Promise((ok, err) => this.cmd.do_jhqx_match_rival(result => ok(result), () => err('获取对手超时')));
        this.log(`当前对手${result.rival.userInfo.serverId}区-${result.rival.userInfo.legion ?? '无军团'}-${result.rival.userInfo.name}，战力${(result.rival.fp / 10000).toFixed(4)}万`)

        console.log('当前用户', result.rival.userInfo);

        // 检查是否找到机器人
        let found = false;
        if (!result.rival.userInfo.uid && result.rival.userInfo.userId === 0) {
            console.log(`当前用户是机器人！`);
            found = true;
        }

        // 如果没有找到，而且当前可以匹配，那么尝试重新匹配
        if (!found && result.re) {
            result = await new Promise((ok, err) => this.cmd.do_jhqx_match_rival(result => ok(result), () => err('获取对手超时'), true));
            this.log(`当前对手${result.rival.userInfo.serverId}区-${result.rival.userInfo.legion ?? '无军团'}-${result.rival.userInfo.name}，战力${(result.rival.fp / 10000).toFixed(4)}万`)
        }

        // 再次检查是否找到机器人
        if (!result.rival.userInfo.uid && result.rival.userInfo.userId === 0) {
            console.log(`当前用户是机器人！`);
            found = true;
        }

        // 如果依旧没有找到机器人，计算下次刷新时间
        if (!found) {
            this.log(`没有找到机器人对手，等待刷新后再看看...`);
            return result.ts > getTime() ? result.ts - getTime() + 3 : 3;
        }

        // 执行战斗
        result = await new Promise((ok, err) => this.cmd.do_jhqx_match_battle(result => ok(result), () => err('执行战斗超时')));
        this.info(`和[${result.review.target.name}]的战斗${result.isWin ? '胜利' : '失败'}！`);
        if (!result.isWin) {
            return 3600;
        }

        return 3;
    }

}
