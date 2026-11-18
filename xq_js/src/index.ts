import {copyText, initPack} from "./pack";
import {Log} from "./log";
import './style.css'
import {
    bossConfig,
    checkUserValid,
    chestConfig,
    downloadInfo, exchange,
    getArenaCount,
    getBossParam,
    getChestParam,
    getCurUser,
    getFightCount,
    getJiaofeiParam,
    getLegionBossParam,
    getMailIndex,
    getOnSweepParam,
    getSelUser,
    getShopParam,
    getStartParam,
    getSubs,
    getSweepParam,
    getTowerRewardParam,
    hideVip,
    initAd,
    jiaofeiConfig,
    legionBossConfig,
    onSweepConfig,
    setChestParam,
    setJiaofeiParam,
    setLegionBossParam,
    setOnSweepParam,
    setShopParam,
    setStartParam,
    setSubs,
    setSweepParam,
    shopConfig,
    showCloudManage,
    showHelp, showUserDownload,
    showVipDesc,
    showWorkState,
    startConfig,
    startWorkDlg,
    subsConfig,
    sweepConfig,
    tidyHeroEx,
    towerRewardConfig,
    updateStatus,
    updateSubs,
    updateUserInfo,
    uploadInfo
} from "./utils/common";
import {addUser, loadUser, saveUser, updateUser} from "./utils/storage";
import {WorkEx} from "./work/workEx";
import {zDownloadInfo} from "./utils/http";
import {Hero} from "./utils/hero";
import Swal from "sweetalert2";
import {donateConfig, getDonateParam, setDonateParam} from "./utils/commonEx";
import {enlistConfig, getEnlistParam, setEnlistParam} from "./utils/ui/enlistCfg";
import {quenchingConfig} from "./utils/ui/quenchingCfg";
import {UiShopEx} from "./utils/ui/uiShopEx";
import {UiAdventure} from "./utils/ui/uiAdventure";
import {UiMelee} from "./utils/ui/uiMelee";
import {UiSlg} from "./utils/ui/uiSlg";

declare global {
    interface Window {
        ToXqWnd?: (txt: string, type?: number) => void;
        zlog?: (txt: string) => void;
        verInfo?: (ver: string) => void;
        zDownloadInfo?: (txt: string) => void;
        userIn?: (user: any) => void;
        ppp?: (o: string | any[]) => void;
        updateProgress?: (percent: number) => void;
        onDetect?: () => void;
        onChangeUser?: () => void;
        onRefreshPage?: () => void;
        onStart?: () => void;
        hWnd?: string;
        work?: WorkEx;
        vecUser?: any[];
        curUserIndex?: number;
        onClearLog?: () => void;
        onHelp?: () => void;
        onLogScroll?: (e: any) => void;
        onCopyParam?: (e: any) => void;
        copyOldUrl?: () => void;
        copyWxUrl?: () => void;
        copyDownload?: () => void;
        copyAppUrl?: () => void;
        onFuncEnable?: () => void;
        onStop?: () => void;
    }
}

let work: WorkEx;


// 设置进程检查条件
window.ToXqWnd?.(JSON.stringify({
    name: 'process',
    vec: [
        {className: 'Chrome_WidgetWin_0', windowName: '胡莱三国手机版', processName: '', inChild: true},
        {className: 'Chrome_WidgetWin_0', windowName: '封神绘卷', processName: '', inChild: true},
        {className: '', windowName: '', processName: 'LdVBoxHeadless.exe', inChild: false},
        {className: '', windowName: '', processName: 'Ld9BoxHeadless.exe', inChild: false},
        {className: '#32770', windowName: '江东战场', inChild: false},
    ]
}));

// 设置内存检查条件
window.ToXqWnd?.(JSON.stringify({
    name: 'data',
    vec: [
        {name: 'server', begin: 'wss://', end: '/?base64=0'},
        {name: 'roleId'},
        {name: 'clientId'},
        {name: 'deviceId'},
        {
            name: 'authorCode',
            sub: [
                {begin: `"authorCode":"`, end: `"`},
                {begin: `"authorCode\":\"`, end: `\"`},
            ]
        },
    ]
}));


// 初始化加解密模块
initPack();

// 来自exe的添加日志指令
window.zlog = (txt) => {
    if (txt.indexOf('QQ用户请忽略') >= 0) {
        return;
    }
    Log.info(txt);
};

