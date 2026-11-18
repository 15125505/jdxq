import {Base} from "./base";


export class TidyHero extends Base {
    constructor(work) {
        super('武将升星', work.configInfo, work.getRoleInfo());

        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }


    /**
     * 一次性任务
     * @param {{up:number, count: number, decompose4:number,decompose3:number,decompose2:number, countryCompose: string[], countryUp: string[]}} param
     */
    once(param) {
        this.param = param;
        this.onceWork(param).catch(e => {
            this.err(`出现错误：`, e);
            this.onceWorkFinished();
        })
    }

    /**
     * 一次性任务
     * @param {{up:number, count: number, decompose4:number,decompose3:number,decompose2:number, countryCompose: string[], countryUp: string[]}} param
     */
    async onceWork(param) {

        this.heroes = null;
        this.heroMap = {};

        // 完成英雄分解
        await this.decompose(param.decompose4, param.decompose3, param.decompose2);

        // 完成4星升5星
        await this.doUp(param.countryUp, param.up);

        // 逐个生成垫子
        for (let i = 0; i < param.count; i++) {
            await this.make();
        }

        this.onceWorkFinished();
    }

    /**
     * 英雄分解
     */
    async decompose(count4, count3, count2) {

        // 获取当前包裹剩余空间
        const result = await new Promise((ok, err) => this.cmd.do_get_hero_list(res => ok(res), () => err('获取当前英雄超时')));
        const maxCount = result.datamerge.heroesCapacity - Object.keys(result.datamerge.heroes).length;
        if (maxCount === 0) {
            await Promise.reject('当前包裹没有任何剩余空间，无法分解英雄碎片');
            return;
        }

        // 开始分解4星碎片
        // const str = `^shard_(${vec[i]})_(?!.*none)(.*)_5$`
        await this.decomposeHeroes(`^shard_all_none_4$`, count4, maxCount, 30, '4星通用碎片')
        await this.decomposeHeroes(`^shard_all_none_3$`, count3, maxCount, 20, '3星通用碎片')
        const finishCount = await this.decomposeHeroes(`^shard_.*_2$`, count2, maxCount, 10, '2星碎片')
        await this.decomposeHeroes(`^shard_.*_1$`, count2 - finishCount, maxCount, 5, '1星碎片')
    }

    /**
     * 分解英雄
     * @param {string} regStr 匹配的正则表达式
     * @param {number} count 需要分解的次数
     * @param {number} maxCount 单次合成的最大次数
     * @param {number} unit 单位数量合成为物品的单位数量
     * @param {string} desc 英雄描述
     * @return {Promise<number>}
     */
    async decomposeHeroes(regStr, count, maxCount, unit, desc) {
        if (count === 0) {
            return 0;
        }
        this.info("当前开始分解", count, '个', desc, "...");

        // 找到所有符合要求的碎片
        const reg = new RegExp(regStr);
        const keys = Object.keys(this.cmd.gameUser).filter(v => !!reg.exec(v));

        // 开始合成
        let finish = 0;
        for (let i = 0; i < keys.length; i++) {
            let curMaxCount = Math.floor(this.cmd.gameUser[keys[i]] / unit)
            while (curMaxCount > 0 && count > 0) {
                let curCount = curMaxCount;
                if (curCount > count) {
                    curCount = count;
                }
                if (curCount > maxCount) {
                    curCount = maxCount;
                }
                if (curCount > 10) {
                    curCount = 10;
                }
                curMaxCount -= curCount;

                this.log('开始合成', curCount, '个英雄，剩余', count, '个待合成' + desc);
                await this.sleep(0.2);

                // 开始合成
                const result = await new Promise((ok, err) => this.cmd.do_use_hero_shard(keys[i], curCount, res => ok(res), () => err('使用碎片超时')));
                const heroes = Object.keys(result.datamergeIncr.heroes);
                count -= heroes.length;
                finish += heroes.length;

                // 开始分解
                const result1 = await new Promise((ok, err) => this.cmd.do_disassemble_heroes(heroes, res => ok(res), () => err('分解英雄超时')));
                this.log('分解', curCount, '个英雄成功...');
                await this.sleep(0.2);
            }
        }

        this.info('成功分解', finish, '个' + desc);
        return finish;
    }


    /**
     * 4星升5星
     * @param {string[]} vecCountry
     * @param {number} count
     * @return {Promise<void>}
     */
    async doUp(vecCountry, count) {

        // 对每个国家依次处理
        const vecName = {};
        vecName['wei'] = '魏国';
        vecName['shu'] = '蜀国';
        vecName['wu'] = '吴国';
        vecName['qun'] = '群雄';
        for (let i = 0; i < vecCountry.length; i++) {
            while (count > 0) {
                this.log(vecName[vecCountry[i]], '开始一轮4升5星，剩余次数：', count);
                if (!await this.doHeroUp(vecCountry[i])) {
                    break;
                }
                --count;
            }
        }
    }

