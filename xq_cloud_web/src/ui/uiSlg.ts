// 作者： maintainer
// 描述: uiSlg
// 日期: 2024-02-26

import {UiBase} from "./uiBase";

export class UiSlg extends UiBase <data.SlgParam> {
    constructor(platform: string, roleId: string) {
        super(platform, roleId, {strength: 30}, "slg");
    }

    async showConfig() {
        const param: ui.UserParam = {
            title: '中军帐参数配置',
            items: [
                {
                    name: '体力',
                    type: 'number',
                    desc: '英雄体力低于设置的值之后会更换英雄，请根据自己的需要设置合适的值。',
                    currentValue: this.param.strength,
                    suggestedValue: 30,
                    minValue: 10,
                    maxValue: 200,
                },
            ],
        };
        if (!await this.getUserParam(param)) {
            return;
        }
        this.param = {
            strength: param.items[0].currentValue
        };
    }
}

