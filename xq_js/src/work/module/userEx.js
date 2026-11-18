/**
 * 用户处理类
 */
import {Base} from "../../auto/base";

export class UserEx extends Base {

    /**
     * 构造函数
     * @param {Object} userInfo
     * @param {string} userInfo.platform 用户平台
     * @param {number} userInfo.userId
     * @param {number} userInfo.roleId
     * @param {string} userInfo.authorCode
     * @param {string} userInfo.code
     * @param {number} userInfo.gameId
     * @param {string} userInfo.clientId
     * @param {string} userInfo.clientVer
     * @param {string} userInfo.deviceId
     *
     * @param {Object} gameConfig 上次存储的游戏配置信息
     *
     * @param {Object} callbacks 各种回调函数
     * @param {function} callbacks.pfnUpdateTimestamp 更新时间戳
     * @param {function} callbacks.pfnUpdateGameConfig 更新游戏配置
     * @param {function} callbacks.pfnUpdateUserInfo 更新用户信息
     */
    constructor(userInfo, callbacks, gameConfig = null) {

        super('用户', null, userInfo.platform + userInfo.roleId);

        // 用户配置信息
        this.userInfo = userInfo;

        // 服务器反馈信息中提取的用户信息
        this.uinfo = {};

        // 这是当前已经保存的用户配置信息参数
        if (gameConfig) {
            this.config = gameConfig;
        } else {
            this.config = {configHash: '00000000000000000000000000000000'};
        }

        // 更新一些回调函数
        this.callbacks = callbacks;
    }

    /**
     * 生成需要发送给服务器的命令
     * @param {string} cmd - 命令字段中的cmd
     * @param {string} action - 命令字段中的action
     * @param {Object} params - 用户自定义参数，如果用户参数存在，将添加用户参数
     * @return {{msg: string, data: {cmd: string, params: {gameId: number, clientId: string, roleId: number, action: string, userId: number}}}}
     */
    make_cmd(cmd, action, params = null) {
        let ret = {
            msg: cmd + '' + action,
            data: {
                cmd: cmd,
                params: {
                    action: action,
                    gameId: this.userInfo.gameId,
                    userId: this.userInfo.userId,
                    roleId: this.userInfo.roleId,
                    clientId: this.userInfo.clientId,
                }
            }
        };
        params && Object.keys(params).forEach(k => ret.data.params[k] = params[k]);
        return ret;
    }

    /**
     * 生成一个绑定用户的指令，该指令是websocket连接之后的第一个指令
     * @return {{msg: string, data: {cmd: string, params: {gameId: number, clientId: string, authorCode: string, code:string, roleId: null, userId: number}}}}
     */
    make_bind_user() {
        return {
            msg: "bind_user",
            data: {
                cmd: 'bind_user',
                params: {
                    userId: this.userInfo.userId,
                    gameId: 9999,
                    clientId: this.userInfo.clientId,
                    roleId: this.userInfo.roleId,
                    authorCode: this.userInfo.authorCode,
                }
            }
        }
    }

    /**
     * 生成一个登录指令，收到绑定反馈信息之后，需要发送该指令
     * @return {Object}
     */
    make_enter() {
        return this.make_cmd('game', 'enter',
            {
                authorCode: this.userInfo.authorCode,
                gameVer: this.userInfo.clientVer,
                // code: this.userInfo.code,
                roleId: this.userInfo.roleId,
            });
    }

    /**
     * 上报环境信息
     * @return {Object}
     */
    make_wx_env() {
        return this.make_cmd('game', 'wx_env',
            {
                gameVer: this.userInfo.clientVer,
                brand: "iPhone",
                model: "iPad Air 2 (WiFi)",
                platform: "ios",
                system: "iOS 12.1.4",
                version: "7.0.12",
                SDKVersion: "2.11.2",
                scene: 1089,
                scenePath: "",
                activity: "",
            });
    }

    /**
     * 首次进入大厅
     * @return {Object}
     */
    make_first_enter_hall() {
        return this.make_cmd('game', 'first_enter_hall',
            {
                configHash: this.config.configHash,
                openId: this.uinfo.snsId.substr(this.uinfo.snsId.indexOf(':') + 1),
            });
    }

    /**
     * 创建心跳信息
     * @return {Object}
     */
    make_heart_beat() {
        return {
            msg: "heart_beat",
            data: {
                cmd: 'heart_beat',
                params: {
                    userId: this.userInfo.userId,
                    gameId: 9999,
                    clientId: this.userInfo.clientId,
                    deviceId: this.userInfo.deviceId,
                    clientVer: this.userInfo.clientVer,
                    roleId: this.userInfo.roleId,
                    cfg_ver: 7556,
                    zhu_lu: 1,
                    // chatChannels: {
                    //     "server_153": 38291,
                    //     "legionrec_153": 3703,
                    //     "legion_23752": 385,
                    //     "mine_8": 19
                    // }
                }
            }
        }
    }

    /**
     * 获取当前用户的roleId
     * @return {number}
     */
    getRoleId() {
        return this.userInfo.roleId;
    }

    /**
     * bind_user的反馈信息
     * @param ret
     * @return {boolean}
     */
    on_user_info(ret) {
        this.uinfo.snsId = ret.result.udata.snsId;
        this.uinfo.name = ret.result.udata.name;
        this.info('用户', this.uinfo.name, "已经登录");
        return true;
    }