    async doHeroUp(camp) {

        // 首先检查是否存在6个3星英雄
        if (!this.composeHeroCheck(6, 3, false, [camp])) {
            this.log('本国3星英雄不足...');
            return false;
        }
        if (!this.composeHeroCheck(6, 4, false, [camp])) {
            this.log('本国4星英雄不足...');
            return false;
        }
        if (!this.composeHeroCheck(2, 4, true, [camp])) {
            this.log('本国4星同名英雄不足...');
            return false;
        }

        // 其次检查是否存在6个4星英雄
        const s2 = await this.composeHero(2, 4, true, [camp]);
        const h4 = await this.composeHero(4, 4, false, [camp]);
        const h3 = await this.composeHero(6, 3, false, [camp]);

        // 进行合成
        const result = await new Promise((ok, err) => this.cmd.do_fuse_hero(
            s2[0],
            {
                '5': [
                    s2.slice(1, 2),
                    h4,
                    h3,
                ]
            },
            1,
            res => ok(res),
            () => err('升星超时失败'),
        ));
        this.info('合成5星英雄成功...')

        // 开始分解
        const result1 = await new Promise((ok, err) => this.cmd.do_disassemble_heroes(s2.slice(0, 1), res => ok(res), () => err('分解英雄超时')));
        this.log('分解5星英雄成功...');
        return true;
    }

    /**
     * 添加英雄详情
     * @param id
     * @param star
     * @param name
     * @param talent
     * @param camp
     * @param heroId
     */
    addHero(id, star, name, talent, camp, heroId) {
        this.heroMap[id] = {id, star, name, talent, camp, heroId};
    }

    /**
     * 获取英雄详情
     * @param id
     * @return {{id:string, star: number, name:string, talent: number, camp: string, heroId: string}}
     */
    getHero(id) {
        return this.heroMap[id];
    }

    /**
     * 制作一个垫子
     * @return {Promise<void>}
     */
    async make() {

        this.info('开始一轮13星英雄制作……');

        // 准备6星垫子
        this.info('开始制作6星英雄...');
        let toUse = await this.prepareHero(0, 2, 2, 8);
        await new Promise((ok, err) => this.cmd.do_fuse_hero(
            toUse.s5[0],
            {
                '6': [
                    toUse.s5.slice(1, 2),
                    toUse.s4,
                    toUse.s3,
                ]
            },
            1,
            res => ok(res),
            () => err('升星超时失败'),
        ));
        const s6 = toUse.s5[0];
        this.info('英雄', this.getHero(s6).name, '升级为6星！');

        //准备7星垫子
        this.info('开始制作7星英雄...');
        toUse = await this.prepareHero(0, 3, 6, 8);
        await new Promise((ok, err) => this.cmd.do_fuse_hero(
            toUse.s5[0],
            {
                '6': [
                    toUse.s5.slice(1, 2),
                    toUse.s4.slice(0, 2),
                    toUse.s3.slice(0, 8),
                ],
                '7': [
                    toUse.s5.slice(2, 3),
                    toUse.s4.slice(2, 6),
                ],
            },
            2,
            res => ok(res),
            () => err('升星超时失败'),
        ));
        const s7 = toUse.s5[0];
        this.info('英雄', this.getHero(s7).name, '升级为7星！');

        // 准备8星垫子
        this.info('开始制作8星英雄...');
        toUse = await this.prepareHero(0, 5, 10, 8);
        await new Promise((ok, err) => this.cmd.do_fuse_hero(
            toUse.s5[0],
            {
                '6': [
                    toUse.s5.slice(1, 2),
                    toUse.s4.slice(0, 2),
                    toUse.s3.slice(0, 8),
                ],
                '7': [
                    toUse.s5.slice(2, 3),
                    toUse.s4.slice(2, 6),
                ],
                '8': [
                    toUse.s5.slice(3, 5),
                    toUse.s4.slice(6, 10),
                ],
            },
            3,
            res => ok(res),
            () => err('升星超时失败'),
        ));
        const s8 = toUse.s5[0];
        this.info('英雄', this.getHero(s8).name, '升级为8星！');

        // 准备9星垫子
        this.info('开始制作9星英雄...');
        toUse = await this.prepareHero(2, 5, 10, 8);
        await new Promise((ok, err) => this.cmd.do_fuse_hero(
            toUse.same[0],
            {
                '6': [
                    toUse.s5.slice(0, 1),
                    toUse.s4.slice(0, 2),
                    toUse.s3.slice(0, 8),
                ],
                '7': [
                    toUse.s5.slice(1, 2),
                    toUse.s4.slice(2, 6),
                ],
                '8': [
                    toUse.s5.slice(2, 4),
                    toUse.s4.slice(6, 10),
                ],
                '9': [
                    toUse.same.slice(1, 2),
                    toUse.s5.slice(4, 5),
                ],
            },
            4,
            res => ok(res),
            () => err('升星超时失败'),
        ));
        const s9 = toUse.same[0];
        this.info('英雄', this.getHero(s9).name, '升级为9星！');

        // 升级为13星垫子
        this.info('开始制作13星英雄...');
        const country = this.getCountry(3, 7);
        if (!country) {
            await Promise.reject('你的碎片中，未能找到有3个同名5星和7个同国五星的国家，无法升级13星英雄')
            return;
        }

        // 准备同名五星和同国家五星
        const same = await this.composeHero(3, 5, true, [country]);
        const c5 = await this.composeHero(7, 5, false, [country]);
        toUse = await this.prepareHero(0, 5, 10, 8);
        await new Promise((ok, err) => this.cmd.do_fuse_hero(
            same[0],
            {
                '6': [
                    toUse.s5.slice(0, 1),
                    toUse.s4.slice(0, 2),
                    toUse.s3.slice(0, 8),
                ],
                '7': [
                    toUse.s5.slice(1, 2),
                    toUse.s4.slice(2, 6),
                ],
                '8': [
                    toUse.s5.slice(2, 4),
                    toUse.s4.slice(6, 10),
                ],
                '9': [
                    same.slice(1, 2),
                    toUse.s5.slice(4, 5),
                ],
                '10': [
                    [s6],
                    c5.slice(0, 2),
                ],
                '11': [
                    [s7],
                    c5.slice(2, 4),
                ],
                '12': [
                    [s8],
                    c5.slice(4, 7),
                ],
                '13': [
                    [s9],
                    same.slice(2, 3),
                ],
            },
            8,
            res => ok(res),
            () => err('升星超时失败'),
        ));
        const s13 = same[0];
        this.warn('英雄', this.getHero(s13).name, '升级为13星！');
    }

