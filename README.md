# 江东小乔源码

项目已经停止由原作者维护，欢迎任何人 Fork、修改和继续开发，但原作者不提供持续技术支持。

## 项目与工具

| 目录 | 内容 |
| --- | --- |
| `xq_js` | 网页辅助与 Node 任务执行端，保留通用自动化功能 |
| `xq_go` | 主服务、账号、任务与支付接口 |
| `xqCloud` / `xqProb` | 云端接口与账号侦测服务 |
| `xq_cloud_web` / `xq_proxy_web` | 云端管理页面、代理侦测页面与说明 |
| `xq_mongo` / `xq_question` | 配置授权服务、题库服务 |
| `xq_sale` / `wxmp` / `wxmp_xiaoxia` | 销售与公众号相关代码 |
| `xq_exe` / `fs_exe` / `XqWeb` | Windows 客户端与不同版本的浏览器封装 |
| `xq_cmd` | 原生辅助命令工具 |
| `XQ-Android` / `XQ-Android-TS` / `xq_and` | Android 客户端及网页配套代码 |
| `xq_tool` | 协议数据解码工具 |
| `rebootServer` / `_output` / 各项目的 `upload.ts`、`cmd` | 脱敏后的维护、发布和部署脚本 |
| `gradle` 与根目录 Gradle 文件 | Android 工作区构建入口 |


## 配置与构建

此源码不能直接连接原线上系统。所有示例地址、端口、路径和 `CHANGEME` 均需根据自己的环境调整。

环境变量见 [.env.example](.env.example)。Node 和 Go 程序从进程环境读取变量；此项目没有自动加载 `.env` 的统一入口，需要自行导出变量或配置进程管理器。Go 的 `conf/config.json` 如存在会覆盖默认配置，勿提交含真实连接串的文件。

Node 部署工具使用 SSH agent 或 `JDXQ_SSH_KEY` 指定的外部私钥。旧批处理中的 `forUpload` 仅是外部密钥路径引用，本目录不提供该密钥。含 `sudo -n` 的操作需由部署者自行配置权限。

在各 Node 子项目内执行 `npm ci`，再按其 `package.json` 中的脚本构建。Go 子项目各有自己的 `go.mod`；Android 需要相应 SDK、JDK 和 Gradle。Windows 原生客户端需要 Visual Studio 和相应版本的 CEF/curl。部分旧资源和说明中的图片已因隐私或二进制排除，需自行替换。

