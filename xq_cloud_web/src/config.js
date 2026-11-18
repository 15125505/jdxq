import Swal from 'sweetalert2'
import QRCode from "qrcodejs2";
import {Log} from "./log";
import {
    getBossParam,
    getChestParam, getConfigInfo,
    getJiaofeiParam, getLegionBossParam, getOnSweepParam, getShopParam,
    getStartParam, getSweepParam, getTowerRewardParam, setBossParam, setChestParam,
    setJiaofeiParam,
    setLegionBossParam, setOnSweepParam, setShopParam,
    setStartParam, setSweepParam, setTowerRewardParam
} from "./params";
import {addOnceWork, checkQr, downloadInfo, getSubCount, payQr, startWork, uploadInfo, workState} from "./http";
import {orangeHero} from "./allHero";
import {setDonateParam} from "./paramEx";
import {setEnlistParam} from "./ui/enlistCfg";
import {UiShopEx} from "./ui/uiShopEx";
import {UiAdventure} from "./ui/uiAdventure";
import {UiMelee} from "./ui/uiMelee";
import {UiSlg} from "./ui/uiSlg";

export async function TestDlg() {
    await Swal.fire({
        title: 'Error!',
        text: 'Do you want to continue',
        icon: 'error',
        confirmButtonText: 'Cool'
    })
}


class Config {

    constructor() {
        this.platform = '';
        this.roleId = '';
        this.key = '';
    }

    init(param) {
        this.platform = param.platform;
        this.roleId = param.roleId;
        this.key = param.key;
    }

    /**
     * 获取用户信息
     * @return {{roleId: string, platform: string, key: string}}
     */
    get userInfo() {
        return {
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
        }
    }

    /**
     * 检查用户状态
     */
    checkUser() {
        if (!this.roleId || !this.key) {
            Log.err('当前不是一个正确的云用户网页，请重新获取云用户管理页面！');
            return false;
        }
        return true;
    }

    /**
     * 检查当前是否可以进入配置状态
     */
    async checkConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 然后检查配置

        // 如果当前用户本地存在配置，那么返回true
        // 如果当前用户本地不存在配置，那么从云端下载配置，然后返回true
        return true;
    }

    /**
     * 云开始
     */
    async start() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 访问服务器
        Log.log("--正在开始当前账号的江东云...");
        const retString = await startWork(this.userInfo);

        // 确认返回结果
        Log.info("--服务器反馈：", retString);
        if (retString === '您已经成功开始') {
            Log.log("--小提示：点击“云状态”可以随时查看云端状态和最近日志（该日志每隔30秒采集一次）。<span class='cr2'>请给服务器一点时间检查账号状态，3秒钟后会自动查询一次状态，请稍候...</span>");
            setTimeout(onState, 3000);
        }
    }

    async state() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 访问服务器
        Log.log("--正在查询云端状态...");
        const ret = await workState(this.userInfo);

        if (ret.VipState.indexOf('赠送') >= 0) {
            Log.info(`<b class="cr2">${ret.VipState}</b>`)
        }

        // 解析反馈信息
        if (ret.UserInfoErr === 'SYS_LOGOUT_OTHER_LOGIN') {
            ret.UserInfoErr = '账号在其它地方登录';
        }
        let stateString = `--当前状态：
 <b class="${ret.State ? 'cr2' : 'cr3'}">${ret.State ? '已开始' : '停止: ' + ret.UserInfoErr}</b>
 登录信息<span class="${ret.IsUserInfoOK ? 'cr2' : 'cr3'}">${ret.IsUserInfoOK ? '' + ret.UserInfoTime : '尚未'}</span>上传
 用户配置信息<b class="${ret.IsConfigOK ? 'cr2' : 'cr3'}">${ret.IsConfigOK ? '已经' : '尚未'}</b>上传
 用户属臣库<b class="${ret.IsSubOK ? 'cr2' : 'cr3'}">${ret.IsSubOK ? '已经' : '尚未'}</b>上传
 最近更新：<span class="cr2">${ret.WorkTime}</span>
 云有效期：<span class="cr2">${ret.VipTime ? ret.VipTime : '未注册云'}</span>`;
        if (ret.VipTime) {
            stateString += '\n ';
            if (ret.LeftDays >= 0) {
                stateString += `云有效期剩余<b class="cr2">${Math.floor(ret.LeftDays)}</b>天`
            } else {
                stateString += `云已经过期<b class="cr3">${Math.floor(-ret.LeftDays)}</b>天`
            }
        }
        Log.info(stateString);
        ret.Logs && Log.info('---云端最近日志：<br><br>' + ret.Logs);

    }

    /**
     * 使能项设置
     */
    async onFuncEnable() {

        // 检查当前配置信息
        if (!await this.checkConfig()) {
            return;
        }

        // 配置选项列表
        const vecFunc = [
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
            {name: 'Enlist', desc: '自动使用免费的招贤机会', descEx: '如没有设置心选武将，将根据当前设置（需要进入“设置”进一步设置）的国家选择一个武将'},
            {name: 'Free', desc: '自动签到、0元限购、每日限购等'},
            {
                name: 'Patrol',
                desc: '自动城头巡逻',
                descEx: '巡逻发现boss会根据体力的设置决定是否挑战，请记得设置对应的体力'
            },
            {name: 'Arena', desc: '自动比武', descEx: '自动比武只完成每天3次比武任务，并且只打机器人'},
            {
                name: 'PracticeEx',
                desc: '自动武神',
                descEx: '自动武神每周至多打一次，如没有配置阵容，将自动使用城门防守阵容'
            },
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
            },
        ];

        // 取出上次保存的配置信息
        const param = getStartParam(this.platform, this.roleId);

        // 准备配置项
        let items = '';
        vecFunc.forEach(item => {
            items += `<label>`;
            items += `<input class="option" type="checkbox" onclick="onChangeOption()" name="${item.name}" ${param.find(v => v === item.name) ? 'checked' : ''}><span style="opacity: 0.8">${item.desc}</span>`;
            item.descEx && (items += `<br><span style="font-size: 14px; color: yellowgreen; padding-left: 20px">${item.descEx}</span>`);
            items += `</label>`;
        });

        // 创建需要弹出的东西
        let innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left; font-size: 17px">
    <label><input id="checkAll" onchange="onChangeCheckAll(this)" type="checkbox">全部（点击此处全选或全部不选）</label>
    <div style="display: flex; flex-direction: column">
    ${items}
    </div>
    <div>注意：有部分功能是无需设置，直接默认运行的。设置修改后将在下次“开始”时生效。</div>