    /**
     * 准备好指定的英雄
     * @param {number} same 需要准备的同名英雄数量
     * @param {number} s5 需要准备的5星英雄数量
     * @param {number} s4 需要准备的4星英雄数量
     * @param {number} s3 需要准备的3星英雄数量
     * @return {Promise<{same: string[], s5: string[], s4: string[], s3: string[]}>}
     */
    async prepareHero(same, s5, s4, s3) {

        const ret = {same: [], s5: [], s4: [], s3: []};

        // 显示需求
        let str = '需要';
        if (same > 0) {
            str += same + '个同名英雄 ';
        }
        if (s5 > 0) {
            str += s5 + '个5星英雄 ';
        }
        if (s4 > 0) {
            str += s4 + '个4星英雄 ';
        }
        if (s3 > 0) {
            str += s3 + '个3星英雄 ';
        }
        this.info(str);

        same > 0 && (ret.same = await this.composeHero(same, 5, true));
        s5 > 0 && (ret.s5 = await this.composeHero(s5, 5, false));
        s4 > 0 && (ret.s4 = await this.composeHero(s4, 4, false));
        s3 > 0 && (ret.s3 = await this.composeHero(s3, 3, false));

        return ret;
    }

    /**
     * 获取一个可以满足五星数量要求的国家
     * @param same 需要同名英雄的数量
     * @param sameCountry 需要的同国家英雄的数量
     * @return {string} 返回符合要求的国家
     */
    getCountry(same, sameCountry) {
        const vec = this.param.countryCompose;

        // 获取这个国家符合条件的英雄数量
        for (let i = 0; i < vec.length; i++) {
            let hasEnoughSame = false, totalCount = 0;
            const str = `^shard_(${vec[i]})_(?!.*none)(.*)_5$`
            const reg = new RegExp(str);
            Object.keys(this.cmd.gameUser).forEach(v => {
                const ret = reg.exec(v);
                if (!ret) {
                    return;
                }
                const heroCfg = this.user.getHero('Hero_' + ret[2]);
                if (heroCfg.talent >= 1000 && !ret[2].includes('PeiLian')) {
                    return;
                }
                const count = Math.floor(this.cmd.gameUser[v] / 50);
                if (count >= same) {
                    hasEnoughSame = true;
                }
                totalCount += count;
            });
            if (hasEnoughSame && totalCount >= same + sameCountry) {
                return vec[i];
            }
        }
    }

