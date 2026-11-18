// 作者： maintainer
// 描述: init.ts
// 日期: 2023-09-02

import {serverList, upload} from "./cmd";


async function main() {
    for (const v of serverList) {
        await upload(v.ip);
    }
}

main().catch(e => console.log('上传文件失败：', e));
