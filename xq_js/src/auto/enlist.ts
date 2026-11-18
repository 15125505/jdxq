import {Base} from "./base";
import {getTime} from "../utils/tool";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";

export class Enlist extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('招贤纳士', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Enlist');
    }

    workStart() {


        this.realWork().then(() => {
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        })
    }

    async realWork() {

        // 当前配置信息
        const param = this.work.configInfo.enlist as data.EnlistParam;

        // 获取招贤状态
        const result = await new Promise<any>((ok, err) => this.cmd.do_get_week_act_info('enlistAct', (result: any) => ok(result), () => err('查看招贤信息超时')));

        // 根据当前设置确定目标心选英雄
        const vec = result.enlishActData.loveHeroesPool as string[];
        let heroId = vec[0];
        result.enlishActData.loveHeroesPool.forEach(v => {
            if (param?.country == this.user.config.hero[v]?.camp) {
                heroId = v;
            }
        })

        // 当前的心选英雄
        const curHeroId = result.enlishActData.loveHero?.hero_id;
        if (curHeroId != heroId) {
            const res = await new Promise<any>((ok, err) => this.cmd.do_act_enlish_set_hero(heroId, (result: any) => ok(result), () => err('查看招贤信息超时')));
            this.info("根据当前设置的国家，心选武将设置为：", this.user.getItemName(res.loveHero));
        } else {
            this.log(`当前心选武将为${this.user.getItemName(heroId)}。`)
        }

        // 如果时间不够，那么进行等待
        const leftTime = result.enlishActData.freeTs - getTime();
        if (leftTime >= 0) {
            this.log(`距离免费的招贤时间还有${leftTime}秒。`);
            this.nextDelay(leftTime + 3);
            return;
        }

        // 执行招贤
        const result1 = await new Promise<any>((ok, err) => this.cmd.do_act_enlish_draw((result: any) => ok(result), () => err('招贤超时')));
        if (result1.success) {
            this.info(`招贤成功，继续招贤${result1.mustAppearCntRemain}次必定获得心选武将！`);
            this.nextDelay(86400);
        } else {
            await Promise.reject('招贤失败')
        }
    }
}
