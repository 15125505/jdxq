/**
 * 协议处理类
 */
import {Base} from "../../auto/base";
import {getTime, randomRangeInt} from "../../utils/tool";
import {genParamInfo, zmd5} from "../../utils/utils";

export class CmdEx extends Base {

    /**
     * 构造函数
     * @param {UserEx} user 用户模块
     *
     * @param {Object} funcInfo 各种回调函数
     * @param {function} funcInfo.initOK 初始化完成
     * @param {function(reason: string)} funcInfo.logout 服务器返回登出消息
     * @param {function} funcInfo.sendCmd 发送指令到服务器的回调
     * @param {function} funcInfo.updateTimestamp 更新时间戳
     * @param {function} funcInfo.taskChange 有任务被领取
     * @param {function} funcInfo.onRob 被打劫的回调
     * @param {function} funcInfo.onBossKilled boss被击杀回调
     */
    constructor(user, funcInfo) {

        super('消息', null, user.userInfo.platform + user.userInfo.roleId);

        // 保存输入的参数
        this.user = user;
        this.funcInfo = funcInfo;

        // 等待异步命令完成的等待序列
        this.wait = {};

        // 游戏中玩家身上的各种物资信息（用于计算物资情报）
        this.gameUser = {};

        // 上次发送查看小镇命令的时间
        this.lastTime = 0;
    }

    onServerCmd(ret) {
        if (!ret || !ret.cmd) {
            return;
        }

        // 物品更新提示
        ret.result && ret.result.datamerge && this.checkTask(ret.result.datamerge);
        ret.result && ret.result.datamerge && this.checkUserData(ret.result.datamerge.user);
        ret.result && ret.result.datamergeIncr && this.checkUserData(ret.result.datamergeIncr.user, true);
        ret.result && ret.result.datamergeIncr && this.checkMail(ret.result.datamergeIncr.mail);

        // 更新系统时间
        ret.result && ret.result.datamerge && ret.result.datamerge.serverTime && this.funcInfo.updateTimestamp(ret.result.datamerge.serverTime);

        // 更新用户军团
        ret.result && ret.result.datamerge && ret.result.datamerge.legion && (this.legionId = ret.result.datamerge.legion.legionId);

        // 命令处理列表
        let m = this.initCmd();

        // ret.cmd === 'social' && console.log('服务器返回', ret);
        // console.log('-----服务器返回', ret);

        // 对命令进行处理
        if (typeof m[ret.cmd] === 'function') {
            m[ret.cmd](ret);
            return;
        } else if (ret.error) {
            if (ret.error.code === 13002) {
                this.on_rob_town(ret);
                return;
            } else if (ret.error.code === 27036 && ret.result?.action === 'share_treasure_info') {
                m.game.share_treasure_info(ret);
                return;
            }
            this.warn('服务器返回错误：', ret.error.info);
            return;
        } else if (typeof m[ret.cmd] === 'object' && typeof m[ret.cmd][ret.result.action] === 'function') {
            m[ret.cmd][ret.result.action](ret);
            return;
        }

        console.log('服务器反馈了不认识的数据：', ret);
    }