    /**
     * 合成指定数量的英雄
     * @param {number} count  需要的数量
     * @param {number} star  英雄星级
     * @param {boolean} mustSame  是否必须为同名英雄
     * @param {string[]} countryCompose 限定的国家
     * @return {Promise<string[]>} 返回英雄的Id列表
     */
    async composeHero(count, star, mustSame, countryCompose = null) {

        this.info('尝试合成', count, '个', mustSame ? '同名' : '', star, '星英雄...');
        if (countryCompose === null) {
            countryCompose = this.param.countryCompose;
        }

        // 当前身上的物资信息
        const unitCount = ([50, 5, 10, 20, 30, 50])[star] ?? 50;
        const str = `^shard_(${countryCompose.join('|')})_(?!.*none)(.*)_${star}$`
        const reg = new RegExp(str);
        const keys = Object.keys(this.cmd.gameUser).filter(v => {
            const ret = reg.exec(v);
            if (!ret) {
                return false;
            }
            const heroCfg = this.user.getHero('Hero_' + ret[2]);
            if (mustSame && this.cmd.gameUser[v] < unitCount * count
                || !mustSame && this.cmd.gameUser[v] < unitCount) {
                return false;
            }
            return heroCfg.talent < 1000 || ret[2].includes('PeiLian');
        });

        // 对符合要求的内容，按照品质进行排序
        keys.sort((a, b) => {
            const heroCfgA = this.user.getHero('Hero_' + reg.exec(a)[2]);
            const heroCfgB = this.user.getHero('Hero_' + reg.exec(b)[2]);
            const talentA = a.includes('PeiLian') ? 0 : heroCfgA.talent;
            const talentB = b.includes('PeiLian') ? 0 : heroCfgB.talent;
            return talentA - talentB;
        });

        // 如果没有找到符合要求的碎片，那么返回碎片不够
        if (keys.length === 0) {
            await Promise.reject('没有找到符合要求的英雄碎片...')
            return [];
        }

        // 逐个进行合成
        const ret = [];
        for (let i = 0; i < keys.length; i++) {
            const maxCount = Math.floor(this.cmd.gameUser[keys[i]] / unitCount);
            const result = await new Promise((ok, err) => this.cmd.do_use_hero_shard(keys[i], Math.min(maxCount, count - ret.length), res => ok(res), () => err('使用英雄碎片超时')));
            Object.keys(result.datamergeIncr.heroes).forEach(key => {
                const hero = result.datamergeIncr.heroes[key];
                const cfg = this.user.getHero(hero.heroId);
                this.addHero(key, hero.star, cfg.name, cfg.talent, cfg.camp, hero.heroId);
                // this.log('合成获得：', cfg.name);
                ret.push(key)
            });
            if (mustSame) {
                break;
            }
            if (ret.length === count) {
                break;
            }
        }
        if (ret.length !== count) {
            await Promise.reject('未能合成足够的英雄');
        }

        await this.sleep(1);
        return ret;
    }

    /**
     * 合成指定数量的英雄
     * @param {number} count  需要的数量
     * @param {number} star  英雄星级
     * @param {boolean} mustSame  是否必须为同名英雄
     * @param {string[]} countryCompose 限定的国家
     * @return {boolean} 是否存在符合要求的英雄
     */
    composeHeroCheck(count, star, mustSame, countryCompose) {

        // 当前身上的物资信息
        const unitCount = ([50, 5, 10, 20, 30, 50])[star] ?? 50;
        const str = `^shard_(${countryCompose.join('|')})_(?!.*none)(.*)_${star}$`
        const reg = new RegExp(str);
        let curCount = 0;
        const keys = Object.keys(this.cmd.gameUser).filter(v => {
            const ret = reg.exec(v);
            if (!ret) {
                return false;
            }
            const heroCfg = this.user.getHero('Hero_' + ret[2]);
            if (mustSame && this.cmd.gameUser[v] < unitCount * count
                || !mustSame && this.cmd.gameUser[v] < unitCount) {
                return false;
            }
            if (heroCfg.talent < 1000 || ret[2].includes('PeiLian')) {
                curCount += Math.floor(this.cmd.gameUser[v] / unitCount);
                return true;
            }
            return false;
        });

        // 如果没有找到符合要求的碎片，那么返回碎片不够
        return curCount >= count;
    }


}

// todo: 5星碎片是50合成一个
// todo: 4星碎片是30合成一个
// todo: 3星碎片是20合成一个
// todo: 2星碎片是10合成一个
// todo: 1星碎片是5合成一个
// todo: 升级规则如下：
//  5=>6  5*1+4*2+3*8
//  6=>7  5*1+4*4
//  7=>8  5*2+4*4
//  8=>9  s*1+5*1
//  9=>10   c*2+6*1
//  10=>11  c*2+7*1
//  11=>12  c*3+8*1
//  12=>13  s*1+9*1
//  .
