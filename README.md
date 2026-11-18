# 江东小乔源码整理版

此目录是供开源使用的独立源码副本。本目录不包含原有 Git 历史。

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
| `tools/check_release.py` | 不联网的发布内容检查 |

## 已移除或改写的内容

- 排除真实账号测试、抓包样本、个人运营笔记、数据库导出、浏览器数据、日志和截图。
- 排除 SSH 私钥、Android 签名文件、共享 CA、证书及所有旧 Git 历史。
- 排除依赖目录、编译产物、旧安装包和第三方二进制文件。源码中引用的 CEF、curl 等原生依赖需要另行准备。
- 线上地址替换为保留示例域名 `*.example.invalid` 或文档地址 `192.0.2.1`。本地回环、监听地址、公共 DNS、依赖下载地址、上游 API 和技术文档链接仍保留。
- 删除部署密码、支付密钥和固定接口口令；需要配置的位置使用环境变量或 `CHANGEME`。已删除连接配置和验证凭据的部分日志输出。
- Android 抓包 CA 改为在本机生成，不再使用随包分发的原证书。使用者需重新安装本机证书。

## 配置与构建

此源码不能直接连接原线上系统。所有示例地址、端口、路径和 `CHANGEME` 均需根据自己的环境调整。

环境变量见 [.env.example](.env.example)。Node 和 Go 程序从进程环境读取变量；此项目没有自动加载 `.env` 的统一入口，需要自行导出变量或配置进程管理器。Go 的 `conf/config.json` 如存在会覆盖默认配置，勿提交含真实连接串的文件。

Node 部署工具使用 SSH agent 或 `JDXQ_SSH_KEY` 指定的外部私钥。旧批处理中的 `forUpload` 仅是外部密钥路径引用，本目录不提供该密钥。含 `sudo -n` 的操作需由部署者自行配置权限。

在各 Node 子项目内执行 `npm ci`，再按其 `package.json` 中的脚本构建。Go 子项目各有自己的 `go.mod`；Android 需要相应 SDK、JDK 和 Gradle。Windows 原生客户端需要 Visual Studio 和相应版本的 CEF/curl。部分旧资源和说明中的图片已因隐私或二进制排除，需自行替换。

## 验证范围

已使用现有本地依赖验证 `xq_js` 浏览器端与 Node 端打包，无错误或警告；验证时 TypeScript 使用 `transpileOnly`，不代表全量类型检查通过。所有导出的 JavaScript/TypeScript 已做语法及相对引用检查，Go 源文件已通过 `gofmt` 解析，JSON 文件已解析检查。

未连接线上系统，也未执行部署、支付、完整服务联调、Android 或 Windows 原生构建。


只将本目录作为新仓库发布。不要从外层目录提交，也不要推送原子项目的历史。已清理的文件清单与原件校验摘要见 `OPEN_SOURCE_INVENTORY.json`，处理和验证记录见 `RELEASE_REVIEW.md`。

已有许可证和第三方版权声明保留。本整理没有替整个项目新增或统一许可证。