    /**
     * enter的反馈信息
     * @param ret
     * @return {boolean}
     */
    on_game_data(ret) {
        if (!ret.result.gdata.serverId) {
            return false;
        }
        this.uinfo.serverId = ret.result.gdata.serverId;             // 当前所在区服
        this.uinfo.partitionName = ret.result.gdata.partitionName;   // 所在区服名称
        this.uinfo.partitionId = ret.result.gdata.partitionId;       // 所在大区ID
        this.callbacks.pfnUpdateTimestamp(ret.result.gdata.serverTimestamp);
        this.info("来自于第", this.uinfo.partitionId, '大区', this.uinfo.partitionName, this.uinfo.serverId, "的玩家");
        return true;
    }

    /**
     * 进入大厅的反馈信息
     * @param ret
     */
    on_first_enter_hall(ret) {
        let user = ret.result.datamerge.user;
        this.uinfo.level = user.level;                  // 等级
        this.uinfo.user_yuanbao = user.user_yuanbao;    // 元宝
        this.uinfo.towerLevel = user.towerLevel;        // 当前爬塔等级
        this.uinfo.userTactic = user.userTactic;        // 当前各种阵容使用的阵法
        this.uinfo.nickname = user.nickname;            // 昵称
        this.uinfo.vipLevel = user.vipLevel;            // vip等级
        this.uinfo.vipExp = user.vipExp;            // vip经验
        if (ret.result.datamerge.config) {
            this.config = ret.result.datamerge.config;
            this.callbacks.pfnUpdateGameConfig(this.config);
            this.log('游戏配置信息更新完成.');
        }
        this.callbacks.pfnUpdateUserInfo(this.userInfo.platform, this.getRoleId(), this.uinfo.serverId, this.uinfo.nickname || this.uinfo.name);
        this.info('玩家:', this.uinfo.nickname || this.uinfo.name, '等级:', this.uinfo.level, "元宝:", this.uinfo.user_yuanbao, "试炼层数:", this.uinfo.towerLevel, "体力:", user.user_strength, "体力上限：", user.user_strength_limit);
    }

    /**
     * 根据物品名称获取真实名称
     * @param {string} itemString
     * @return {string}
     */
    getItemName(itemString) {

        if (itemString === 'fp') {
            return '战力';
        }

        if (!this.config) {
            return itemString;
        }

        // 普通物品
        if (this.config.item[itemString]) {
            return this.config.item[itemString].name;
        }

        // 神兵
        let artifactName = this.getArtifactName(itemString);
        if (artifactName) {
            return artifactName;
        }

        // 武将碎片
        let shardName = this.getShardName(itemString);
        if (shardName) {
            return shardName;
        }

        // 武将
        let heroName = this.getHeroName(itemString);
        if (heroName) {
            return heroName;
        }

        switch (itemString) {
            case 'level':
                return '等级';
        }
        return itemString;
    }

    /**
     * 获取神兵对应的名称
     * @param itemString
     */
    getArtifactName(itemString) {
        let artifactNames = Object.keys(this.config.artifact);
        for (let i = 0; i < artifactNames.length; i++) {
            let artifact = this.config.artifact[artifactNames[i]];
            let stars = Object.keys(artifact.star);
            for (let j = 0; j < stars.length; j++) {
                let star = stars[j];
                let item = artifact.star[star];
                if (itemString === item.itemId) {
                    return star + '级神兵：' + artifact.name;
                }
            }
        }
    }

    /**
     * 获取武将碎片名称
     * shard_qun_ZhangJiaonew_5
     * shard_all_none_4
     * shard_shu_PeiLian_Shu_5_5
     * @param itemString
     */
    getShardName(itemString) {
        if (itemString.slice(0, 6) !== 'shard_') {
            return;
        }
        let curString = itemString.slice(6);

        // 获取国家
        let pos = curString.indexOf('_');
        if (pos < 0) {
            return;
        }
        let country = curString.slice(0, pos);
        curString = curString.slice(pos + 1);

        // 获取星级
        pos = curString.lastIndexOf('_');
        if (pos < 0) {
            return;
        }
        let star = curString.slice(pos + 1);
        curString = curString.slice(0, pos);

        // 计算碎片名称
        let hero = this.config.hero['Boss_' + curString] || this.config.hero['Hero_' + curString];
        let heroName = curString;
        hero && (heroName = hero.name);
        if (heroName === 'none') {
            heroName = '武将';
        }

        // 计算国家
        switch (country) {
            case 'qun':
            case 'elite-qun':
                country = '(群)';
                break;
            case 'shu':
            case 'elite-shu':
                country = '(蜀)';
                break;
            case 'wei':
            case 'elite-wei':
                country = '(魏)';
                break;
            case 'wu':
            case 'elite-wu':
                country = '(吴)';
                break;
            case 'all':
                country = '';
                break;
            case 'elite-all':
                country = '(红)';
                break;
        }

        // 剩下的是碎片名称
        return star + '星' + heroName + country + '碎片';

    }

    /**
     * 获取武将名称
     * Hero_CaiWenJi
     * @param itemString
     */
    getHeroName(itemString) {
        return this.config.hero[itemString]?.name ?? itemString;
    }

    /**
     * 获取英雄配置信息
     */
    getHero(itemString) {
        return this.config.hero[itemString];
    }

}