// 来自exe的版本信息指令
window.verInfo = (ver) => {
    if (ver !== '4.3') {
        Log.info(`小提醒：当前江东小乔并非最新版本，建议使用最新版本（下载地址在上方）。
最新版本为4.3，该版本大幅度提升了侦测速度和成功概率。`);
    }
};

let failCount = 0;

// 来自于exe的添加用户函数
window.userIn = function (user: {
    authorCode: any;
    userId?: any;
    gameId: any;
    clientId: any;
    platform: any;
    deviceId: any;
    code: any;
    clientVer: any;
    roleId: number;
    server: string;
}) {
    try {
        let author = JSON.parse(window.atob(user.authorCode));
        user.userId = author.uid;
    } catch (e) {
        Log.err('---探测到的数据有问题，请重新探测！');
        return;
    }
    user.gameId = 129;
    !user.clientId && (user.clientId = "H5_2.0_weixin.weixin.0-hall129.weixin.hulaisg");
    user.platform = '';
    if (user.deviceId.indexOf('qq') >= 0) {
        !user.clientId && (user.clientId = 'QQ_5.0_qq.qq.0-hall129.qq.hulaisg');
        user.platform = 'QQ';
        if (user.clientId.indexOf('fengshj') >= 0) {
            user.platform = 'QQ封神';
        }
    } else {
        if (user.clientId.indexOf('fengshj') >= 0) {
            user.platform = '封神';
        }
        delete user.code;
    }
    failCount = 0;
    !user.clientVer && (user.clientVer = "v5.6.1");
    if (!user.roleId) {
        user.roleId = 0;
    }
    addUser(user);
};

/**
 * 初始化vip模块
 */
