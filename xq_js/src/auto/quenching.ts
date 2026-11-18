// Create by maintainer
// Description: 武将置换
// Date: 2023-08-12 18:02
import {Base} from "./base";
import {WorkEx} from "../work/workEx";
import {UserEx} from "../work/module/userEx";
import {CmdEx} from "../work/module/cmdEx";

export class Quenching extends Base {


    readonly work: WorkEx;
    readonly user: UserEx;
    readonly cmd: CmdEx;

    constructor(work: WorkEx) {
        super('快速洗练', work.configInfo, work.getRoleInfo());
        this.work = work;
        this.user = work.user;
        this.cmd = work.cmd;
    }

    once(param: data.QuenchingParam) {
        console.log('一次性任务开始：', param);
        this.realWork(param).then(() => this.onceWorkFinished()).catch((e) => {
            this.err('出现错误：', e);
            this.onceWorkFinished();
        });
    }

    async realWork(param: data.QuenchingParam) {

        // 显示当前参数
        const vec = ['武器', '帽子', '衣服', '鞋子'];
        this.info('当前打算洗练', param.name, '的', vec[param.pos % vec.length], '...');
        if (param.mode == 1) {
            this.info('当前打算直接洗练', param.count, '次...');
        } else if (param.mode == 2) {
            this.info('当前打算洗练到开', param.level, '孔，开孔剩余', param.minCount, '次时洗练如果出红就立即停止...');
        } else {
            this.err('配置信息不合法！');
            return;
        }

        // 获取当前防守阵容
        const troops = await new Promise<any>((ok, err) => this.cmd.getAllTroop((result: any) => ok(result), () => err('获取当前防守阵容超时')));
        const heroId = troops.troop.defense[0];
        console.log('当前防守阵容：', troops, '当前防守阵容第一个英雄ID：', heroId);

        // 获取当前英雄列表
        const hero_list = await new Promise<any>((ok, err) => this.cmd.do_get_hero_list((result: any) => ok(result), () => err('获取英雄列表失败')));
        const hero = hero_list.datamerge.heroes[heroId];
        const heroCfg = this.user.config.hero[hero.heroId];
        console.log('当前选中的英雄详情：', hero, heroCfg.name);

        // 检查用户输入的名称是否和当前英雄名称一致
        if (heroCfg.name != param.name) {
            this.err('当前头像防守阵容第一个英雄是', heroCfg.name, '和设置的', param.name, '不一致，洗练已经停止！');
            return;
        }
        const etype = ['weapon', 'headpeace', 'armor', 'accessory'][param.pos % 4];

        // 当前英雄状态
        let holy = hero.equipments[etype].holy;
        console.log('当前英雄装备状态：', holy);

        // 如果是模式1，直接洗练指定次数
        if (param.mode == 1) {
            for (let i = 0; i < param.count; i++) {
                this.info('开始第', i + 1, '/', param.count, '次洗练...');
                const ret = await new Promise<any>((ok, err) => this.cmd.do_holy_quenching(heroId, 1, etype, (result: any) => ok(result), () => err('洗练失败')));
                holy = ret.equipments[param.pos].holy;
                const attrs = holy.attrs;
                this.info('洗练结果',
                    this.attrName(attrs?.[0]),
                    this.attrName(attrs?.[1]),
                    this.attrName(attrs?.[2]),
                    this.attrName(attrs?.[3]),
                    this.attrName(attrs?.[4]),
                    '当前已累计洗练该装备', holy.quenching_times, '次'
                );
            }
            this.info('洗练已经到达指定次数！');
            return
        }

        // 如果是模式2，直接洗练到指定开孔
        if (param.level < 3) {
            this.info('开3孔以下没必要使用辅助，请手动执行吧！');
            return;
        } else if (param.level > 5) {
            this.info('你不可能有开6孔的需求吧！');
            return;
        }

        // 开3孔需要100次，4孔1000次，5孔10000次，根据当前需要开孔的个数，计算开孔的次数
        const needCount = 10 ** (param.level - 1) - holy.quenching_times;
        if (needCount <= 0) {
            this.info('当前装备的开孔状态已经满足要求，无需洗练了！');
            return;
        }
        for (let i = 0; i < needCount; i++) {

            this.info('开始第', i + 1, '/', needCount, '次洗练...');

            // 如果当前剩余次数进入了警戒状态，那么遇到红色就停止
            if (needCount - i <= param.minCount) {
                if (holy.attrs.find(v => v.color == 'red')) {
                    this.info('即将开孔的时候，遇到了红色属性，停止洗练！');
                    return;
                }
            }

            // 执行洗练
            const ret = await new Promise<any>((ok, err) => this.cmd.do_holy_quenching(heroId, 1, etype, (result: any) => ok(result), () => err('洗练失败')));
            console.log('洗练结果：', ret);
            holy = ret.equipments[param.pos].holy;
            const attrs = holy.attrs;
            this.info('洗练结果', this.attrName(attrs?.[0]),
                this.attrName(attrs?.[1]),
                this.attrName(attrs?.[2]),
                this.attrName(attrs?.[3]),
                this.attrName(attrs?.[4]),
                '当前已累计洗练该装备', holy.quenching_times, '次'
            );
        }
        this.info('已经完成开孔需求！');
    }

    attrName(attr: { color: string, level_percent: number }): string {
        if (!attr.color) {
            return '<b style="color: aqua">锁</b>';
        }
        const m: { [key: string]: string } = {
            white: '<b style="color: #e6e6e6">白</b>',
            green: '<b style="color: #00ff88 ">绿</b>',
            blue: '<b style="color: #10aeef">蓝</b>',
            purple: '<b style="color: blueviolet">紫</b>',
            orange: '<b style="color: #ffc300">橙</b>',
            red: '<b style="color: crimson">红</b>',
        }
        let ret = m[attr.color] ?? '未知';
        return (attr.level_percent * 100).toFixed(0) + '%' + ret;
    }
}
