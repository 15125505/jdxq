import './style.css';
import './pure-min.css';
import {getRoleId, recentUser} from "./http";

/**
 * 准备(下一步)
 * 等待(已经好了)
 * 没有发现(重试一次)
 * 发现多个(重试一次)
 * 已经发现(二次确认)
 * 二次确认成功(存好你的链接地址)
 * 二次确认失败(重头再来一次)
 */


enum State {
    ready,      // 准备状态，显示说明文字，按钮上显示"开始侦测"
    wait,       // 等待状态，显示让用户前往游戏，按钮显示“我已经进入游戏了”
    notFound,   // 没有侦测到用户，按钮显示“让我重试一次”
    manyFound,  // 找到过多用户，按钮显示“让我重试一次”
    found,      // 找到了唯一用户，按钮显示“准备二次校验”
    waitCheck,  // 等待校验，按钮显示“我已经进入游戏了”
    ok,         // 确认成功，显示连接，请保存好你的链接地址
    fail,       // 确认失败，按钮显示“你可能需要重新来过”
    error,       // 操作过程出现错误，按钮提示返回
}

const StateKey = 'propState';
const TimeKey = 'propStartTime';
const UserInfoKey = 'propUserInfo';

class NewUser {

    // 文本空间
    private textElement: HTMLElement;

    // 按钮控件
    private buttonElement: HTMLButtonElement;

    private state: State = State.ready;

    constructor() {
        this.textElement = window.document.getElementById('tip-text');
        this.buttonElement = window.document.getElementById('tip-button') as HTMLButtonElement;
        this.buttonElement.onclick = () => this.next().catch(e => {
            this.state = State.error;
            this.update(e);
        });
        let oldState = localStorage.getItem(StateKey);
        if (oldState) {
            this.state = parseInt(oldState);
        }
        this.update();
    }


    update(errInfo?: string) {
        const mm: { [key: string]: { text: string, buttonText: string } } = {};
        mm[State.ready] = {
            text: `开始侦测之前，请<b>确保证书和代理都已经配置好了</b>。<br>一切就绪之后，触发游戏登录将会自动进行侦测。<br>为了保证游戏触发登录过程，建议先杀掉游戏进程。注意是在进程中杀掉，而不是点右上角的关闭。<br>一切就绪之后，请点击下方按钮。`,
            buttonText: '知道了，我准备好了',
        }
        mm[State.wait] = {
            text: `现在，请进入游戏。成功进入游戏之后，再回到本页面点击下方按钮。`,
            buttonText: '嗯，我已经进入游戏了',
        }
        mm[State.notFound] = {
            text: `很遗憾，未能侦测到你的账号。你可能需要重新配置一下你的侦测环境。<br>如果想重试一次，请点击下方按钮。`,
            buttonText: '我再试试吧',
        }
        mm[State.manyFound] = {
            text: `本次侦测，我们发现了不止一个账号。<br>为了保证准确找到你的账号，现在需要你重来一次。`,
            buttonText: '我再试试吧',
        }
        mm[State.found] = {
            text: `恭喜！成功侦测到了一个账号！<br>本着负责任的态度，我们需要你再次触发一次游戏登录，以便我们确认这是你的账号。<br>如果你准备好了，请点击下方按钮。`,
            buttonText: '好的，我准备好了',
        }
        mm[State.waitCheck] = {
            text: `现在需要你再次触发游戏登录——杀掉游戏重新进入。<br>当你进入游戏之后，请回到本页面点击下方按钮。`,
            buttonText: '嗯，我的游戏已经打开了',
        }
        mm[State.ok] = {
            text: `恭喜，侦测成功！你的云管理地址是如下（点击地址可以打开）：<br><a href="${this.userInfo.url}" target="_blank">${this.userInfo.url}</a><br>请妥善保存这个地址，勿让他人知晓。以后你可以在任何浏览器打开这个地址来管理你的账号。<br>如果想再侦测一个账号，请点击下方按钮。`,
            buttonText: '我要再次侦测一个账号',
        }
        mm[State.fail] = {
            text: `很遗憾，第二次校验未能再次检测到你的账号。<br>你可以点击下方按钮重试一次。`,
            buttonText: '我再试试吧',
        }
        mm[State.error] = {
            text: `操作过程中出现了错误(${errInfo})。<br>你可以点击下方按钮重头再来一次。`,
            buttonText: '我再来一次吧',
        }

        this.textElement.innerHTML = mm[this.state]?.text ?? '出错了！' + this.state;
        this.buttonElement.innerHTML = mm[this.state]?.buttonText ?? '出错了！';
        this.buttonElement.disabled = false;
    }

    /**
     * 更新用户操作开始的时间
     */
    updateStartTime() {
        localStorage.setItem(TimeKey, (new Date().getTime() / 1000).toFixed(0))
    }

    /**
     * 获取用户操作开始的时间
     */
    get startTime(): string {
        let timeString = localStorage.getItem(TimeKey);
        if (!timeString) {
            timeString = '0';
        }
        return timeString;
    }

    set userInfo(user: { platform: string, uid: string, url: string }) {
        localStorage.setItem(UserInfoKey, JSON.stringify(user));
    }

    get userInfo(): { platform: string, uid: string, url: string } {
        try {
            const ret = JSON.parse(localStorage.getItem(UserInfoKey));
            if (ret.uid) {
                return {
                    platform: ret.platform ?? '',
                    uid: ret.uid,
                    url: ret.url ?? '',
                }
            }
        } catch (e) {
            console.log('解析存储中的用户信息出错：', e);
        }
        return {platform:'', uid: '', url: ''}
    }

    async next() {
        this.buttonElement.disabled = true;
        switch (this.state) {
            case State.ready:
                this.state = State.wait;
                this.updateStartTime();
                break;
            case State.wait:
                const res = await this.getRecentUser();
                if (res.userCount == 1) {
                    this.userInfo = {platform: res.platform, uid: res.uid, url: ''};
                    this.state = State.found;
                } else if (res.userCount == 0) {
                    this.state = State.notFound;
                } else {
                    this.state = State.manyFound;
                }
                break;
            case State.found:
                this.state = State.waitCheck;
                this.updateStartTime();
                break;
            case State.waitCheck:
                const roleInfo = await this.getRecentUserRoleId();
                this.userInfo = {
                    ...this.userInfo,
                    url: `http://server-7.example.invalid/?p=${encodeURIComponent(this.userInfo.platform)}&r=${roleInfo.roleId}&k=${roleInfo.key}`
                }
                this.state = State.ok;
                break;
            case State.notFound:
            case State.manyFound:
            case State.ok:
            case State.fail:
            case State.error:
                this.state = State.ready;
                break;
        }
        localStorage.setItem(StateKey, this.state.toString());
        this.update();
    }

    /**
     * 获取指定时间之后，新探测到的用户
     */
    async getRecentUser(): Promise<{ userCount: number, platform: string, uid: string }> {
        const res = await recentUser({t: this.startTime});
        return {userCount: res.C, platform: res.P, uid: res.U};
    }

    /**
     * 获取指定用户的角色ID
     */
    async getRecentUserRoleId(): Promise<{ roleId: string, key: string }> {
        const res = await getRoleId({
            t: this.startTime,
            p: this.userInfo.platform,
            u: this.userInfo.uid,
        });
        return {roleId: res.R, key: res.K};
    }

}

new NewUser();