function initVip() {

    if (hideVip) {
        document.getElementById("vip").style.display = 'none';
        return;
    }

    // 采矿设置
    document.getElementById("chest-config").addEventListener('click', () => onChestConfig());

    // 剿匪设置
    document.getElementById("jiaofei").addEventListener('click', () => onJiaofei());

    document.getElementById("donate").addEventListener('click', () => onDonate());

    // 招贤设置
    document.getElementById("enlist").addEventListener('click', () => onEnlist());

    // 珍宝阁武将结晶购买设置
    document.getElementById("shopEx").addEventListener('click', () => {
        const user = getCurUser();
        if (!user) {
            return;
        }
        const cfg = new UiShopEx(user.platform, user.roleId);
        cfg.showConfig().then(() => {
            Log.warn('--珍宝阁武将结晶购买设置已经被更新。');
            if (!work) {
                return;
            }
            work.configInfo.shopEx = cfg.param;
            work.shop.startNowOnSet('Shop');
        }).catch(console.error);
    });

    // 南征北战设置
    document.getElementById("adventure").addEventListener('click', () => {
        const user = getCurUser();
        if (!user) {
            return;
        }
        const cfg = new UiAdventure(user.platform, user.roleId);
        cfg.showConfig().then(() => {
            Log.warn('--南征北战设置已经被更新。');
            if (!work) {
                return;
            }
            work.configInfo.adventure = cfg.param;
            work.adventure.startNowOnSet('Adventure');
        }).catch(console.error);

    });

    // 军团大乱斗设置
    document.getElementById("melee").addEventListener('click', () => {
        const user = getCurUser();
        if (!user) {
            return;
        }
        const cfg = new UiMelee(user.platform, user.roleId);
        cfg.showConfig().then(() => {
            Log.warn('--军团大乱斗设置已经被更新。');
            if (!work) {
                return;
            }
            work.configInfo.melee = cfg.param;
            work.melee.startNowOnSet('Melee');
        }).catch(console.error);

    });

    // 中军帐设置
    document.getElementById("slg").addEventListener('click', () => {
        const user = getCurUser();
        if (!user) {
            return;
        }
        const cfg = new UiSlg(user.platform, user.roleId);
        cfg.showConfig().then(() => {
            Log.warn('--中军帐设置已经被更新。');
            if (!work) {
                return;
            }
            work.configInfo.slg = cfg.param;
            work.slg.startNowOnSet('Slg');
        }).catch(console.error);
    });


    document.getElementById("boss").addEventListener('click', () => onBoss());

    // 军团远征设置
    document.getElementById("legion-boss").addEventListener('click', () => onLegionBoss());

    // 试炼奖励领取
    document.getElementById("tower-reward").addEventListener('click', () => onTowerReward());

    // 珍宝阁设置
    document.getElementById("shop").addEventListener('click', () => onShop());

    // 试炼扫荡
    document.getElementById("sweep").addEventListener('click', () => onSweep());

    // 名将扫荡
    document.getElementById("on-sweep").addEventListener('click', () => onOnSweep());

    // 更新矿号
    document.getElementById("subs").addEventListener('click', () => onSubs());

    // 快速洗练
    document.getElementById("auto-quenching").addEventListener('click', () => onQuenching());

    // 自动爬塔
    document.getElementById("auto-tower").addEventListener('click', () => onTowerFight());

    // 自动武神

    // 整理英雄
    document.getElementById("tidy-hero").addEventListener('click', () => onTidyHero());

    // 自动比武
    document.getElementById("auto-arena").addEventListener('click', () => onArena());

    // 属臣战报
    document.getElementById("record").addEventListener('click', () => onRecord());

    // 攻城掠地

    // 武将置换
    document.getElementById("exchange").addEventListener('click', () => onExChange());

    // 数据上传
    document.getElementById("vip-upload").addEventListener('click', () => {
        let user = getCurUser();
        if (!user) {
            return;
        }
        if (!checkUserValid(user.authorCode)) {
            return;
        }
        uploadInfo(user);
    });

    // 数据下载
    document.getElementById("vip-download").addEventListener('click', () => {
        let user = getCurUser();
        if (!user) {
            return;
        }
        downloadInfo(ret => {
            let param = {
                platform: user.platform,
                roleId: user.roleId + '',
                configInfo: !!ret.config,
                subInfo: !!ret.sub
            };
            zDownloadInfo(param, (result) => {
                console.log('下载到的数据为：', result);
                if (ret.ErrMsg) {
                    Log.err("---数据下载失败：", ret.ErrMsg);
                    return
                }

                // 更新数据到本地
                if (result.ConfigInfo) {
                    try {
                        let configInfo = JSON.parse(result.ConfigInfo);
                        if (configInfo.vecEnable) {
                            setStartParam(user.platform, user.roleId, configInfo.vecEnable);
                            Log.info("---用户功能项设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.chest) {
                            setChestParam(user.platform, user.roleId, configInfo.chest);
                            Log.info("---采矿设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.jiaofei) {
                            setJiaofeiParam(user.platform, user.roleId, configInfo.jiaofei);
                            Log.info("---剿匪设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.shop) {
                            setShopParam(user.platform, user.roleId, configInfo.shop);
                            Log.info("---珍宝阁设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.shopEx) {
                            new UiShopEx(user.platform, user.roleId).param = configInfo.shopEx;
                            Log.info("---珍宝阁武将结晶购买设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.sweep) {
                            setSweepParam(user.platform, user.roleId, configInfo.sweep);
                            Log.info("---试炼扫荡设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.onSweep) {
                            setOnSweepParam(user.platform, user.roleId, configInfo.onSweep);
                            Log.info("---名将扫荡设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.legionBoss) {
                            setLegionBossParam(user.platform, user.roleId, configInfo.legionBoss);
                            Log.info("---军团远征设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.donate) {
                            setDonateParam(user.platform, user.roleId, configInfo.donate);
                            Log.info("---军团祈愿设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.enlist) {
                            setEnlistParam(user.platform, user.roleId, configInfo.enlist);
                            Log.info("---招贤纳士设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.adventure) {
                            new UiAdventure(user.platform, user.roleId).param = configInfo.adventure;
                            Log.info("---南征北战设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.melee) {
                            new UiMelee(user.platform, user.roleId).param = configInfo.melee;
                            Log.info("---军团大乱斗设置已经从服务器成功下载，下次开始时生效！");
                        }
                        if (configInfo.slg) {
                            new UiSlg(user.platform, user.roleId).param = configInfo.slg;
                            Log.info("---中军帐设置已经从服务器成功下载，下次开始时生效！");
                        }
                    } catch (e) {
                        Log.err('---解析服务器反馈的配置信息失败！');
                    }
                }
                if (result.SubInfo) {
                    try {
                        let vecSub = JSON.parse(result.SubInfo);
                        setSubs(user.platform, user.roleId, vecSub);
                        Log.info(`---用户库(${vecSub.length}条数据)已经从服务器成功下载，下次开始时生效！`)
                    } catch (e) {
                        Log.err('---解析服务器反馈的用户库信息失败！');
                    }
                }
                Log.info("---数据已经被成功下载！")
            }, () => Log.err("---数据下载失败！"));
        });
    });

    // 云侦测
    document.getElementById("user-download").addEventListener('click', () => {
        showUserDownload().catch(e => Log.err("出现错误：", e));
    });

    // 云说明
    document.getElementById("vip-desc").addEventListener('click', () => {
        showVipDesc();
    });

    // 云注册
    document.getElementById("vip-register").addEventListener('click', () => {
        Swal.fire({icon: 'info', titleText: '支付功能已经关闭', confirmButtonText: '知道了'});
    });

    // 云注册
    document.getElementById("pay-cloud").addEventListener('click', () => {
        Swal.fire({icon: 'info', titleText: '支付功能已经关闭', confirmButtonText: '知道了'});
    });

    // 云开始
    document.getElementById("vip-start").addEventListener('click', () => {
        let user = getCurUser();
        if (!user) {
            return;
        }
        startWorkDlg(user.platform, user.roleId);
    });

    // 云状态
    document.getElementById("vip-state").addEventListener('click', () => {
        let user = getCurUser();
        if (!user) {
            return;
        }
        showWorkState(user.platform, user.roleId);
    });

    // 网页端
    document.getElementById("vip-manage").addEventListener('click', () => {
        let user = getCurUser();
        if (!user) {
            return;
        }
        showCloudManage(user.platform, user.roleId);
    });


}

window.ppp = function (o: string | any[]) {
    if (typeof o !== 'string' || o.length < 1) {
        return;
    }

    // 第一个字符是括号，那么应该是原始字符串
    if (o[0] === '{') {
        addUser(JSON.parse(o));
        return;
    }

    // base64编码
    console.log('解析出来的结果：', decodeURIComponent(escape(window.atob(o))));
    const ret = JSON.parse(decodeURIComponent(escape(window.atob(o))));
    ret?.forEach(u => addUser(u));
};

// 提供给exe的更新进度条函数
window.updateProgress = percent => {
    (document.getElementById('progress') as HTMLProgressElement).value = percent;
};

// 禁止右键菜单
document.oncontextmenu = () => false;

// 探测
window.onDetect = () => {
    if (!window.hWnd || !window.ToXqWnd) {
        Log.err('---您的客户端版本需要升级！');
        return;
    }
    document.getElementById('prog').style.display = 'flex';
    window.ToXqWnd(window.hWnd, 1)
};


// 切换用户
window.onChangeUser = () => {
    if (window.work) {
        Log.err('--当前有账号正在运行中，当前状态下不允许切换用户，请重新载入！');
        return;
    }
    getSelUser(window.vecUser, window.curUserIndex, (vec, index) => {
        window.vecUser = vec;
        saveUser();
        updateUserInfo(index);
    });
};

// 刷新
window.onRefreshPage = () => {
    if (!window.hWnd || !window.ToXqWnd) {
        Log.err('---您的客户端版本需要升级！');
        return;
    }
    window.ToXqWnd(window.hWnd, 2)
};

// 开始按钮的消息响应
window.onStart = () => {

    // 不允许启动多个用户
    if (window.work) {
        Log.err('--已经有用户在运行中了！');
        return;
    }

    // 获取用户
    let user = getCurUser();
    if (!user) {
        return;
    }

    console.log('当前用户信息：', user);
    if (!checkUserValid(user.authorCode)) {
        return;
    }

    // 读取用户配置信息
    let configInfo = getConfigInfo(user.platform, user.roleId);

    // 从本地数据库读取属臣库
    configInfo.chest.vecSubs = getSubs(user.platform, user.roleId);

    if (configInfo.vecEnable.length === 0) {
        Log.err('---友情提醒：当前没有启动任何功能项，请先点击“功能”按钮对需要启动的内容进行勾选。');
    }

    // 启动用户模块
    window.work = new WorkEx(user, configInfo, (vec) => {

        // 保存属臣库到本地数据库
        updateSubs(user.platform, user.roleId, vec);

        // 更新当前配置参数
        window.work.configInfo.chest.vecSubs = getSubs(user.platform, user.roleId);
    }, () => updateStatus(), (platform, roleId, serverId, name) => updateUser(platform, roleId, serverId, name));
    work = window.work;

    // 开始按钮不再可用
    document.querySelectorAll('.disableOn').forEach(e => (e as HTMLButtonElement).disabled = true);
};

/**
 * 获取本地缓存中的用户配置信息
 * @param platform
 * @param roleId
 */
export function getConfigInfo(platform, roleId) {
    return {
        vecEnable: getStartParam(platform, roleId),
        chest: getChestParam(platform, roleId, true),
        jiaofei: getJiaofeiParam(platform, roleId),
        boss: getBossParam(platform, roleId),
        shop: getShopParam(platform, roleId),
        sweep: getSweepParam(platform, roleId),
        onSweep: getOnSweepParam(platform, roleId),
        legionBoss: getLegionBossParam(platform, roleId),
        towerReward: getTowerRewardParam(platform, roleId),
        donate: getDonateParam(platform, roleId),
        enlist: getEnlistParam(platform, roleId),
        shopEx: new UiShopEx(platform, roleId).param,
        adventure: new UiAdventure(platform, roleId).param,
        melee: new UiMelee(platform, roleId).param,
        slg: new UiSlg(platform, roleId).param
    }
}

/**
 * 使能项设置
 */
window.onFuncEnable = () => {

    // 获取用户
    let user = getCurUser();
    if (!user) {
        return;
    }

    // 启动配置
    startConfig([
        {name: 'Shop', desc: '自动购买珍宝阁商品', descEx: '注意：还需要在“设置”中进一步配置“珍宝阁”、“武将结晶”，购买内容才能生效。'},
        {name: 'InnRecruit', desc: '自动免费初级招募'},
        {name: 'Sweep', desc: '自动试炼扫荡', descEx: '注意：还需要在“设置”中进一步配置扫荡规模。'},
        {name: 'ExchangeGold', desc: '自动免费点金', descEx: '累计点金15次的奖励也会自动领取。'},
        {name: 'OnSweep', desc: '自动扫荡名将之路', descEx: '扫荡通关最高的那个国家，如需购买次数需要进一步设置。'},
        {name: 'ReceiveStrength', desc: '自动赠送体力'},
        {
            name: 'LegionBoss',
            desc: '自动挑战军团BOSS（默认两次，可修改为其它次数）',
            descEx: '说明：战斗将使用城门防守左边阵容（即大矿阵容）。'
        },
        {
            name: 'HoldChest1',
            desc: '自动采矿，注意：还需要点击“采矿”按钮进一步设置',
            descEx: '说明：占矿将使用城门防守阵容，大中小矿分别对应城门左中右阵容。'
        },
        {name: 'Jiaofei', desc: '自动剿匪，注意：还需要点击“剿匪”按钮进一步设置'},
        {name: 'Story', desc: '主线任务自动征收'},
        {name: 'StrengthReward', desc: '自动领取中午和晚上的免费体力'},
        {name: 'TowerReward', desc: '自动领取试炼奖励', descEx: '注意：还需要点击“试炼奖励1”按钮进一步设置'},
        {name: 'Legion', desc: '自动军团签到并领取军机处任务'},
        {
            name: 'Enlist',
            desc: '自动使用免费的招贤机会',
            descEx: '如没有设置心选武将，将根据当前设置（需要进入“设置”进一步设置）的国家选择一个武将'
        },
        {name: 'Free', desc: '自动签到、0元限购、每日限购等'},
        {name: 'Patrol', desc: '自动城头巡逻', descEx: '巡逻发现boss会根据体力的设置决定是否挑战，请记得设置对应的体力'},
        {name: 'Arena', desc: '自动比武', descEx: '自动比武只完成每天3次比武任务，并且只打机器人'},
        {name: 'PracticeEx', desc: '自动武神', descEx: '自动武神每周至多打一次，如没有配置阵容，将自动使用城门防守阵容'},
        {
            name: 'Jhqx',
            desc: '自动剑会群雄',
            descEx: '剑会群雄仅仅以完成每日任务为目标，只对机器人出手（面对机器人仍然有可能战败，请谨慎勾选）'
        },
        {
            name: 'Through',
            desc: '自动过关斩将',
        },
        {
            name: 'ShareTreasure',
            desc: '自动领取分享宝箱',
            descEx: '自动领取宝箱会尽可能让奖励最大化，因此会在必要时放弃某些宝箱'
        },
        {name: 'Mail', desc: '自动领取邮件', descEx: '自动领取不包含体力的邮件附件，每小时检查一次'},
        {
            name: 'Slg',
            desc: '中军帐刷地块',
            descEx: '为尽可能减少不公平，江东小乔只完成刷地块这个特别肝的功能，小乔只在占地已满之后才会去打地块（也就是说小乔不会去主动占地），并只在主城2周围2格距离（18个地块）内打空白地块。小乔只会动用和修改一号编队，保证每次打地块只上一个英雄，英雄体力低于30（可以在设置中修改）后会更换英雄。'
        },
        {
            name: 'Official',
            desc: '官职日常',
            descEx: '目前只完成官职日常任务中的“点金若干次”任务和“比武若干次”任务，有需要的用户可以酌情勾选'
        },
        {
            name: 'Donate',
            desc: '军团祈愿',
            descEx: '设置祈愿碎片的国家和花费元宝的次数，请在“设置”中进一步配置。'
        },
        {
            name: 'RedBag',
            desc: '军团红包',
            descEx: '每隔半小时检查一次军团红包，如果有红包将自动领取。'
        },
        {
            name: 'Adventure',
            desc: '南征北战',
            descEx: '请注意，还需要在设置中“南征北战”处进行进一步详细设置方可正常使用。'
        },
        {
            name: 'Melee',
            desc: '军团大乱斗',
            descEx: '请注意，还需要在设置中“军团大乱斗”处进行进一步详细设置方可正常使用。'
        }
    ], user.platform, user.roleId, () => Log.warn('--配置的修改已经被保存，将在下次开始的时候生效。'));
};


// 停止按钮的消息响应
window.onStop = () => {
    if (!window.work) {
        Log.err('--没有需要停止的工作！');
        return;
    }
    window.work.release();
    window.work.canRetry = false;
    window.work = null;
};

// 洗练按钮的消息响应
function onQuenching() {

    // 只有工作状态之下可以洗练
    if (!window.work) {
        Log.err('--停止状态下无法洗练！');
        return;
    }

    // 先设置好用户输入之后的处理
    quenchingConfig().then(param => window.work.quenching.startOnce(param)).catch(console.error);
}

// 爬塔按钮的消息响应
function onTowerFight() {

    // 只有工作状态之下可以爬塔
    if (!window.work) {
        Log.err('--停止状态下无法爬塔！');
        return;
    }

    // 先设置好用户输入之后的处理
    getFightCount((count) => {
        if (count <= 0) {
            Log.err("--自动爬塔没有开始：输入的爬塔次数不合法！");
            return;
        }
        window.work.towerFight.startOnce({count: count});
    });
}

// 武神按钮的消息响应

// 英雄整理
function onTidyHero() {

    // 只有工作状态之下可以打武神
    if (!window.work) {
        Log.err('--停止状态下无法进行英雄升星！');
        return;
    }

    // 执行英雄升星
    tidyHeroEx().then(param => window.work.tidyHero.startOnce(param));
}

function onExChange() {
    if (!window.work) {
        Log.err('--停止状态下无法进行武将置换！');
        return;
    }
    exchange().then((param: {
        country: string,
        heroes: string[],
        count: number
    }) => window.work.exchange.startOnce(param)).catch(console.error);
}

// 比武按钮的消息响应
function onArena() {

    // 只有工作状态之下可以打武神
    if (!window.work) {
        Log.err('--停止状态下无法打比武！');
        return;
    }

    // 先设置好用户输入之后的处理
    getArenaCount().then((count: number) => {
        if (count <= 0) {
            Log.err("--自动比武没有开始：输入的次数不合法！");
            return;
        }
        window.work.arena.startOnce({count: count});
    })
};

// 属臣战报的消息响应
function onRecord() {

    // 只有工作状态之下可以爬塔
    if (!window.work) {
        Log.err('--停止状态下无法查看属臣战报！');
        return;
    }

    // 弹出对话框，询问用户需要获取第几封邮件的战报
    getMailIndex((count) => {
        if (count <= 0) {
            Log.err("--查看属臣战报失败：输入的序号不合法！");
            return;
        }
        count--;

        // 获取邮件列表，并打开指定的邮件
        let work = window.work;
        let cmd = work.cmd;

        // 获取邮件列表
        new Promise((ok, err) => {
            let mails = [];
            cmd.do_get_mail_list(result => {
                let mail = result?.datamerge?.mail;
                Object.keys(mail).forEach(k => mail[k].type === 4 && mails.push(mail[k]));
                mails.sort((a, b) => b.createTime - a.createTime);
                if (count >= mails.length) {
                    err('请求的战报序号不存在（超过了属臣战报总数）');
                    return;
                }
                ok(mails[count].mailId);
            }, () => err('获取邮件列表超时'));
        }).then((mailId) => new Promise((ok, err) => {
            // 查看邮件内容
            cmd.do_get_mail_content(mailId, 4, result => {
                let downUrl = result?.mailContent?.report?.downUrl;
                if (!downUrl) {
                    err(`该邮件(${result?.mailContent?.desc})不包含战报信息`);
                    return;
                }
                ok({downUrl, desc: result?.mailContent?.desc})
            }, () => err('获取邮件详情超时'));
        })).then((o: any) => showMail(count, o.downUrl, o.desc)).catch(e => Log.err('执行出错：', e));
    });
};

function showMail(count, url, desc) {


    let heroes = [];
    let addStr = (src, added, prefix = '  ') => {
        return added ? (src + prefix + added + '<br>') : src;
    };

    let log = str => {
        str = str.substr(0, str.length - 4);
        Log.log(`<span style="font-size: 13px">${str}</span>`);
    };

    let xhr = new XMLHttpRequest;
    xhr.open('GET', url);
    xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
    xhr.responseType = "json";
    xhr.onload = () => {
        let mapHeroId = {};
        let record = xhr.response?.record;
        record?.troop1?.forEach(value => {
            let hero = new Hero('troop1', value.position);
            hero.update(value);
            heroes.push(hero);
            mapHeroId[`troop1_${value.position}`] = value.heroId;
        });
        console.log('---防守方：');
        record?.troop2?.forEach(value => {
            let hero = new Hero('troop2', value.position);
            hero.update(value);
            heroes.push(hero);
        });

        Log.warn(`---第${count + 1}封属臣战报：${desc}`);
        record?.rounds?.forEach((value, index) => {
            let str = `---第${index + 1}回合开战（每回合阵法加20点怒气）：<br>`;
            value.begin.forEach(item => str = addStr(str, heroes.find(v => v.isMe(item.troop, item.position))?.update(item)));
            log(str);

            value.attacks.forEach((item, i) => {
                str = `---第${index + 1}回合第${i + 1}次出手<br>`;
                str = addStr(str, heroes.find(v => v.isMe(item.attacker.troop, item.attacker.position))?.update(item.attacker));
                item.victims.forEach(vv => str = addStr(str, heroes.find(v => v.isMe(vv.troop, vv.position))?.update(vv)));
                item.friends.forEach(vv => str = addStr(str, heroes.find(v => v.isMe(vv.troop, vv.position))?.update(vv)));
                item.assistants?.forEach(vv => {
                    let assistant = vv.assistant;
                    let hero = heroes.find(v => v.isMe(assistant.troop, assistant.position));
                    let origin = heroes.find(v => v.isMe(assistant.troop, assistant.originPosition));
                    str = addStr(str, hero && origin && hero.assistantIn(origin.data.heroId, assistant.fire, assistant.hp, origin.data.shield));
                });
                log(str);
            });
            if (value.buffs.buffhp.length) {
                str = `---第${index + 1}回合结束前状态结算（灼烧流血等）：<br>`;
                value.buffs.buffhp.forEach(item => str = addStr(str, heroes.find(v => v.isMe(item.troop, item.position))?.update(item)));
                log(str);
            }

            if (value.end.length) {
                str = `---第${index + 1}回合结束前结算（护盾衰减等）：<br>`;
                value.end.forEach(item => str = addStr(str, heroes.find(v => v.isMe(item.troop, item.position))?.update(item)));
                log(str);
            }
        });
        Log.warn(`---第${count + 1}封属臣战报详情结束---`);

    };
    xhr.onabort = xhr.onerror = xhr.ontimeout = () => {
        console.log('请求失败：',)
    };
    xhr.send();
}

// 采矿设置按钮
const onChestConfig = () => {
    let user = getCurUser();
    if (!user) {
        return;
    }
    chestConfig(user.platform, user.roleId, true, (param) => {
        Log.warn('--采矿设置已经被更新。');
        window.work && work.hChest1.onConfigOK();
    });
};

// 矿号设置按钮
function onSubs() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    subsConfig(user.platform, user.roleId, !!window.work, (param) => window.work && work.hChest2.startOnce(param));
};

// 剿匪设置按钮
function onJiaofei() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    jiaofeiConfig(user.platform, user.roleId, true, () => {
        Log.warn('--剿匪设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.jiaofei = getJiaofeiParam(user.platform, user.roleId);
        work.jiaofei.onConfigOK();
    });
}

// 军团祈愿按钮
function onDonate() {
    const user = getCurUser();
    if (!user) {
        return;
    }
    donateConfig(user.platform, user.roleId).then(() => {
        Log.warn('--军团祈愿设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.donate = getDonateParam(user.platform, user.roleId);
        work.donate.startNow();
    }).catch(console.error);
}

// 招贤设置按钮
function onEnlist() {
    const user = getCurUser();
    if (!user) {
        return;
    }
    enlistConfig(user.platform, user.roleId).then(() => {
        Log.warn('--招贤纳士设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.enlist = getEnlistParam(user.platform, user.roleId);
        work.enlist.startNow();
    }).catch(console.error);
}

// Boss设置按钮
function onBoss() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    // 先设置好用户输入之后的处理
    bossConfig(user.platform, user.roleId).then(() => {
        if (!work) {
            return;
        }
        Log.warn('--Boss设置已经被更新，将在城门巡逻发现boss时生效。');
        work.configInfo.boss = getBossParam(user.platform, user.roleId);
    })
}


// 攻城略地的消息响应

// 军团远征设置按钮
function onLegionBoss() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    legionBossConfig(user.platform, user.roleId, () => {
        Log.warn('--军团Boss设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.legionBoss = getLegionBossParam(user.platform, user.roleId);
        work.legionBoss.startNowOnSet('LegionBoss');
    });
};

// 试炼奖励设置按钮
function onTowerReward() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    towerRewardConfig(user.platform, user.roleId).then(() => {
        Log.warn('--试炼奖励设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.towerReward = getTowerRewardParam(user.platform, user.roleId);
        work.towerReward.startNowOnSet('TowerReward');
    });
};

// 珍宝阁设置按钮
function onShop() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    shopConfig(user.platform, user.roleId, () => {
        Log.warn('--珍宝阁购买设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.shop = getShopParam(user.platform, user.roleId);
        work.shop.startNowOnSet('Shop');
    });
};

// 扫荡设置按钮
function onSweep() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    sweepConfig(user.platform, user.roleId, () => {
        Log.warn('--试炼扫荡设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.sweep = getSweepParam(user.platform, user.roleId);
        work.sweep.startNowOnSet('Sweep');
    });
};

// 名将扫荡设置按钮
function onOnSweep() {
    let user = getCurUser();
    if (!user) {
        return;
    }
    onSweepConfig(user.platform, user.roleId, () => {
        Log.warn('--名将扫荡设置已经被更新。');
        if (!window.work) {
            return;
        }
        work.configInfo.onSweep = getOnSweepParam(user.platform, user.roleId);
        work.onSweep.startNowOnSet('OnSweep');
    });
}

// 清除日志按钮的消息响应
window.onClearLog = Log.clear;

// 帮助按钮的消息响应
window.onHelp = showHelp;

// 用户改变勾选了日志滚动
window.onLogScroll = e => Log.setAutoScroll(e.checked);

// 用户复制登录信息
window.onCopyParam = (e) => {

    switch (e.key) {
        case 'c':
            console.log('用户执行复制操作：', window.vecUser);
            copyText(`${window.btoa(unescape(encodeURIComponent(JSON.stringify(window.vecUser))))}`);
            break;
        case 'v':
            let userInput = prompt();
            if (userInput === "check") {
                window.work && window.work.checkVipInfo();
            } else if (userInput === 'share') {
                window.work && window.work.share.startOnce();
            } else if (userInput === 'pass') {
                window.work && window.work.passThrough.startOnce();
            } else {
                window.ppp(userInput);
            }
            break;
        case 't':
            window.work && window.work.test();
            break;
    }
};

window.copyOldUrl = () => {
    copyText('https://server-4.example.invalid/q/');
    Swal.fire(
        '江东小乔',
        '链接已经复制到剪切板。',
        'success'
    ).then();
}

window.copyWxUrl = () => {
    copyText('http://server-9.example.invalid/ax/WeChatSetup2.9.5.exe');
    Swal.fire(
        '江东小乔',
        '链接已经复制到剪切板。',
        'success'
    ).then();
}

window.copyDownload = () => {
    copyText('http://server-9.example.invalid/ax/xq4.3.7z');
    Swal.fire(
        '江东小乔',
        '下载链接已经复制到剪切板，请使用浏览器或下载工具打开。',
        'success'
    ).then();
}

window.copyAppUrl = () => {
    copyText('http://server-9.example.invalid/ax/xq-1.1.apk');
    Swal.fire(
        '江东小乔',
        '江东小乔App下载链接已经复制到剪切板，请使用浏览器或下载工具打开。',
        'success'
    ).then();
}



// 初始化自动载入用户信息
loadUser(true);

// 初始化vip相关按钮
initVip();

// 更新按钮状态
WorkEx.updateButton(false);

// 更新用户状态
updateUserInfo();

// 更新广告模块
initAd();