    initCmd() {

        // 保证只进行一次初始化
        if (this.cmdProcess) {
            return this.cmdProcess;
        }
        let m = {};
        this.cmdProcess = m;

        console.log('----------命令映射表进行初始化！');

        // 南征北战
        m.adventure = {};

        // game
        m.game = {};
        m.game.redpoint = () => 0;
        m.game.datamerge = () => 0;
        m.game.function_switch = () => 0;
        m.game.update_icon_list = () => 0;
        m.game.strength_limit_product = ret => this.onStrengthAdInfo(ret.result);
        m.game.strength_limit = ret => this.onStrengthInfo(ret.result);
        m.game.time_activity_reward = ret => this.onStrengthReward(ret.result);
        m.game.get_tower_leaderboard = ret => this.onGetTowerLeaderboard(ret.result);
        m.game.common_watch_ad = ret => {
            (ret.result.adType === 'strengthLimit') && this.onStrengthAd(ret.result);
            (ret.result.adType === 'exchangeGold') && this.onGoldAd(ret.result);
        };
        m.game.first_enter_hall = ret => {
            this.user.on_first_enter_hall(ret);
            this.funcInfo.initOK();
        };
        m.game.junjichu_in = ret => this.onJunjichuIn(ret.result);
        m.game.junjichu_task_get = ret => this.onJunjichuTaskGet(ret.result);
        m.game.junjichu_task_start = ret => this.onJunjichuTaskStart(ret.result);
        m.game.get_week_act_info = ret => this.on_get_week_act_info(ret.result);
        m.game.official_position_get_info = ret => this.on_official_position_get_info(ret.result);
        m.game.official_position_get_salary = ret => this.on_official_position_get_salary(ret.result);
        m.game.official_position_get_task_reward = ret => this.on_official_position_get_task_reward(ret.result);
        m.game.act_enlish_set_hero = ret => this.on_act_enlish_set_hero(ret.result);
        m.game.act_enlish_draw = ret => this.on_act_enlish_draw(ret.result);
        m.game.get_act_info = ret => this.on_get_act_info(ret.result);
        m.game.act_everyday_store = ret => this.on_act_everyday_store(ret.result);
        m.game.sign_info = ret => this.on_sign_info(ret.result);
        m.game.sign = ret => this.on_sign(ret.result);
        m.game.take_gift_everyday = ret => this.on_take_gift_everyday(ret.result);
        m.game.act_everyday_store_buy_product = ret => this.on_act_everyday_store_buy_product(ret.result);
        m.game.inMyTown = ret => this.on_inMyTown(ret.result);
        m.game.executePatrol = ret => this.on_executePatrol(ret.result);
        m.game.orient_share = ret => this.on_orient_share(ret.result);
        m.game.orient_share_draw = ret => this.on_orient_share_draw(ret.result);
        m.game.junjichu_task_up = ret => this.on_junjichu_task_up(ret.result);
        m.game.get_common_rewards = ret => this.on_get_common_rewards(ret.result);
        m.game.get_assign_store = ret => this.on_get_assign_store(ret.result);
        m.game.refresh_assign_store = ret => this.on_refresh_assign_store(ret.result);
        m.game.assign_store_buy_product = ret => this.on_assign_store_buy_product(ret.result);
        m.game.getInnData = ret => this.on_getInnData(ret.result);
        m.game.innRecruit = ret => this.on_innRecruit(ret.result);
        m.game.exchange_gold = ret => this.on_exchange_gold(ret.result);
        m.game.get_exchange_gold_data = ret => this.on_get_exchange_gold_data(ret.result);
        m.game.exchange_chest = ret => this.on_exchange_chest(ret.result);
        m.game.get_hero_list = ret => this.on_get_hero_list(ret.result);
        m.game.share_treasure_info = ret => this.on_share_treasure_info(ret.result);
        m.game.get_share_treasure_final = ret => this.on_get_share_treasure_final(ret.result);
        m.game.get_share_treasure = ret => this.on_get_share_treasure(ret.result);
        m.game.quit_share_treasure = ret => this.on_quit_share_treasure(ret.result);
        m.game.click_soldier = ret => this.on_click_soldier(ret.result);
        m.game.snake_info = ret => this.on_snake_info(ret.result);
        m.game.finish_snake = ret => this.on_finish_snake(ret.result);
        m.game.get_snake_reward_info = ret => this.on_get_snake_reward_info(ret.result);
        m.game.receive_snake_reward = ret => this.on_receive_snake_reward(ret.result);
        m.game.use_hero_shard = ret => this.on_use_hero_shard(ret.result);
        m.game.fuse_hero = ret => this.on_fuse_hero(ret.result);
        m.game.sweepBoss = ret => this.on_sweepBoss(ret.result);
        m.game.disassemble_heroes = ret => this.on_disassemble_heroes(ret.result);
        m.game.slg_match_info = ret => this.on_slg_match_info(ret.result);
        m.game.slg_enter_battle_ground = ret => this.on_slg_enter_battle_ground(ret.result);
        m.game.slg_get_troops = ret => this.on_slg_get_troops(ret.result);
        m.game.slg_op_hexagon = ret => this.on_slg_op_hexagon(ret.result);
        m.game.slg_set_troop = ret => this.on_slg_set_troop(ret.result);
        m.game.get_qingdian_act_info = ret => this.on_get_qingdian_act_info(ret.result);
        m.game.questionnaire_info = ret => this.on_questionnaire_info(ret.result);
        m.game.questionnaire_answer = ret => this.on_questionnaire_answer(ret.result);
        m.game.executeReplace = ret => this.on_executeReplace(ret.result);
        m.game.saveHeroReplace = ret => this.on_saveHeroReplace(ret.result);
        m.game.get_legion_red_bag_info = ret => this.on_get_legion_red_bag_info(ret.result);
        m.game.get_legion_red_bag_reward = ret => this.on_get_legion_red_bag_reward(ret.result);
        m.game.ancient_books_draw_info = ret => this.on_ancient_books_draw_info(ret.result);
        m.game.ancient_books_draw = ret => this.on_ancient_books_draw(ret.result);
        m.game.holy_quenching = ret => this.on_holy_quenching(ret.result);


        // general
        m.general = {};
        m.general.onGetTroop = ret => this.on_onGetTroop(ret.result);
        m.general.onChallenge = ret => this.on_onChallenge(ret.result);
        m.general.onCamp = ret => this.on_onCamp(ret.result);
        m.general.onSweep = ret => this.on_onSweep(ret.result);
        m.general.preBuySweep = ret => this.on_preBuySweep(ret.result);
        m.general.buySweep = ret => this.on_buySweep(ret.result);

        // mail
        m.mail = {};
        m.mail.get_mail_list = ret => this.on_get_mail_list(ret.result);
        m.mail.get_mail_content = ret => this.on_get_mail_content(ret.result);
        m.mail.pick_up = ret => this.on_pick_up(ret.result);

        // trophy_match
        m.trophy_match = {}
        m.trophy_match.trophy_match = ret => this.on_trophy_match(ret.result);

        // interior_dispatch
        m.interior_dispatch = {};
        m.interior_dispatch.task_list = ret => this.on_task_list(ret.result);
        m.interior_dispatch.task_finish = ret => this.on_task_finish(ret.result);
        m.interior_dispatch.task_event_finish = ret => this.on_task_event_finish(ret.result);

        // pass_through_sys
        m.pass_through_sys = {};
        m.pass_through_sys.get_levels = ret => this.on_pass_through_sys_get_levels(ret.result);
        m.pass_through_sys.open_box = ret => this.on_pass_through_sys_open_box(ret.result);
        m.pass_through_sys.next_pattern = ret => this.on_pass_through_sys_next_pattern(ret.result);
        m.pass_through_sys.fight = ret => this.on_pass_through_sys_fight(ret.result);

        // rob
        m.rob = {};
        m.rob.predict_rob_resource = ret => this.on_predict_rob_resource(ret.result);
        m.rob.rob_town = ret => this.on_rob_town(ret.result);

        // story
        m.story = {};
        m.story.reap_info = ret => this.onStoryReapInfo(ret.result);
        m.story.reap = ret => this.onStoryReap(ret.result);
        m.story.rank = ret => this.on_story_rank(ret.result);
        m.story.worship = ret => this.on_story_worship(ret.result);


        // task
        m.task = {};
        m.task.get_list = ret => this.on_get_list(ret.result);
        m.task.receive_reward = ret => this.on_receive_reward(ret.result);
        m.task.receive_activity_reward = ret => this.on_receive_activity_reward(ret.result);

        // logout
        m.logout = ret => {
            this.warn(ret.error.info);
            if (ret.reason !== 'SYS_LOGOUT_OTHER_LOGIN') {
                this.warn('用户信息已经失效，请重新侦测。');
                this.funcInfo.logout(ret.error.info);
            } else {
                this.funcInfo.logout('SYS_LOGOUT_OTHER_LOGIN');
            }
        };

        // user_info
        m.user_info = ret => {
            this.user.on_user_info(ret);
            this.send(this.user.make_enter());
        };

        // game_data
        m.game_data = ret => {
            if (!this.user.on_game_data(ret)) {
                return false;
            }
            this.send(this.user.make_wx_env());
            this.send(this.user.make_first_enter_hall());

            // 技术对抗
            let serverTime = getTime();
            let n = Math.ceil(serverTime / 60);
            this.send(this.user.make_cmd('game', 'get_hall_abc', {
                hallId: 0,
                hallParam: zmd5(this.user.userInfo.roleId + "param_hall" + n),
                extId: zmd5("ext_id" + n),
                infoHall: zmd5(this.user.userInfo + "info_hall" + n),
            }));
            this.send(this.user.make_cmd('game', 'get_game_info', {
                infoGame: zmd5("info_game" + n),
                checkInfo: zmd5(n + "info_check"),
                hallInfo: zmd5(this.user.userInfo.roleId + "hall_info" + n),
                paramInfo: genParamInfo(this.user.userInfo.roleId, serverTime),
            }));
            this.send(this.user.make_cmd('game', 'check_hall_info', {
                infoHall: zmd5(this.user.userInfo.roleId + "hall_info" + n),
                paramCheck: zmd5(this.user.userInfo.roleId + "param" + n)
            }));

            // 避免收到军团战消息
            this.send(this.user.make_cmd('legion_match', 'war_user_exit', {
                "matchId": 0, "serverId": this.user.uinfo.serverId, "partitionId": this.user.uinfo.partitionId,
            }));

        };

        // tower
        m.tower = {};
        m.tower.get_tower_rewards = ret => this.onGetTowerRewards(ret);
        m.tower.challenge_tower = ret => this.onFightTower(ret.result);
        m.tower.get_tower_data = ret => this.on_get_tower_data(ret.result);
        m.tower.sweep_tower = ret => this.on_sweep_tower(ret.result);

        // led
        m.led = ret => ret.result.forEach(v => {
            this.log('系统消息', v[5]);
            this.do_get_user_redbag(v[3], v[4], result => {
                if (result.state === 0) {
                    this.info('领取福利成功！');
                } else if (result.state === 1) {
                    this.warn('福利领取过了！');
                } else if (result.state === 2) {
                    this.warn('福利领取达到上限了！');
                }
            });
        });

        // battle
        m.battle = {};
        m.battle.get_all_troop = ret => this.onAllTroop(ret.result);

        // social
        m.social = {};
        m.social.arena_mate = ret => this.onRefreshArena(ret.result.userList);
        m.social.get_town_data = ret => this.onTownInfo(ret.result);
        m.social.get_lord_subs = ret => this.onGetSubs(ret.result);
        m.social.hold_chest = ret => this.onHoldChest(ret.result);
        m.social.open_chest = ret => this.onOpenChest(ret.result);
        m.social.get_friend_list = ret => this.onGetFriend(ret.result);
        m.social.kill_monster = ret => this.onKillMonster(ret.result);
        m.social.get_user_redbag = ret => this.on_get_user_redbag(ret.result);
        m.social.arena_join = ret => this.on_arena_join(ret.result);
        m.social.arena_battle = ret => this.on_arena_battle(ret.result);
        m.social.get_home_page_info = ret => this.on_get_home_page_info(ret.result);
        m.social.practice_arena_in = ret => this.on_practice_arena_in(ret.result);
        m.social.practice_arena_troop_get = ret => this.on_practice_arena_troop_get(ret.result);
        m.social.practice_arena_fight = ret => this.on_practice_arena_fight(ret.result);
        m.social.practice_arena_mate = ret => this.on_practice_arena_mate(ret.result);
        m.social.practice_arena_troop_adjust = ret => this.on_practice_arena_troop_adjust(ret.result);
        m.social.practice_arena_troop_set = ret => this.on_practice_arena_troop_set(ret.result);
        m.social.receive_strength = ret => this.on_receive_strength(ret.result);
        m.social.jhqx_main_info = ret => this.on_jhqx_main_info(ret.result);
        m.social.jhqx_set_troop = ret => this.on_jhqx_set_troop(ret.result);
        m.social.jhqx_match_rival = ret => this.on_jhqx_match_rival(ret.result);
        m.social.jhqx_match_battle = ret => this.on_jhqx_match_battle(ret.result);
        m.social.jhqx_get_task_list = ret => this.on_jhqx_get_task_list(ret.result);
        m.social.jhqx_finish_task = ret => this.on_jhqx_finish_task(ret.result);
        m.social.one_click_send_recv_strength = ret => this.on_one_click_send_recv_strength(ret.result);

        // legion
        m.legion = {};
        m.legion.get_sign_reward = ret => this.onGetSignReward(ret.result);
        m.legion.get_panel_info = ret => this.onGetPanelInfo(ret.result);
        m.legion.get_all_legion_boss = ret => this.on_get_all_legion_boss(ret.result);
        m.legion.get_attack_boss_info = ret => this.on_get_attack_boss_info(ret.result);
        m.legion.legion_boss_fight = ret => this.on_legion_boss_fight(ret.result);
        m.legion.is_can_enter_donate_card = ret => this.on_is_can_enter_donate_card(ret.result);
        m.legion.enter_donate_hall = ret => this.on_enter_donate_hall(ret.result);
        m.legion.legion_wish_list = ret => this.on_legion_wish_list(ret.result);
        m.legion.add_shard_wish = ret => this.on_add_shard_wish(ret.result);
        m.legion.get_wish = ret => this.on_get_wish(ret.result);
        m.legion.help_donate_card = ret => this.on_help_donate_card(ret.result);
        m.legion.get_complete_wish_reward = ret => this.on_get_complete_wish_reward(ret.result);

        // dbf_match
        m.dbf_match = {};
        m.dbf_match.enter = ret => this.on_dbf_match_enter(ret.result);
        m.dbf_match.worship = ret => this.on_dbf_match_worship(ret.result);

        // pass_through_sys
        m.pass_through_sys = {};
        m.pass_through_sys.get_open_time = ret => this.on_through_get_open_time(ret.result);
        m.pass_through_sys.get_levels = ret => this.on_through_get_levels(ret.result);
        m.pass_through_sys.choice_heroes = ret => this.on_through_choice_heroes(ret.result);
        m.pass_through_sys.fight = ret => this.on_through_fight(ret.result);
        m.pass_through_sys.guanxing = ret => this.on_through_guanxing(ret.result);
        m.pass_through_sys.guanxing_choice = ret => this.on_through_guanxing_choice(ret.result);
        m.pass_through_sys.next_pattern = ret => this.on_through_next_pattern(ret.result);
        m.pass_through_sys.open_box = ret => this.on_through_open_box(ret.result);

        return m;
    }

    /**
     * 检查任务信息变化
     * @param datamerge
     */
    checkTask(datamerge) {

        Object.keys(datamerge).forEach(k => {
            if (k.indexOf('task_') !== 0) {
                return;
            }
            let tasks = datamerge[k];
            if (tasks.constructor !== Array) {
                tasks = tasks.tasks;
            }
            let taskChanged = false;
            tasks.forEach(t => {
                if (t.state !== 1) {
                    return;
                }
                taskChanged = true;
                this.log('完成任务：', t.name, '(', t.desc, ')...');
                this.do_receive_reward(t.id);
            });
            taskChanged && this.funcInfo.taskChange();
        });
    }

