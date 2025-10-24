import {ref} from 'vue';
import {getDataPath, getUserDataPath, getSaveUserTokensPath} from '../utils/pathHelper.js';

export function useTokens() {
    const tokenCategories = ref([]);
    const userTokens = ref([]);
    const systemTokens = ref([]); // 新增：存储系统词库

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

            // 同时加载系统词库和用户词库
            const [systemData, userData] = await Promise.allSettled([
                loadSystemTokens(),
                loadUserTokens()
            ]);

            console.log('[useTokens] 词库加载完成:', {
                system: systemData.status,
                user: userData.status
            });

            // 合并词库数据，用户词库优先
            await mergeTokenData(
                systemData.status === 'fulfilled' ? systemData.value : [],
                userData.status === 'fulfilled' ? userData.value : []
            );

            console.log('[useTokens] 词库合并完成，共', tokenCategories.value.length, '个分类');

            return true;
        } catch (error) {
            console.error('[useTokens] 加载词库数据失败:', error);
            console.warn('[useTokens] 使用默认数据');

            // 使用默认数据
            tokenCategories.value = [];
            systemTokens.value = [];
            userTokens.value = [];
            return false;
        }
    };

    // 加载系统词库
    const loadSystemTokens = async () => {
        try {
            const dataPath = getDataPath('data.json');
            console.log('[useTokens] 加载系统词库:', dataPath);

            const data = await loadLocalFile(dataPath);
            console.log('[useTokens] 系统词库加载成功，共', data.categories?.length || 0, '个分类');

            // 处理系统词元，添加唯一标识
            const processedTokens = processSystemTokens(data.categories || []);
            systemTokens.value = processedTokens;

            return processedTokens;
        } catch (error) {
            console.warn('[useTokens] 系统词库加载失败:', error);
            return [];
        }
    };

    // 处理系统词元，为每个词元添加唯一标识
    const processSystemTokens = (categories) => {
        return categories.map(category => ({
            ...category,
            source: 'system', // 标记来源
            subcategories: category.subcategories.map(sub => ({
                ...sub,
                source: 'system',
                tokens: sub.tokens.map(token => ({
                    ...token,
                    source: 'system',
                    // 生成系统词元的唯一ID（基于分类+子分类+英文名）
                    uniqueId: `system_${category.id}_${sub.id}_${token.en?.replace(/\s+/g, '_') || token.zh?.replace(/\s+/g, '_')}`
                }))
            }))
        }));
    };

    // 加载用户词库
    const loadUserTokens = async () => {
        try {
            const userDataPath = getUserDataPath('data.json');
            console.log('[useTokens] 加载用户词库:', userDataPath);

            const response = await fetch(userDataPath);
            if (response.ok) {
                const data = await response.json();
                const userTokensData = data.categories || [];
                console.log('[useTokens] 用户词库加载成功:', userTokensData.length, '个分类');

                // 处理用户词元，添加唯一标识
                const processedTokens = processUserTokens(userTokensData);
                userTokens.value = processedTokens;

                return processedTokens;
            }
            return [];
        } catch (error) {
            console.warn('[useTokens] 用户词库加载失败:', error);
            return [];
        }
    };

    // 处理用户词元
    const processUserTokens = (categories) => {
        return categories.map(category => ({
            ...category,
            source: 'user', // 标记来源
            subcategories: category.subcategories.map(sub => ({
                ...sub,
                source: 'user',
                tokens: sub.tokens.map(token => ({
                    ...token,
                    source: 'user',
                    // 用户词元的唯一ID（基于分类+子分类+英文名）
                    uniqueId: `user_${category.id}_${sub.id}_${token.en?.replace(/\s+/g, '_') || token.zh?.replace(/\s+/g, '_')}`
                }))
            }))
        }));
    };

    // 合并词库数据（用户词库优先）
    const mergeTokenData = async (systemCategories, userCategories) => {
        console.log('[useTokens] 开始合并词库数据', {
            system: systemCategories.length,
            user: userCategories.length
        });

        // 创建用户词元映射表（用于快速查找和覆盖）
        const userTokenMap = new Map();
        userCategories.forEach(category => {
            category.subcategories.forEach(sub => {
                sub.tokens.forEach(token => {
                    // 使用英文名作为键（如果英文名相同，则认为相同词元）
                    const key = token.en?.toLowerCase().trim();
                    if (key) {
                        userTokenMap.set(key, {
                            ...token,
                            categoryId: category.id,
                            subcategoryId: sub.id
                        });
                    }
                });
            });
        });

        console.log('[useTokens] 用户词元映射表大小:', userTokenMap.size);

        // 合并分类结构
        const mergedCategories = [];

        // 首先添加用户分类（完全保留）
        userCategories.forEach(userCategory => {
            const mergedCategory = {
                ...userCategory,
                source: 'user',
                subcategories: [...userCategory.subcategories]
            };
            mergedCategories.push(mergedCategory);
        });

        // 然后添加系统分类（但排除用户词库中已存在的词元）
        systemCategories.forEach(systemCategory => {
            // 检查是否已存在同ID的用户分类
            const existingUserCategory = userCategories.find(cat => cat.id === systemCategory.id);

            if (existingUserCategory) {
                // 分类已存在，合并子分类
                const mergedCategory = mergedCategories.find(cat => cat.id === systemCategory.id);

                systemCategory.subcategories.forEach(systemSub => {
                    const existingUserSub = existingUserCategory.subcategories.find(sub => sub.id === systemSub.id);

                    if (existingUserSub) {
                        // 子分类已存在，合并词元（排除用户词库中已存在的词元）
                        const mergedSub = mergedCategory.subcategories.find(sub => sub.id === systemSub.id);
                        const mergedTokens = [...mergedSub.tokens]; // 用户词元已经在里面

                        // 添加系统词元（排除用户词库中已存在的）
                        systemSub.tokens.forEach(systemToken => {
                            const userTokenKey = systemToken.en?.toLowerCase().trim();
                            if (!userTokenMap.has(userTokenKey)) {
                                mergedTokens.push(systemToken);
                            }
                        });

                        mergedSub.tokens = mergedTokens;
                    } else {
                        // 子分类不存在，添加整个系统子分类（但排除用户词库中已存在的词元）
                        const filteredTokens = systemSub.tokens.filter(systemToken => {
                            const userTokenKey = systemToken.en?.toLowerCase().trim();
                            return !userTokenMap.has(userTokenKey);
                        });

                        if (filteredTokens.length > 0) {
                            mergedCategory.subcategories.push({
                                ...systemSub,
                                tokens: filteredTokens
                            });
                        }
                    }
                });
            } else {
                // 分类不存在，添加整个系统分类（但排除用户词库中已存在的词元）
                const filteredSubcategories = systemCategory.subcategories.map(systemSub => ({
                    ...systemSub,
                    tokens: systemSub.tokens.filter(systemToken => {
                        const userTokenKey = systemToken.en?.toLowerCase().trim();
                        return !userTokenMap.has(userTokenKey);
                    })
                })).filter(sub => sub.tokens.length > 0);

                if (filteredSubcategories.length > 0) {
                    mergedCategories.push({
                        ...systemCategory,
                        subcategories: filteredSubcategories
                    });
                }
            }
        });

        // 处理展开状态
        tokenCategories.value = mergedCategories.map(cat => ({
            ...cat,
            expanded: false,
            subcategories: cat.subcategories.map(sub => ({
                ...sub,
                expanded: false
            }))
        }));

        console.log('[useTokens] 合并完成，最终分类数:', tokenCategories.value.length);
    };

    // 添加新词元到用户词库
    const addNewToken = async (category, subcategory, tokenData) => {
        const newToken = {
            id: `custom_${Date.now()}`,
            zh: tokenData.zh,
            en: tokenData.en,
            category: subcategory.id,
            source: 'user',
            uniqueId: `user_${category.id}_${subcategory.id}_${tokenData.en?.replace(/\s+/g, '_') || tokenData.zh?.replace(/\s+/g, '_')}`
        };

        // 添加到用户词库
        userTokens.value = await addTokenToUserData(category, subcategory, newToken);

        // 重新合并词库
        await mergeTokenData(systemTokens.value, userTokens.value);

        console.log('[useTokens] 添加新词元到用户词库:', newToken);
        return newToken;
    };

    // 将词元添加到用户词库文件
    const addTokenToUserData = async (category, subcategory, token) => {
        try {
            // 加载现有用户数据
            const userDataPath = getUserDataPath('data.json');
            const response = await fetch(userDataPath);
            let userData = { categories: [] };

            if (response.ok) {
                userData = await response.json();
            }

            // 查找或创建分类
            let userCategory = userData.categories.find(cat => cat.id === category.id);
            if (!userCategory) {
                userCategory = {
                    ...category,
                    source: 'user',
                    subcategories: []
                };
                userData.categories.push(userCategory);
            }

            // 查找或创建子分类
            let userSubcategory = userCategory.subcategories.find(sub => sub.id === subcategory.id);
            if (!userSubcategory) {
                userSubcategory = {
                    ...subcategory,
                    source: 'user',
                    tokens: []
                };
                userCategory.subcategories.push(userSubcategory);
            }

            // 添加词元
            userSubcategory.tokens.push(token);

            // 保存到用户词库文件
            await saveUserTokens(userData);

            return userData.categories;
        } catch (error) {
            console.error('[useTokens] 添加到用户词库失败:', error);
            return userTokens.value;
        }
    };

    // 保存用户词库
    const saveUserTokens = async (userData = null) => {
        try {
            const dataToSave = userData || { categories: userTokens.value };

            // 保存到 localStorage
            localStorage.setItem('lxh_user_tokens', JSON.stringify(dataToSave.categories));

            // 保存到服务器
            if (!import.meta.env.DEV) {
                const savePath = getSaveUserTokensPath();
                const response = await fetch(savePath, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSave)
                });

                if (response.ok) {
                    console.log('[useTokens] 用户词库已保存到服务器');
                }
            }

            return true;
        } catch (error) {
            console.error('[useTokens] 保存用户词库失败:', error);
            return false;
        }
    };

    // 搜索词元（在合并后的词库中搜索）
    const searchTokens = (query) => {
        const results = [];
        const lowerQuery = query.toLowerCase();

        tokenCategories.value.forEach(cat => {
            cat.subcategories.forEach(sub => {
                sub.tokens.forEach(token => {
                    if (
                        token.zh?.toLowerCase().includes(lowerQuery) ||
                        token.en?.toLowerCase().includes(lowerQuery)
                    ) {
                        results.push({
                            ...token,
                            category: cat.name,
                            subcategory: sub.name,
                            source: token.source // 包含来源信息
                        });
                    }
                });
            });
        });

        return results;
    };

    // 重新加载数据
    const reloadData = async () => {
        console.log('[useTokens] 🔄🔄 重新加载数据...');
        tokenCategories.value = [];
        systemTokens.value = [];
        userTokens.value = [];
        return await loadTokenData();
    };

    return {
        tokenCategories,
        userTokens: userTokens,
        systemTokens: systemTokens,
        loadTokenData,
        addNewToken,
        searchTokens,
        reloadData,
        saveUserTokens
    };
}