/**
 * Create by maintainer
 * Description: dataProcess
 * Date: 2023-04-19 21:19
 */
import {Log} from "./log";
import {gHttpCmd, AppUpParam} from "./HttpCmd";
import {decode, encode} from "@ygoe/msgpack";

class DataProcess {
    dataIn(url: string, recv: string, send: string, ua: string) {
        try {
            url = atob(url);
            recv = atob(recv);
            send = atob(send);
            ua = atob(ua);
        } catch (e) {
            console.error('输入的内容不是合法的base64编码的内容');
            return;
        }
        this.onDataIn(
            url,
            recv,
            send,
            ua,
        ).catch(e => Log.err("操作出错：", e));
    }

    /**
     * 从侦测到的数据中，解析需要的内容
     */
    private async onDataIn(url: string, recv: string, send: string, ua: string) {

        // 从url和send中提取clientId
        const reg = new RegExp("clientId=([^&]*)");
        let clientId = reg.exec(url)?.[1];
        if (!clientId) {
            clientId = reg.exec(send)?.[1];
        }
        if (!clientId) {
            console.log("未能提取到clientId");
            return;
        }

        // 解析收到的数据
        const ret = JSON.parse(recv);
        const param: AppUpParam = {
            au: ret?.result?.authorCode,
            uid: ret?.result?.userId,
            ci: clientId,
            ua,
            wss: ret?.result?.tcpsrv?.ip,
        }
        if (!param.au || !param.uid || !param.ci || !param.ua || !param.wss) {
            console.log('侦测到的内容中不包含所有的有效字段');
            return;
        }
        Log.log("侦测到账号信息，正在进行验证...");
        const res = await gHttpCmd.appUp(param);
        console.log('服务器反馈：', res);

        // 如果服务器没有反馈角色信息，那么自动开始获取url信息
        const id = Math.random().toString();
        this.id2Check[id] = param;
        if (!res.K?.length) {
            Log.log("当前属于首次侦测到的用户，下面开始获取进一步信息...");
            await this.reCheck(id);
        } else {
            const url = `http://server-7.example.invalid/?p=${res.P}&r=${res.R}&k=${res.K}`;
            Log.info(`侦测到${res.S}区 ${res.N || res.U}
<a href="#" onclick="openUrl('${url}')">点击此处在浏览器中打开云链接</a>
<b>云链接切记保密，连截图都别外传！</b>`);
            Log.log(`如果侦测到的区服不对（换区侦测会发生这种情况），<a href="#" onclick="reCheck('${id}')">请点击此处</a>`);
            Android && Android.notice('江东小乔', `侦测到${res.S}区 ${res.N || res.U}`);
        }
    }

    /**
     * 重新确认用户信息
     */
    public async reCheck(id: string) {
        const param = this.id2Check[id];
        if (!param) {
            Log.err("当前需要侦测的信息已经失效！");
            return;
        }

        // 获取用户信息
        const userInfo = await this.getUserInfo({
            wss: param.wss,
            clientId: param.ci,
            authorCode: param.au,
            uid: param.uid,
        });

        console.log('校验的用户信息：', userInfo);

        // 用户校验没有成功时，直接返回
        if (!userInfo.roleId) {
            Log.err("本次校验失败，请重试！")
            return;
        }

        // 再次向服务器请求数据
        const finalRes = await gHttpCmd.appUp({
            ...param,
            name: userInfo.name,
            nick: userInfo.nick,
            server: userInfo.server,
            ro: userInfo.roleId,
        });

        // 显示侦测到的结果
        const url = `http://server-7.example.invalid/?p=${finalRes.P}&r=${finalRes.R}&k=${finalRes.K}`;
        Log.info(`成功侦测到${finalRes.S}区的[${finalRes.N || finalRes.U}]
<a href="#" onclick="openUrl('${url}')">点击此处在浏览器中打开云管理页面</a>
<b>云链接切记保密，连截图都别外传！</b>`);
        Android && Android.notice('江东小乔', `侦测到${finalRes.S}区 ${finalRes.N || finalRes.U}`);
    }

    /**
     * 从胡莱服务器获取用户数据
     */
    private async getUserInfo(userData: {
        wss: string,
        clientId: string,
        authorCode: string,
        uid: number,
    }): Promise<{
        name: string,
        nick: string,
        server: number,
        roleId: number,
    }> {
        return new Promise<{
            name: string,
            nick: string,
            server: number,
            roleId: number,
        }>((ok, err) => {
            console.log('开始向服务器校验数据：', userData);
            const retUser = {
                name: '',
                nick: '',
                server: 0,
                roleId: 0,
            };
            const ws = new WebSocket(`wss://${userData.wss}/?base64=0&mask=0&binary=1`);
            const wsSend = (data: any) => {
                console.log('发送给服务器的数据：', data);
                ws?.send(encode(data))
            }

            // 连接建立之后发送绑定消息
            ws.onopen = () => {
                wsSend({
                    cmd: 'bind_user',
                    params: {
                        userId: userData.uid,
                        gameId: 9999,
                        clientId: userData.clientId,
                        roleId: null,
                        authorCode: userData.authorCode,
                    }
                });
            };

            // 消息处理
            let snsId = '';
            ws.onmessage = (evt) => {
                const reader = new FileReader();
                reader.readAsArrayBuffer(evt.data);
                reader.onload = () => {
                    if (!reader.result) {
                        return;
                    }
                    const ret: any = decode(reader.result.slice(4) as ArrayBuffer);
                    console.log('收到服务器消息', ret);

                    if (ret?.cmd == "user_info") {
                        wsSend({
                            "cmd": "game",
                            "params": {
                                "action": "enter",
                                "gameId": 129,
                                "userId": userData.uid,
                                "roleId": null,
                                "clientId": userData.clientId,
                                "authorCode": userData.authorCode,
                                "gameVer": "v6.0.4"
                            }
                        });
                        retUser.name = ret.result.udata.name;
                        snsId = ret.result.udata.snsId;
                    } else if (ret?.cmd == "game_data") {
                        if (ret?.result?.gdata?.serverId) {
                            retUser.server = ret.result.gdata.serverId;
                            retUser.roleId = ret.result.gdata.lastRoleId;
                            wsSend({
                                cmd: "game",
                                params: {
                                    configHash: '00000000000000000000000000000000',
                                    openId: snsId.substring(snsId.indexOf(':') + 1),
                                    action: "first_enter_hall",
                                    gameId: 129,
                                    userId: userData.uid,
                                    roleId: retUser.roleId,
                                    clientId: userData.clientId,
                                }
                            });
                        }
                    } else if (ret?.cmd == "game" && ret?.result?.action == "first_enter_hall") {
                        retUser.nick = ret.result.datamerge.user.nickname;
                        ok(retUser);
                        ws.close();
                    }
                }
            }

            ws.onerror = ev => {
                err(`和胡莱服务器的通讯出现错误-${ev}`);
            }

            ws.onclose = () => {
                console.log('连接已经关闭');
                err("和胡莱服务器的连接被关闭");
            }
        });
    }


    /**
     * 待检测的Id列表
     */
    private id2Check: { [key: string]: AppUpParam } = {};
}

/**
 * 重新检查用户
 */
window.reCheck = id => gDataProcess.reCheck(id).catch(e => Log.err("验证失败：", e));

export const gDataProcess = new DataProcess();
// (globalThis as { [key: string]: any }).gDataProcess = gDataProcess;
