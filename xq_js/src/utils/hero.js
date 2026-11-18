const gFight = {
    TroopName: {Owner: "troop1", Enemy: "troop2"},
    SoldierStatus: {
        stun: "眩晕", freeze: "冰冻", sleep: "昏睡", silence: "沉默", hurt: "伤害", taunt: "嘲讽"
    },
    SoldierBuffs: {
        buff_hp: "回血",
        buff_pattack: "加物攻",
        buff_mattack: "加法攻",
        buff_ma: "buff_ma",
        buff_pa: "buff_pa",
        buff_speed: "加速",
        debuff_bleed_hp: "流血",
        debuff_poison_hp: "中毒",
        debuff_burn_hp: "灼烧",
        debuff_pattack: "减物攻",
        debuff_mattack: "减法攻",
        debuff_ma: "debuff_ma",
        debuff_pa: "debuff_pa",
        debuff_speed: "减速"
    },
    SoldierMarks: {
        crit_mark: "crit_mark",
        hurt_mark: "hurt_mark",
        feng_mark: "feng_mark",
        tu_mark: "tu_mark",
        long_dan_mark: "long_dan_mark",
        ling_feng_mark: "ling_feng_mark"
    },
    SoldierTips: {
        block: "格挡",
        debuff_bleed_hp: "流血",
        debuff_poison_hp: "中毒",
        debuff_burn_hp: "灼烧",
        stun: "眩晕",
        freeze: "冰冻",
        silence: "沉默",
        taunt: "嘲讽"
    },
    SkillType: {
        attack: "普通攻击", skill: "技能攻击"
    },
    SkillState: {
        attack: "attack", hit: "hit", help: "help"
    },
    ResultTpe: {
        normal: "normal",
        chest: "chest",
        subordinate: "subordinate",
        sweep: "sweep",
        record: "record",
        pvpMatch: "pvpMatch",
        trialMatch: "trialMatch",
        tower: "tower",
        challenge: "challenge",
        revenge: "revenge",
        callHelp: "callHelp",
        rob: "rob",
        plot: "plot",
        boss: "boss",
        dispatch: "dispatch",
        groupBoss: "groupBoss",
        general: "general",
        top_challenge: "top_challenge",
        adventure: "adventure",
        noJump: "noJump"
    },
    RecordSource: {
        plot: "plot"
    },
    FightingScene: {
        plot: "plot",
        tower: "tower",
        thief: "thief",
        chest: "chest",
        subordinate: "subordinate",
        pvpMatch: "pvpMatch",
        revenge: "revenge",
        callHelp: "callHelp",
        rob: "rob",
        dispatch: "dispatch",
        trialMatch: "trialMatch",
        general: "general",
        top_challenge: "top_challenge",
        boss: "boss",
        groupBoss: "groupBoss",
        jhqx: "jhqx",
        dbf: "dbf",
        legionWar: "legionWar",
        passThrough: "passThrough"
    },
    FightingSpeed: {
        one: 1, normal: 1.5, speed: 2.5, max: 3.5
    },
    BgConfig: {
        plot1: "fighting_bg_plot1",
        plot2: "fighting_bg_plot2",
        plot3: "fighting_bg_plot3",
        plot4: "fighting_bg_plot4",
        plot5: "fighting_bg_plot5"
    },
    TowerBgConfig: ["plot1", "plot2", "plot3", "plot4", "plot5"],
    ThiefBgConfig: {Hero_ShanZei_Qun: "plot1", Hero_HuangJinBing_Qun: "plot2", Hero_LiuKou_Qun: "plot3"}
};

/**
 * 指定位置的英雄，和出战位置绑定，如果战死，英雄可能变更
 */
export class Hero {
    constructor(troop, pos) {
        this.data = {troop, position: pos};
    }

    isMe(troop, pos) {
        return this.data.troop === troop && this.data.position === pos;
    }

    /**
     * 替补上场
     */
    assistantIn(heroId, fire, hp, shield) {
        return `替补<span class="cr02">${heroId}</span>上场顶替${this.name()}`
        this.data.heroId = heroId;
        this.data.fire = fire;
        this.data.hp = hp;
        this.data.shield = shield;
    }

    update(data) {
        // 遍历当前输入的信息
        let ret = '';
        Object.keys(data).forEach(attrKey => {
            let attr = this.updateKey(attrKey, data[attrKey]);
            if (!attr) {
                return;
            }
            ret += attr + ' ';
        });
        ret = ret.trimRight();
        if (!ret) {
            return '';
        }
        return `${this.name()} ${ret.trimRight()}`;
    }

    name() {
        let name = this.data.heroId;
        let tag = this.data.troop === 'troop1' ? '左' : '右';
        let pos = this.data.position;
        if (pos === 6) {
            pos = '阵法';
            name = '';
        } else if (pos === 'assist_1') {
            pos = '替补';
        }
        return `<span class="${this.data.troop === 'troop1' ? 'cr01' : 'cr03'}">${tag}${pos} ${name}</span>`;
    }


