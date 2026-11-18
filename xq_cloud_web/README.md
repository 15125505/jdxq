# 使用说明

## 文件目录说明

* `dist\`                    -- 文件输出目录
* `dist/index.html`          -- 输出目录html入口文件
* `dist/app.bundle.js`       -- 自动生成的js打包文件（生产环境编译后出现）
* `dist/app.bundle.js.map`   -- source map文件（生产环境编译后出现）
* `src\`                     -- js和css源码目录
* `src/index.js`             -- js源码入口文件
* `src/style.css`            -- css文件示例

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
