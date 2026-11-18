import {UiBase} from "./uiBase";

export class UiAdventure extends UiBase <data.AdventureParam> {
    constructor(platform: string, roleId: string) {
        super(platform, roleId, {
            shop: {
                item1: 0,
                item2: 0,
                item3: 0,
                item4: 0,
                item5: 0,
                item6: 0,
                item7: 0,
                item8: 0,
                item9: 0,
                item10: 0,
                item11: 0,
            }, stopOnShop: false, resume: false, event2: false, event4: false, mainTroop: 0,
        }, "UiAdventure");
    }

    async showConfig() {

        console.log('当前参数:', this.param);

        const param: ui.UserParam = {
            title: '南征北战',
            items: [
                {
                    name: '英魂',
                    type: 'number',
                    currentValue: this.param.shop.item1,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '蓝田玉',
                    type: 'number',
                    currentValue: this.param.shop.item2,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '高级招募令',
                    type: 'number',
                    currentValue: this.param.shop.item3,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '灵玉',
                    type: 'number',
                    currentValue: this.param.shop.item4,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '银色祈愿符',
                    type: 'number',
                    currentValue: this.param.shop.item5,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '金色祈愿符',
                    type: 'number',
                    currentValue: this.param.shop.item6,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '名将令',
                    type: 'number',
                    currentValue: this.param.shop.item7,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '御龙币',
                    type: 'number',
                    currentValue: this.param.shop.item8,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '祝福宝石',
                    type: 'number',
                    currentValue: this.param.shop.item9,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '指点迷津',
                    type: 'number',
                    currentValue: this.param.shop.item10,
                    minValue: 0,
                    maxValue: 1000000,
                },
                {
                    name: '橙兵',
                    type: 'number',
                    currentValue: this.param.shop.item11,
                    minValue: 0,
                    maxValue: 1000000,
                    desc: '以上设置将用于南征北战的商店物品购买，当商店物品单价小于或等于上面标识的价格时，将进行购买行为。设置为0将不购买该物品。',
                },
                {
                    name: '神秘商店',
                    type: 'switch',
                    currentValue: this.param.stopOnShop,
                    label: '当出现神秘商店时停止行军（行军次数已满除外）',
                },
                {
                    name: '恢复耐力',
                    type: 'switch',
                    currentValue: this.param.resume,
                    label: '自动使用元宝恢复耐力',
                },
                {
                    name: '一帆风顺',
                    type: 'switch',
                    currentValue: this.param.event2,
                    label: '遇到该事件后使用元宝增加速度',
                },
                {
                    name: '十面埋伏',
                    type: 'switch',
                    currentValue: this.param.event4,
                    label: '遇到该事件后执行与玩家的战斗',
                },
                {
                    name: '最强阵容位置',
                    type: 'select',
                    currentValue: this.param.mainTroop,
                    options: [
                        {name: '第一套阵容', value: 0},
                        {name: '第二套阵容', value: 1},
                        {name: '第三套阵容', value: 2},
                    ],
                    desc: '该阵容将用于与玩家或NPC的战斗。当辅助进行新一轮行军的时候，将自动以城门3套防守阵容作为当前阵容。同时，将会把城门左边的防守阵容，放置在当前最强阵容的位置上。',
                },
            ]
        };
        if (!await this.getUserParam(param)) {
            return;
        }
        this.param = {
            shop: {
                item1: param.items[0].currentValue,
                item2: param.items[1].currentValue,
                item3: param.items[2].currentValue,
                item4: param.items[3].currentValue,
                item5: param.items[4].currentValue,
                item6: param.items[5].currentValue,
                item7: param.items[6].currentValue,
                item8: param.items[7].currentValue,
                item9: param.items[8].currentValue,
                item10: param.items[9].currentValue,
                item11: param.items[10].currentValue,
            },
            stopOnShop: param.items[11].currentValue,
            resume: param.items[12].currentValue,
            event2: param.items[13].currentValue,
            event4: param.items[14].currentValue,
            mainTroop: parseInt(param.items[15].currentValue),
        };
    }

}