    keyName(key) {
        const names = {
            'fire': '怒气值',
            'shield': '护盾',
            'hp': '血量',
            'level': '等级',
            'star': '星级',
            'max_hp': '血量上线',
            'heroId': '英雄ID',
            'tacticId': '阵法ID',
        };
        return names[key] || key;
    }


    updateKey(key, value) {
        let ret = '';
        switch (key) {
            // 这一部分内容，直接无视
            case "ani":
            case "max_hp":
            case "skinType":
            case "skinId":
            case "atkType":
            case "artifact":
            case "stoneArtifact":
                break;
            case "useskill":
                return value ? '大招' : '普攻';
            case "crit":
                return value ? '被暴击' : '';
            case "block":
                return value ? '被格挡' : '';
            // 这一部分内容，如果原先没有，那就更新，如果有，就提示变化
            case "heroId":
                value = window.work.user.getItemName(value);
            case "troop":
            case "position":
            case 'fire':
            case 'hp':
            case 'level':
            case 'star':
            case 'tacticId':
                let old = this.data[key];
                if (old === undefined) {
                    this.data[key] = value;
                    return `${this.keyName(key)}<span class="cr04">${value.toLocaleString()}</span>`;
                    // console.log(`设置${this.keyName(key)}为`, value);
                } else if (old !== value) {
                    this.data[key] = value;
                    return `${this.keyName(key)}<span class="cr04">${value.toLocaleString()}</span>(之前<span class="cr02">${old.toLocaleString()}</span>)`;
                    // console.log(`更新${this.keyName(key)}  [${old}] => [${value}]`);
                }
                break;
            case 'marks':
                // todo 暂时不予处理，这个应该是特殊标记
                break;
            case 'defenses':
                Object.keys(value).forEach(subKey => {
                    switch (subKey) {
                        case  'shield':
                            let newValue = value[subKey][0][0];
                            let old = this.data[subKey];
                            !old && (old = 0);
                            if (old !== newValue) {
                                // console.log(this.keyName(subKey), this.data[subKey], '=>', newValue);
                                ret += `${this.keyName(subKey)}<span class="cr04">${newValue.toLocaleString()}</span>(之前<span class="cr02">${old.toLocaleString()}</span>) `;
                                this.data[subKey] = newValue;
                            }
                            break;
                        default:
                            console.log('找不到合适的更新方式', key, value, '子项：', subKey);
                    }
                });
                break;
            case 'buffs':
                Object.keys(value).forEach(subKey => {
                    let buffName = gFight.SoldierBuffs[subKey];
                    if (!buffName) {
                        buffName = subKey;
                        console.warn('未知buff：', buffName);
                    }
                    ret += `<span class="cr04">${buffName}</span><span class="cr02">${value[subKey][0]}</span>回合*<span class="cr04">${value[subKey].length}</span> `;
                    // console.log(this.name(), '叠加buff', buffName, value[subKey].length, '层', value[subKey]);
                });
                break;
            case 'cbuffs':
                Object.keys(value).forEach(subKey => {
                    let buffName = gFight.SoldierTips[subKey] || gFight.SoldierBuffs[subKey];
                    if (!buffName) {
                        buffName = subKey;
                        console.log('未知的待清除buff：', buffName);
                    }
                    if (value[subKey].length === 0) {
                        ret += `清${buffName} `;
                        // console.log(this.name(), '清除buff', buffName);
                    }
                });
                break;
            case 'states':
                Object.keys(value).forEach(subKey => {
                    let stateName = gFight.SoldierStatus[subKey];
                    if (!stateName) {
                        stateName = subKey;
                        console.log('未知的状态：', stateName);
                    }
                    // console.log(this.name(), '受到', stateName, value[subKey], '回合');
                    ret += `${stateName}${value[subKey]}回合 `;
                });
                break;
            case 'cstates':
                Object.keys(value).forEach(subKey => {
                    let stateName = gFight.SoldierStatus[subKey];
                    if (!stateName) {
                        stateName = subKey;
                        console.log('未知的状态：', stateName);
                    }
                    if (value[subKey] === 0) {
                        ret += `解除${stateName} `
                    }
                });
                break;
            case 'deltas':
                if (value.length !== 2) {
                    console.warn(`${key}的长度不为2`);
                    break;
                }
                value.forEach(vv => {
                    vv > 0 && (ret += `回血<span class="cr04">${vv}</span> `);
                    vv < 0 && (ret += `减血<span class="cr01">${-vv}</span> `);
                });
                break;
            case 'deltahps':
                Object.keys(value).forEach(subKey => {
                    let name = gFight.SoldierBuffs[subKey];
                    if (!name) {
                        name = subKey;
                        console.warn('未知的状态：', name);
                    }
                    let vv = value[subKey];
                    vv > 0 && (ret += `${name}<span class="cr04">${vv}</span> `);
                    vv < 0 && (ret += `${name}<span class="cr01">${-vv}</span> `);
                });
                break;
            default:
                console.warn('---------找不到合适的更新方式', key, value);
        }

        return ret.trimRight();
    }
}
