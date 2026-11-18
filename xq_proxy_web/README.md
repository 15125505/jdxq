# 使用说明

## 文件目录说明

* `dist`                          -- 文件输出目录（生产环境编译后出现）
* `dist/index.html`               -- 输出目录html入口文件（生产环境编译后出现）
* `dist/app.[chunkhash].js`       -- 自动生成的js打包文件（生产环境编译后出现）
* `dist/app.[chunkhash].js.map`   -- source map文件（生产环境编译后出现）
* `src`                           -- 源码目录
* `src/index.html`                -- html源码入口文件
* `src/index.js`                  -- js源码入口文件
* `src/style.css`                 -- css文件示例

## 项目初始化
```
npm install
```

### 执行生产环境的编译
```
npm run build
```

### 启动开发环境自动编译和预览
```
npm run start
```

### 启动生产环境自动编译
```
npm run watch
```

```mermaid
graph
    A(开始)
    B[等待]
    Z(结束)
    
```

* 准备(下一步)
* 等待(已经好了)
* 没有发现(重试一次)
* 发现多个(重试一次)
* 已经发现(二次确认)
* 二次确认成功(存好你的链接地址)
* 二次确认失败(重头再来一次)
