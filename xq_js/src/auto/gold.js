import {Base} from "./base";

export class Gold extends Base {


    constructor(work) {
        super('银两', null, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.start();
    }

    workStart() {

        let param = {
            remainTimes: 0,
        };
        new Promise((ok, err) => {
            this.cmd.do_get_exchange_gold_data(result=>{
                if (result.watchAds) {
                    param.remainTimes = result.watchAds.remainTimes;
                }
                ok();
            }, ()=>err('获取银两详情超时'));

        }).then(() => new Promise((ok, err) => {
            if (param.remainTimes === 0) {
                ok();
                return;
            }
            this.cmd.doGoldAd(result=>{
                ok();
            }, ()=>err('获取银两超时'))
        })).then(() => {
            this.workFinished(7200);
        }).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(1800);
        });
    }

}
