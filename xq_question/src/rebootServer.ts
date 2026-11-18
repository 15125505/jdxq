// 作者： maintainer
// 描述: rebootServer
// 日期: 2023-09-03


import Log from "crlog";
import {NodeSSH} from "node-ssh";
import cron from 'node-cron';
import {gDb} from "./conf/dbConfig";
import {ResultSetHeader} from "mysql2";

const serverList: { id: number, ip: string, count: number }[] = [
    {id: 3, ip: '192.0.2.1', count: 10},
    {id: 10, ip: '192.0.2.1', count: 10},
    {id: 11, ip: '192.0.2.1', count: 10},
    {id: 12, ip: '192.0.2.1', count: 10},
    {id: 13, ip: '192.0.2.1', count: 10},
    {id: 14, ip: '192.0.2.1', count: 10},
    {id: 15, ip: '192.0.2.1', count: 10},
    {id: 16, ip: '192.0.2.1', count: 10},
    {id: 17, ip: '192.0.2.1', count: 10},
    {id: 18, ip: '192.0.2.1', count: 10},
    {id: 21, ip: '192.0.2.1', count: 10},
    {id: 25, ip: '192.0.2.1', count: 10},
    {id: 29, ip: '192.0.2.1', count: 10},
    {id: 30, ip: '192.0.2.1', count: 10},
];


async function reboot(id: number, ip: string) {

    try {
        Log.warn('===准备重启服务器', id, '-', ip);

        // 连接服务器
        const ssh = new NodeSSH();
        await ssh.connect({
            host: ip,
            port: 60022,
            username: process.env.JDXQ_SSH_USER || 'deploy',
            agent: process.env.SSH_AUTH_SOCK,
        privateKeyPath: process.env.JDXQ_SSH_KEY
        });
        Log.info('===服务器连接成功');

        await doCmd(ssh, 'sudo -n reboot', 'xq_node');

        // 关闭连接
        ssh.dispose();
    } catch (e) {
        // 异常处理
        Log.error('===重启服务器出现异常', id, '-', ip, e);
    }
}

async function doCmd(ssh: NodeSSH, cmd: string, cwd: string) {
    Log.info('---执行远程命令：', cmd);
    const ret = await ssh.execCommand(cmd, {cwd});
    ret.stdout && Log.log('---反馈：', ret.stdout);
    ret.stderr && Log.error('---反馈：', ret.stderr);
}

export async function rebootAll() {
    for (let server of serverList) {
        await reboot(server.id, server.ip);

        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
}

async function resetUser() {
    const result = await gDb.corePool.execute(`update xq.cloud
                                               set state = 1
                                               where state = 0
                                                 and user_info_err like '%维护%'`);
    // 获取受到影响的行数
    const {affectedRows} = result[0] as ResultSetHeader;
    Log.log('重置受到维护的用户', affectedRows, '个');
}

export function start() {

    const work = () => rebootAll().catch(e => Log.error('重启服务器失败', e));
    const reset = () => resetUser().catch(e => Log.error('重置用户失败', e));

    // 每天凌晨4点，以及周五的7点，重启所有服务器
    cron.schedule('0 7 * * 5', work);
    cron.schedule('0 4 * * *', work);

    // 每天凌晨7点、8点、9点、10点、11点，自动重置受到维护的用户
    cron.schedule('0 7 * * *', reset);
    cron.schedule('0 8 * * *', reset);
    cron.schedule('0 9 * * *', reset);
    cron.schedule('0 10 * * *', reset);
    cron.schedule('0 11 * * *', reset);
}
