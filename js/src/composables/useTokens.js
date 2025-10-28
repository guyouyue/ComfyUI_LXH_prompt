import {ref} from 'vue';
import {getDataPath, getSaveUserTokensPath, getUserDataPath} from '../utils/pathHelper.js';

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
            source: 'system',
            subcategories: category.subcategories.map(sub => ({
                ...sub,
                source: 'system',
                tokens: sub.tokens.map(token => ({
                    ...token,
                    source: 'system',
                    uniqueId: `system_${category.id}_${sub.id}_${token.en?.replace(/\s+/g, '_') || token.zh?.replace(/\s+/g, '_')}`,
                    // 新增：确保分类信息完整
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
            source: 'user',
            subcategories: category.subcategories.map(sub => ({
                ...sub,
                source: 'user',
                tokens: sub.tokens.map(token => ({
                    ...token,
                    source: 'user',
                    uniqueId: `user_${category.id}_${sub.id}_${token.en?.replace(/\s+/g, '_') || token.zh?.replace(/\s+/g, '_')}`,
                    // 新增：确保分类信息完整
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
            let userData = {categories: []};

            if (response.ok) {
                userData = await response.json();
            }

            // 查找或创建分类
            let userCategory = userData.categories.find(cat => cat.id === category.id);
            if (!userCategory) {
                // ✅ 只复制必要的属性
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

            // 查找或创建子分类
            let userSubcategory = userCategory.subcategories.find(sub => sub.id === subcategory.id);
            if (!userSubcategory) {
                // ✅ 只复制必要的属性
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

            // 添加词元
            userSubcategory.tokens.push({
                ...token,
                categoryId: category.id,
                subcategoryId: subcategory.id
            });

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
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useTokens] 保存用户词库 (${env})`);

            // 1. 读取现有的用户词库数据
            let existingData = {categories: []};
            try {
                const userDataPath = getUserDataPath('data.json');
                const response = await fetch(userDataPath);
                if (response.ok) {
                    existingData = await response.json();
                    console.log('📖 读取现有数据，分类数:', existingData.categories?.length || 0);
                }
            } catch (error) {
                console.warn('⚠️ 读取现有数据失败，使用空数据:', error);
            }

            // 2. 准备要保存的数据
            // ⭐ 关键修改：无论是否传入 userData，都要清洗数据
            let newCategories;
            if (userData?.categories) {
                console.log('📝 使用传入的 userData，分类数:', userData.categories.length);
                // ⭐ 清洗传入的数据
                newCategories = cleanUserTokens(userData.categories);
                console.log('🧹 清洗后的分类数:', newCategories.length);
            } else {
                // ⭐ 清洗 userTokens.value
                newCategories = cleanUserTokens(userTokens.value);
                console.log('🧹 使用清洗后的 userTokens，分类数:', newCategories.length);
            }

            // 3. 合并数据（保留现有数据，更新/添加新数据）
            const mergedCategories = mergeCategories(existingData.categories || [], newCategories);

            const dataToSave = {
                categories: mergedCategories,
                updatedAt: Date.now()
            };

            console.log('📊 合并结果:', {
                existing: existingData.categories?.length || 0,
                new: newCategories.length,
                merged: mergedCategories.length
            });

            // 4. 统计词元总数
            const tokensCount = dataToSave.categories?.reduce((sum, cat) =>
                sum + cat.subcategories.reduce((s, sub) => s + sub.tokens.length, 0), 0) || 0;
            console.log('💾 词元总数:', tokensCount);

            // 5. 保存
            const savePath = getSaveUserTokensPath();
            console.log('💾 保存路径:', savePath);

            const response = await fetch(savePath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 保存成功:', result);
                console.groupEnd();

                // ⭐ 关键修改：只更新 userTokens.value 为纯净的用户数据
                // 不要包含合并后的系统数据
                userTokens.value = processUserTokens(mergedCategories);

                // ⭐ 立即重新合并到 tokenCategories
                await mergeTokenData(systemTokens.value, userTokens.value);

                console.log('✅ 内存数据已同步更新');

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

    // ⭐ 新增：清洗用户词元数据（移除不应该保存的数据）
    const cleanUserTokens = (categories) => {
        console.log('[cleanUserTokens] 开始清洗用户词元数据');

        if (!categories || categories.length === 0) {
            return [];
        }

        // 只保留标记为 'user' source 的数据
        const cleanedCategories = categories
            .filter(cat => {
                // 只保留用户分类或包含用户词元的分类
                const hasUserTokens = cat.subcategories?.some(sub =>
                    sub.tokens?.some(token => token.source === 'user')
                );
                return cat.source === 'user' || hasUserTokens;
            })
            .map(category => {
                // 清洗子分类
                const cleanedSubcategories = category.subcategories
                    .filter(sub => {
                        // 只保留包含用户词元的子分类
                        return sub.tokens?.some(token => token.source === 'user');
                    })
                    .map(subcategory => {
                        // 只保留用户词元
                        const userOnlyTokens = subcategory.tokens.filter(token =>
                            token.source === 'user'
                        );

                        return {
                            id: subcategory.id,
                            name: subcategory.name,
                            description: subcategory.description,
                            source: 'user',
                            tokens: userOnlyTokens,
                            createdAt: subcategory.createdAt,
                            updatedAt: subcategory.updatedAt || Date.now()
                        };
                    })
                    .filter(sub => sub.tokens.length > 0); // 移除空子分类

                // 如果没有用户词元，返回 null
                if (cleanedSubcategories.length === 0) {
                    return null;
                }

                return {
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    source: 'user',
                    subcategories: cleanedSubcategories,
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt || Date.now()
                };
            })
            .filter(cat => cat !== null); // 移除空分类

        console.log('[cleanUserTokens] 清洗完成:', {
            original: categories.length,
            cleaned: cleanedCategories.length,
            tokens: cleanedCategories.reduce((sum, cat) =>
                sum + cat.subcategories.reduce((s, sub) => s + sub.tokens.length, 0), 0)
        });

        return cleanedCategories;
    };

    const refreshMergedData = async () => {
        console.log('[useTokens] 🔄 刷新合并数据（不重新加载文件）');
        await mergeTokenData(systemTokens.value, userTokens.value);
        console.log('[useTokens] ✅ 合并数据已刷新');
    };

    // 新增：合并分类数据的辅助函数
    const mergeCategories = (existingCategories, newCategories) => {
        console.log('[mergeCategories] 开始合并分类数据');

        // 创建现有分类的映射表
        const categoryMap = new Map();
        existingCategories.forEach(cat => {
            categoryMap.set(cat.id, {...cat});
        });

        // 合并新分类
        newCategories.forEach(newCat => {
            if (categoryMap.has(newCat.id)) {
                // 分类已存在，合并子分类
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
                // 新分类，直接添加
                categoryMap.set(newCat.id, {
                    ...newCat,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        });

        return Array.from(categoryMap.values());
    };

    // 新增：合并子分类数据的辅助函数
    const mergeSubcategories = (existingSubcategories, newSubcategories) => {
        const subcategoryMap = new Map();

        // 添加现有子分类
        existingSubcategories.forEach(sub => {
            subcategoryMap.set(sub.id, {...sub});
        });

        // 合并新子分类
        newSubcategories.forEach(newSub => {
            if (subcategoryMap.has(newSub.id)) {
                // 子分类已存在，合并词元
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
                // 新子分类，直接添加
                subcategoryMap.set(newSub.id, {
                    ...newSub,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        });

        return Array.from(subcategoryMap.values());
    };

    // 新增：合并词元数据的辅助函数
    const mergeTokens = (existingTokens, newTokens) => {
        const tokenMap = new Map();

        // 添加现有词元
        existingTokens.forEach(token => {
            tokenMap.set(token.id, token);
        });

        // 合并新词元（更新或添加）
        newTokens.forEach(newToken => {
            if (tokenMap.has(newToken.id)) {
                // 词元已存在，更新
                tokenMap.set(newToken.id, {
                    ...tokenMap.get(newToken.id),
                    ...newToken,
                    updatedAt: Date.now()
                });
            } else {
                // 新词元，添加
                tokenMap.set(newToken.id, {
                    ...newToken,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        });

        return Array.from(tokenMap.values());
    };

// 专门保存用户词元数据
    const saveUserTokenData = async () => {
        console.log('[useTokens] 🔄 准备保存用户词元数据');

        const dataToSave = {
            categories: userTokens.value,
            updatedAt: Date.now()
        };

        const result = await saveUserTokens(dataToSave);

        if (result) {
            console.log('[useTokens] ✅ 用户词元数据保存成功');
        } else {
            console.error('[useTokens] ❌ 用户词元数据保存失败');
        }

        return result;
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

    const updateUserToken = async (tokenId, updates) => {
        try {
            console.log('[updateUserToken] 开始更新词元:', {tokenId, updates});

            // 查找词元
            for (const category of userTokens.value) {
                for (const subcategory of category.subcategories) {
                    const tokenIndex = subcategory.tokens.findIndex(token => token.id === tokenId);
                    if (tokenIndex !== -1) {
                        // 更新词元
                        subcategory.tokens[tokenIndex] = {
                            ...subcategory.tokens[tokenIndex],
                            ...updates,
                            updatedAt: Date.now()
                        };

                        console.log('[updateUserToken] 词元已更新:', subcategory.tokens[tokenIndex]);

                        // ⭐ 关键修改：只保存用户词库数据
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

    // 添加用户词元到指定分类
    const addUserToken = async (tokenData, category, subcategory) => {
        try {
            console.log('[addUserToken] 开始添加词元:', {
                tokenId: tokenData.id,
                categoryId: category.id,
                subcategoryId: subcategory.id
            });

            // 查找或创建用户分类
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
                console.log('[addUserToken] 创建新的用户分类:', userCategory.id);
            }

            // 查找或创建用户子分类
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
                console.log('[addUserToken] 创建新的用户子分类:', userSubcategory.id);
            }

            // 检查是否已存在相同ID的词元
            const existingIndex = userSubcategory.tokens.findIndex(token => token.id === tokenData.id);
            if (existingIndex !== -1) {
                console.log('[addUserToken] 更新现有词元:', tokenData.id);
                userSubcategory.tokens[existingIndex] = {
                    ...userSubcategory.tokens[existingIndex],
                    ...tokenData,
                    source: 'user', // ⭐ 确保标记为用户词元
                    updatedAt: Date.now()
                };
            } else {
                console.log('[addUserToken] 添加新词元:', tokenData.id);
                userSubcategory.tokens.push({
                    ...tokenData,
                    categoryId: category.id,
                    subcategoryId: subcategory.id,
                    source: 'user', // ⭐ 确保标记为用户词元
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }

            // ⭐ 关键修改：传入清洗后的数据
            await saveUserTokens({
                categories: userTokens.value
            });

            console.log('[addUserToken] 词元添加成功，当前用户词库状态:', {
                categories: userTokens.value.length,
                subcategories: userTokens.value.reduce((sum, cat) => sum + cat.subcategories.length, 0),
                tokens: userTokens.value.reduce((sum, cat) =>
                    sum + cat.subcategories.reduce((s, sub) => s + sub.tokens.length, 0), 0)
            });

            return true;
        } catch (error) {
            console.error('[useTokens] 添加用户词元失败:', error);
            return false;
        }
    };

    // 重新加载数据
    const reloadData = async () => {
        console.log('[useTokens] 🔄 重新加载数据...');
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
        updateUserToken,
        addUserToken,
        reloadData,
        saveUserTokens,
        saveUserTokenData,
        refreshMergedData
    };
}