    /**
     * 检查用户数据是否有变化，如果有变化，那么输出日志
     */
    checkUserData(user, isAdd = false) {
        if (!user) {
            return;
        }

        // 逐个物品进行检查
        let info = '';
        Object.keys(user).forEach(key => {
            let oldCount = this.gameUser[key];
            let newCount = user[key];
            if (typeof newCount === 'number' && isAdd && key !== 'strengthTimestamp') {
                typeof oldCount !== 'number' && (oldCount = 0);
                if (newCount > oldCount) {
                    info += "\n     " + `获得 - <span style="min-width: 200px; display: inline-block">${this.user.getItemName(key)} ${newCount - oldCount}</span> 当前为: ${newCount}`;
                } else if (newCount < oldCount) {
                    info += "\n     " + `失去 - <span style="min-width: 200px; display: inline-block">${this.user.getItemName(key)} ${oldCount - newCount}</span> 当前为: ${newCount}`;
                }
            }
            this.gameUser[key] = user[key];
        });
        info && this.info('物资情报：' + info);
    }

    /**
     * 检查邮件
     * @param mail
     */
    checkMail(mail) {
        if (!mail) {
            return;
        }
        this.info('邮件消息', mail.title, mail.desc);
        if (mail.title.includes('Boss击杀奖励')) {
            this.funcInfo.onBossKilled();
        }
        if (mail.title.includes('矿山战报')) {
            this.warn('貌似被打劫了！');
            this.funcInfo.onRob();
        }
    }


    /**
     * 添加一个需要反馈的异步命令
     * @param {string} name - 命令名称
     * @param {function} pfnRet - 如果命令执行成功，将调用这个函数
     * @param {function} pfnTimeout - 如果命令没有及时返回，会回调这个函数
     */
    addCmd(name, pfnRet, pfnTimeout = null) {

        // 找出对应名称的等待数组
        if (!this.wait[name]) {
            this.wait[name] = [];
        }
        let vec = this.wait[name];

        // 如果超时，那么执行回调并删除这个节点
        let timer = setTimeout(() => {
            let index = vec.findIndex(v => v.timer === timer);
            index >= 0 && vec.splice(index, 1);
            pfnTimeout && pfnTimeout();
        }, 20000);

        // 将这个命令加入到等待序列
        vec.push({
            pfnRet: pfnRet, timer: timer,
        });
    }

    /**
     * 异步反馈命令已经完成
     * @param {string} name - 命令名称
     * @param retInfo - 回调通知的参数
     */
    finishCmd(name, retInfo) {

        // 找出对应名称的等待数组
        if (!this.wait[name]) {
            return;
        }
        let vec = this.wait[name];

        // 数组中的所有元素进行回调
        vec.forEach(v => {
            clearTimeout(v.timer);
            v.pfnRet && v.pfnRet(retInfo);
        });
        vec.length = 0;
    }

    // 直接调用服务器的send
    send(cmd) {
        // console.log('发送命令：', cmd);
        this.funcInfo.sendCmd(cmd);
    }

