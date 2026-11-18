import {UiBase} from "./uiBase";

export class UiMelee extends UiBase <data.MeleeParam> {
    constructor(platform: string, roleId: string) {
        super(platform, roleId, {
            buyLevel: 1,
            fightType: 0,
            useItem: false,
        }, "UiMelee");
    }

    async showConfig() {

        console.log('当前参数:', this.param);

        const param: ui.UserParam = {
            title: '军团大乱斗',
            items: [
                {
                    name: '购买状态',
                    type: 'radio',
                    currentValue: this.param.buyLevel,
                    options: [
                        {name: '200元宝 -- 属性加成100%', value: 3},
                        {name: '60元宝 -- 属性加成50%', value: 2},
                        {name: '免费 -- 属性加成20%', value: 1},
                    ],
                },
                {
                    name: '对手选择',
                    type: 'radio',
                    currentValue: this.param.fightType,
                    options: [
                        {name: '在战力比自己低的对手中，选择积分最高的', value: 0},
                        {name: '在等级比自己低的对手中，选择积分最高的', value: 1},
                    ],
                    desc: '如果没有符合条件的对手，则选择积分最低的对手',
                },
                {
                    name: '自动使用匹配令',
                    type: 'switch',
                    currentValue: this.param.useItem,
                    label: '勾选后自动使用匹配令，否则只使用免费次数',
                }
            ]
        };
        if (!await this.getUserParam(param)) {
            return;
        }
        this.param = {
            buyLevel: parseInt(param.items[0].currentValue),
            fightType: parseInt(param.items[1].currentValue),
            useItem: param.items[2].currentValue,
        };
    }

}
