/**
 * 词元解析工具
 */

/**
 * 解析输入文本为词元数组
 * @param {string} text - 输入文本
 * @param {Array} tokenCategories - 词库分类
 * @param {string} mode - 模式 'token' 或 'natural'
 * @returns {Array} 词元数组
 */
export function parseTextToTokens(text, tokenCategories, mode = 'token') {
    if (!text || !text.trim()) {
        return [];
    }

    // 创建词库映射表
    const tokenMap = createTokenMap(tokenCategories);

    // 根据模式分割文本
    let parts;
    if (mode === 'token') {
        parts = text.split(',').map(t => t.trim()).filter(Boolean);
    } else {
        parts = text.split(/\s+/).filter(Boolean);
    }

    // 转换为词元对象
    return parts.map((part, index) => {
        const mapping = findTokenMapping(part, tokenMap);

        return {
            id: `token_${Date.now()}_${index}`,
            value: part,
            original: part,
            display: part,
            mapping: mapping,
            // 新增：保留分类信息
            categoryId: mapping?.categoryId || '',
            subcategoryId: mapping?.subcategoryId || '',
            categoryName: mapping?.categoryName || '',
            subcategoryName: mapping?.subcategoryName || ''
        };
    });
}

/**
 * 将词元数组转换为文本
 * @param {Array} tokens - 词元数组
 * @param {string} mode - 模式
 * @param {string} language - 语言
 * @returns {string}
 */
export function tokensToText(tokens, mode = 'token', language = 'zh') {
    if (!tokens || tokens.length === 0) {
        return '';
    }

    const parts = tokens.map(token => {
        if (mode === 'natural') {
            return token.display || token.value;
        }

        // 词元模式
        if (language === 'zh') {
            return token.mapping?.zh || token.zh || token.value;
        } else {
            return token.mapping?.en || token.en || token.value;
        }
    });

    // 根据模式使用不同的连接符
    return mode === 'token' ? parts.join(', ') : parts.join(' ');
}

/**
 * 创建词库映射表（用于快速查找）
 * @param {Array} categories - 分类数组
 * @returns {Map}
 */
function createTokenMap(categories) {
    const map = new Map();

    if (!categories || !Array.isArray(categories)) {
        return map;
    }

    categories.forEach(category => {
        if (!category.subcategories) return;

        category.subcategories.forEach(subcategory => {
            if (!subcategory.tokens) return;

            subcategory.tokens.forEach(token => {
                // 英文作为 key
                if (token.en) {
                    map.set(token.en.toLowerCase(), {
                        ...token,
                        categoryId: category.id,
                        subcategoryId: subcategory.id,
                        categoryName: category.name,
                        subcategoryName: subcategory.name
                    });
                }

                // 中文也作为 key
                if (token.zh) {
                    map.set(token.zh.toLowerCase(), {
                        ...token,
                        categoryId: category.id,
                        subcategoryId: subcategory.id,
                        categoryName: category.name,
                        subcategoryName: subcategory.name
                    });
                }
            });
        });
    });

    return map;
}

/**
 * 查找词元映射
 * @param {string} text - 要查找的文本
 * @param {Map} tokenMap - 词库映射表
 * @returns {Object|null}
 */
function findTokenMapping(text, tokenMap) {
    if (!text || !tokenMap) {
        return null;
    }

    const lowerText = text.toLowerCase().trim();
    return tokenMap.get(lowerText) || null;
}

/**
 * 从词库获取所有词元的扁平列表
 * @param {Array} categories - 分类数组
 * @returns {Array}
 */
export function getAllTokensFlat(categories) {
    const allTokens = [];

    if (!categories || !Array.isArray(categories)) {
        return allTokens;
    }

    categories.forEach(category => {
        if (!category.subcategories) return;

        category.subcategories.forEach(subcategory => {
            if (!subcategory.tokens) return;

            subcategory.tokens.forEach(token => {
                allTokens.push({
                    ...token,
                    categoryId: category.id,
                    subcategoryId: subcategory.id,
                    categoryName: category.name.zh || category.name.en,
                    subcategoryName: subcategory.name.zh || subcategory.name.en
                });
            });
        });
    });

    return allTokens;
}

/**
 * 验证词元 ID 格式
 * @param {string} id - 词元 ID
 * @returns {boolean}
 */
export function validateTokenId(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }

    // 只允许字母、数字、下划线和连字符
    return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * 生成唯一的词元 ID
 * @param {string} prefix - 前缀
 * @returns {string}
 */
export function generateTokenId(prefix = 'token') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}