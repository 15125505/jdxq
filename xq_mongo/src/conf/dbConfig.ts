// Create by maintainer
// Description: 数据库配置模块，该模块同时会初始化数据库连接池

import * as mysql from 'mysql2/promise'
import {CreateIndexesOptions, IndexSpecification, MongoClient} from "mongodb";
import Log from "crlog";

class DbConfig {
    constructor() {
        // this.pool = mysql.createPool({
        //     host: 'server-20.example.invalid',
        //     port: 3306,
        //     user: 'root',
        //     password: process.env.JDXQ_DB_PASSWORD,
        //     database: 'xq',
        //     connectionLimit: 5,
        // });

        this.pool = mysql.createPool({
            host: '127.0.0.1',
            port: 6666,
            user: 'root',
            password: process.env.JDXQ_DB_PASSWORD,
            database: 'xq',
            connectionLimit: 5,
        });

        const client = new MongoClient("mongodb://localhost:27017", {maxPoolSize: 50, minPoolSize: 5});
        (async () => {
            await client.connect();
            this.mClient = client;
            console.log('mongo connected')

            // 创建索引
            await this.createIndex();
        })()
    }

    /**
     * mongo客户端
     */
    get mongo(): MongoClient {
        return this.mClient;
    }

    /**
     * 创建数据库索引
     */
    async createIndex() {

        Log.info('创建必要的索引...');

        // 需要创建的索引
        const indexes: { [collection: string]: { indexSpec: IndexSpecification; options: CreateIndexesOptions; }[] } = {
            'user': [
                {
                    indexSpec: {platform: 1, roleId: 1},
                    options: {unique: true, name: 'platform_roleId', background: true}
                },
            ]
        };

        // 强制创建所有的集合
        try {
            for (const key of Object.keys(indexes)) {
                await this.mongo.db('xq').createCollection(key);
            }
        } catch (e) {
            if (e.code !== 48) {
                Log.error('创建集合失败', e);
            }
        }

        // 依次为所有的表创建索引
        for (const key of Object.keys(indexes)) {
            for (const item of indexes[key]) {
                const collection = this.mongo.db('xq').collection(key);
                if (await collection.indexExists(item.options.name)) {
                    continue;
                }
                await collection.createIndex(item.indexSpec, item.options);
            }
        }
    }

    /**
     * 数据库连接池
     */
    readonly pool: mysql.Pool;


    /**
     * mongo数据库连接池
     */
    private mClient: MongoClient;
}

export const gDb = new DbConfig();
