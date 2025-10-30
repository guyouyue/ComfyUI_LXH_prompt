// src/utils/pathHelper.js

/**
 * 路径辅助工具 - 开发环境直接使用本地文件
 */

/**
 * 智能检测环境并获取基础路径
 */
export function getBasePath() {
    // 开发环境（Vite dev server）
    if (import.meta.env.DEV) {
        return ''; // 开发环境直接访问根路径
    }

    // 生产环境（ComfyUI）
    return '';
}

/**
 * 获取数据文件路径 - 开发环境直接读取本地文件
 */
export function getDataPath(filename) {
    if (import.meta.env.DEV) {
        // 开发环境：直接读取本地文件
        return `/data/${filename}?t=${Date.now()}`;
    }
    // 生产环境：使用API
    return `/lxh_prompt/getData?t=${Date.now()}`;
}

/**
 * 获取用户数据路径 - 开发环境直接读取本地文件
 */
export function getUserDataPath(filename) {
    if (import.meta.env.DEV) {
        // 开发环境：直接读取本地文件
        return `/data_user/${filename}?t=${Date.now()}`;
    }

    // 生产环境：使用API
    if (filename === 'group.json') {
        return `/lxh_prompt/getUserData?t=${Date.now()}`;
    } else if (filename === 'data.json') {
        return `/lxh_prompt/getUserTokens?t=${Date.now()}`;
    }
    return `/lxh_prompt/getUserData?t=${Date.now()}`;
}

/**
 * 保存用户数据的路径（词组）
 */
export function getSaveUserDataPath() {
    // 开发环境和生产环境都使用相同的路径
    return '/lxh_prompt/saveUserData';
}

/**
 * 保存用户词库的路径
 */
export function getSaveUserTokensPath() {
    // 开发环境和生产环境都使用相同的路径
    return '/lxh_prompt/saveUserTokens';
}

/**
 * 获取静态资源路径
 */
export function getAssetPath(filename) {
    const base = getBasePath();
    return `${base}/assets/${filename}`;
}

/**
 * 获取项目根路径
 */
export function getRootPath() {
    if (import.meta.env.DEV) {
        return '/';
    }
    return '/extensions/ComfyUI_LXH_prompt/';
}
