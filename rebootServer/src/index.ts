// 作者： maintainer
// 描述: upload.ts
// 日期: 2023-09-02


import {NodeSSH} from 'node-ssh';
import Log from "crlog";

export const serverList: {id: number, ip: string, count: number}[] = [
    {id: 1, ip: '192.0.2.1', count: 20},
    {id: 2, ip: '192.0.2.1', count: 20},
    {id: 4, ip: '192.0.2.1', count: 4},
    {id: 5, ip: '192.0.2.1', count: 4},
    {id: 6, ip: '192.0.2.1', count: 10},
    {id: 7, ip: '192.0.2.1', count: 10},
    {id: 8, ip: '192.0.2.1', count: 10},
    {id: 9, ip: '192.0.2.1', count: 10},
    {id: 10, ip: '192.0.2.1', count: 10},
    {id: 11, ip: '192.0.2.1', count: 10},
    {id: 12, ip: '192.0.2.1', count: 10},
    {id: 13, ip: '192.0.2.1', count: 10},
    {id: 14, ip: '192.0.2.1', count: 10},
    {id: 15, ip: '192.0.2.1', count: 10},
    {id: 16, ip: '192.0.2.1', count: 10},
    {id: 17, ip: '192.0.2.1', count: 10},
    {id: 18, ip: '192.0.2.1', count: 10},
    {id: 19, ip: '192.0.2.1', count: 10},
    {id: 20, ip: '192.0.2.1', count: 10},
    {id: 21, ip: '192.0.2.1', count: 10},
    {id: 22, ip: '192.0.2.1', count: 10},
    {id: 23, ip: '192.0.2.1', count: 10},
    {id: 24, ip: '192.0.2.1', count: 10},
    {id: 25, ip: '192.0.2.1', count: 10},
    {id: 26, ip: '192.0.2.1', count: 10},
    {id: 27, ip: '192.0.2.1', count: 10},
    {id: 28, ip: '192.0.2.1', count: 20},
    {id: 29, ip: '192.0.2.1', count: 10},
    {id: 30, ip: '192.0.2.1', count: 10},
];


export async function reboot(id: number) {

    Log.warn('准备重启服务器', id);

    const server = serverList.find(v => v.id === id);
    if (!server) {
        Log.error('服务器不存在');
        return;
    }


    // 连接服务器
    const ssh = new NodeSSH();
    await ssh.connect({
        host: server.ip,
        port: 60022,
        username: process.env.JDXQ_SSH_USER || 'deploy',
        agent: process.env.SSH_AUTH_SOCK,
        privateKeyPath: process.env.JDXQ_SSH_KEY
    });
    Log.info('服务器连接成功');

    await doCmd(ssh, 'sudo -n reboot', 'xq_node');

    // 关闭连接
    ssh.dispose();
}

async function doCmd(ssh: NodeSSH, cmd: string, cwd: string) {
    Log.info('执行远程命令：', cmd);
    const ret = await ssh.execCommand(cmd, {cwd});
    ret.stdout && Log.log('反馈：', ret.stdout);
    ret.stderr && Log.error('反馈：', ret.stderr);
}


async function main() {
    for (let server of serverList) {
        if (server.id != 30) {
            continue;
        }
        await reboot(server.id);
    }
}

main().then(() => {
    Log.info('执行完毕');
}).catch(e => {
    Log.error('执行失败', e);
});
