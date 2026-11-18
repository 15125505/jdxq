// 作者： maintainer
// 描述: show
// 日期: 2023-09-02

import {serverList, state} from "./cmd";
import Log from "crlog";

async function show() {

    let count = 0;
    for (let server of serverList) {
        Log.warn('---查看服务器', server.id, server.ip);
        count += server.count;
        await state(server.ip);
    }
    const lowCount = serverList.reduce((a, b) => a + (b.count < 10 ? 1 : 0), 0);
    const midCount = serverList.reduce((a, b) => a + (b.count == 10 ? 1 : 0), 0);
    const highCount = serverList.reduce((a, b) => a + (b.count > 10 ? 1 : 0), 0);
    Log.warn(`---服务器支持节点总数：${count} * 40 = ${count * 40}, 目前已有服务器 ${serverList.length}台，其中低性能服务器${lowCount}台，中性能服务器${midCount}台，高性能服务器${highCount}台`);
}

show().catch(e => console.log('查看服务器状态失败：', e));
