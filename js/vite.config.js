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

            // 修正中间件中的路径
            server.middlewares.use('/lxh_prompt/getData', (req, res) => {
                try {
                    // 直接使用项目根目录下的 data 文件夹
                    const dataPath = resolve(__dirname, '../data/data.json');
                    console.log('📝 开发环境：读取数据文件路径:', dataPath);
                    if (existsSync(dataPath)) {
                        const data = readFileSync(dataPath, 'utf-8');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(data);
                        console.log('📝 开发环境：直接提供本地数据文件');
                    } else {
                        res.statusCode = 404;
                        res.end(JSON.stringify({categories: []}));
                    }
                } catch (error) {
                    console.error('❌ 读取数据文件失败:', error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({categories: []}));
                }
            });

            server.middlewares.use('/lxh_prompt/getUserData', (req, res) => {
                try {
                    const dataPath = resolve(__dirname, '../data_user/group.json');
                    console.log('📝 开发环境：读取用户数据文件路径:', dataPath);
                    if (existsSync(dataPath)) {
                        const data = readFileSync(dataPath, 'utf-8');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(data);
                        console.log('📝 开发环境：直接提供本地用户数据文件');
                    } else {
                        res.statusCode = 404;
                        res.end(JSON.stringify({groups: []}));
                    }
                } catch (error) {
                    console.error('❌ 读取用户数据文件失败:', error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({groups: []}));
                }
            });

            // 保存数据的中间件（开发环境写入本地文件）
            server.middlewares.use('/lxh_prompt/saveUserData', async (req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const dataPath = resolve(__dirname, '../data_user/group.json');
                            console.log('💾 保存用户数据到:', dataPath);
                            mkdirSync(dirname(dataPath), {recursive: true});
                            writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({status: 'success'}));
                            console.log('💾 开发环境：用户数据已保存到本地文件');
                        } catch (error) {
                            console.error('❌ 保存用户数据失败:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({status: 'error', message: error.message}));
                        }
                    });
                }
            });

            server.middlewares.use('/lxh_prompt/saveUserTokens', async (req, res) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const dataPath = resolve(__dirname, '../data_user/data.json');
                            console.log('💾 保存用户词元到:', dataPath);
                            mkdirSync(dirname(dataPath), {recursive: true});
                            writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({status: 'success'}));
                            console.log('💾 开发环境：用户词元已保存到本地文件');
                        } catch (error) {
                            console.error('❌ 保存用户词元失败:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({status: 'error', message: error.message}));
                        }
                    });
                }
            });
        }
    }
}

export default defineConfig({
    plugins: [vue(), devDataHandler()], // 替换原来的 copyStaticFiles

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@data': resolve(__dirname, '../data'),
            '@data_user': resolve(__dirname, '../data_user')
        }
    },

    // 配置静态资源目录
    publicDir: false,
    server: {
        port: 3000,
        open: true,
        cors: true,
        host: true,
        fs: {
            strict: false,
            allow: ['..', '.', '/'] // 允许访问上级目录和根目录
        },
        // 自定义静态文件目录
        middlewareMode: false,
        // 修改 proxy 配置部分
        proxy: {

            '/data_user': {
                target: 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/data_user/, ''),
                bypass: (req, res, options) => {
                    const fs = require('fs')
                    const path = require('path')

                    // 获取项目根目录
                    const rootDir = __dirname;

                    // 从URL中提取文件名
                    let fileName = req.url.replace('/data_user/', '');
                    fileName = fileName.split('?')[0];

                    // 直接指向项目根目录下的data_user文件夹
                    const filePath = path.join(rootDir, '..', 'data_user', fileName);

                    console.log('📁 尝试读取用户数据文件:', filePath)

                    if (fs.existsSync(filePath)) {
                        const data = fs.readFileSync(filePath, 'utf-8')
                        res.setHeader('Content-Type', 'application/json')
                        res.end(data)
                        return true
                    }

                    console.log('❌ 用户数据文件不存在:', filePath)
                    return null
                }
            },
            '/data': {
                target: 'http://localhost:3000',
                rewrite: (path) => path.replace(/^\/data/, ''),
                bypass: (req, res, options) => {
                    const fs = require('fs')
                    const path = require('path')

                    // 获取项目根目录（vite.config.js所在目录）
                    const rootDir = __dirname;

                    // 从URL中提取文件名
                    let fileName = req.url.replace('/data/', '');
                    fileName = fileName.split('?')[0]; // 移除查询参数

                    // 直接指向项目根目录下的data文件夹
                    const filePath = path.join(rootDir, '..', 'data', fileName);

                    console.log('📁 尝试读取文件:', filePath)

                    if (fs.existsSync(filePath)) {
                        const data = fs.readFileSync(filePath, 'utf-8')
                        res.setHeader('Content-Type', 'application/json')
                        res.end(data)
                        return true
                    }

                    console.log('❌ 文件不存在:', filePath)
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