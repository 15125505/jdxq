// Create by maintainer
// Description: 中军帐功能
// Date: 2023-08-12 18:02


import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";
import * as pako from 'pako';
import {getTime} from "../utils/tool";

export class Slg extends Base {

    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('中军帐', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
        this.startOnSet('Slg');
    }


    workStart() {
        this.realWork().then(() => this.workFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.workFinished(600);
        });
    }

    async realWork() {

        // 获取中军帐参数
        const cfg = (this.work.configInfo.slg ?? {
            strength: 30,
        }) as data.SlgParam;
        this.info('中军帐刷地块当前体力上限：', cfg.strength);

        // 获取中军帐信息（如果发现还没报名，直接返回，第二天再检查）
        const slgInfo = await new Promise<any>((ok, err) => this.cmd.do_slg_match_info((result: any) => ok(result), () => err('获取中军帐信息超时')));
        if (!slgInfo.isSignUp) {
            this.err('还没报名中军帐，今天不再检查');
            this.nextDay(0);
            return;
        }
        const belongs = slgInfo.belongs;

        // 进入战场
        const enterInfo = await new Promise<any>((ok, err) => this.cmd.do_slg_enter_battle_ground(belongs, (result: any) => ok(result), () => err('进入战场超时')));
        const data = enterInfo.isZip ? this.unzip(enterInfo.datamergeIncr) : enterInfo.datamergeIncr;
        this.info('玩家主城两步以内的空闲城池有', data.vec.length, '块！');
        if (data.vec.length === 0) {
            this.err('玩家主城两步以内没有空地，无法刷地块！');
            this.nextDay(0);
            return;
        }
        if (data.office * 5 + 5 != Object.keys(data.hexagonIds).length) {
            this.err('当前占地还没满，为避免影响平衡，辅助不会主动攻打地块，请占地满之后再刷地块！');
            this.nextDay(0);
            return;
        }


        // 开始刷地块
        while (this.isWorking) {
            const ret = await this.doOneRound(cfg.strength, data);
            if (!ret) {
                break;
            }
            await this.sleep(1);
        }
        this.nextDay(0)
    }

    /** 进行一轮刷地块 */
    private async doOneRound(strength: number, data: { birthPlace: number, vec: number[]; }): Promise<boolean> {

        // 获取当前部队信息
        const troops = await new Promise<any>((ok, err) => this.cmd.do_slg_get_troops((result: any) => ok(result), () => err('获取部队信息超时')));

        // 如果当前有buff，那么等待buff结束
        const formationId = Object.keys(troops.troops)[0];
        const troop = troops.troops[formationId];

        // 如果当前有buff，那么等待buff结束
        if (Object.keys(troop.buffs).length > 0) {
            const time = troop.buffs[Object.keys(troop.buffs)[0]].end_time - getTime();
            this.info(`等待当前部队行动结束 -- 剩余${time}秒！`);
            await this.sleep(time);
            return true;
        }

        // 如果一号队伍死亡，那么尝试调整阵容
        if (troop.isDeath) {
            this.warn('一号队伍死亡，尝试调整阵容！');
            await this.adjustTroop(strength, formationId, troop.hexagonId, data.birthPlace, troops.heroHole);
            return true
        }

        // 如果当前队伍人数超过1人或者体力少于strength，那么回城
        this.info(`当前队伍人数：${Object.keys(troop.troop).length}，当前武将体力：${troop.troop[Object.keys(troop.troop)[0]].strength}`);
        if (Object.keys(troop.troop).length > 1 || troop.troop[Object.keys(troop.troop)[0]].strength <= strength) {
            this.warn(`刷地块将使用一个超过${strength}体力的英雄进行，当前队伍人数超过1人或者体力少于${strength}，回城调整阵容！`);
            await this.adjustTroop(strength, formationId, troop.hexagonId, data.birthPlace, troops.heroHole);
            return true
        }

        // 确定当前所在地块是否是空闲地块
        if (data.vec.find(v => v == troop.hexagonId) == null || !await this.isFreeHexagon(troop.hexagonId)) {
            this.info('当前所在地块不是空闲地块，现在开始寻找一个空闲地块！');
            const hexagonId = await this.findFreeHexagon(data.vec);
            if (hexagonId === 0) {
                this.err('没有找到空闲地块，等待1分钟！');
                await this.sleep(60);
                return true;
            }

            // 移动到空闲地块
            await this.move(formationId, hexagonId);
            return true
        }


        // 开始刷地块
        await new Promise((ok, err) => this.cmd.do_slg_op_hexagon(3, troop.hexagonId, formationId, (result: any) => ok(result), () => err('侦查地块信息超时')));
        this.info('攻打空白地块完成：', this.getHexagonsName(troop.hexagonId));

        await this.sleep(2);
        return true;
    }

    /**
     * 确定指定地块是否是空闲地块
     */
    private async isFreeHexagon(hexagonId: number): Promise<boolean> {
        const hexagonInfo = await new Promise<any>((ok, err) => this.cmd.do_slg_op_hexagon(1, hexagonId, '', (result: any) => ok(result), () => err('侦查地块信息超时')));
        return Object.keys(hexagonInfo.hexagon_info.buffs).length == 0 && hexagonInfo.hexagon_info.master == 0;
    }

    /** 寻找一个空闲地块 */
    private async findFreeHexagon(vec: number[]): Promise<number> {

        // 寻找一个空闲地块
        for (let i = 0; i < vec.length; i++) {
            if (await this.isFreeHexagon(vec[i])) {
                this.info('找到一个空闲地块：', this.getHexagonsName(vec[i]));
                return vec[i];
            }
        }

        return 0;
    }

    /** 调整阵容 */
    private async adjustTroop(strength: number, formationId: string, hexagonId: number, birthPlace: number, heroHole: {
        [keys: string]: { formationId: string, heroId: string, hp: number, strength: number, holeId: number }
    }) {

        // 如果当前不在主城，那么回主城
        if (hexagonId !== birthPlace) {
            await this.move(formationId, birthPlace);
            return true;
        }

        this.info('调整阵容');

        // 选择一个当前存活的且体力超过strength的部队，放入队伍一
        const foundKey = Object.keys(heroHole).find((key) => {
            const hero = heroHole[key];
            return (!hero.formationId || hero.formationId == formationId) && hero.strength > strength && hero.hp > 0;
        });
        if (!foundKey) {
            this.err('没有找到合适的英雄，等待一分钟后再尝试！');
            await this.sleep(60);
            return false;
        }

        // 调整阵容
        const hero = heroHole[foundKey];
        const res = await new Promise<any>((ok, err) => this.cmd.do_slg_set_troop([hero.holeId, null, null, null, null, null], formationId, (result: any) => ok(result), () => err('调整阵容超时')));
        this.info('调整阵容成功，当前出战英雄：', this.user.getHeroName(hero.heroId));
    }

    /** 移动到指定地块 */
    private async move(formationId: string, dst: number) {
        this.info('移动到地块', this.getHexagonsName(dst));
        await new Promise<any>((ok, err) => this.cmd.do_slg_op_hexagon(5, dst, formationId, (result: any) => ok(result), () => err('移动到地块超时')));
    }

    getHexagonsName(hexagonId: number) {
        return '(' + hexagonId % 100000 + ', ' + Math.floor(hexagonId / 100000) + ')';
    }

    /** 对数据进行解压缩 */
    private unzip(data: string): {
        office: number;
        hexagonIds: { [key: number]: string };
        birthPlace: number;
        vec: number[];
    } {
        let inflatedData;
        if (typeof window === 'undefined') {
            let zlib;
            eval(`zlib = require('zlib')`);
            const decompressedData = zlib.inflateSync(Buffer.from(data, 'base64'));
            inflatedData = decompressedData.toString();
        } else {
            inflatedData = pako.inflate(new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0))), {to: 'string'});
        }
        const json = JSON.parse(inflatedData);
        const office = json.slgUser.incr.office;
        const hexagonIds = json.slgUser.incr.hexagonIds;
        const birthPlace = json.slgUser.incr.birthPlace;

        // 获取hexagonIds相邻的地块
        const setNear = new Set<number>();
        for (const hexagonId in hexagonIds) {
            const hexagon = parseInt(hexagonId);
            const hexagons = this.getHexagons(hexagon);
            hexagons.forEach((hexagon) => setNear.add(hexagon));
        }

        // 获取出生点周围的地块
        let vec = [birthPlace];
        const hexagons = this.getHexagons(birthPlace);
        vec.push(...hexagons);
        for (const hexagon of hexagons) {
            vec.push(...this.getHexagons(hexagon));
        }

        // 去掉重复的地块
        vec = Array.from(new Set(vec));

        // 去掉被人占领的地块 ["废弃地块", "山脉", "一级营地", "四级关卡", "地块", "四级州府", "玩家主城", "二级城池", "三级城池", "四级城池", "五级城池", "六级城池", "七级城池", "六级关卡", "洛阳", "六级州府"]
        vec = vec.filter(v => {
            const info = json.slgMapInfo.incr[v];
            return info.master == 0 && info.hexagonType == 4 && setNear.has(v);
        })


        return {office, hexagonIds, birthPlace, vec};
    }

    /** 获取指定地块周围的地块 */
    private getHexagons(cur: number): number[] {
        const x = Math.floor(cur / 100000);
        const y = cur % 100000;
        const vec = [
            x * 100000 + y - 1,
            x * 100000 + y + 1,
            (x - 1) * 100000 + y,
            (x + 1) * 100000 + y,
        ];
        if (x % 2 === 0) {
            vec.push((x - 1) * 100000 + y - 1);
            vec.push((x + 1) * 100000 + y - 1);
        } else {
            vec.push((x - 1) * 100000 + y + 1);
            vec.push((x + 1) * 100000 + y + 1);
        }
        return vec;
    }
}
