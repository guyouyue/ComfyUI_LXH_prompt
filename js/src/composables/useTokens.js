import {ref} from 'vue';
import {getDataPath, getUserDataPath} from '../utils/pathHelper.js';

export function useTokens() {
    const tokenCategories = ref([]);
    const userTokens = ref([]);

    // 开发环境直接读取本地文件
    const loadLocalFile = async (path) => {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[useTokens] 读取本地文件失败 ${path}:`, error);
            throw error;
        }
    };

    // 加载词库数据
    const loadTokenData = async () => {
        try {
            console.log('[useTokens] 开始加载词库数据');

            const dataPath = getDataPath('data.json');
            console.log('[useTokens] 请求路径:', dataPath);

            const data = await loadLocalFile(dataPath);
            console.log('[useTokens] 词库数据加载成功:', data);

            // 处理数据，添加展开状态
            tokenCategories.value = data.categories.map(cat => ({
                ...cat,
                expanded: false,
                subcategories: cat.subcategories.map(sub => ({
                    ...sub,
                    expanded: false
                }))
            }));

            console.log('[useTokens] 词库数据处理完成，共', tokenCategories.value.length, '个分类');

            // 加载用户自定义词元
            await loadUserTokens();

            return true;
        } catch (error) {
            console.error('[useTokens] 加载词库数据失败:', error);
            console.warn('[useTokens] 使用默认数据');

            // 使用默认数据
            tokenCategories.value = [];
            return false;
        }
    };

    // 加载用户自定义词元
    const loadUserTokens = async () => {
        try {
            const userDataPath = getUserDataPath('data.json');
            console.log('[useTokens] 加载用户词元:', userDataPath);

            const response = await fetch(userDataPath);
            if (response.ok) {
                const data = await response.json();
                userTokens.value = data.tokens || [];
                console.log('[useTokens] 用户词元加载成功:', userTokens.value.length, '个');

                // 如果有用户自定义词元，合并到主词库
                if (userTokens.value.length > 0) {
                    mergeUserTokens();
                }
            }
        } catch (error) {
            console.warn('[useTokens] 用户词元加载失败，使用空数据:', error);
            userTokens.value = [];
        }
    };

    // 合并用户词元到主词库
    const mergeUserTokens = () => {
        let customCategory = tokenCategories.value.find(cat => cat.id === 'custom');

        if (!customCategory) {
            customCategory = {
                id: 'custom',
                name: {zh: '自定义词元', en: 'Custom Tokens'},
                expanded: true,
                subcategories: []
            };
            tokenCategories.value.unshift(customCategory);
        }

        const userTokensByCategory = {};
        userTokens.value.forEach(token => {
            const category = token.category || 'uncategorized';
            if (!userTokensByCategory[category]) {
                userTokensByCategory[category] = [];
            }
            userTokensByCategory[category].push(token);
        });

        Object.entries(userTokensByCategory).forEach(([catName, tokens]) => {
            let subcategory = customCategory.subcategories.find(sub => sub.id === catName);
            if (!subcategory) {
                subcategory = {
                    id: catName,
                    name: {zh: catName, en: catName},
                    expanded: true,
                    tokens: []
                };
                customCategory.subcategories.push(subcategory);
            }
            subcategory.tokens.push(...tokens);
        });
    };


    // 添加新词元
    const addNewToken = (category, subcategory, tokenData) => {
        const newToken = {
            id: `custom_${Date.now()}`,
            zh: tokenData.zh,
            en: tokenData.en,
            category: subcategory.id
        };

        subcategory.tokens.push(newToken);
        userTokens.value.push(newToken);

        console.log('[useTokens] 添加新词元:', newToken);

        saveUserTokens();

        return newToken;
    };

    // 保存用户词元
    // 在 useTokens.js 中修改 saveUserTokens 函数
    const saveUserTokens = async () => {
        try {
            console.log('[useTokens] 保存用户词元:', userTokens.value);

            // 保存到 localStorage
            localStorage.setItem('lxh_user_tokens', JSON.stringify(userTokens.value));

            // 保存到服务器
            if (!import.meta.env.DEV) {
                const savePath = getSaveUserTokensPath();
                const response = await fetch(savePath, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({tokens: userTokens.value})
                });

                if (response.ok) {
                    console.log('[useTokens] 用户词元已保存到服务器');
                }
            }

            return true;
        } catch (error) {
            console.error('[useTokens] 保存用户词元失败:', error);
            return false;
        }
    };

    // 搜索词元
    const searchTokens = (query) => {
        const results = [];
        const lowerQuery = query.toLowerCase();

        tokenCategories.value.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.tokens.forEach(token => {
                    if (
                        token.zh.toLowerCase().includes(lowerQuery) ||
                        token.en.toLowerCase().includes(lowerQuery)
                    ) {
                        results.push({
                            ...token,
                            category: cat.name,
                            subcategory: sub.name
                        });
                    }
                });
            });
        });

        return results;
    };

    // 重新加载数据（开发时使用）
    const reloadData = async () => {
        console.log('[useTokens] 🔄 重新加载数据...');
        tokenCategories.value = [];
        userTokens.value = [];
        return await loadTokenData();
    };

    return {
        tokenCategories,
        userTokens,
        loadTokenData,
        loadUserTokens,
        addNewToken,
        searchTokens,
        reloadData
    };
}