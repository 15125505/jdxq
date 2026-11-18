// 作者： maintainer
// 描述: upload.ts
// 日期: 2023-09-02


import { NodeSSH } from 'node-ssh';
import Log from "crlog";
import * as fs from "fs";

const template = `module.exports = {
    apps: [{name: 'xq', script: './node.js', log_date_format: 'YYYY-MM-DD HH:mm:ss', exec_mode: 'cluster', max_memory_restart:'150M', instances: COUNT, merge_logs: true}]
};`;

export const serverList: { id: number, ip: string, count: number }[] = [
    { id: 30, ip: '192.0.2.1', count: 20 },
];


export async function init(id: number) {

    Log.warn('准备初始化服务器', id);

    const server = serverList.find(v => v.id === id);
    if (!server) {
        Log.error('服务器不存在');
        return;
    }

    Log.info('开始初始化服务器：', id, server.ip, '节点数量：', server.count);

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


    // 创建一个临时文件 'ecosystem.config.js'
    fs.writeFileSync('dist/ecosystem.config.js', template.replace('COUNT', server.count.toString()));

    // 复制本地文件到远程服务器
    await ssh.putFiles([
        { local: 'dist/node.js', remote: 'xq_node/node.js' },
        { local: 'dist/node.js.map', remote: 'xq_node/node.js.map' },
        { local: 'dist/ecosystem.config.js', remote: 'xq_node/ecosystem.config.js' },
    ]);
    Log.warn('文件全部上传成功！');

    // 删除临时文件
    fs.unlinkSync('dist/ecosystem.config.js');

    // 重启服务
    await doCmd(ssh, 'pm2 delete all', 'xq_node');
    await doCmd(ssh, 'pm2 start', 'xq_node');
    await doCmd(ssh, 'pm2 save --force', 'xq_node');
    await doCmd(ssh, 'sudo -n reboot', 'xq_node');

    // 关闭连接
    ssh.dispose();
}

async function doCmd(ssh: NodeSSH, cmd: string, cwd: string) {
    Log.info('执行远程命令：', cmd);
    const ret = await ssh.execCommand(cmd, { cwd });
    ret.stdout && Log.log('反馈：\n', ret.stdout);
    ret.stderr && Log.error('反馈：\n', ret.stderr);
}

export async function upload(ip: string) {

    // 连接服务器
    const ssh = new NodeSSH();
    Log.info("开始连接服务器", ip);
    await ssh.connect({
        host: ip,
        port: 60022,
        username: process.env.JDXQ_SSH_USER || 'deploy',
        agent: process.env.SSH_AUTH_SOCK,
        privateKeyPath: process.env.JDXQ_SSH_KEY
    });
    Log.info('-------服务器连接成功', ip);

    // 复制本地文件到远程服务器
    await ssh.putFiles([
        { local: 'dist/node.js', remote: 'xq_node/node.js' },
        { local: 'dist/node.js.map', remote: 'xq_node/node.js.map' },
    ]);

    Log.warn('文件全部上传成功！');

    // 关闭连接
    ssh.dispose();
}

/** 查看服务器状态 */
export async function state(ip: string) {

    // 连接服务器
    const ssh = new NodeSSH();
    await ssh.connect({
        host: ip,
        port: 60022,
        username: process.env.JDXQ_SSH_USER || 'deploy',
        agent: process.env.SSH_AUTH_SOCK,
        privateKeyPath: process.env.JDXQ_SSH_KEY
    });
    Log.info('服务器连接成功');

    await doCmd(ssh, 'pm2 list', 'xq_node');
    await doCmd(ssh, 'free -h', 'xq_node');

    // 关闭连接
    ssh.dispose();
}


