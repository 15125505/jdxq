// 作者： maintainer
// 描述: 黑市武将结晶购买
// 日期: 2024-02-26

import {UiBase} from "./uiBase";
import {orangeHero} from "../allHero";

export class UiShopEx extends UiBase <data.ShopExParam> {
    constructor(platform: string, roleId: number) {
        super(platform, roleId, {heroIds: []}, "shopEx");
    }

    async showConfig() {
        const param: ui.UserParam = {
            title: '珍宝阁武将结晶兑换',
            items: [
                {
                    name: '魏国',
                    type: 'checkbox',
                    currentValue: this.param.heroIds.filter(heroId => orangeHero.find(hero => hero.id === heroId).camp === 'wei'),
                    options: orangeHero.filter(hero => hero.camp == 'wei').map(hero => ({
                        name: hero.name,
                        value: hero.id
                    }))
                },
                {
                    name: '蜀国',
                    type: 'checkbox',
                    currentValue: this.param.heroIds.filter(heroId => orangeHero.find(hero => hero.id === heroId).camp === 'shu'),
                    options: orangeHero.filter(hero => hero.camp == 'shu').map(hero => ({
                        name: hero.name,
                        value: hero.id
                    }))
                },
                {
                    name: '吴国',
                    type: 'checkbox',
                    currentValue: this.param.heroIds.filter(heroId => orangeHero.find(hero => hero.id === heroId).camp === 'wu'),
                    options: orangeHero.filter(hero => hero.camp == 'wu').map(hero => ({
                        name: hero.name,
                        value: hero.id
                    }))
                },
                {
                    name: '群雄',
                    type: 'checkbox',
                    desc: '请在上方勾选需要使用武将结晶兑换的武将。',
                    currentValue: this.param.heroIds.filter(heroId => orangeHero.find(hero => hero.id === heroId).camp === 'qun'),
                    options: orangeHero.filter(hero => hero.camp == 'qun').map(hero => ({
                        name: hero.name,
                        value: hero.id
                    }))
                },
            ],
        };
        if (!await this.getUserParam(param)) {
            return;
        }
        this.param = {
            heroIds: [
                ...param.items[0].currentValue,
                ...param.items[1].currentValue,
                ...param.items[2].currentValue,
                ...param.items[3].currentValue,
            ]
        };
    }
}