    // 获取小镇信息
    getTownInfo(userId, pfnRet, pfnTimeout) {
        // console.log('-------获取小镇信息', userId);

        // 限制频率
        let now = Date.now();
        if (now - this.lastTime < 3000) {
            setTimeout(() => this.getTownInfo(userId, pfnRet, pfnTimeout), 3000);
            return;
        }
        this.lastTime = now;

        this.addCmd('getTownInfo' + userId, pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'get_town_data', {targetUserId: userId ? userId : this.user.getRoleId()}))
    }

    // 收到小镇信息
    onTownInfo(result) {
        this.finishCmd('getTownInfo' + result.town.user.uid, result);
    }

    // 获取战斗阵容
    getAllTroop(pfnRet, pfnTimeout) {
        this.addCmd('getAllTroop', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('battle', 'get_all_troop'));
    }

    // 收到战斗阵容消息
    onAllTroop(result) {
        this.finishCmd('getAllTroop', result);
    }

    // 占矿
    holdChest(userId, troop, chestTypeId, pfnRet, pfnTimeout) {
        this.addCmd('holdChest', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'hold_chest', {
            targetUserId: userId,
            troop: troop,
            scene: {
                scene: 'chest', type: 1,
            },
            troopType: "chest_" + chestTypeId,
            tacticId: this.user.uinfo.userTactic && this.user.uinfo.userTactic['rob_defense_' + chestTypeId] ? this.user.uinfo.userTactic['rob_defense_' + chestTypeId] : ''
        }));
    }

    // 收到占矿结果
    onHoldChest(result) {
        this.finishCmd('holdChest', result);
    }

    // 刷新竞技场
    refreshArena(pfnRet, pfnTimeout) {
        this.addCmd('refreshArena', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'arena_mate'))
    }

    // 刷新竞技场结果
    onRefreshArena(result) {
        this.finishCmd('refreshArena', result);
    }

    // 获取属臣
    getSubs(userId, pfnRet, pfnTimeout) {
        console.log('-------获取属臣', userId);
        this.addCmd('getSubs', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'get_lord_subs', {targetUserId: userId}));
    }

    // 获取属臣结果
    onGetSubs(result) {
        this.finishCmd('getSubs', result);
    }

    // 领取挖矿奖励
    openChest(chestId, chestTypeId, townId, timestamp, pfnRet, pfnTimeout) {
        this.addCmd('openChest', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'open_chest', {
            chestId: chestId, chestTypeId: chestTypeId, townId: townId, timestamp: timestamp,
        }));
    }

    // 领取挖矿奖励反馈
    onOpenChest(result) {
        this.finishCmd('openChest', result);
    }

    // 获取好友列表
    doGetFriend(pfnRet, pfnTimeout) {
        this.addCmd('getFriend', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'get_friend_list'));
    }

    // 获取好友列表反馈
    onGetFriend(result) {
        this.finishCmd('getFriend', result);
    }

    // 获取试炼塔奖励
    getTowerRewards(pfnRet, pfnTimeout) {
        this.addCmd('getTowerRewards_', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('tower', 'get_tower_rewards'));
    }

    // 获取试炼塔奖励反馈
    onGetTowerRewards(result) {
        this.finishCmd('getTowerRewards_', result);
    }

    // 爬塔
    doFightTower(troop, pfnRet, pfnTimeout) {
        this.addCmd('doFightTower', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('tower', 'challenge_tower', {
            troop: troop.defense, scene: {
                scene: "tower", type: this.user.uinfo.towerLevel,
            }, troopType: "attack", tacticId: this.user.uinfo.userTactic ? this.user.uinfo.userTactic.defense : '',
        }));
    }

    // 获取爬塔反馈
    onFightTower(result) {
        this.finishCmd('doFightTower', result);
    }

    // 获取体力详情
    doStrengthAdInfo(pfnRet, pfnTimeout) {
        this.addCmd('onStrengthAdInfo', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'strength_limit_product'));
    }

    // 获取体力详情反馈
    onStrengthAdInfo(result) {
        this.finishCmd('onStrengthAdInfo', result);
    }

    // 看广告获取体力
    doStrengthAd(pfnRet, pfnTimeout) {
        this.addCmd('StrengthAd', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'common_watch_ad', {adType: 'strengthLimit'}));
    }

    // 看广告获取体力反馈
    onStrengthAd(result) {
        this.finishCmd('StrengthAd', result);
    }

    // 看广告获取银两
    doGoldAd(pfnRet, pfnTimeout) {
        this.addCmd('doGoldAd', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'common_watch_ad', {adType: 'exchangeGold'}));
    }

    // 看广告获取银两反馈
    onGoldAd(result) {
        this.finishCmd('doGoldAd', result);
    }

    // 查看当前体力
    doStrengthInfo(pfnRet, pfnTimeout) {
        this.addCmd('_StrengthInfo', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'strength_limit'));
    }

    // 获取当前体力反馈
    onStrengthInfo(result) {
        this.finishCmd('_StrengthInfo', result);
    }

    // 领取体力奖励
    doStrengthReward(pfnRet, pfnTimeout) {
        this.addCmd('_StrengthReward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'time_activity_reward'));
    }

    // 领取体力奖励反馈
    onStrengthReward(result) {
        this.finishCmd('_StrengthReward', result);
    }

    // 剿匪
    doKillMonster(targetUserId, type, troop, monsterId, tacticId, pfnRet, pfnTimeout) {
        this.addCmd('kill_monster', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'kill_monster', {
            targetUserId: targetUserId, monsterId: monsterId, troop: troop, scene: {
                scene: 'thief', type: type
            }, troopType: 'attack', tacticId: tacticId
        }));
    }

    // 剿匪反馈
    onKillMonster(result) {
        this.finishCmd('kill_monster', result);
    }


    // 获取试炼排行榜
    doGetTowerLeaderboard(pfnRet, pfnTimeout) {
        this.addCmd('get_tower_leaderboard', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_tower_leaderboard', {
            "type": 0, "offset": 0, "limit": 100,
        }));
    }

    // 获取试炼排行榜反馈
    onGetTowerLeaderboard(result) {
        this.finishCmd('get_tower_leaderboard', result);
    }

    // 获取主线征收状态
    doStoryReapInfo(pfnRet, pfnTimeout) {
        this.addCmd('reap_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('story', 'reap_info'));
    }

    // 获取主线征收状态反馈
    onStoryReapInfo(result) {
        this.finishCmd('reap_info', result);
    }

    // 执行主线征收
    doStoryReap(pfnRet, pfnTimeout) {
        this.addCmd('story_reap', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('story', 'reap'));
    }

    // 执行主线征收反馈
    onStoryReap(result) {
        this.finishCmd('story_reap', result);
    }

    // 获取军团面板信息
    doGetPanelInfo(pfnRet, pfnTimeout) {
        this.addCmd('get_panel_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'get_panel_info', {legionId: this.legionId}));
    }


    // 获取军团面板信息
    onGetPanelInfo(result) {
        this.finishCmd('get_panel_info', result);
    }

    // 军团签到
    doGetSignReward(pfnRet, pfnTimeout) {
        this.addCmd('get_sign_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'get_sign_reward', {legionId: this.legionId}));
    }

    // 军团签到
    onGetSignReward(result) {
        this.finishCmd('get_sign_reward', result);
    }

    // 进入军机处
    doJunjichuIn(pfnRet, pfnTimeout) {
        this.addCmd('junjichu_in', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'junjichu_in'));
    }

    // 进入军机处
    onJunjichuIn(result) {
        this.finishCmd('junjichu_in', result);
    }

    // 获取军机处任务
    doJunjichuTaskGet(pfnRet, pfnTimeout) {
        this.addCmd('junjichu_task_get', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'junjichu_task_get'));
    }

    // 获取军机处任务
    onJunjichuTaskGet(result) {
        this.finishCmd('junjichu_task_get', result);
    }

    // 开始军机处任务
    doJunjichuTaskStart(taskId, pfnRet, pfnTimeout) {
        this.addCmd('junjichu_task_start', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'junjichu_task_start', {taskId: taskId}));
    }

    // 开始军机处任务
    onJunjichuTaskStart(result) {
        this.finishCmd('junjichu_task_start', result);
    }


    // 获取周任务面板，enlistAct表示招贤，passCert是月度任务
    do_get_week_act_info(actId, pfnRet, pfnTimeout) {
        this.addCmd('get_week_act_info' + actId, pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_week_act_info', {actId: actId}));
    }

    // 获取招贤面板信息
    on_get_week_act_info(result) {
        this.finishCmd('get_week_act_info' + result.actId, result);
    }

    // 获取官职信息面板
    do_official_position_get_info(pfnRet, pfnTimeout) {
        this.addCmd('official_position_get_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'official_position_get_info'));
    }

    // 获取官职信息面板
    on_official_position_get_info(result) {
        this.finishCmd('official_position_get_info', result);
    }

    // 获取俸禄
    do_official_position_get_salary(pfnRet, pfnTimeout) {
        this.addCmd('official_position_get_salary', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'official_position_get_salary'));
    }

    // 获取官职每日奖励
    on_official_position_get_salary(result) {
        this.finishCmd('official_position_get_salary', result);
    }

    // 获取官职每日奖励
    do_official_position_get_task_reward(id, pfnRet, pfnTimeout) {
        this.addCmd('official_position_get_task_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'official_position_get_task_reward', {id: id, taskType: 'daily'}));
    }

    // 获取官职每日奖励
    on_official_position_get_task_reward(result) {
        this.finishCmd('official_position_get_task_reward', result);
    }

    // 设置心选武将
    do_act_enlish_set_hero(loveHero, pfnRet, pfnTimeout) {
        this.addCmd('act_enlish_set_hero', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'act_enlish_set_hero', {loveHero: loveHero}));
    }

    // 设置心选武将
    on_act_enlish_set_hero(result) {
        this.finishCmd('act_enlish_set_hero', result);
    }

    // 执行招贤
    do_act_enlish_draw(pfnRet, pfnTimeout) {
        this.addCmd('act_enlish_draw', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'act_enlish_draw', {drawCnt: 1}));
    }

    // 执行招贤
    on_act_enlish_draw(result) {
        this.finishCmd('act_enlish_draw', result);
    }


    // 查看任务列表
    do_get_list(taskType, pfnRet, pfnTimeout) {
        this.addCmd('task get_list', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('task', 'get_list', {taskType: taskType}));
    }

    // 查看任务列表
    on_get_list(result) {
        this.finishCmd('task get_list', result);
    }

    // 完成任务
    do_receive_reward(taskId, pfnRet, pfnTimeout) {
        this.addCmd('task receive_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('task', 'receive_reward', {taskId: taskId}));
    }

    // 完成任务
    on_receive_reward(result) {
        this.finishCmd('task receive_reward', result);
    }

    // 检查每日礼包状态
    do_get_act_info(actId, pfnRet, pfnTimeout) {
        this.addCmd('get_act_info' + actId, pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_act_info', {actId: actId}));
    }

    // 检查每日礼包状态
    on_get_act_info(result) {
        this.finishCmd('get_act_info' + result.actId, result);
    }

    // 查看每日商店
    do_act_everyday_store(pfnRet, pfnTimeout) {
        this.addCmd('act_everyday_store', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'act_everyday_store'));
    }

    // 查看每日商店
    on_act_everyday_store(result) {
        this.finishCmd('act_everyday_store', result);
    }

    // 检查签到状态
    do_sign_info(pfnRet, pfnTimeout) {
        this.addCmd('sign_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'sign_info'));
    }

    // 检查签到状态
    on_sign_info(result) {
        this.finishCmd('sign_info', result);
    }

    // 签到
    do_sign(index, pfnRet, pfnTimeout) {
        this.addCmd('sign', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'sign', {index: index}));
    }

    // 签到
    on_sign(result) {
        this.finishCmd('sign', result);
    }


    // 每日福利
    do_take_gift_everyday(pfnRet, pfnTimeout) {
        this.addCmd('take_gift_everyday', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'take_gift_everyday'));
    }

    // 每日福利
    on_take_gift_everyday(result) {
        this.finishCmd('take_gift_everyday', result);
    }

    // 每日免费0元福利
    do_act_everyday_store_buy_product(productId, pfnRet, pfnTimeout) {
        this.addCmd('act_everyday_store_buy_product', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'act_everyday_store_buy_product', {productId: productId}));
    }

    // 每日免费0元福利
    on_act_everyday_store_buy_product(result) {
        this.finishCmd('act_everyday_store_buy_product', result);
    }

    // 领取系统栏福利
    do_get_user_redbag(serverId, timeStamp, pfnRet, pfnTimeout) {
        this.addCmd('get_user_redbag', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'get_user_redbag', {serverId: serverId, timeStamp: timeStamp}));
    }

    // 领取系统栏福利
    on_get_user_redbag(result) {
        this.finishCmd('get_user_redbag', result);
    }

    // 查看逐鹿状态 serverType为SS表示同服，MS表示混服
    do_dbf_match_enter(serverId, serverType, pfnRet, pfnTimeout) {
        this.addCmd('dbf_match_enter', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('dbf_match', 'enter', {serverId: serverId, serverType: serverType}));
    }

    // 查看逐鹿状态
    on_dbf_match_enter(result) {
        this.finishCmd('dbf_match_enter', result);
    }

    // 完成逐鹿朝拜 serverType为SS表示同服，MS表示混服
    do_dbf_match_worship(serverId, serverType, targetId, pfnRet, pfnTimeout) {
        this.addCmd('dbf_match_worship', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('dbf_match', 'worship', {
            serverId: serverId, serverType: serverType, targetId: targetId
        }));
    }

    // 完成逐鹿朝拜
    on_dbf_match_worship(result) {
        this.finishCmd('dbf_match_worship', result);
    }

    // 查看主线排行榜
    do_story_rank(pfnRet, pfnTimeout) {
        this.addCmd('story_rank', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('story', 'rank'));
    }

    // 查看主线排行榜
    on_story_rank(result) {
        this.finishCmd('story_rank', result);
    }

    // 膜拜主线排行榜高手
    do_story_worship(worshipUserId, pfnRet, pfnTimeout) {
        this.addCmd('story_worship', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('story', 'worship', {worshipUserId: worshipUserId}));
    }

    // 膜拜主线排行榜高手
    on_story_worship(result) {
        this.finishCmd('story_worship', result);
    }

    // 领取活跃奖励 weekRewards为0表示日奖励，1表示周奖励 rewardIndex是奖励索引值
    do_receive_activity_reward(weekRewards, rewardIndex, pfnRet, pfnTimeout) {
        this.addCmd('receive_activity_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('task', 'receive_activity_reward', {
            weekRewards: weekRewards, rewardIndex: rewardIndex
        }));
    }

    // 领取活跃奖励
    on_receive_activity_reward(result) {
        this.finishCmd('receive_activity_reward', result);
    }

    // 查看试炼塔
    do_get_tower_data(pfnRet, pfnTimeout) {
        this.addCmd('get_tower_data', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('tower', 'get_tower_data'));
    }

    // 查看试炼塔
    on_get_tower_data(result) {
        this.finishCmd('get_tower_data', result);
    }

    // 查看竞技排行榜
    do_arena_join(pfnRet, pfnTimeout) {
        this.addCmd('arena_join', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'arena_join', {offset: 0, limit: 100}));
    }

    // 查看竞技排行榜
    on_arena_join(result) {
        this.finishCmd('arena_join', result);
    }


    // 挑战竞技场
    do_arena_battle(troop, tacticId, targetUserInfo, pfnRet, pfnTimeout) {
        this.addCmd('arena_battle', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'arena_battle', {
            troop: troop,
            scene: {scene: "pvpMatch"},
            tacticId: tacticId,
            targetUserInfo: targetUserInfo,
            troopType: "attack",
        }));
    }

    // 挑战竞技场
    on_arena_battle(result) {
        this.finishCmd('arena_battle', result);
    }

    // 查看军团boss列表
    do_get_all_legion_boss(pfnRet, pfnTimeout) {
        this.addCmd('get_all_legion_boss', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'get_all_legion_boss'));
    }

    // 查看军团boss列表
    on_get_all_legion_boss(result) {
        this.finishCmd('get_all_legion_boss', result);
    }

    // 查看军团boss信息
    do_get_attack_boss_info(bossNo, pfnRet, pfnTimeout) {
        this.addCmd('get_attack_boss_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'get_attack_boss_info', {bossNo: bossNo}));
    }

    // 查看军团boss信息
    on_get_attack_boss_info(result) {
        this.finishCmd('get_attack_boss_info', result);
    }

    // 挑战boss
    do_legion_boss_fight(bossNo, troop, tacticId, pfnRet, pfnTimeout) {
        this.addCmd('legion_boss_fight', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'legion_boss_fight', {
            bossNo: bossNo, troop: troop, troopType: `attack`, tacticId: tacticId,
        }));
    }

    // 挑战boss
    on_legion_boss_fight(result) {
        this.finishCmd('legion_boss_fight', result);
    }

    // 查看城门状态
    do_inMyTown(pfnRet, pfnTimeout) {
        this.addCmd('inMyTown', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'inMyTown'));
    }

    // 查看城门状态
    on_inMyTown(result) {
        this.finishCmd('inMyTown', result);
    }

    // 城门巡逻
    do_executePatrol(pfnRet, pfnTimeout) {
        this.addCmd('executePatrol', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'executePatrol'));
    }

    // 城门巡逻
    on_executePatrol(result) {
        this.finishCmd('executePatrol', result);
    }

    // 执行分享
    do_orient_share(sceneId, pfnRet, pfnTimeout) {
        this.addCmd('orient_share', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'orient_share', {sceneId: sceneId}));
    }

    // 执行分享
    on_orient_share(result) {
        this.finishCmd('orient_share', result);
    }

    // 分享抽奖
    do_orient_share_draw(functionId, pfnRet, pfnTimeout) {
        this.addCmd('orient_share_draw', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'orient_share_draw', {functionId: functionId}));
    }

    // 分享抽奖
    on_orient_share_draw(result) {
        this.finishCmd('orient_share_draw', result);
    }

    // 查看用户信息
    do_get_home_page_info(targetUserId, pfnRet, pfnTimeout) {
        this.addCmd('_get_home_page_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'get_home_page_info', {targetUserId: targetUserId}));
    }

    // 查看用户信息
    on_get_home_page_info(result) {
        this.finishCmd('_get_home_page_info', result);
    }

    // 查看攻城收获
    do_predict_rob_resource(targetUserId, pfnRet, pfnTimeout) {
        this.addCmd('predict_rob_resource', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('rob', 'predict_rob_resource', {targetUserId: targetUserId}));
    }

    // 查看攻城收获
    on_predict_rob_resource(result) {
        this.finishCmd('predict_rob_resource', result);
    }

    // 攻城
    do_rob_town(targetUserId, troop, pfnRet, pfnTimeout) {
        this.addCmd('rob_town', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('rob', 'rob_town', {
            targetUserId: targetUserId,
            troop: troop,
            "scene": {
                "scene": "rob"
            },
            "door": 2,
            "troopType": "attack",
            tacticId: this.user.uinfo.userTactic ? this.user.uinfo.userTactic.defense : ''
        }));
    }

    // 攻城
    on_rob_town(result) {
        this.finishCmd('rob_town', result);
    }

    // 升级军机处任务
    do_junjichu_task_up(taskId, pfnRet, pfnTimeout) {
        this.addCmd('junjichu_task_up', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'junjichu_task_up', {
            taskId: taskId
        }));
    }

    // 升级军机处任务
    on_junjichu_task_up(result) {
        this.finishCmd('junjichu_task_up', result);
    }

    // 获取过关斩将信息
    do_pass_through_sys_get_levels(pfnRet, pfnTimeout) {
        this.addCmd('pass_through_sys_get_levels', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'get_levels'));
    }

    // 获取过关斩将信息
    on_pass_through_sys_get_levels(result) {
        this.finishCmd('pass_through_sys_get_levels', result);
    }

    // 领取过关斩将中间奖励
    do_pass_through_sys_open_box(id, pfnRet, pfnTimeout) {
        this.addCmd('pass_through_sys_open_box', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'open_box', {index: 0, id: id}));
    }

    // 领取过关斩将中间奖励
    on_pass_through_sys_open_box(result) {
        this.finishCmd('pass_through_sys_open_box', result);
    }

    // 过关斩将下一个难度
    do_pass_through_sys_next_pattern(pfnRet, pfnTimeout) {
        this.addCmd('pass_through_sys_next_pattern', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'next_pattern'));
    }

    // 过关斩将下一个难度
    on_pass_through_sys_next_pattern(result) {
        this.finishCmd('pass_through_sys_next_pattern', result);
    }

    // 过关斩将战斗
    do_pass_through_sys_fight(troop, level, tacticId, pfnRet, pfnTimeout) {
        this.addCmd('pass_through_sys_fight', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'fight', {
            troop: troop, scene: {
                scene: "tower", type: level       // 当前的层数
            }, troopType: "passsys", tacticId: tacticId
        }));
    }

    // 过关斩将战斗
    on_pass_through_sys_fight(result) {
        this.finishCmd('pass_through_sys_fight', result);
    }

    // 获取武神排行榜信息
    do_practice_arena_in(pfnRet, pfnTimeout) {
        this.addCmd('practice_arena_in', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'practice_arena_in', {
            offset: 0, limit: 100,
        }));
    }

    // 获取武神排行榜信息
    on_practice_arena_in(result) {
        this.finishCmd('practice_arena_in', result);
    }

    // 获取武神阵容 troopType: 0.获取防守阵容 1.获取进攻阵容
    do_practice_arena_troop_get(targetId, troopType, pfnRet, pfnTimeout) {
        this.addCmd('practice_arena_troop_get', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'practice_arena_troop_get', {
            targetId: targetId, troopType: troopType,
        }));
    }

    // 获取武神阵容
    on_practice_arena_troop_get(result) {
        this.finishCmd('practice_arena_troop_get', result);
    }

    // 设置武神防守阵容
    do_practice_arena_troop_set(troop, tacticId, which, pfnRet, pfnTimeout) {
        this.addCmd('practice_arena_troop_set', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'practice_arena_troop_set', {
            troop: troop, which: which, troopType: 0, tacticId: tacticId,
        }));
    }

    // 设置武神防守阵容
    on_practice_arena_troop_set(result) {
        this.finishCmd('practice_arena_troop_set', result);
    }


    // 调整武神防守阵容
    do_practice_arena_troop_adjust(which, where, pfnRet, pfnTimeout) {
        this.addCmd('practice_arena_troop_adjust', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'practice_arena_troop_adjust', {
            which: which, where: where, troopType: 0,
        }));
    }

    // 调整武神防守阵容
    on_practice_arena_troop_adjust(result) {
        this.finishCmd('practice_arena_troop_adjust', result);
    }

    // 发起武神战斗
    do_practice_arena_fight(troop, targetUserInfo, tacticId, sign, pfnRet, pfnTimeout) {
        this.addCmd('practice_arena_fight', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'practice_arena_fight', {
            troop: troop,
            scene: {
                scene: "trialMatch"
            },
            sign: sign,
            targetUserInfo: targetUserInfo,
            troopType: ["practice_A_1", "practice_A_2", "practice_A_3"],
            tacticId: tacticId
        }));
    }

    // 发起武神战斗
    on_practice_arena_fight(result) {
        this.finishCmd('practice_arena_fight', result);
    }

    // 刷新武神竞技对手名单
    do_practice_arena_mate(pfnRet, pfnTimeout) {
        this.addCmd('practice_arena_mate', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'practice_arena_mate'));
    }

    // 刷新武神竞技对手名单
    on_practice_arena_mate(result) {
        this.finishCmd('practice_arena_mate', result);
    }

    // 领取尊享卡礼包
    do_get_common_rewards(rewardId, pfnRet, pfnTimeout) {
        this.addCmd('get_common_rewards', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_common_rewards', {
            rewardId: rewardId
        }));
    }

    // 领取尊享卡礼包
    on_get_common_rewards(result) {
        this.finishCmd('get_common_rewards', result);
    }

    // 获取名将之路阵容 camp:'wu'
    do_onGetTroop(camp, pfnRet, pfnTimeout) {
        this.addCmd('onGetTroop', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('general', 'onGetTroop', {
            camp: camp
        }));
    }

    // 获取名将之路阵容
    on_onGetTroop(result) {
        this.finishCmd('onGetTroop', result);
    }

    // 名将之路战斗
    do_onChallenge(camp, level, troop, tacticId, pfnRet, pfnTimeout) {
        this.addCmd('onChallenge', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('general', 'onChallenge', {
            camp: camp, level: level, scene: {
                scene: "general"
            }, troop: troop, troopType: "attack", tacticId: tacticId
        }));
    }

    // 名将之路战斗
    on_onChallenge(result) {
        this.finishCmd('onChallenge', result);
    }


    // 获取内政任务列表
    do_task_list(pfnRet, pfnTimeout) {
        this.addCmd('interior_dispatch task_list', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('interior_dispatch', 'task_list'));
    }

    // 获取内政任务列表
    on_task_list(result) {
        this.finishCmd('interior_dispatch task_list', result);
    }

    // 完成内政任务
    do_task_finish(taskId, pfnRet, pfnTimeout) {
        this.addCmd('interior_dispatch task_finish', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('interior_dispatch', 'task_finish', {taskId: taskId}));
    }

    // 完成内政任务
    on_task_finish(result) {
        this.finishCmd('interior_dispatch task_finish', result);
    }

    // 完成内政任务事件
    do_task_event_finish(taskId, pfnRet, pfnTimeout) {
        this.addCmd('interior_dispatch task_event_finish', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('interior_dispatch', 'task_event_finish', {taskId: taskId}));
    }

    // 完成内政任务事件
    on_task_event_finish(result) {
        this.finishCmd('interior_dispatch task_event_finish', result);
    }

    // 查看珍宝阁
    do_get_assign_store(type, pfnRet, pfnTimeout) {
        this.addCmd('get_assign_store', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_assign_store', {type}));
    }

    // 查看珍宝阁
    on_get_assign_store(result) {
        this.finishCmd('get_assign_store', result);
    }

    // 购买珍宝阁物品
    do_assign_store_buy_product(type, productId, pfnRet, pfnTimeout) {
        this.addCmd('assign_store_buy_product', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'assign_store_buy_product', {productId, type}));
    }

    // 购买珍宝阁物品
    on_assign_store_buy_product(result) {
        this.finishCmd('assign_store_buy_product', result);
    }

    // 刷新珍宝阁
    do_refresh_assign_store(type, pfnRet, pfnTimeout) {
        this.addCmd('refresh_assign_store', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'refresh_assign_store', {type}));
    }

    // 刷新珍宝阁
    on_refresh_assign_store(result) {
        this.finishCmd('refresh_assign_store', result);
    }

    // 获取酒馆信息
    do_getInnData(pfnRet, pfnTimeout) {
        this.addCmd('getInnData', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'getInnData'));
    }

    // 获取酒馆信息
    on_getInnData(result) {
        this.finishCmd('getInnData', result);
    }

    // 执行一次免费初级招募
    do_innRecruit(pfnRet, pfnTimeout) {
        this.addCmd('innRecruit', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'innRecruit', {"recruitType": 0, "count": 1, "pay": 0}));
    }

    // 执行一次免费初级招募
    on_innRecruit(result) {
        this.finishCmd('innRecruit', result);
    }

    // 执行一次试炼扫荡
    do_sweep_tower(pfnRet, pfnTimeout) {
        this.addCmd('sweep_tower', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('tower', 'sweep_tower'));
    }

    // 执行一次试炼扫荡
    on_sweep_tower(result) {
        this.finishCmd('sweep_tower', result);
    }

    // 查看点金面板
    do_get_exchange_gold_data(pfnRet, pfnTimeout) {
        this.addCmd('get_exchange_gold_data', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_exchange_gold_data'));
    }

    // 查看点金面板
    on_get_exchange_gold_data(result) {
        this.finishCmd('get_exchange_gold_data', result);
    }

    // 执行点金
    do_exchange_gold(pfnRet, pfnTimeout) {
        this.addCmd('exchange_gold', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'exchange_gold'));
    }

    // 执行点金
    on_exchange_gold(result) {
        this.finishCmd('exchange_gold', result);
    }

    // 领取点金15次奖励
    do_exchange_chest(pfnRet, pfnTimeout) {
        this.addCmd('exchange_chest', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'exchange_chest'));
    }

    // 领取点金15次奖励
    on_exchange_chest(result) {
        this.finishCmd('exchange_chest', result);
    }

    // 获取英雄列表
    do_get_hero_list(pfnRet, pfnTimeout) {
        this.addCmd('get_hero_list', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_hero_list', {data: ''}));
    }

    // 获取英雄列表
    on_get_hero_list(result) {
        this.finishCmd('get_hero_list', result);
    }

    // 查看名将之路面板
    do_onCamp(pfnRet, pfnTimeout) {
        this.addCmd('onCamp', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('general', 'onCamp'));
    }

    // 查看名将之路面板
    on_onCamp(result) {
        this.finishCmd('onCamp', result);
    }

    // 名将之路扫荡
    do_onSweep(level, camp, pfnRet, pfnTimeout) {
        this.addCmd('onSweep', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('general', 'onSweep', {level, camp}));
    }

    // 名将之路扫荡
    on_onSweep(result) {
        this.finishCmd('onSweep', result);
    }

    // 赠送体力
    do_receive_strength(targetUserId, pfnRet, pfnTimeout) {
        this.addCmd('receive_strength', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'receive_strength', {targetUserId}));
    }

    // 赠送体力
    on_receive_strength(result) {
        this.finishCmd('receive_strength', result);
    }

    // 获取名将扫荡次数的价格
    do_preBuySweep(pfnRet, pfnTimeout) {
        this.addCmd('preBuySweep', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('general', 'preBuySweep'));
    }

    // 获取名将扫荡次数的价格
    on_preBuySweep(result) {
        this.finishCmd('preBuySweep', result);
    }

    // 名将购买次数
    do_buySweep(pfnRet, pfnTimeout) {
        this.addCmd('buySweep', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('general', 'buySweep'));
    }

    // 名将购买次数
    on_buySweep(result) {
        this.finishCmd('buySweep', result);
    }


    // 查看邮件列表
    do_get_mail_list(pfnRet, pfnTimeout) {
        this.addCmd('get_mail_list', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('mail', 'get_mail_list'));
    }

    // 查看邮件列表
    on_get_mail_list(result) {
        this.finishCmd('get_mail_list', result);
    }

    // 查看邮件内容
    do_get_mail_content(mailId, type, pfnRet, pfnTimeout) {
        this.addCmd('get_mail_content', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('mail', 'get_mail_content', {mailId, type}));
    }

    // 查看邮件内容
    on_get_mail_content(result) {
        this.finishCmd('get_mail_content', result);
    }

    // 查看剑会群雄信息
    do_jhqx_main_info(pfnRet, pfnTimeout) {
        this.addCmd('jhqx_main_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'jhqx_main_info'));
    }

    // 查看剑会群雄信息
    on_jhqx_main_info(result) {
        this.finishCmd('jhqx_main_info', result);
    }

    // 设置剑会群雄阵容
    do_jhqx_set_troop(pfnRet, pfnTimeout, troop, tacticId) {
        this.addCmd('jhqx_set_troop', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'jhqx_set_troop', {troop, tacticId}));
    }

    // 设置剑会群雄阵容
    on_jhqx_set_troop(result) {
        this.finishCmd('jhqx_set_troop', result);
    }

    // 获取剑会群雄对手
    do_jhqx_match_rival(pfnRet, pfnTimeout, rematch = false) {
        this.addCmd('jhqx_match_rival', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'jhqx_match_rival', rematch ? {rematch} : null));
    }

    // 获取剑会群雄对手
    on_jhqx_match_rival(result) {
        this.finishCmd('jhqx_match_rival', result);
    }

    // 执行剑会群雄战斗
    do_jhqx_match_battle(pfnRet, pfnTimeout) {
        this.addCmd('jhqx_match_battle', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'jhqx_match_battle', {scene: {scene: "jhqx"}}));
    }

    // 执行剑会群雄战斗
    on_jhqx_match_battle(result) {
        this.finishCmd('jhqx_match_battle', result);
    }


    // 获取剑会群雄任务列表
    do_jhqx_get_task_list(pfnRet, pfnTimeout) {
        this.addCmd('jhqx_get_task_list', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'jhqx_get_task_list'));
    }

    // 获取剑会群雄任务列表
    on_jhqx_get_task_list(result) {
        this.finishCmd('jhqx_get_task_list', result);
    }

    // 完成剑会群雄任务
    do_jhqx_finish_task(taskId, pfnRet, pfnTimeout) {
        this.addCmd('jhqx_finish_task', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'jhqx_finish_task', {taskId}));
    }

    // 完成剑会群雄任务
    on_jhqx_finish_task(result) {
        this.finishCmd('jhqx_finish_task', result);
    }

    // 获取过关斩将状态
    do_through_get_open_time(pfnRet, pfnTimeout) {
        this.addCmd('get_open_time', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'get_open_time'));
    }

    // 获取过关斩将状态
    on_through_get_open_time(result) {
        this.finishCmd('get_open_time', result);
    }

    // 获取过关斩将详情
    do_through_get_levels(pfnRet, pfnTimeout) {
        this.addCmd('get_levels', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'get_levels'));
    }

    // 获取过关斩将详情
    on_through_get_levels(result) {
        this.finishCmd('get_levels', result);
    }

    // 英雄出征 heroes: 长度为10的数组，每个元素是英雄ID，不够10个以0补充
    do_through_choice_heroes(heroes, pfnRet, pfnTimeout) {
        this.addCmd('choice_heroes', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'choice_heroes', {heroes}));
    }

    // 英雄出征
    on_through_choice_heroes(result) {
        this.finishCmd('choice_heroes', result);
    }

    // 过关斩将进行战斗
    do_through_fight(troop, level, pfnRet, pfnTimeout) {
        this.addCmd('through_fight', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'fight', {
            troop, "scene": {
                "scene": "passThrough", "type": level
            }, "troopType": "passsys", "tacticId": ""
        }));
    }

    // 过关斩将进行战斗
    on_through_fight(result) {
        this.finishCmd('through_fight', result);
    }

    // 观星 update: 0查看 1刷新
    do_through_guanxing(update, pfnRet, pfnTimeout) {
        this.addCmd('guanxing', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'guanxing', {update}));
    }

    // 观星
    on_through_guanxing(result) {
        this.finishCmd('guanxing', result);
    }

    // 执行观星 update: 0查看 1刷新
    do_through_guanxing_choice(index, id, heroItemId, pfnRet, pfnTimeout) {
        this.addCmd('guanxing_choice', pfnRet, pfnTimeout);
        const param = {index, id, heroItemId};
        if (heroItemId === 0) {
            delete param.heroItemId;
        }
        this.send(this.user.make_cmd('pass_through_sys', 'guanxing_choice', param));
    }

    // 执行观星
    on_through_guanxing_choice(result) {
        this.finishCmd('guanxing_choice', result);
    }

    // 下一关
    do_through_next_pattern(pfnRet, pfnTimeout) {
        this.addCmd('next_pattern', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'next_pattern',));
    }

    // 下一关
    on_through_next_pattern(result) {
        this.finishCmd('next_pattern', result);
    }

    // 领取宝箱
    do_through_open_box(index, id, pfnRet, pfnTimeout) {
        this.addCmd('open_box', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('pass_through_sys', 'open_box', {index, id}));
    }

    // 领取宝箱
    on_through_open_box(result) {
        this.finishCmd('open_box', result);
    }


    // 获取分享领奖详情
    do_share_treasure_info(pfnRet, pfnTimeout) {
        this.addCmd('share_treasure_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'share_treasure_info'));
    }

    // 获取分享领奖详情
    on_share_treasure_info(result) {
        this.finishCmd('share_treasure_info', result);
    }


    // 获取最终奖励
    do_get_share_treasure_final(boxId, pfnRet, pfnTimeout) {
        this.addCmd('get_share_treasure_final', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_share_treasure_final', {boxId}));
    }

    // 获取最终奖励
    on_get_share_treasure_final(result) {
        this.finishCmd('get_share_treasure_final', result);
    }


    // 执行分享领奖
    do_get_share_treasure(treasureId, pfnRet, pfnTimeout) {
        this.addCmd('get_share_treasure', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_share_treasure', {treasureId}));
    }

    // 执行分享领奖
    on_get_share_treasure(result) {
        this.finishCmd('get_share_treasure', result);
    }

    // 放弃领奖
    do_quit_share_treasure(treasureId, pfnRet, pfnTimeout) {
        this.addCmd('quit_share_treasure', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'quit_share_treasure', {treasureId}));
    }

    // 放弃领奖
    on_quit_share_treasure(result) {
        this.finishCmd('quit_share_treasure', result);
    }

    // 查看士兵详情
    do_click_soldier(pfnRet, pfnTimeout) {
        this.addCmd('click_soldier', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'click_soldier'));
    }

    // 查看士兵详情
    on_click_soldier(result) {
        this.finishCmd('click_soldier', result);
    }

    // 查看贪吃蛇详情
    do_snake_info(pfnRet, pfnTimeout) {
        this.addCmd('snake_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'snake_info'));
    }

    // 查看贪吃蛇详情
    on_snake_info(result) {
        this.finishCmd('snake_info', result);
    }

    // 完成贪吃蛇
    do_finish_snake(pfnRet, pfnTimeout) {
        this.addCmd('finish_snake', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'finish_snake', {score: randomRangeInt(1500, 1500)}));
    }

    // 完成贪吃蛇
    on_finish_snake(result) {
        this.finishCmd('finish_snake', result);
    }


    // 获取贪吃蛇奖励信息
    do_get_snake_reward_info(pfnRet, pfnTimeout) {
        this.addCmd('get_snake_reward_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_snake_reward_info'));
    }

    // 获取贪吃蛇奖励信息
    on_get_snake_reward_info(result) {
        this.finishCmd('get_snake_reward_info', result);
    }

    // 贪吃蛇领奖
    do_receive_snake_reward(stage, pfnRet, pfnTimeout) {
        this.addCmd('receive_snake_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'receive_snake_reward', {stage}));
    }

    // 贪吃蛇领奖
    on_receive_snake_reward(result) {
        this.finishCmd('receive_snake_reward', result);
    }

    // 合成英雄碎片
    do_use_hero_shard(shardItemId, heroNum, pfnRet, pfnTimeout) {
        this.addCmd('use_hero_shard', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'use_hero_shard', {shardItemId, heroNum}));
    }

    // 合成英雄碎片
    on_use_hero_shard(result) {
        this.finishCmd('use_hero_shard', result);
    }


    // 英雄升星
    do_fuse_hero(heroItemId, fusedHeroes, stars, pfnRet, pfnTimeout) {
        this.addCmd('fuse_hero', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'fuse_hero', {heroItemId, fusedHeroes, multi: true, stars}));
    }

    // 英雄升星
    on_fuse_hero(result) {
        this.finishCmd('fuse_hero', result);
    }

    // 一键赠送给体力
    do_one_click_send_recv_strength(pfnRet, pfnTimeout) {
        this.addCmd('one_click_send_recv_strength', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('social', 'one_click_send_recv_strength'));
    }

    // 一键赠送给体力
    on_one_click_send_recv_strength(result) {
        this.finishCmd('one_click_send_recv_strength', result);
    }


    // 挑战自家门前boss
    do_sweepBoss(bossId, targetUserId, number, troop, tacticId, pfnRet, pfnTimeout) {
        this.addCmd('sweepBoss', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'sweepBoss', {
            bossId, targetUserId, number, troop, tacticId, "scene": {
                "scene": "boss"
            }, "troopType": "attack",
        }));
    }

    // 挑战自家门前boss
    on_sweepBoss(result) {
        this.finishCmd('sweepBoss', result);
    }


    // 分解英雄
    do_disassemble_heroes(heroItemIds, pfnRet, pfnTimeout) {
        this.addCmd('disassemble_heroes', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'disassemble_heroes', {heroItemIds}));
    }

    // 分解英雄
    on_disassemble_heroes(result) {
        this.finishCmd('disassemble_heroes', result);
    }


    // 领取邮件
    do_pick_up(mailId, pfnRet, pfnTimeout) {
        this.addCmd('pick_up', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('mail', 'pick_up', {mailId}));
    }

    // 领取邮件
    on_pick_up(result) {
        this.finishCmd('pick_up', result);
    }

    // 领取赛季杯奖励
    do_trophy_match(pfnRet, pfnTimeout) {
        this.addCmd('trophy_match_daily_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('trophy_match', 'daily_reward'));
    }

    // 领取赛季杯奖励
    on_trophy_match(result) {
        this.finishCmd('trophy_match_daily_reward', result);
    }

    // 获取中军帐信息
    do_slg_match_info(pfnRet, pfnTimeout) {
        this.addCmd('slg_match_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'slg_match_info', {
            "isSignUp": 1,
            "isMatch": 1,
            "isReward": 1,
            "isDesc": 1
        }));
    }

    // 获取中军帐信息
    on_slg_match_info(result) {
        this.finishCmd('slg_match_info', result);
    }

    // 进入战场
    do_slg_enter_battle_ground(belongs, pfnRet, pfnTimeout) {
        this.addCmd('slg_enter_battle_ground', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'slg_enter_battle_ground', {belongs}));
    }

    // 进入战场
    on_slg_enter_battle_ground(result) {
        this.finishCmd('slg_enter_battle_ground', result);
    }

    // 获取部队信息
    do_slg_get_troops(pfnRet, pfnTimeout) {
        this.addCmd('slg_get_troops', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'slg_get_troops'));
    }

    // 获取部队信息
    on_slg_get_troops(result) {
        this.finishCmd('slg_get_troops', result);
    }

    /**
     * 地块操作
     * @param op {1|5|3|9} -- 1.侦查 5.移动 3.攻击 7.放弃
     * @param hexagonId {number} -- 目标地块
     * @param formationId {string} -- 部队id
     * @param pfnRet
     * @param pfnTimeout
     */
    do_slg_op_hexagon(op, hexagonId, formationId, pfnRet, pfnTimeout) {
        this.addCmd('slg_op_hexagon', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'slg_op_hexagon', op === 1 || op === 9 ? {op, hexagonId} : {
            op,
            hexagonId,
            formationId,
            attackType: 1
        }));
    }

    // 地块操作
    on_slg_op_hexagon(result) {
        this.finishCmd('slg_op_hexagon', result);
    }

    /** 调整队伍 */
    do_slg_set_troop(troops, troopId, pfnRet, pfnTimeout) {
        this.addCmd('slg_set_troop', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'slg_set_troop', {troops, troopId}));
    }

    // 调整队伍
    on_slg_set_troop(result) {
        this.finishCmd('slg_set_troop', result);
    }

    // 获取答题信息
    do_get_qingdian_act_info(pfnRet, pfnTimeout) {
        this.addCmd('get_qingdian_act_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_qingdian_act_info', {'actId': 'act_questionnaire'}));
    }

    // 获取答题信息
    on_get_qingdian_act_info(result) {
        this.finishCmd('get_qingdian_act_info', result);
    }

    // 获取题目
    do_questionnaire_info(pfnRet, pfnTimeout) {
        this.addCmd('questionnaire_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'questionnaire_info', {'functionId': 'questionnaire_gongce'}));
    }

    // 获取题目
    on_questionnaire_info(result) {
        this.finishCmd('questionnaire_info', result);
    }

    /**
     * 提交答案
     * @param answer {number[]}
     * @param questionId {string}
     * @param pfnRet
     * @param pfnTimeout
     */
    do_questionnaire_answer(answer, questionId, pfnRet, pfnTimeout) {
        this.addCmd('questionnaire_answer', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'questionnaire_answer', {
            answer,
            questionId,
            ts: getTime(),
            'functionId': 'questionnaire_gongce'
        }));
    }

    // 提交答案
    on_questionnaire_answer(result) {
        this.finishCmd('questionnaire_answer', result);
    }

    // 英雄置换
    do_executeReplace(heroItemId, pfnRet, pfnTimeout) {
        this.addCmd('executeReplace', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'executeReplace', {heroItemId}));
    }

    // 英雄置换
    on_executeReplace(result) {
        this.finishCmd('executeReplace', result);
    }

    // 保存置换
    do_saveHeroReplace(oldHeroId, newHeroId, heroItemId, pfnRet, pfnTimeout) {
        this.addCmd('saveHeroReplace', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'saveHeroReplace', {oldHeroId, newHeroId, heroItemId}));
    }

    // 保存置换
    on_saveHeroReplace(result) {
        this.finishCmd('saveHeroReplace', result);
    }

    // 检查是否可以进行军团祈愿
    do_is_can_enter_donate_card(pfnRet, pfnTimeout) {
        this.addCmd('is_can_enter_donate_card', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'is_can_enter_donate_card'));
    }

    // 检查是否可以进行军团祈愿
    on_is_can_enter_donate_card(result) {
        this.finishCmd('is_can_enter_donate_card', result);
    }

    // 获取军团祈愿信息
    do_enter_donate_hall(pfnRet, pfnTimeout) {
        this.addCmd('enter_donate_hall', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'enter_donate_hall'));
    }

    // 获取军团祈愿信息
    on_enter_donate_hall(result) {
        this.finishCmd('enter_donate_hall', result);
    }

    // 获取军团祈愿列表
    do_legion_wish_list(pfnRet, pfnTimeout) {
        this.addCmd('legion_wish_list', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'legion_wish_list'));
    }

    // 获取军团祈愿列表
    on_legion_wish_list(result) {
        this.finishCmd('legion_wish_list', result);
    }

    // 添加军团祈愿
    do_add_shard_wish(wishId, pfnRet, pfnTimeout) {
        this.addCmd('add_shard_wish', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'add_shard_wish', {wishId}));
    }

    // 添加军团祈愿
    on_add_shard_wish(result) {
        this.finishCmd('add_shard_wish', result);
    }

    // 领取祈愿奖励
    do_get_wish(wishId, pfnRet, pfnTimeout) {
        this.addCmd('get_wish', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'get_wish', {wishId}));
    }

    // 领取祈愿奖励
    on_get_wish(result) {
        this.finishCmd('get_wish', result);
    }

    // 助力祈愿
    do_help_donate_card(wishId, donatedUserId, pfnRet, pfnTimeout) {
        this.addCmd('help_donate_card', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'help_donate_card', {wishId, donatedUserId}));
    }

    // 助力祈愿
    on_help_donate_card(result) {
        this.finishCmd('help_donate_card', result);
    }

    // 全部祈愿完成奖励
    do_get_complete_wish_reward(pfnRet, pfnTimeout) {
        this.addCmd('get_complete_wish_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('legion', 'get_complete_wish_reward', {rewardIndex: null}));
    }

    // 全部祈愿完成奖励
    on_get_complete_wish_reward(result) {
        this.finishCmd('get_complete_wish_reward', result);
    }

    // 获取红包列表
    do_get_legion_red_bag_info(pfnRet, pfnTimeout) {
        this.addCmd('get_legion_red_bag_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_legion_red_bag_info'));
    }

    // 获取红包列表
    on_get_legion_red_bag_info(result) {
        this.finishCmd('get_legion_red_bag_info', result);
    }

    // 领取红包
    do_get_legion_red_bag_reward(id, pfnRet, pfnTimeout) {
        this.addCmd('get_legion_red_bag_reward', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'get_legion_red_bag_reward', {id, isGet: 1}));
    }

    // 领取红包
    on_get_legion_red_bag_reward(result) {
        this.finishCmd('get_legion_red_bag_reward', result);
    }


    // 进入古籍阁
    do_ancient_books_draw_info(pfnRet, pfnTimeout) {
        this.addCmd('ancient_books_draw_info', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'ancient_books_draw_info'));
    }

    // 进入古籍阁
    on_ancient_books_draw_info(result) {
        this.finishCmd('ancient_books_draw_info', result);
    }

    // 免费古籍勘探
    do_ancient_books_draw(pfnRet, pfnTimeout) {
        this.addCmd('ancient_books_draw', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'ancient_books_draw', {
            'pay': 0,
            'count': 1,
            'type': 'common'
        }));
    }

    // 免费古籍勘探
    on_ancient_books_draw(result) {
        this.finishCmd('ancient_books_draw', result);
    }

    // 洗练
    do_holy_quenching(heroItemId, force, etype, pfnRet, pfnTimeout) {
        this.addCmd('holy_quenching', pfnRet, pfnTimeout);
        this.send(this.user.make_cmd('game', 'holy_quenching', {
            heroItemId,
            etype,
            lock_attrs: [],
            force,
        }));
    }

    // 洗练
    on_holy_quenching(result) {
        this.finishCmd('holy_quenching', result);
    }

    async do_qingdian_memory_reward() {
        this.send(this.user.make_cmd('game', 'qingdian_memory_reward'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.game.qingdian_memory_reward = ret => {
                resolve(ret.result);
                this.cmdProcess.game.qingdian_memory_reward = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    // 查看南征北战信息
    async do_adventure_info() {
        this.send(this.user.make_cmd('adventure', 'adventure_info'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.adventure_info = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.adventure_info = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 开启南征北战
     * @param {string[][]} troops -- [["61fcb5066a725c06880b76e2", "5fd38107fe3ec3bf481d01f9", "5fe960effe3ec35ad6a83de1", "600d1cf3c5fd014f8f1ed361", "62b55d5c862066d3e5a96bdf"], ["5f526191c5fd0129fd6a672d", "5f1127f4c5fd017b2120a567", "5e91f6d4c5fd01ea7044a81a", "5ef8191fc5fd01e0660d9acb", "6280e9006a725cafa5b438e2"], ["5ebf34a9c42770482d7f669d", "650adfa29ae40fea0853c68f", "6506ca479ae40fea0853c0c7", "650ed42e9ae40f8ce26838aa", "6506ca3d9ae40fea0853c0ba"]],
     * @param {string[]} tactics  --  ["snake", "goose", "gossip"]
     * @param {number} index
     * @return {Promise<unknown>}
     */
    async do_start_adventure(troops, tactics, index = 1) {
        this.send(this.user.make_cmd('adventure', 'start_adventure', {troops, tactics, index}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.start_adventure = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.start_adventure = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 获取南征北战
     */
    async do_get_adventure() {
        this.send(this.user.make_cmd('adventure', 'get_adventure', {needUnfinishedEvent: 1}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.get_adventure = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.get_adventure = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 行军一次
     */
    async do_explore_once() {
        this.send(this.user.make_cmd('adventure', 'explore_once'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.explore_once = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.explore_once = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 完成奖励探索
     * @param {string} type
     * @param {string} ID
     * @param {number} op -- 0.放弃 1.领取
     * @return {Promise<any>}
     */
    async do_finish_reward_explore(type, ID, op) {
        this.send(this.user.make_cmd('adventure', 'finish_reward_explore', {type, ID, op}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.finish_reward_explore = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.finish_reward_explore = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 完成战斗探索
     */
    async do_finish_fighting_explore(type, ID, op, troopType, troop, tacticId) {
        this.send(this.user.make_cmd('adventure', 'finish_fighting_explore', {
            type,
            ID,
            op,
            troopType,
            troop,
            tacticId
        }));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.finish_fighting_explore = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.finish_fighting_explore = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 恢复耐力
     */
    async do_recover_endurance() {
        this.send(this.user.make_cmd('adventure', 'recover_endurance'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.recover_endurance = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.recover_endurance = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 获取南征北战状态
     */
    async do_get_travell_list() {
        this.send(this.user.make_cmd('game', 'get_travell_list'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.game.get_travell_list = ret => {
                resolve(ret.result);
                this.cmdProcess.game.get_travell_list = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 获取奇遇商店
     */
    async do_get_explore_shop() {
        this.send(this.user.make_cmd('adventure', 'get_explore_shop'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.get_explore_shop = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.get_explore_shop = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 购买奇遇商店物品
     */
    async do_buy_goods(index) {
        this.send(this.user.make_cmd('adventure', 'buy_goods', {index}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.buy_goods = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.buy_goods = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 领取南征北战奖励
     */
    async do_get_adventure_reward() {
        this.send(this.user.make_cmd('adventure', 'get_reward'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.adventure.get_reward = ret => {
                resolve(ret.result);
                this.cmdProcess.adventure.get_reward = undefined;
            }
            setTimeout(() => reject('timeout'), 10000);
        });
    }

    /**
     * 查看乱斗信息
     */
    async do_legion_melee_main_info() {
        this.send(this.user.make_cmd('game', 'legion_melee_main_info'));
        return new Promise((resolve, reject) => {
            this.cmdProcess.game.legion_melee_main_info = ret => {
                resolve(ret.result);
                this.cmdProcess.game.legion_melee_main_info = undefined;
            }
            setTimeout(() => reject('查看乱斗超时'), 10000);
        });
    }

    /**
     * 进入乱斗
     */
    async do_legion_melee_reenter(groupId) {
        this.send(this.user.make_cmd('game', 'legion_melee_reenter', {groupId}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.game.legion_melee_reenter = ret => {
                resolve(ret.result);
                this.cmdProcess.game.legion_melee_reenter = undefined;
            }
            setTimeout(() => reject('进入乱斗超时'), 10000);
        });
    }

    /**
     * 开始挑战
     */
    async do_legion_melee_challenge(groupId, targetUserId) {
        this.send(this.user.make_cmd('game', 'legion_melee_challenge', {groupId, targetUserId}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.game.legion_melee_challenge = ret => {
                resolve(ret.result);
                this.cmdProcess.game.legion_melee_challenge = undefined;
            }
            setTimeout(() => reject('挑战超时'), 10000);
        });
    }

    /**
     * 匹配
     */
    async do_legion_melee_match(groupId) {
        this.send(this.user.make_cmd('game', 'legion_melee_match', {groupId}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.game.legion_melee_match = ret => {
                resolve(ret.result);
                this.cmdProcess.game.legion_melee_match = undefined;
            }
            setTimeout(() => reject('匹配超时'), 10000);
        });
    }

    /**
     * 乱斗附加购买
     */
    async do_legion_melee_buy_addition(groupId, level) {
        this.send(this.user.make_cmd('game', 'legion_melee_buy_addition', {groupId, level}));
        return new Promise((resolve, reject) => {
            this.cmdProcess.game.legion_melee_buy_addition = ret => {
                resolve(ret.result);
                this.cmdProcess.game.legion_melee_buy_addition = undefined;
            }
            setTimeout(() => reject('增益选择超时'), 10000);
        });
    }


}