</div>
`;

        // 用户点击了全选按钮，需要根据当前选中状态，修改下面所有的选项的状态
        window.onChangeCheckAll = function (e) {
            e.style.opacity = '1';
            document.querySelectorAll('.option').forEach(v => {
                v.checked = e.checked;
            });
        };

        // 用户点击了某个按钮，需要根据当前所有按钮的选中状态，修改全选按钮的状态
        window.onChangeOption = function () {
            let isSomeItemCheck = false;    // 是否有被选中的项
            let isSomeItemNoCheck = false;  // 是否有没有被选中的项
            document.querySelectorAll('.option').forEach(v => v.checked ? (isSomeItemCheck = true) : (isSomeItemNoCheck = true));
            let item = document.getElementById('checkAll');
            item.checked = isSomeItemCheck;
            if (isSomeItemCheck && isSomeItemNoCheck) {
                item.style.opacity = '0.5';
            } else {
                item.style.opacity = '1';
            }
        };


        // 弹出对话框
        const res = await Swal.fire({
            title: '选择本次启动的功能',
            html: innerHTML,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            didOpen: () => onChangeOption(),
            preConfirm: () => {
                let param = [];
                document.querySelectorAll('.option').forEach(v => v.checked && param.push(v.name));
                console.log('选中的内容有：', param);
                setStartParam(this.platform, this.roleId, param);
                return true;
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }


    /**
     * 采矿设置
     */
    async onChestConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }


        // 取出上次保存的配置信息
        const paramKey = 'chest_' + this.platform + this.roleId;
        const param = getChestParam(this.platform, this.roleId);

        // 创建需要弹出的东西
        const innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left">
    <div style="display: flex; flex-direction: column">
        <label>
            <input id="findInFriend" type="checkbox" ${param.findInFriend ? 'checked' : ''}><span>在好友家中找矿</span>
        </label>
        <label>
            <input id="findInRank" type="checkbox" ${param.findInRank ? 'checked' : ''}><span>在试炼排行榜用户家中找矿</span>
        </label>
        <label>
            <input id="findInSub" type="checkbox" ${param.findInSub ? 'checked' : ''}><span>在用户库中找矿</span>
        </label>   
    </div>
    <div style="padding: 8px 0">注意：选择<b style="color: yellowgreen">在用户库中找矿</b>时，需要先建立用户（矿号）库，建立方法请点击主界面<b style="color: yellowgreen">矿号</b>按钮。</div>
</div>
`;

        // 弹出对话框
        const res = await Swal.fire({
            title: '采矿设置',
            html: innerHTML,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: () => {
                let param = {};
                param.findInFriend = document.getElementById('findInFriend').checked;
                param.findInRank = document.getElementById('findInRank').checked;
                param.findInSub = document.getElementById('findInSub').checked;
                localStorage[paramKey] = JSON.stringify(param);
                return true;
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }

    /**
     * 配置剿匪参数
     */
    async jiaofeiConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 取出上次保存的配置信息
        let param = getJiaofeiParam(this.platform, this.roleId);

        // 创建需要弹出的东西
        let innerHTML = `
<div style="text-align: left">
    <div>
        <label>
            <input id="fei1" type="checkbox" ${param.fei1 ? 'checked' : ''}><span>黄巾兵</span>
        </label>
        <label>
            <input id="fei2" type="checkbox" ${param.fei2 ? 'checked' : ''}><span>山贼</span>
        </label>
        <label>
            <input id="fei3" type="checkbox" ${param.fei3 ? 'checked' : ''}><span>流寇</span>
        </label>
    </div>
    <div><label>
        达到 <input class="dlg-input" id="feiLevel" type="number" placeholder="匪徒等级" value="${param.feiLevel}"> 级的陌生人家盗匪
    </label></div>
    <div><label>
        达到 <input class="dlg-input" id="friendFeiLevel" type="number" placeholder="匪徒等级" value="${param.friendFeiLevel}"> 级的好友家盗匪
    </label></div>
    <div><label>
        超过 <input class="dlg-input" id="maxStrength" type="number" placeholder="体力" value="${param.maxStrength}"> 的体力会用于剿匪
    </label></div>
    <div>剿匪1小时检查一次。</div>
</div>
`;
        // 弹出对话框
        const res = await Swal.fire({
            title: '请设置剿匪条件',
            html: innerHTML,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: () => {
                let param = {};
                param.fei1 = document.getElementById('fei1').checked;
                param.fei2 = document.getElementById('fei2').checked;
                param.fei3 = document.getElementById('fei3').checked;
                param.feiLevel = parseInt(document.getElementById('feiLevel').value);
                param.friendFeiLevel = parseInt(document.getElementById('friendFeiLevel').value);
                param.maxStrength = parseInt(document.getElementById('maxStrength').value);
                if (param.feiLevel <= 0 || param.friendFeiLevel <= 0 || param.maxStrength < 10 || param.maxStrength >= 10000) {
                    Swal.showValidationMessage(`请检查输入的参数是否合法！`);
                    return false;
                }
                if (!param.fei1 && !param.fei2 && !param.fei3) {
                    Log.warn('--剿匪设置：由于没有选择任何一个剿匪项，下次启动时自动剿匪将停止！');
                }
                setJiaofeiParam(this.platform, this.roleId, param);
                return true;
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }


    /**
     * 配置城门boss参数
     */
    async bossConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 取出上次保存的配置信息
        const param = getBossParam(this.platform, this.roleId);

        // 弹出对话框
        const res = await Swal.fire({
            title: '请设置打Boss时保留的体力',
            input: 'number',
            inputValue: param.strength,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            inputAttributes: {
                min: 0,
                max: 1000,
                step: 10,
            },
            inputValidator: (value) => {
                if (!value) {
                    return '请输入一个数值';
                }
                if (value < 0 || value > 1000) {
                    return '数值必须在0和1000之间';
                }
                return null;
            },
            footer: '战斗使用城门左侧阵容，即大矿阵容。超出设置的体力，才会被用于打自家门前boss，请合理设置这个值，记住得低于剿匪的保留体力设置。否则的话，剿匪把体力用到低于这个值了，就没体力打boss了。',
        });
        if (!res.isConfirmed) {
            return
        }
        setBossParam(this.platform, this.roleId, {strength: res.value})
    }


    async legionBossConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 取出上次保存的配置信息
        let param = getLegionBossParam(this.platform, this.roleId);

        const res = await Swal.fire({
            title: '军团远征挑战BOSS次数',
            text: '注意：超过两次将花费元宝',
            input: 'number',
            inputValue: param.count,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                if (!v || isNaN(v) || v < 1 || v > 4) {
                    Swal.showValidationMessage(`请检查输入的参数是否合法！`);
                    console.log('输入参数不合法！');
                    return false;
                }
                param.count = v;
                setLegionBossParam(this.platform, this.roleId, param);
                return true;
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }

    /**
     * 珍宝阁参数
     */
    async shopConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }


        // 取出上次保存的配置信息
        let param = getShopParam(this.platform, this.roleId);

        // 配置信息
        let items = [
            {money: 'user_yuanbao', checked: false, off: 10, name: '勘探罗盘', item: "item:60005"},
            {money: 'user_yuanbao', checked: false, off: 10, name: '指点迷津', item: "item:1037"},
            {money: 'user_yuanbao', checked: false, off: 10, name: '高级招募令', item: "item:1005"},
            {money: 'user_yuanbao', checked: false, off: 10, name: '名将令', item: "item:1013"},
            {money: 'user_yuanbao', checked: false, off: 10, name: '情报值', item: 'item:1014'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '武魂', item: 'item:1001'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '紫魂', item: 'item:1002'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '蓝田玉', item: 'item:1003'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '四星武将碎片', item: 'shard_all_none_4'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '三星武将碎片', item: 'shard_all_none_3'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '金色祈愿符', item: 'item:1011'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '比武券', item: 'item:4003'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '银色祈愿符', item: 'item:1010'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '灵玉', item: 'item:1008'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '乌金', item: 'item:1026'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '祝福宝石', item: 'item:1027'},
            {money: 'user_yuanbao', checked: false, off: 10, name: '褪魔锤', item: 'item:1034'},
            {money: 'user_chip', checked: false, off: 10, name: '武魂', item: 'item:1001'},
            {money: 'user_chip', checked: false, off: 10, name: '紫魂', item: 'item:1002'},
            {money: 'user_chip', checked: false, off: 10, name: '蓝田玉', item: 'item:1003'},
            {money: 'user_chip', checked: false, off: 10, name: '四星武将碎片', item: 'shard_all_none_4'},
            {money: 'user_chip', checked: false, off: 10, name: '三星武将碎片', item: 'shard_all_none_3'},
            {money: 'user_chip', checked: false, off: 10, name: '比武券', item: 'item:4003'},
            {money: 'user_chip', checked: false, off: 10, name: '银色祈愿符', item: 'item:1010'},
        ];

        // 使用当前用户配置，对当前内容进行更新
        items.forEach(v => {
            let node = param.vec.find(vv => v.money === vv.money && v.item === vv.item);
            if (node) {
                v.off = node.off;
                v.checked = node.checked;
            }
        });

        // 配置信息
        let itemString = ``;
        items.forEach(v => {
            itemString += `<div><label class="buy-item shop-config-item"><input type="checkbox" ${v.checked ? 'checked' : ''}> 使用<b>${v.money === 'user_yuanbao' ? '元宝' : '铜钱'}</b>购买<input class="off" type="number" value="${v.off}">折或更加优惠的<b>${v.name}</b></label></div>`
        });

        // 创建需要弹出的东西
        let innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left; font-size: 17px">
    <div>购买珍宝阁物品，会导致元宝或银两减少，请谨慎设置。</div>
    <div style="display: flex; flex-direction: column">
    ${itemString}
    </div>
    <label><input type="checkbox" id="freeRefresh" ${param.freeRefresh ? 'checked' : ''}> 所有符合条件的物品购买完成后，自动免费刷新。</label>
    <label><input type="checkbox" id="moneyRefresh" ${param.moneyRefresh ? 'checked' : ''}> 所有符合条件的物品购买完成后，自动免费和元宝刷新。</label>
    <label><input type="checkbox" id="raffle" ${param.raffle ? 'checked' : ''}> 自动刷新购买福星阁高抽。</label>
    <div>注意：拖动右侧滚动条可以看到更多勾选项。</div>
</div>
`;


        // 弹出对话框
        const res = await Swal.fire({
            title: '请设置需要购买的内容',
            html: innerHTML,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: () => {
                let param = {
                    vec: [],
                    freeRefresh: false,
                    moneyRefresh: false,
                    raffle: false,
                };
                let vec = document.querySelectorAll('.shop-config-item');
                vec.forEach((v, k) => {
                    let node = {
                        money: items[k].money,
                        item: items[k].item,
                    };
                    let vec1 = v.querySelectorAll('input');
                    node.checked = vec1[0].checked;
                    node.off = parseInt(vec1[1].value);
                    param.vec.push(node);
                });
                param.moneyRefresh = document.getElementById('moneyRefresh').checked;
                param.freeRefresh = document.getElementById('freeRefresh').checked;
                param.raffle = document.getElementById('raffle').checked;

                console.log('当前用户参数：', param);
                for (let i = 0; i < param.vec.length; i++) {
                    if (param.vec[i].off <= 0 || param.vec[i].off > 10) {
                        Swal.showValidationMessage(`折扣值只允许在1~10之间，请检查输入是否合法！`);
                        return false;
                    }
                }
                setShopParam(this.platform, this.roleId, param);
                return true;
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }


    /**
     * 扫荡参数
     */
    async sweepConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }


        // 取出上次保存的配置信息
        let param = getSweepParam(this.platform, this.roleId);

        // 用户配置
        const res = await Swal.fire({
            title: '请选择试炼扫荡元宝上限',
            text: '使用的元宝超出设置后不会扫荡',
            input: 'select',
            inputValue: param.maxGold,
            inputOptions: {
                '0': '仅仅使用免费扫荡',
                '50': '50元宝以内扫荡',
                '100': '100元宝以内扫荡',
                '150': '150元宝以内扫荡',
            },
            inputPlaceholder: '选择扫荡规模',
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                console.log('当前选择：', v);
                if (!v || isNaN(v)) {
                    Swal.showValidationMessage(`不是合法的选择！`);
                    return false;
                }
                setSweepParam(this.platform, this.roleId, {maxGold: parseInt(v)});
                return parseInt(v);
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }


    /**
     * 名将之路扫荡参数
     */
    async onSweepConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 取出上次保存的配置信息
        let param = getOnSweepParam(this.platform, this.roleId);

        // 用户配置
        const res = await Swal.fire({
            title: '名将之路元宝买次数设置',
            text: '次数购买的单价超出设置后停止购买',
            input: 'select',
            inputValue: param.maxGold,
            inputOptions: {
                '0': '不购买扫荡次数',
                '200': '购买200元宝以内的次数',
                '400': '购买400元宝以内的次数',
                '600': '购买600元宝以内的次数',
            },
            inputPlaceholder: '选择购买次数',
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                console.log('当前选择：', v);
                if (!v || isNaN(v)) {
                    Swal.showValidationMessage(`不是合法的选择！`);
                    return false;
                }
                setOnSweepParam(this.platform, this.roleId, {maxGold: parseInt(v)});
                return parseInt(v);
            }
        });
        res.isConfirmed && Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }

    /**
     * 试炼奖励参数
     */
    async towerRewardConfig() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 取出上次保存的配置信息
        const param = getTowerRewardParam(this.platform, this.roleId);
        await Swal.fire({
            title: '领取试炼奖励最大间隔时间',
            text: '注意：最小间隔1小时，奖励积累达到设定时间或奖励已满则自动收取。',
            input: 'number',
            inputValue: param.hours,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                if (!v || isNaN(v) || v < 1 || v > 100) {
                    Swal.showValidationMessage(`请输入1~100之间的数值`);
                    return false;
                }
                setTowerRewardParam(this.platform, this.roleId, {hours: parseInt(v)});
                return v;
            }
        });
    }


    // 上传配置
    async upload() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 用户确认
        const res = await Swal.fire({
            title: '上传配置信息到江东云',
            html: '确定上传配置到云端吗？<br>请在上传之前确认当前配置无误。<br>上传后，当前配置将会覆盖云端配置，并将在下次云开始之后生效。',
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
        });
        if (!res.isConfirmed) {
            return;
        }

        // 获取当前配置并上传
        const setting = JSON.stringify(getConfigInfo(this.platform, this.roleId));
        await uploadInfo({platform: this.platform, roleId: this.roleId, key: this.key, setting})
        Log.warn('配置信息成功上传到服务器！');
    }

    // 下载配置
    async download() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 避免过于频繁的下载
        const key = this.platform + this.roleId + 'download_time';
        let data = localStorage.getItem(key);
        if (!data) {
            data = '0';
        }
        const lastTime = parseInt(data);
        if (new Date().getTime() - lastTime < 5000) {
            Log.warn('您不需要下载如此频繁！');
            return;
        }
        localStorage.setItem(key, (new Date().getTime()).toString())

        Log.warn("开始下载云端配置信息...");
        const retString = await downloadInfo(this.userInfo);
        try {
            const configInfo = JSON.parse(retString);

            // 更新数据到本地
            if (configInfo.vecEnable) {
                setStartParam(this.platform, this.roleId, configInfo.vecEnable);
                Log.info("---用户功能项设置已经从服务器成功下载！");
            }
            if (configInfo.chest) {
                setChestParam(this.platform, this.roleId, configInfo.chest);
                Log.info("---采矿设置已经从服务器成功下载！");
            }
            if (configInfo.jiaofei) {
                setJiaofeiParam(this.platform, this.roleId, configInfo.jiaofei);
                Log.info("---剿匪设置已经从服务器成功下载！");
            }
            if (configInfo.shop) {
                setShopParam(this.platform, this.roleId, configInfo.shop);
                Log.info("---珍宝阁设置已经从服务器成功下载！");
            }
            if (configInfo.shopEx) {
                new UiShopEx(this.platform, this.roleId).param = configInfo.shopEx;
                Log.info("---武将结晶兑换设置已经从服务器成功下载！");
            }
            if (configInfo.sweep) {
                setSweepParam(this.platform, this.roleId, configInfo.sweep);
                Log.info("---试炼扫荡设置已经从服务器成功下载！");
            }
            if (configInfo.onSweep) {
                setOnSweepParam(this.platform, this.roleId, configInfo.onSweep);
                Log.info("---名将扫荡设置已经从服务器成功下载！");
            }
            if (configInfo.boss) {
                setBossParam(this.platform, this.roleId, configInfo.boss);
                Log.info("---城门boss体力设置已经从服务器成功下载！");
            }
            if (configInfo.legionBoss) {
                setLegionBossParam(this.platform, this.roleId, configInfo.legionBoss);
                Log.info("---军团远征设置已经从服务器成功下载！");
            }
            if (configInfo.donate) {
                setDonateParam(this.platform, this.roleId, configInfo.donate);
                Log.info("---军团祈愿设置已经从服务器成功下载！");
            }
            if (configInfo.enlist) {
                setEnlistParam(this.platform, this.roleId, configInfo.enlist);
                Log.info("---招贤纳士设置已经从服务器成功下载！");
            }
            if (configInfo.adventure) {
                new UiAdventure(this.platform, this.roleId).param = configInfo.adventure;
                Log.info("---南征北战设置已经从服务器成功下载！");
            }
            if (configInfo.melee) {
                new UiMelee(this.platform, this.roleId).param = configInfo.melee;
                Log.info("---军团乱斗设置已经从服务器成功下载！");
            }
            if (configInfo.slg) {
                new UiSlg(this.platform, this.roleId).param = configInfo.slg;
                Log.info("---中军帐设置已经从服务器成功下载！");
            }
        } catch (e) {
            await Promise.reject('解析服务器数据失败：' + e);
        }
    }

    // 购买江东云
    async buyCloud() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 用户选择加时类型
        const choice = await Swal.fire({
            titleText: "云账号注册/续期",
            html: `处于云有效期之内时，您的账号可以在江东云上自动运行。`,
            showConfirmButton: true,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '云60天 ￥6.66',
            denyButtonText: '云180天 ￥18.88',
            cancelButtonText: '关闭',
            denyButtonColor: '#3085d6',
        })
        let priceId = 0;
        if (choice.isConfirmed) {
            priceId = 2;
        } else if (choice.isDenied) {
            priceId = 3;
        } else {
            return;
        }

        // 请求服务器
        console.log('开始请求服务器');
        const ret = await payQr({platform: this.platform, roleId: this.roleId, key: this.key, priceId});
        console.log('开始请求服务器，反馈：', ret);
        if (ret.ErrMsg) {
            await Promise.reject(ret.ErrMsg);
            return;
        }

        /**
         * 定时检查支付结果
         */
        let stop = false;
        const check = () => {
            checkQr({platform: this.platform, roleId: this.roleId, key: this.key, id: ret.Id}).then(msg => {
                if (msg.ErrMsg) {
                    console.log('检查支付状态失败：', msg.ErrMsg);
                    throw msg.ErrMsg;
                }
                if (!msg.Finished) {
                    !stop && setTimeout(check, 1000);
                    return;
                }
                Swal.fire({
                    icon: 'success',
                    title: '已为您成功增加云时间',
                });
            }).catch(errMsg => console.log("查询支付状态失败：", errMsg));
        }
        setTimeout(check, 1000);

        // 显示二维码
        await Swal.fire({
            titleText: "请用微信扫码",
            html: `<div id="qrcode" style="display: flex; justify-content: center"></div>`,
            footer: `★ 因为某些原因，只能扫码支付，请使用另外一个手机扫码完成支付。<br>★ 支付结果可能会有延迟，关闭本窗口不影响支付结果。`,
            willOpen() {
                new QRCode(document.getElementById("qrcode"), {
                    text: ret.Qr,
                    width: 128,
                    height: 128,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            },
            showConfirmButton: true,
            confirmButtonText: '关闭',
            allowOutsideClick: false,
        });
        stop = true;
    }

    /**
     * 爬塔
     */
    async towerFight() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }
        const res = await Swal.fire({
            title: '请输入爬塔次数',
            text: '爬塔将使用防守阵容进行战斗',
            input: 'number',
            inputValue: localStorage.fightTowerCount,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                if (!v || isNaN(v)) {
                    Swal.showValidationMessage(`不是合法的数值！`);
                    return false;
                }
                localStorage.fightTowerCount = v;
                return parseInt(v);
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        // 添加一次性任务
        await addOnceWork({
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
            info: JSON.stringify({Cmd: 'towerFight', param: {count: res.value}})
        });

        Log.warn("一次性任务将在下次云开始后自动运行，顶号停止云端将会终止该任务。")
    }


    /**
     * 比武
     */
    async autoArena() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        const res = await Swal.fire({
            title: '请输入比武次数',
            text: '本功能仅仅为了避免长时间无聊的刷比武，建议尽量手动进行。为避免激化玩家矛盾，战斗对手是机器人。为避免辅助影响到手动玩家的乐趣，也为避免辅助影响游戏平衡，周日不能使用本功能。',
            input: 'number',
            inputValue: localStorage.arenaCount,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                if (!v || isNaN(v)) {
                    Swal.showValidationMessage(`不是合法的数值！`);
                    return false;
                }
                localStorage.arenaCount = v;
                return parseInt(v);
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        // 添加一次性任务
        await addOnceWork({
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
            info: JSON.stringify({Cmd: 'arena', param: {count: res.value}})
        });

        Log.warn("自动比武将在下次云开始后自动运行（多次设置将以最后一次设置的次数为准），顶号停止云端将会终止该任务。")
    }

    /**
     * 武神
     */
    async autoPractice() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        const res = await Swal.fire({
            title: '请输入武神次数',
            text: '本功能仅仅为了避免长时间无聊的刷武神，建议武神尽量手动进行。为避免激化玩家矛盾，武神的对手是机器人。为避免辅助影响到手动玩家的乐趣，也为避免辅助影响游戏平衡，每周结算前最后一个小时，不能使用自动武神功能。',
            input: 'number',
            inputValue: localStorage.practiceCount,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                if (!v || isNaN(v)) {
                    Swal.showValidationMessage(`不是合法的数值！`);
                    return false;
                }
                localStorage.practiceCount = v;
                return parseInt(v);
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        // 添加一次性任务
        await addOnceWork({
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
            info: JSON.stringify({Cmd: 'practiceEx', param: {count: res.value}})
        });

        Log.warn("自动武神将在下次云开始后自动运行（多次设置将以最后一次设置的次数为准），顶号停止云端将会终止该任务。")
    }

    /**
     * 更新矿号
     */
    async subs() {

        // 首先检查用户
        if (!this.checkUser()) {
            return false;
        }

        // 获取矿号数量
        const count = await getSubCount({
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
        });

        // 创建需要弹出的东西
        let innerHTML = `
<div style="display: flex; flex-direction: column; text-align: left">
    <div style="display: flex; flex-direction: column">
        <label>
            <input id="findInFriend" type="checkbox"><span>获取好友并遍历其子属臣</span>
        </label>
        <label>
            <input id="findInRank" type="checkbox"><span>获取排行榜用户并遍历其子属臣</span>
        </label>
        <label>
            <input id="findInLord" type="checkbox"><span>将用户的主公也加入到用户库</span>
        </label>
    </div>
    <div style="padding: 8px 0">注意：<br>1.主界面点击<b style="color: yellowgreen">开始</b>之后，才可以更新用户库。<br>2.更新用户库不会<b style="color: yellowgreen">删除</b>已有用户，只会<b style="color: yellowgreen">追加</b>或<b style="color: yellowgreen">更新</b>数据。<br>3.当前用户库中已经有<b style="color: yellowgreen">${count}</b>个用户。<br>4.更新用户库时间比较长，但并不需要经常进行。</div>
</div>
`;

        // 弹出对话框
        const res = await Swal.fire({
            title: '更新用户库（矿号）',
            html: innerHTML,
            showConfirmButton: true,
            confirmButtonText: '立即更新',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: () => {
                const param = {};
                param.findInFriend = document.getElementById('findInFriend').checked;
                param.findInRank = document.getElementById('findInRank').checked;
                param.findInLord = document.getElementById('findInLord').checked;
                if (!param.findInFriend && !param.findInRank) {
                    Swal.showValidationMessage(`您没有勾选必选项（前两项至少选中一个）。`);
                    return false;
                }
                return param;
            }
        });
        if (!res.isConfirmed) {
            return;
        }

        // 添加一次性任务
        await addOnceWork({
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
            info: JSON.stringify({Cmd: 'hChest2', param: res.value})
        });

        Log.warn("更新矿号将在下次云开始后自动运行，顶号停止云端将会终止该任务。")
    }


    /**
     * @return {Promise<{count: number, countries: string[]} | undefined>}
     */
    async tidyHero() {


        const v = await Swal.fire({
            title: '英雄升星',
            html: `
 <hr />
 <b>分解通用碎片</b>

<div class="tidy-range">
<span>分解</span>
<button id="decrement1">-</button>
<input id="tidyRange1" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment1">+</button>
<input id="tidyCount1" type="number" min="0" max="1000" value="0" step="1" class="import-text">次4星英雄
</div>

<div class="tidy-range">
<span>分解</span>
<button id="decrement2">-</button>
<input id="tidyRange2" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment2">+</button>
<input id="tidyCount2" type="number" min="0" max="1000" value="0" step="1" class="import-text">次3星英雄
</div>


<div class="tidy-range">
<span>分解</span>
<button id="decrement3">-</button>
<input id="tidyRange3" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment3">+</button>
<input id="tidyCount3" type="number" min="0" max="1000" value="0" step="1" class="import-text">次1,2星英雄
</div>

<ul style="text-align: left">
  <li>碎片会先合成为英雄然后分解为紫魂绿魂。</li>
  <li>1,2星英雄不限定通用碎片。</li>
  <li>达到次数或者没有材料后停止（以下相同）。</li>
  <li>注意留够包裹空间（以下相同）。</li>
</ul>

 <hr />
 <b>紫色4星升5星</b>
<div  class="tidy-country">
  <label><input type="checkbox" value="0">魏</label>
  <label><input type="checkbox" value="1">蜀</label>
  <label><input type="checkbox" value="2">吴</label>
  <label><input type="checkbox" value="3">群</label>
</div>

<div class="tidy-range">
<span>升级</span>
<button id="decrement4">-</button>
<input id="tidyRange4" type="range" min="0" max="1000" value="0" step="10" style="flex: 1">
<button id="increment4">+</button>
<input id="tidyCount4" type="number" min="0" max="1000" value="0" step="1" class="import-text">次英雄
</div>
<ul style="text-align: left">
  <li>合成后的英雄会自动分解为碎片。</li>
</ul>
 
 
 <hr />
 <b>升级13星垫子</b>
<div  class="tidy-country">
  <label><input type="checkbox" value="0">魏</label>
  <label><input type="checkbox" value="1">蜀</label>
  <label><input type="checkbox" value="2">吴</label>
  <label><input type="checkbox" value="3">群</label>
</div>

<div class="tidy-range">
<span>升级</span>
<button id="decrement5">-</button>
<input id="tidyRange5" type="range" min="0" max="8" value="0" step="1" style="flex: 1">
<button id="increment5">+</button>
<input id="tidyCount5" class="import-text" min="0" max="8" value="0" step="1" />个13星垫子
</div>

<ul style="text-align: left">
  <li>仅使用英雄碎片，不会动用背包英雄。</li>
  <li><b>只使用不能将星</b>且确定国家的英雄碎片。</li>
</ul>
`,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            didOpen(popup) {
                for (let i = 1; i < 6; i++) {
                    const incButton = document.getElementById('increment' + i);
                    const decButton = document.getElementById('decrement' + i);
                    const countNode = document.getElementById('tidyCount' + i);
                    const rangeNode = document.getElementById("tidyRange" + i);
                    rangeNode.oninput = function () {
                        countNode.value = this.value;
                    };
                    countNode.oninput = function () {
                        if (this.value === '') {
                            rangeNode.value = 0;
                            return;
                        }
                        const min = parseInt(this.min);
                        const max = parseInt(this.max);
                        let value = parseInt(this.value);
                        if (isNaN(value) || value < min) {
                            value = min;
                        }
                        if (value > max) {
                            value = max;
                        }
                        this.value = value;
                        rangeNode.value = this.value;
                    };
                    incButton.addEventListener('click', () => {
                        let value = parseInt(rangeNode.value) + parseInt(rangeNode.step);
                        if (value > parseInt(rangeNode.max)) {
                            value = rangeNode.max;
                        }
                        rangeNode.value = value;
                        countNode.value = value;
                    });
                    decButton.addEventListener('click', () => {
                        let value = parseInt(rangeNode.value) - parseInt(rangeNode.step);
                        if (value < parseInt(rangeNode.min)) {
                            value = rangeNode.min;
                        }
                        rangeNode.value = value;
                        countNode.value = value;
                    });
                }
            },
            preConfirm: v => {
                const param = {
                    decompose4: parseInt(document.getElementById('tidyCount1').value),
                    decompose3: parseInt(document.getElementById('tidyCount2').value),
                    decompose2: parseInt(document.getElementById('tidyCount3').value),
                    up: parseInt(document.getElementById('tidyCount4').value),
                    count: parseInt(document.getElementById('tidyCount5').value),
                    countryUp: [],
                    countryCompose: [],
                    countries: [],
                };
                const vec = Array.from(document.querySelectorAll('.tidy-country input'));
                const t = {
                    '0': 'wei',
                    '1': 'shu',
                    '2': 'wu',
                    '3': 'qun',
                }
                vec.forEach((v, k) => k < 4 ? v.checked && param.countryUp.push(t[k]) : v.checked && param.countryCompose.push(t[k - 4]));
                return param;
            }
        });
        if (!v.isConfirmed) {
            return;
        }

        // 添加一次性任务
        await addOnceWork({
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
            info: JSON.stringify({Cmd: 'tidyHero', param: v.value})
        });

        Log.warn("英雄升星将在下次云开始后自动运行，顶号停止云端将会终止该任务。")
        return v.value;
    }

    async exchange() {

        // 选择国家
        let ret = await Swal.fire({
            title: '请选择需要置换的国家',
            input: 'select',
            inputOptions: {
                wei: '魏国',
                shu: "蜀国",
                wu: "吴国",
                qun: "群雄",
            },
            inputPlaceholder: '选择国家',
            showConfirmButton: true,
            confirmButtonText: '下一步',
            showCancelButton: true,
            cancelButtonText: '取消',
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value) {
                        resolve();
                    } else {
                        resolve('你需要先选择一个国家');
                    }
                })
            }
        });
        if (!ret.isConfirmed) {
            // await Promise.reject('用户取消');
            return;
        }
        const country = ret.value;

        // 选择武将
        let html = `<div  class="select-hero">`
        orangeHero.filter(v => v.camp === country).forEach(v => html += `<label><input type="checkbox" value="${v.id}">${v.name}</label>`);
        html += `</div>`
        ret = await Swal.fire({
            title: '请勾选武将',
            footer: '红将和勾选的武将将会在置换时被保留且不参与置换，已升级的英雄不会参与置换',
            html,
            showConfirmButton: true,
            confirmButtonText: '下一步',
            showCancelButton: true,
            cancelButtonText: '取消',
            didOpen(popup) {
                console.log('当前pop的网页内容：', popup);
            },
            preConfirm: (value) => {
                const checkboxes = document.querySelectorAll('.select-hero input[type=checkbox]');
                const heroes = [];
                checkboxes.forEach(v => v.checked && heroes.push(v.value));

                console.log('选中的英雄', heroes)
                if (heroes.length <= 0) {
                    Swal.showValidationMessage('至少需要选择一个武将');
                    return false;
                }
                return heroes;
            }
        });
        if (!ret.isConfirmed) {
            // await Promise.reject('用户取消');
            return;
        }
        const heroes = ret.value;

        // 选择次数
        ret = await Swal.fire({
            title: '请选择需要置换的次数',
            input: 'number',
            inputValue: 1,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: (v) => {
                const value = parseInt(v);
                if (v.isNaN || v <= 0) {
                    Swal.showValidationMessage('请输入合法的数字');
                    return false;
                }
                return value;
            }
        });
        if (!ret.isConfirmed) {
            // await Promise.reject('用户取消');
            return;
        }
        const count = ret.value;

        // 添加一次性任务
        await addOnceWork({
            platform: this.platform,
            roleId: this.roleId,
            key: this.key,
            info: JSON.stringify({Cmd: 'exchange', param: {country, heroes, count}})
        });

        Log.warn("武将置换将在下次云开始后自动运行，顶号停止云端将会终止该任务。")

        return {country, heroes, count}
    }

}

export const gConfig = new Config();
typeof globalThis === 'object' && (globalThis.gConfig = gConfig);

