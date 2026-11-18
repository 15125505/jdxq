// Create by maintainer
// Description: 数据库配置模块，该模块同时会初始化数据库连接池

import * as mysql from 'mysql2/promise'

class DbConfig {
    constructor() {
        this.pool = mysql.createPool({
            host: '127.0.0.1',
            port: 3306,
            user: 'green',
            password: process.env.JDXQ_DB_PASSWORD,
            database: 'xq',
            connectionLimit: 50,
        });

        this.corePool = mysql.createPool({
            host: 'server-20.example.invalid',
            port: 3306,
            user: 'root',
            password: process.env.JDXQ_DB_PASSWORD,
            database: 'xq',
            connectionLimit: 5,
        });
    }

    /**
     * 数据库连接池
     */
    readonly pool: mysql.Pool;

    /**
     * 核心数据库链接池
     */
    readonly corePool: mysql.Pool;
}

export const gDb = new DbConfig();
