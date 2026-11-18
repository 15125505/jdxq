declare namespace data {

    // 军团捐赠参数
    interface DonateParam {
        country: number;                // 国家
        goldDonateTimes: number;        // 元宝捐赠次数
    }

    // 招贤纳士参数
    interface EnlistParam {
        country: string;                // 国家
    }

    // 淬炼参数
    interface QuenchingParam {
        name: string;       // 洗练的英雄名称
        mode: number;       // 洗练模式 1.无视任何条件洗练若干次 2.洗练到指定的开孔数量
        count: number;      // 模式1下的洗练次数
        level: number;      // 模式2下的开孔数量
        pos: number;        // 洗练部位 0.武器 1.帽子 2.衣服 3.鞋子
        minCount: number;   // 距离洗练目标小于这个次数时，如果出现红色就停下
    }

    // 中军帐参数
    interface SlgParam {
        strength: number;   // 体力
    }

    // 武将结晶购买参数
    interface ShopExParam {
        heroIds: string[];       // 武将Id
    }

    // 南征北战参数
    interface AdventureParam {
        shop: {
            item1: number;      // 英魂 'item:1002'
            item2: number;      // 蓝田玉 'item:1003'
            item3: number;      // 高级招募令 'item:1005'
            item4: number;      // 灵玉 'item:1008'
            item5: number;      // 银色祈愿符 'item:1010'
            item6: number;      // 金色祈愿符 'item:1011'
            item7: number;      // 名将令 'item:1013'
            item8: number;      // 御龙币 'item:1021'
            item9: number;      // 祝福宝石 'item:1027'
            item10: number;     // 指点迷津 'item:1037'
            item11: number;     // 橙兵 'item:6002'
        };
        stopOnShop: boolean;    // 当出现神秘商店时停止行军（行军次数已满除外）
        resume: boolean;        // 使用元宝恢复耐力
        event2: boolean;        // 一帆风顺(元宝增加速度)
        event4: boolean;        // 十面埋伏（与玩家战斗）
        mainTroop: number;      // 主力阵容 0.第一套 1.第二套 2.第三套
    }

    // 军团乱斗参数
    interface MeleeParam {
        buyLevel: number;           // 购买状态 1.免费 2.60元宝 3.200元宝
        fightType: number;          // 战斗类型 0.战力优先 1.等级优先
        useItem: boolean;           // 是否自动使用匹配令
    }
}
