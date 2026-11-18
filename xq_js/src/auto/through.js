import {Base} from "./base";
import {getTime, randomRangeInt} from "../utils/tool";


export class Through extends Base {
    constructor(work) {
        super('过关斩将', work.configInfo, work.getRoleInfo());

        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;

        this.startOnSet('Through');
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

        // 检查过关斩将是否已经开启，如果没有开启，将在下一次开启之后重新检查
        const result = await new Promise((ok, err) => this.cmd.do_through_get_open_time(res => ok(res), () => err('获取过关斩将状态超时')));
        const now = getTime();
        if (now <= result.open_time) {
            this.workFinished(result.open_time - now + randomRangeInt(0, 30));
            return;
        }
        if (now >= result.end_time) {
            this.nextDay(randomRangeInt(0, 30));
            this.workFinished();
            return;
        }


        // 递归执行一轮检查
        const param = {failCount: 0};
        while (1) {
            const ret = await this.round(param);
            if (!ret) {
                break;
            }
            await this.sleep(1);
        }
    }

    // 如果还需要继续，返回true，否则返回false
    async round(param) {

        // 首先获取当前等级信息
        const result = await new Promise((ok, err) => this.cmd.do_through_get_levels(res => ok(res), () => err('获取过关斩将当前状态超时')));

        // 如果当前是首次进入，那么首先需要安排英雄出战
        if (result.isFirstIn) {

            // 获取当前所有超过100级的英雄，并按照战力由高到低排序
            const result1 = await new Promise((ok, err) => this.cmd.do_get_hero_list(res => ok(res), () => err('获取英雄列表失败')));
            const heroes = result1.datamerge.heroes;
            const curHeroes = [];
            Object.keys(heroes).forEach(heroKey => heroes[heroKey].level >= 50 && curHeroes.push(heroKey));
            curHeroes.sort((a, b) => heroes[b].fp - heroes[a].fp);

            // 获取当前防守阵容
            const result2 = await new Promise((ok, err) => this.cmd.getAllTroop(res => ok(res), () => err('获取阵容失败')));
            param.defense = result2.troop.defense;

            // 首先从防守阵容中，选择等级超过100级的英雄
            const choice = [];
            param.defense.forEach(v => (heroes[v]?.level ?? 0) >= 50 && choice.push(v));

            // 然后将超过100级的英雄加入到队列中
            curHeroes.forEach(v => choice.length < 10 && !choice.includes(v) && choice.push(v));
            while (choice.length < 10) {
                choice.push(0);
            }

            // 英雄出战
            const result3 = await new Promise((ok, err) => this.cmd.do_through_choice_heroes(choice, res => ok(res), () => err('开启过关斩将失败')));
            this.log('过关斩将出战英雄：', choice.map(v => this.user.getHeroName(heroes[v]?.heroId)).join(' '));
            return true;
        }

        // 显示英雄状态
        this.warn(`当前是${result.cur_pattern === 1 ? '普通' : result.cur_pattern === 2 ? '困难' : '地狱'}难度第${result.cur_level}关,`, '英雄当前状态如下：\n', result.heroes.map(v => this.user.getHeroName(v.heroId) + `(${(v.hp * 100 / v.max_hp).toFixed(0)}%血)`).join(' '));

        // 如果当前处于等待观星状态，那么执行观星
        if (result.guanxing === 1) {

            // 获取观星信息
            const resultGX = await new Promise((ok, err) => this.cmd.do_through_guanxing(0, res => ok(res), () => err('获取观星面板失败')));
            this.log('观星可选buff1', resultGX.buffs[0].desc);
            this.log('观星可选buff2', resultGX.buffs[1].desc);
            this.log('观星可选buff3', resultGX.buffs[2].desc);

            // 如果有阵亡英雄，并有复活技能，那么优先复活阵亡英雄
            const dead = result.heroes.find(v => v.hp === 0);
            const reborn = resultGX.buffs.find(v => v.type === 5);
            if (dead && reborn) {
                this.info('考虑到有阵亡英雄，将使用复活buff');
                await new Promise((ok, err) => this.cmd.do_through_guanxing_choice(0, reborn.id, dead.heroItemId, res => ok(res), () => err('观星失败')));
                return true;
            }

            // 如果有英雄血量低于70%，那么优先使用回血技能
            const hasLowHpHero = result.heroes.find(v => v.hp > 0 && v.hp / v.max_hp < 0.7);
            let maxAddHp, curStar = 0;
            resultGX.buffs.forEach(v => {
                if (v.type === 4 && v.star > curStar) {
                    curStar = v.star;
                    maxAddHp = v.id;
                }
            });
            if (hasLowHpHero && maxAddHp) {
                this.info('考虑到有英雄血量不健康（低于70%），将选用回血buff...');
                await new Promise((ok, err) => this.cmd.do_through_guanxing_choice(0, maxAddHp, 0, res => ok(res), () => err('观星失败')));
                return true;
            }

            // 对技能进行排序
            const sequence = {
                '1': 2,
                '2': 3,
                '3': 1,
                '4': 4,
                '5': 5,
            }
            resultGX.buffs.sort((a, b) => {
                if (a.type !== b.type) {
                    return sequence[a.type] - sequence[b.type];
                }
                return b.star - a.star;
            });
            if (resultGX.buffs[0].type === 5) {
                this.info('当前所有buff均为复活英雄，但没有可以复活的英雄，强制进行元宝刷新...');
                await new Promise((ok, err) => this.cmd.do_through_guanxing(1, res => ok(res), () => err('刷新观星面板失败')));
                return true;
            }

            // 选择优先级最高的buff
            this.info('按照速度>攻击>防御>回血>复活的优先级，最终选择：', resultGX.buffs[0].desc);
            await new Promise((ok, err) => this.cmd.do_through_guanxing_choice(0, resultGX.buffs[0].id, 0, res => ok(res), () => err('观星失败')));
            return true;
        }

        // 如果当前等级超过了额外奖励，并且额外奖励没有领取，那么领取额外奖励
        for (let i = 0; i < result.extra_boxs.length; i++) {
            const info = result.extra_boxs[i];
            if (info.level < result.cur_level && !info.is_open) {
                this.log('领取过关斩将额外奖励...');
                await new Promise((ok, err) => this.cmd.do_through_open_box(0, info.id, res => ok(res), () => err('领取过关斩将额外奖励失败')));
                return true;
            }
        }

        // 如果当前到了16关，那么进入下一个难度，如果下一个难度没有了，那么退出过关斩将
        if (result.cur_level === 16) {

            // 如果已经到了最高难度，那么说明成功完成
            if (result.cur_pattern === 3) {
                this.warn('恭喜你成功通关！');
                this.nextDay(randomRangeInt(0, 30));
                this.workFinished();
                return false;
            }

            // 进入下一关
            await new Promise((ok, err) => this.cmd.do_through_next_pattern(res => ok(res), () => err('进入下一关失败')));
            this.info('进入下一关...');
            return true;
        }

        // 执行战斗
        const troop = [], names = [];
        result.heroes.forEach(v => {
            if (v.hp > 0 && troop.length < 6) {
                troop.push(v.heroItemId);
                names.push(this.user.getHeroName(v.heroId));
            }
        });
        if (troop.length === 0) {
            this.err('所有英雄全部阵亡，今日不再继续！');
            this.nextDay(randomRangeInt(0, 30));
            this.workFinished();
            return false;
        }
        const result1 = await new Promise((ok, err) => this.cmd.do_through_fight(troop, result.cur_level, res => ok(res), () => err('过关斩将战斗失败')));
        this.info(names.join(' '), '和敌人的战斗：', result1.combatResult ? '胜利！' : '失败！');

        // 如果战斗失败，再来一次，如果连续3次失败，那么第二天继续
        if (!result1.combatResult) {
            param.failCount++;
            if (param.failCount >= 3) {
                this.err('连续战败3次，今日不再继续！');
                this.nextDay(randomRangeInt(0, 30));
                this.workFinished();
                return false;
            }
            return true;
        }

        return true;
    }

}
