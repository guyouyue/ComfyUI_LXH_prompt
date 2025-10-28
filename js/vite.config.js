import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs'
import {dirname, resolve} from 'path'

// 开发环境数据文件处理
function devDataHandler() {
    return {
        name: 'dev-data-handler',

        configureServer(server) {
            console.log('📡 开发服务器已启动，直接读取本地数据文件...');

            // 读取系统词库数据
            server.middlewares.use('/lxh_prompt/getData', (req, res) => {
                try {
                    const dataPath = resolve(__dirname, '../data/data.json');
                    console.log('📝 [DEV] 读取系统词库:', dataPath);

                    if (existsSync(dataPath)) {
                        const data = readFileSync(dataPath, 'utf-8');
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-cache');
                        res.end(data);
                        console.log('✅ [DEV] 系统词库加载成功');
                    } else {
                        console.warn('⚠️ [DEV] 系统词库文件不存在');
                        res.statusCode = 404;
                        res.end(JSON.stringify({categories: []}));
                    }
                } catch (error) {
                    console.error('❌ [DEV] 读取系统词库失败:', error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({categories: []}));
                }
            });

            // 读取用户词库数据
            server.middlewares.use('/lxh_prompt/getUserTokens', (req, res) => {
                try {
                    const dataPath = resolve(__dirname, '../data_user/data.json');
                    console.log('📝 [DEV] 读取用户词库:', dataPath);

                    if (existsSync(dataPath)) {
                        const data = readFileSync(dataPath, 'utf-8');
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-cache');
                        res.end(data);
                        console.log('✅ [DEV] 用户词库加载成功');
                    } else {
                        console.warn('⚠️ [DEV] 用户词库文件不存在，返回空数据');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({categories: []}));
                    }
                } catch (error) {
                    console.error('❌ [DEV] 读取用户词库失败:', error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({categories: []}));
                }
            });

            // 读取用户词组数据
            server.middlewares.use('/lxh_prompt/getUserData', (req, res) => {
                try {
                    const dataPath = resolve(__dirname, '../data_user/group.json');
                    console.log('📝 [DEV] 读取用户词组:', dataPath);

                    if (existsSync(dataPath)) {
                        const data = readFileSync(dataPath, 'utf-8');
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-cache');
                        res.end(data);
                        console.log('✅ [DEV] 用户词组加载成功');
                    } else {
                        console.warn('⚠️ [DEV] 用户词组文件不存在，返回空数据');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({groups: []}));
                    }
                } catch (error) {
                    console.error('❌ [DEV] 读取用户词组失败:', error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({groups: []}));
                }
            });

            // 保存用户词组数据
            server.middlewares.use('/lxh_prompt/saveUserData', async (req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const dataPath = resolve(__dirname, '../data_user/group.json');

                            console.log('💾 [DEV] 保存用户词组到:', dataPath);
                            console.log('💾 [DEV] 词组数量:', data.groups?.length || 0);

                            // 确保目录存在
                            mkdirSync(dirname(dataPath), {recursive: true});

                            // 写入文件
                            writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                status: 'success',
                                message: '用户词组保存成功',
                                timestamp: Date.now()
                            }));

                            console.log('✅ [DEV] 用户词组保存成功');
                        } catch (error) {
                            console.error('❌ [DEV] 保存用户词组失败:', error);
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                status: 'error',
                                message: error.message
                            }));
                        }
                    });
                } else {
                    res.statusCode = 405;
                    res.end('Method Not Allowed');
                }
            });

            // 保存用户词库数据
            server.middlewares.use('/lxh_prompt/saveUserTokens', async (req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const dataPath = resolve(__dirname, '../data_user/data.json');

                            console.log('💾 [DEV] 保存用户词库到:', dataPath);
                            console.log('💾 [DEV] 分类数量:', data.categories?.length || 0);

                            // 统计词元总数
                            const tokenCount = data.categories?.reduce((sum, cat) =>
                                sum + (cat.subcategories?.reduce((s, sub) =>
                                    s + (sub.tokens?.length || 0), 0) || 0), 0) || 0;
                            console.log('💾 [DEV] 词元总数:', tokenCount);

                            // 确保目录存在
                            mkdirSync(dirname(dataPath), {recursive: true});

                            // 写入文件
                            writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                status: 'success',
                                message: '用户词库保存成功',
                                timestamp: Date.now(),
                                stats: {
                                    categories: data.categories?.length || 0,
                                    tokens: tokenCount
                                }
                            }));

                            console.log('✅ [DEV] 用户词库保存成功');
                        } catch (error) {
                            console.error('❌ [DEV] 保存用户词库失败:', error);
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                status: 'error',
                                message: error.message
                            }));
                        }
                    });
                } else {
                    res.statusCode = 405;
                    res.end('Method Not Allowed');
                }
            });
        }
    }
}

export default defineConfig({
    plugins: [vue(), devDataHandler()],

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@data': resolve(__dirname, '../data'),
            '@data_user': resolve(__dirname, '../data_user')
        }
    },

    publicDir: false,

    server: {
        port: 3000,
        open: true,
        cors: true,
        host: true,
        fs: {
            strict: false,
            allow: ['..', '.', '/']
        },
        middlewareMode: false,

        proxy: {
            '/data_user': {
                target: 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/data_user/, ''),
                bypass: (req, res, options) => {
                    const fs = require('fs')
                    const path = require('path')
                    const rootDir = __dirname;

                    let fileName = req.url.replace('/data_user/', '');
                    fileName = fileName.split('?')[0];

                    const filePath = path.join(rootDir, '..', 'data_user', fileName);
                    console.log('📁 [PROXY] 读取用户数据:', filePath)

                    if (fs.existsSync(filePath)) {
                        const data = fs.readFileSync(filePath, 'utf-8')
                        res.setHeader('Content-Type', 'application/json')
                        res.setHeader('Cache-Control', 'no-cache')
                        res.end(data)
                        return true
                    }

                    console.log('❌ [PROXY] 文件不存在:', filePath)
                    return null
                }
            },

            '/data': {
                target: 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/data/, ''),
                bypass: (req, res, options) => {
                    const fs = require('fs')
                    const path = require('path')
                    const rootDir = __dirname;

                    let fileName = req.url.replace('/data/', '');
                    fileName = fileName.split('?')[0];

                    const filePath = path.join(rootDir, '..', 'data', fileName);
                    console.log('📁 [PROXY] 读取系统数据:', filePath)

                    if (fs.existsSync(filePath)) {
                        const data = fs.readFileSync(filePath, 'utf-8')
                        res.setHeader('Content-Type', 'application/json')
                        res.setHeader('Cache-Control', 'no-cache')
                        res.end(data)
                        return true
                    }

                    console.log('❌ [PROXY] 文件不存在:', filePath)
                    return null
                }
            }
        }
    },

    base: './',

    build: {
        outDir: 'dist',
        minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
        sourcemap: process.env.NODE_ENV !== 'production',
        cssCodeSplit: false,

        rollupOptions: {
            input: './main.js',
            external: ['../../scripts/app.js'],
            output: {
                format: 'es',
                entryFileNames: 'main.js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === 'style.css') {
                        return 'style.css';
                    }
                    return assetInfo.name;
                },
                inlineDynamicImports: true
            },
        },
    }
})