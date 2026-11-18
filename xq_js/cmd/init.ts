// 作者： maintainer
// 描述: init.ts
// 日期: 2023-09-02

import {init} from "./cmd";

const serverId = parseInt(process.argv[2]);
init(serverId).catch(e => console.log('上传文件失败：', e));
