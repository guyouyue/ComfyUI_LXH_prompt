// src/composables/useTokens.js
import {ref} from 'vue';
import {getDataPath, getSaveUserTokensPath, getUserDataPath} from '../utils/pathHelper.js';

// ⭐ 全局单例状态（移到函数外部）
const tokenCategories = ref([]);
const userTokens = ref([]);
const systemTokens = ref([]);

// ⭐ 初始化标记
let isInitialized = false;

export function useTokens() {
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
        // ⭐ 避免重复加载
        if (isInitialized) {
            return true;
        }

        try {
            // 同时加载系统词库和用户词库
            const [systemData, userData] = await Promise.allSettled([
                loadSystemTokens(),
                loadUserTokens()
            ]);

            // 合并词库数据，用户词库优先
            await mergeTokenData(
                systemData.status === 'fulfilled' ? systemData.value : [],
                userData.status === 'fulfilled' ? userData.value : []
            );

            // ⭐ 标记已初始化
            isInitialized = true;

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

            const data = await loadLocalFile(dataPath);

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
            source: 'system',
            subcategories: category.subcategories.map(sub => ({
                ...sub,
                source: 'system',
                tokens: sub.tokens.map(token => ({
                    ...token,
                    source: 'system',
                    uniqueId: `system_${category.id}_${sub.id}_${token.en?.replace(/\s+/g, '_') || token.zh?.replace(/\s+/g, '_')}`,
                    categoryId: category.id,
                    subcategoryId: sub.id,
                    categoryName: category.name,
                    subcategoryName: sub.name
                }))
            }))
        }));
    };

    // 加载用户词库
    const loadUserTokens = async () => {
        try {
            const userDataPath = getUserDataPath('data.json');

            const response = await fetch(userDataPath);
            if (response.ok) {
                const data = await response.json();
                const userTokensData = data.categories || [];

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
            source: 'user',
            subcategories: category.subcategories.map(sub => ({
                ...sub,
                source: 'user',
                tokens: sub.tokens.map(token => ({
                    ...token,
                    source: 'user',
                    uniqueId: `user_${category.id}_${sub.id}_${token.en?.replace(/\s+/g, '_') || token.zh?.replace(/\s+/g, '_')}`,
                    categoryId: category.id,
                    subcategoryId: sub.id,
                    categoryName: category.name,
                    subcategoryName: sub.name
                }))
            }))
        }));
    };

    // 合并词库数据（用户词库优先）
    const mergeTokenData = async (systemCategories, userCategories) => {
        // 创建用户词元映射表（用于快速查找和覆盖）
        const userTokenMap = new Map();
        userCategories.forEach(category => {
            category.subcategories.forEach(sub => {
                sub.tokens.forEach(token => {
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
            const existingUserCategory = userCategories.find(cat => cat.id === systemCategory.id);

            if (existingUserCategory) {
                const mergedCategory = mergedCategories.find(cat => cat.id === systemCategory.id);

                systemCategory.subcategories.forEach(systemSub => {
                    const existingUserSub = existingUserCategory.subcategories.find(sub => sub.id === systemSub.id);

                    if (existingUserSub) {
                        const mergedSub = mergedCategory.subcategories.find(sub => sub.id === systemSub.id);
                        const mergedTokens = [...mergedSub.tokens];

                        systemSub.tokens.forEach(systemToken => {
                            const userTokenKey = systemToken.en?.toLowerCase().trim();
                            if (!userTokenMap.has(userTokenKey)) {
                                mergedTokens.push(systemToken);
                            }
                        });

                        mergedSub.tokens = mergedTokens;
                    } else {
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

        userTokens.value = await addTokenToUserData(category, subcategory, newToken);
        await mergeTokenData(systemTokens.value, userTokens.value);

        return newToken;
    };

    // 将词元添加到用户词库文件
    const addTokenToUserData = async (category, subcategory, token) => {
        try {
            const userDataPath = getUserDataPath('data.json');
            const response = await fetch(userDataPath);
            let userData = {categories: []};

            if (response.ok) {
                userData = await response.json();
            }

            let userCategory = userData.categories.find(cat => cat.id === category.id);
            if (!userCategory) {
                userCategory = {
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    source: 'user',
                    subcategories: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                userData.categories.push(userCategory);
            }

            let userSubcategory = userCategory.subcategories.find(sub => sub.id === subcategory.id);
            if (!userSubcategory) {
                userSubcategory = {
                    id: subcategory.id,
                    name: subcategory.name,
                    description: subcategory.description,
                    source: 'user',
                    tokens: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                userCategory.subcategories.push(userSubcategory);
            }

            userSubcategory.tokens.push({
                ...token,
                categoryId: category.id,
                subcategoryId: subcategory.id
            });

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
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useTokens] 保存用户词库 (${env})`);

            let existingData = {categories: []};
            try {
                const userDataPath = getUserDataPath('data.json');
                const response = await fetch(userDataPath);
                if (response.ok) {
                    existingData = await response.json();
                }
            } catch (error) {
                console.warn('⚠️ 读取现有数据失败，使用空数据:', error);
            }

            let newCategories;
            if (userData?.categories) {
                newCategories = cleanUserTokens(userData.categories);
            } else {
                newCategories = cleanUserTokens(userTokens.value);
            }

            const mergedCategories = mergeCategories(existingData.categories || [], newCategories);

            const dataToSave = {
                categories: mergedCategories,
                updatedAt: Date.now()
            };

            const tokensCount = dataToSave.categories?.reduce((sum, cat) =>
                sum + cat.subcategories.reduce((s, sub) => s + sub.tokens.length, 0), 0) || 0;

            const savePath = getSaveUserTokensPath();

            const response = await fetch(savePath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                const result = await response.json();
                console.groupEnd();

                userTokens.value = processUserTokens(mergedCategories);
                await mergeTokenData(systemTokens.value, userTokens.value);

                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ 保存失败:', response.status, errorText);
                console.groupEnd();
                return false;
            }
        } catch (error) {
            console.error('❌ 保存异常:', error);
            console.groupEnd();
            return false;
        }
    };

    const cleanUserTokens = (categories) => {
        if (!categories || categories.length === 0) {
            return [];
        }

        const cleanedCategories = categories
            .filter(cat => {
                if (cat.source === 'user') {
                    return true;
                }
                const hasUserTokens = cat.subcategories?.some(sub =>
                    sub.tokens?.some(token => token.source === 'user')
                );
                return hasUserTokens;
            })
            .map(category => {
                const cleanedSubcategories = (category.subcategories || [])
                    .filter(sub => {
                        if (sub.source === 'user') {
                            return true;
                        }
                        return sub.tokens?.some(token => token.source === 'user');
                    })
                    .map(subcategory => {
                        const userOnlyTokens = (subcategory.tokens || []).filter(token =>
                            token.source === 'user'
                        );

                        return {
                            id: subcategory.id,
                            name: subcategory.name,
                            description: subcategory.description,
                            source: 'user',
                            tokens: userOnlyTokens,
                            createdAt: subcategory.createdAt || Date.now(),
                            updatedAt: subcategory.updatedAt || Date.now()
                        };
                    });

                return {
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    source: 'user',
                    subcategories: cleanedSubcategories,
                    createdAt: category.createdAt || Date.now(),
                    updatedAt: category.updatedAt || Date.now()
                };
            });

        return cleanedCategories;
    };

    const refreshMergedData = async () => {
        await mergeTokenData(systemTokens.value, userTokens.value);
    };

    const mergeCategories = (existingCategories, newCategories) => {
        const categoryMap = new Map();
        existingCategories.forEach(cat => {
            categoryMap.set(cat.id, {...cat});
        });

        newCategories.forEach(newCat => {
            if (categoryMap.has(newCat.id)) {
                const existingCat = categoryMap.get(newCat.id);
                const mergedSubcategories = mergeSubcategories(
                    existingCat.subcategories || [],
                    newCat.subcategories || []
                );

                categoryMap.set(newCat.id, {
                    ...existingCat,
                    ...newCat,
                    subcategories: mergedSubcategories,
                    updatedAt: Date.now()
                });
            } else {
                categoryMap.set(newCat.id, {
                    ...newCat,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        });

        return Array.from(categoryMap.values());
    };

    const mergeSubcategories = (existingSubcategories, newSubcategories) => {
        const subcategoryMap = new Map();

        existingSubcategories.forEach(sub => {
            subcategoryMap.set(sub.id, {...sub});
        });

        newSubcategories.forEach(newSub => {
            if (subcategoryMap.has(newSub.id)) {
                const existingSub = subcategoryMap.get(newSub.id);
                const mergedTokens = mergeTokens(
                    existingSub.tokens || [],
                    newSub.tokens || []
                );

                subcategoryMap.set(newSub.id, {
                    ...existingSub,
                    ...newSub,
                    tokens: mergedTokens,
                    updatedAt: Date.now()
                });
            } else {
                subcategoryMap.set(newSub.id, {
                    ...newSub,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        });

        return Array.from(subcategoryMap.values());
    };

    const mergeTokens = (existingTokens, newTokens) => {
        const tokenMap = new Map();

        existingTokens.forEach(token => {
            tokenMap.set(token.id, token);
        });

        newTokens.forEach(newToken => {
            if (tokenMap.has(newToken.id)) {
                tokenMap.set(newToken.id, {
                    ...tokenMap.get(newToken.id),
                    ...newToken,
                    updatedAt: Date.now()
                });
            } else {
                tokenMap.set(newToken.id, {
                    ...newToken,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        });

        return Array.from(tokenMap.values());
    };

    const saveUserTokenData = async () => {
        const dataToSave = {
            categories: userTokens.value,
            updatedAt: Date.now()
        };

        const result = await saveUserTokens(dataToSave);

        return result;
    };

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
                            source: token.source
                        });
                    }
                });
            });
        });

        return results;
    };

    const updateUserToken = async (tokenId, updates) => {
        try {
            for (const category of userTokens.value) {
                for (const subcategory of category.subcategories) {
                    const tokenIndex = subcategory.tokens.findIndex(token => token.id === tokenId);
                    if (tokenIndex !== -1) {
                        subcategory.tokens[tokenIndex] = {
                            ...subcategory.tokens[tokenIndex],
                            ...updates,
                            updatedAt: Date.now()
                        };

                        await saveUserTokens({
                            categories: userTokens.value
                        });

                        return true;
                    }
                }
            }

            console.warn('[updateUserToken] 未找到要更新的词元:', tokenId);
            return false;
        } catch (error) {
            console.error('[useTokens] 更新用户词元失败:', error);
            return false;
        }
    };

    const addUserToken = async (tokenData, category, subcategory) => {
        try {
            let userCategory = userTokens.value.find(cat => cat.id === category.id);
            if (!userCategory) {
                userCategory = {
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    source: 'user',
                    subcategories: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                userTokens.value.push(userCategory);
            }

            let userSubcategory = userCategory.subcategories.find(sub => sub.id === subcategory.id);
            if (!userSubcategory) {
                userSubcategory = {
                    id: subcategory.id,
                    name: subcategory.name,
                    description: subcategory.description,
                    source: 'user',
                    tokens: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                userCategory.subcategories.push(userSubcategory);
            }

            const existingIndex = userSubcategory.tokens.findIndex(token => token.id === tokenData.id);
            if (existingIndex !== -1) {
                userSubcategory.tokens[existingIndex] = {
                    ...userSubcategory.tokens[existingIndex],
                    ...tokenData,
                    source: 'user',
                    updatedAt: Date.now()
                };
            } else {
                userSubcategory.tokens.push({
                    ...tokenData,
                    categoryId: category.id,
                    subcategoryId: subcategory.id,
                    source: 'user',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }

            await saveUserTokens({
                categories: userTokens.value
            });

            return true;
        } catch (error) {
            console.error('[useTokens] 添加用户词元失败:', error);
            return false;
        }
    };

    const reloadData = async () => {
        tokenCategories.value = [];
        systemTokens.value = [];
        userTokens.value = [];
        // ⭐ 重置初始化标记
        isInitialized = false;
        return await loadTokenData();
    };

    // ⭐ 返回全局单例 ref
    return {
        tokenCategories,
        userTokens,
        systemTokens,
        loadTokenData,
        addNewToken,
        searchTokens,
        updateUserToken,
        addUserToken,
        reloadData,
        saveUserTokens,
        saveUserTokenData,
        refreshMergedData
    };
}