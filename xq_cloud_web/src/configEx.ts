// 作者： maintainer
// 描述: configEx
// 日期: 2023-10-14

import Swal from "sweetalert2";
import {gConfig} from "./config";
import {getDonateParam, setDonateParam} from "./paramEx";
import {Log} from "./log";
import {getEnlistParam, setEnlistParam} from "./ui/enlistCfg";
import {UiShopEx} from "./ui/uiShopEx";
import {UiAdventure} from "./ui/uiAdventure";
import {UiMelee} from "./ui/uiMelee";
import {UiSlg} from "./ui/uiSlg";

class ConfigEx {

    private platform = '';
    private roleId = '';
    private key = '';
    init(param: { roleId: string, platform: string, key: string }) {
        this.platform = param.platform;
        this.roleId = param.roleId;
        this.key = param.key;
    }

    async donateConfig() {

        // 首先检查用户
        if (!gConfig.checkUser()) {
            return false;
        }

        // 取出上次保存的配置信息
        const param = getDonateParam(this.platform, this.roleId);

        // 创建需要弹出的东西
        const innerHTML = `
<div style="text-align: left">
    <div>优先祈愿
        <select class="swal2-select" id="donate-country">
            <option value="1" ${param.country == 1 ? 'selected' : ''}>蜀国</option>
            <option value="2" ${param.country == 2 ? 'selected' : ''}>魏国</option>
            <option value="3" ${param.country == 3 ? 'selected' : ''}>群雄</option>
            <option value="4" ${param.country == 4 ? 'selected' : ''}>吴国</option>
        </select>碎片
    </div>
    <div><label>
        花费元宝助力他人 <input class="swal2-input narrow-input" id="donate-goldDonateTimes" type="number" value="${param.goldDonateTimes}"> 次军团祈愿，免费次数自动使用，不会浪费。
    </label></div>
</div>
`;

        // 选择次数
        const ret = await Swal.fire({
            title: '军团祈愿设置',
            html: innerHTML,
            footer: '军团祈愿自动助力当前列表中第一个目标，如果希望指定目标，请手动进行军团祈愿',
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消'
        });
        if (!ret.isConfirmed) {
            return;
        }

        param.country = parseInt((document.getElementById('donate-country') as HTMLSelectElement).value);
        param.goldDonateTimes = parseInt((document.getElementById('donate-goldDonateTimes') as HTMLInputElement).value);
        if (param.goldDonateTimes < 0) {
            param.goldDonateTimes = 0;
        }
        if (param.goldDonateTimes > 5) {
            param.goldDonateTimes = 5;
        }
        console.log('用户选择：', param);
        setDonateParam(this.platform, this.roleId, param);

        Log.warn("配置修改之后，记得务必上传到云端，云端下次开始时才会生效！");
    }


    /**
     * 招贤纳士配置信息配置
     */
    async enlistConfig() {

        // 取出上次保存的配置信息
        const param = getEnlistParam(this.platform, this.roleId);

        // 创建需要弹出的东西
        const innerHTML = `
<div style="text-align: left">
    <div>自动设置
        <select class="swal2-select" id="enlist-country">
            <option value="wei" ${param.country == 'wei' ? 'selected' : ''}>魏国</option>
            <option value="shu" ${param.country == 'shu' ? 'selected' : ''}>蜀国</option>
            <option value="wu" ${param.country == 'wu' ? 'selected' : ''}>吴国</option>
            <option value="qun" ${param.country == 'qun' ? 'selected' : ''}>群雄</option>
        </select>为目标
    </div>
</div>
`;

        // 选择次数
        const ret = await Swal.fire({
            title: '招贤纳士设置',
            html: innerHTML,
            footer: '没有设置心选英雄时，将自动使用上面设置的英雄',
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消'
        });
        if (!ret.isConfirmed) {
            // await Promise.reject('用户取消');
            return;
        }

        param.country = (document.getElementById('enlist-country') as HTMLSelectElement).value;
        console.log('用户选择：', param);
        setEnlistParam(this.platform, this.roleId, param);
    }

    /**
     * 武将结晶配置
     */
    async shopExConfig() {
        const cfg = new UiShopEx(this.platform, this.roleId);
        await cfg.showConfig();
    }

    /**
     * 南征北战配置
     */
    async adventureConfig() {
        const cfg = new UiAdventure(this.platform, this.roleId);
        await cfg.showConfig();
    }

    /**
     * 军团乱斗配置
     */
    async meleeConfig() {
        const cfg = new UiMelee(this.platform, this.roleId);
        await cfg.showConfig();
    }

    /**
     * 中军帐配置
     */
    async slgConfig() {
        const cfg = new UiSlg(this.platform, this.roleId);
        await cfg.showConfig();
    }
}

export const gConfigEx = new ConfigEx();

