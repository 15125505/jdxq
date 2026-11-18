import {Base} from "./base";
import {getTime} from "../utils/tool";

export class InnRecruit extends Base {


    constructor(work) {
        super('初级招募', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('InnRecruit');
    }

    workStart() {

        let param = {
            work: false,
        };
        new Promise((ok, err) => {
            this.cmd.do_getInnData((result) => {
                // 检查次数是否还有
                if (result.recruitData['0'].freeRemain <= 0) {
                    this.info('今天次数已经用完，明天继续（为避免所有人同时进行，将在明天0点后随机延时一定时间）...');
                    this.nextDay(Math.floor(Math.random() * 200));
                    ok();
                    return;
                }

                // 如果当前时间在冷却时间之后，说明可以招募
                let nowTime = getTime(), coldTime = result.recruitData['0'].timestamp;
                if (nowTime > coldTime) {
                    param.work = true;
                    ok();
                    return;
                }

                // 否则进行延迟
                this.nextDelay(coldTime - nowTime + 1);
                this.info('当前还不可以免费招募，剩余时间：', coldTime - nowTime + 1, "秒");
                ok();
            }, () => err("查看酒馆超时"));
        }).then(() => new Promise((ok, err) => {
            if (!param.work) {
                ok();
                return;
            }
            this.info('开始一次免费招募...');
            this.cmd.do_innRecruit(result => {
                if (result.heroes && result.heroes.length) {
                    this.info('初级招募获得：', this.user.getItemName(result.heroes[0].heroId));
                }
                if (result.shards && result.shards.length) {
                    this.info('初级招募获得：', this.user.getItemName(result.shards[0]));
                }
                this.nextDelay(300);
                ok();
            }, () => err('免费招募超时'))
        })).then(() => {
            this.workFinished();
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

}
