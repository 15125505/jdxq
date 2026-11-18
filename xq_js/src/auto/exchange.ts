// Create by maintainer
// Description: 武将置换
// Date: 2023-08-12 18:02
import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";

export class Exchange extends Base {


    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('武将置换', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    once(param: { country: string, heroes: string[], count: number }) {
        console.log('一次性任务开始：', param);
        this.realWork(param).then(() => this.onceWorkFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.onceWorkFinished();
        });
    }

    async realWork(param: { country: string, heroes: string[], count: number }) {

        // 获取当前的情报值
        const qb = this.cmd.gameUser['item:1014'];
        const count = Math.min(param.count, ~~(qb / 100));
        this.info('当前情报值：', qb, "最多能置换：", ~~(qb / 100), '次', "当前将执行：", count, '次置换...');

        // 获取当前英雄列表
        const hero_list = await new Promise<any>((ok, err) => this.cmd.do_get_hero_list((result: any) => ok(result), () => err('获取英雄列表失败')));

        // 找出符合条件的英雄
        const heroes = hero_list.datamerge.heroes;
        const keys = Object.keys(heroes);
        const toBeExchange: { id: string, name: string, heroId: string }[] = [];
        keys.forEach(id => {
            const hero = heroes[id];
            const heroInfo = this.user.config.hero[hero.heroId];
            if (hero.level != 1 || param.country != heroInfo.camp || heroInfo.talent > 1200 || hero.star != 5 || param.heroes.find(v => v == hero.heroId)) {
                return;
            }
            console.log('----当前英雄可以置换：', heroInfo.name, hero);
            toBeExchange.push({id, name: heroInfo.name, heroId: hero.heroId});
        });

        // 开始进行置换
        let hero: { id: string, name: string, heroId: string };
        for (let i = 0; i < count; i++) {

            // 延迟1秒
            await this.sleep(1);

            // 找到需要置换的英雄
            if (!hero) {
                if (toBeExchange.length == 0) {
                    this.info('没有可以置换的英雄了！');
                    return;
                }
                hero = toBeExchange.pop();
            }

            // 开始置换
            this.log(`开始第${i + 1}/${count}次置换，被置换英雄：${hero.name}`);
            const replace = await new Promise<any>((ok, err) => this.cmd.do_executeReplace(hero.id, (result: any) => ok(result), () => err('英雄置换失败')));
            const newHeroId = replace.newHero.heroId;
            const heroInfo = this.user.config.hero[newHeroId];
            this.info(`置换后的英雄是：${heroInfo.name}`);

            // 判断是否需要保留
            if (heroInfo.talent > 1200) {
                this.warn('恭喜置换出红色英雄！');
            } else if (!param.heroes.find(v => v == newHeroId)) {
                this.info('当前英雄不需要保留！');
                continue;
            }

            // 保存当前英雄
            const save = await new Promise<any>((ok, err) => this.cmd.do_saveHeroReplace(hero.heroId, newHeroId, hero.id, (result: any) => ok(result), () => err('保存英雄失败')));
            hero = null;
            this.warn('新的英雄已经被保存！');
        }
    }
}
