// src/composables/useTokens.js
import {ref} from 'vue';
import {getDataPath, getSaveUserTokensPath, getUserDataPath} from '../utils/pathHelper.js';

// ⭐ 全局单例状态
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
        if (isInitialized) {
            return true;
        }

        try {
            const [systemData, userData] = await Promise.allSettled([
                loadSystemTokens(),
                loadUserTokens()
            ]);

            await mergeTokenData(
                systemData.status === 'fulfilled' ? systemData.value : [],
                userData.status === 'fulfilled' ? userData.value : []
            );

            isInitialized = true;
            return true;
        } catch (error) {
            console.error('[useTokens] 加载词库数据失败:', error);
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
            const processedTokens = processSystemTokens(data.categories || []);
            systemTokens.value = processedTokens;
            return processedTokens;
        } catch (error) {
            console.warn('[useTokens] 系统词库加载失败:', error);
            return [];
        }
    };

    // 处理系统词元
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

    // ⭐ 修复：加载用户词库时确保正确设置 userTokens.value
    const loadUserTokens = async () => {
        try {
            const userDataPath = getUserDataPath('data.json');
            const response = await fetch(userDataPath);

            if (response.ok) {
                const data = await response.json();
                const userTokensData = data.categories || [];
                const processedTokens = processUserTokens(userTokensData);
                userTokens.value = processedTokens;
                console.log('[useTokens] ✅ 用户词库加载成功，分类数:', processedTokens.length);
                return processedTokens;
            }

            // ⭐ 文件不存在时，显式设置为空数组
            console.log('[useTokens] ⚠️ 用户词库文件不存在，使用空数组');
            userTokens.value = [];
            return [];
        } catch (error) {
            console.warn('[useTokens] 用户词库加载失败:', error);
            // ⭐ 加载失败时，显式设置为空数组
            userTokens.value = [];
            return [];
        }
    };

    // 处理用户词元
    const processUserTokens = (categories) => {
        return categories.map(category => ({
            ...category,
            source: 'user',
            subcategories: (category.subcategories || []).map(sub => ({
                ...sub,
                source: 'user',
                tokens: (sub.tokens || []).map(token => ({
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

    // 合并词库数据
    const mergeTokenData = async (systemCategories, userCategories) => {
        const userTokenMap = new Map();
        userCategories.forEach(category => {
            category.subcategories?.forEach(sub => {
                sub.tokens?.forEach(token => {
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

        const mergedCategories = [];

        userCategories.forEach(userCategory => {
            mergedCategories.push({
                ...userCategory,
                source: 'user',
                subcategories: [...userCategory.subcategories]
            });
        });

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

        tokenCategories.value = mergedCategories.map(cat => ({
            ...cat,
            expanded: false,
            subcategories: cat.subcategories.map(sub => ({
                ...sub,
                expanded: false
            }))
        }));
    };

    // ⭐⭐⭐ 核心修复：从文件读取现有用户数据（确保返回干净的数据）
    const loadUserDataFromFile = async () => {
        try {
            const userDataPath = getUserDataPath('data.json');
            const response = await fetch(userDataPath);

            if (response.ok) {
                const data = await response.json();
                console.log('[loadUserDataFromFile] ✅ 读取成功，分类数:', data.categories?.length || 0);

                // ⭐ 验证并清理数据，确保只包含用户数据
                const cleanedCategories = cleanAndValidateCategories(data.categories || []);

                return {
                    categories: cleanedCategories,
                    createdAt: data.createdAt || Date.now()
                };
            }

            // 文件不存在，返回空结构
            console.log('[loadUserDataFromFile] ⚠️ 文件不存在，返回空结构');
            return { categories: [], createdAt: Date.now() };
        } catch (error) {
            console.warn('[loadUserDataFromFile] 读取失败:', error);
            return { categories: [], createdAt: Date.now() };
        }
    };

    // ⭐⭐⭐ 新增：清理和验证分类数据，确保只包含用户数据
    const cleanAndValidateCategories = (categories) => {
        if (!Array.isArray(categories)) {
            return [];
        }

        return categories
            .filter(cat => cat && cat.id)  // 过滤无效分类
            .map(category => ({
                id: category.id,
                name: category.name,
                description: category.description || '',
                source: 'user',
                subcategories: (category.subcategories || [])
                    .filter(sub => sub && sub.id)  // 过滤无效子分类
                    .map(sub => ({
                        id: sub.id,
                        name: sub.name,
                        description: sub.description || '',
                        source: 'user',
                        tokens: (sub.tokens || [])
                            .filter(token => token && (token.id || token.en || token.zh))  // 过滤无效词元
                            .map(token => ({
                                id: token.id,
                                zh: token.zh || '',
                                en: token.en || '',
                                jp: token.jp || '',
                                description: token.description || '',
                                source: 'user',
                                categoryId: category.id,
                                subcategoryId: sub.id,
                                createdAt: token.createdAt || Date.now(),
                                updatedAt: token.updatedAt || Date.now()
                            })),
                        createdAt: sub.createdAt || Date.now(),
                        updatedAt: sub.updatedAt || Date.now()
                    })),
                createdAt: category.createdAt || Date.now(),
                updatedAt: category.updatedAt || Date.now()
            }));
    };

    // ⭐⭐⭐ 核心修复：增量保存单个词元（确保只保存必要的数据）
    const saveTokenIncremental = async (tokenData) => {
        try {
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useTokens] 增量保存词元 (${env})`);
            console.log('输入词元数据:', tokenData);

            // 1. 从文件读取现有数据（已清理）
            const existingData = await loadUserDataFromFile();
            console.log('现有用户数据分类数:', existingData.categories?.length || 0);

            // 2. ⭐ 提取干净的分类信息（只保留名称，不保留词元列表）
            const cleanTokenData = extractCleanTokenData(tokenData);
            console.log('清理后的词元数据:', cleanTokenData);

            // 3. 应用单个词元的修改
            const updatedCategories = applySingleTokenUpdate(
                existingData.categories || [],
                cleanTokenData
            );

            // 4. 构建保存数据
            const dataToSave = {
                categories: updatedCategories,
                createdAt: existingData.createdAt || Date.now(),
                updatedAt: Date.now()
            };

            // 5. 统计
            const tokensCount = dataToSave.categories.reduce((sum, cat) =>
                sum + (cat.subcategories || []).reduce((s, sub) =>
                    s + (sub.tokens || []).length, 0), 0);
            console.log('保存后总词元数:', tokensCount);
            console.log('保存的分类:', dataToSave.categories.map(c => ({
                id: c.id,
                name: c.name,
                subcategoriesCount: c.subcategories?.length || 0,
                tokensCount: c.subcategories?.reduce((s, sub) => s + (sub.tokens?.length || 0), 0) || 0
            })));

            // 6. 保存到文件
            const savePath = getSaveUserTokensPath();
            const response = await fetch(savePath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                console.log('✅ 增量保存成功');
                console.groupEnd();

                // 7. 更新本地缓存
                userTokens.value = processUserTokens(updatedCategories);
                await mergeTokenData(systemTokens.value, userTokens.value);

                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ 保存失败:', response.status, errorText);
                console.groupEnd();
                return false;
            }
        } catch (error) {
            console.error('❌ 增量保存异常:', error);
            console.groupEnd();
            return false;
        }
    };

    // ⭐⭐⭐ 新增：提取干净的词元数据（移除可能包含系统数据的字段）
    const extractCleanTokenData = (tokenData) => {
        const {
            categoryId,
            subcategoryId,
            id,
            operation = 'upsert',
            zh,
            en,
            jp,
            description,
            categoryName,
            subcategoryName,
        } = tokenData;

        // ⭐ 只提取必要的名称信息，不包含任何词元列表
        const cleanCategoryName = extractCleanName(categoryName, categoryId, 'Category');
        const cleanSubcategoryName = extractCleanName(subcategoryName, subcategoryId, 'Subcategory');

        return {
            categoryId,
            subcategoryId,
            id,
            operation,
            zh: zh || '',
            en: en || '',
            jp: jp || '',
            description: description || '',
            // ⭐ 只保留干净的名称对象
            categoryName: cleanCategoryName,
            subcategoryName: cleanSubcategoryName,
        };
    };

    // ⭐⭐⭐ 新增：提取干净的名称（确保是纯名称对象）
    const extractCleanName = (name, id, type) => {
        if (!name) {
            return {
                zh: `${type === 'Category' ? '分类' : '子分类'}-${id}`,
                en: `${type}-${id}`
            };
        }

        // 如果是字符串，转换为对象
        if (typeof name === 'string') {
            return { zh: name, en: name };
        }

        // 如果是对象，只保留 zh 和 en 字段
        return {
            zh: name.zh || name.en || `${type}-${id}`,
            en: name.en || name.zh || `${type}-${id}`
        };
    };

    // ⭐⭐⭐ 核心修复：应用单个词元的更新（确保不引入系统数据）
    const applySingleTokenUpdate = (existingCategories, tokenData) => {
        const {
            categoryId,
            subcategoryId,
            id: tokenId,
            operation = 'upsert',
            zh,
            en,
            jp,
            description,
            categoryName,
            subcategoryName,
        } = tokenData;

        // 深拷贝现有数据（这里的 existingCategories 已经是干净的用户数据）
        const categories = JSON.parse(JSON.stringify(existingCategories));

        // 查找分类
        let category = categories.find(cat => cat.id === categoryId);

        if (!category) {
            console.log(`[applySingleTokenUpdate] 创建新分类: ${categoryId}`);
            // ⭐ 创建干净的新分类，不包含任何词元
            category = {
                id: categoryId,
                name: categoryName,  // 已经是干净的名称对象
                description: '',
                source: 'user',
                subcategories: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            categories.push(category);
        }

        // 查找子分类
        let subcategory = category.subcategories.find(sub => sub.id === subcategoryId);

        if (!subcategory) {
            console.log(`[applySingleTokenUpdate] 创建新子分类: ${subcategoryId}`);
            // ⭐ 创建干净的新子分类，不包含任何词元
            subcategory = {
                id: subcategoryId,
                name: subcategoryName,  // 已经是干净的名称对象
                description: '',
                source: 'user',
                tokens: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            category.subcategories.push(subcategory);
        }

        // 确保 tokens 数组存在
        if (!subcategory.tokens) {
            subcategory.tokens = [];
        }

        // 查找现有词元
        const existingTokenIndex = subcategory.tokens.findIndex(t => t.id === tokenId);

        // 根据操作类型处理
        if (operation === 'delete') {
            if (existingTokenIndex !== -1) {
                subcategory.tokens.splice(existingTokenIndex, 1);
                console.log(`[applySingleTokenUpdate] 删除词元: ${tokenId}`);
            }
        } else {
            // ⭐ 构建干净的词元数据（只包含必要字段）
            const cleanTokenData = {
                id: tokenId,
                zh: zh || '',
                en: en || '',
                jp: jp || '',
                description: description || '',
                source: 'user',
                categoryId,
                subcategoryId,
                updatedAt: Date.now()
            };

            if (existingTokenIndex !== -1) {
                // 更新现有词元
                cleanTokenData.createdAt = subcategory.tokens[existingTokenIndex].createdAt || Date.now();
                subcategory.tokens[existingTokenIndex] = cleanTokenData;
                console.log(`[applySingleTokenUpdate] 更新词元: ${tokenId}`);
            } else {
                // 创建新词元
                cleanTokenData.createdAt = Date.now();
                subcategory.tokens.push(cleanTokenData);
                console.log(`[applySingleTokenUpdate] 创建词元: ${tokenId}`);
            }
        }

        // 更新时间戳
        category.updatedAt = Date.now();
        subcategory.updatedAt = Date.now();

        return categories;
    };

    // ⭐⭐⭐ 核心修复：批量增量保存多个词元
    const saveTokensIncremental = async (tokenDataList) => {
        if (!tokenDataList || tokenDataList.length === 0) {
            console.warn('[saveTokensIncremental] 没有要保存的词元');
            return true;
        }

        try {
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useTokens] 批量增量保存 ${tokenDataList.length} 个词元 (${env})`);

            // 1. 从文件读取现有数据
            const existingData = await loadUserDataFromFile();
            let updatedCategories = existingData.categories || [];

            // 2. 依次应用每个词元的修改（使用清理后的数据）
            for (const tokenData of tokenDataList) {
                const cleanTokenData = extractCleanTokenData(tokenData);
                updatedCategories = applySingleTokenUpdate(updatedCategories, cleanTokenData);
            }

            // 3. 保存
            const dataToSave = {
                categories: updatedCategories,
                createdAt: existingData.createdAt || Date.now(),
                updatedAt: Date.now()
            };

            const savePath = getSaveUserTokensPath();
            const response = await fetch(savePath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                console.log('✅ 批量增量保存成功');
                console.groupEnd();

                userTokens.value = processUserTokens(updatedCategories);
                await mergeTokenData(systemTokens.value, userTokens.value);
                return true;
            } else {
                console.error('❌ 保存失败');
                console.groupEnd();
                return false;
            }
        } catch (error) {
            console.error('❌ 批量增量保存异常:', error);
            console.groupEnd();
            return false;
        }
    };

    // ⭐ 修复：保留原有的批量保存函数，增加数据清理
    const saveUserTokens = async (userData = null) => {
        try {
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useTokens] 批量保存用户词库 (${env})`);

            // 从文件读取现有数据
            const existingData = await loadUserDataFromFile();

            let newCategories;
            if (userData?.categories) {
                newCategories = cleanUserTokens(userData.categories);
            } else {
                newCategories = cleanUserTokens(userTokens.value);
            }

            const mergedCategories = mergeCategories(existingData.categories || [], newCategories);

            const dataToSave = {
                categories: mergedCategories,
                createdAt: existingData.createdAt || Date.now(),
                updatedAt: Date.now()
            };

            // ⭐ 添加调试日志
            const tokensCount = dataToSave.categories.reduce((sum, cat) =>
                sum + (cat.subcategories || []).reduce((s, sub) =>
                    s + (sub.tokens || []).length, 0), 0);
            console.log('批量保存 - 分类数:', dataToSave.categories.length);
            console.log('批量保存 - 词元数:', tokensCount);

            const savePath = getSaveUserTokensPath();
            const response = await fetch(savePath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                console.log('✅ 批量保存成功');
                console.groupEnd();

                userTokens.value = processUserTokens(mergedCategories);
                await mergeTokenData(systemTokens.value, userTokens.value);
                return true;
            } else {
                console.error('❌ 保存失败');
                console.groupEnd();
                return false;
            }
        } catch (error) {
            console.error('❌ 保存异常:', error);
            console.groupEnd();
            return false;
        }
    };

    // ⭐ 修复：清理用户词元，确保只保留用户数据
    const cleanUserTokens = (categories) => {
        if (!categories || categories.length === 0) {
            return [];
        }

        return categories
            .filter(cat => {
                // ⭐ 只保留用户分类或包含用户词元的分类
                if (cat.source === 'user') return true;
                return cat.subcategories?.some(sub =>
                    sub.tokens?.some(token => token.source === 'user')
                );
            })
            .map(category => {
                const cleanedSubcategories = (category.subcategories || [])
                    .filter(sub => {
                        if (sub.source === 'user') return true;
                        return sub.tokens?.some(token => token.source === 'user');
                    })
                    .map(subcategory => ({
                        id: subcategory.id,
                        name: extractCleanName(subcategory.name, subcategory.id, 'Subcategory'),
                        description: subcategory.description || '',
                        source: 'user',
                        // ⭐ 只保留用户词元
                        tokens: (subcategory.tokens || [])
                            .filter(token => token.source === 'user')
                            .map(token => ({
                                id: token.id,
                                zh: token.zh || '',
                                en: token.en || '',
                                jp: token.jp || '',
                                description: token.description || '',
                                source: 'user',
                                categoryId: category.id,
                                subcategoryId: subcategory.id,
                                createdAt: token.createdAt || Date.now(),
                                updatedAt: token.updatedAt || Date.now()
                            })),
                        createdAt: subcategory.createdAt || Date.now(),
                        updatedAt: subcategory.updatedAt || Date.now()
                    }))
                    .filter(sub => sub.tokens.length > 0);  // ⭐ 过滤掉没有词元的子分类

                return {
                    id: category.id,
                    name: extractCleanName(category.name, category.id, 'Category'),
                    description: category.description || '',
                    source: 'user',
                    subcategories: cleanedSubcategories,
                    createdAt: category.createdAt || Date.now(),
                    updatedAt: category.updatedAt || Date.now()
                };
            })
            .filter(cat => cat.subcategories.length > 0);  // ⭐ 过滤掉没有子分类的分类
    };

    const refreshMergedData = async () => {
        await mergeTokenData(systemTokens.value, userTokens.value);
    };

    const mergeCategories = (existingCategories, newCategories) => {
        const categoryMap = new Map();
        existingCategories.forEach(cat => categoryMap.set(cat.id, {...cat}));

        newCategories.forEach(newCat => {
            if (categoryMap.has(newCat.id)) {
                const existingCat = categoryMap.get(newCat.id);
                categoryMap.set(newCat.id, {
                    ...existingCat,
                    ...newCat,
                    subcategories: mergeSubcategories(
                        existingCat.subcategories || [],
                        newCat.subcategories || []
                    ),
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
        existingSubcategories.forEach(sub => subcategoryMap.set(sub.id, {...sub}));

        newSubcategories.forEach(newSub => {
            if (subcategoryMap.has(newSub.id)) {
                const existingSub = subcategoryMap.get(newSub.id);
                subcategoryMap.set(newSub.id, {
                    ...existingSub,
                    ...newSub,
                    tokens: mergeTokens(existingSub.tokens || [], newSub.tokens || []),
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
        existingTokens.forEach(token => tokenMap.set(token.id, token));

        newTokens.forEach(newToken => {
            tokenMap.set(newToken.id, {
                ...(tokenMap.get(newToken.id) || {}),
                ...newToken,
                updatedAt: Date.now()
            });
        });

        return Array.from(tokenMap.values());
    };

    // ⭐ 更新用户词元（使用增量保存）
    const updateUserToken = async (tokenId, updates, categoryInfo = null) => {
        try {
            let categoryId, subcategoryId;

            if (categoryInfo) {
                categoryId = categoryInfo.categoryId;
                subcategoryId = categoryInfo.subcategoryId;
            } else {
                // 从缓存中查找
                for (const category of userTokens.value) {
                    for (const subcategory of category.subcategories) {
                        const token = subcategory.tokens.find(t => t.id === tokenId);
                        if (token) {
                            categoryId = category.id;
                            subcategoryId = subcategory.id;
                            break;
                        }
                    }
                    if (categoryId) break;
                }
            }

            if (!categoryId || !subcategoryId) {
                console.error('[updateUserToken] 无法确定词元的分类信息');
                return false;
            }

            return await saveTokenIncremental({
                id: tokenId,
                categoryId,
                subcategoryId,
                operation: 'update',
                ...updates
            });
        } catch (error) {
            console.error('[useTokens] 更新用户词元失败:', error);
            return false;
        }
    };

    // ⭐ 添加用户词元（使用增量保存）
    const addUserToken = async (tokenData, category, subcategory) => {
        try {
            return await saveTokenIncremental({
                id: tokenData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                categoryId: category.id,
                subcategoryId: subcategory.id,
                categoryName: extractCleanName(category.name, category.id, 'Category'),
                subcategoryName: extractCleanName(subcategory.name, subcategory.id, 'Subcategory'),
                operation: 'upsert',
                zh: tokenData.zh,
                en: tokenData.en,
                jp: tokenData.jp || '',
                description: tokenData.description || ''
            });
        } catch (error) {
            console.error('[useTokens] 添加用户词元失败:', error);
            return false;
        }
    };

    // ⭐ 删除用户词元（使用增量保存）
    const deleteUserToken = async (tokenId, categoryId, subcategoryId) => {
        try {
            return await saveTokenIncremental({
                id: tokenId,
                categoryId,
                subcategoryId,
                operation: 'delete'
            });
        } catch (error) {
            console.error('[useTokens] 删除用户词元失败:', error);
            return false;
        }
    };

    const addNewToken = async (category, subcategory, tokenData) => {
        const newToken = {
            id: `custom_${Date.now()}`,
            zh: tokenData.zh,
            en: tokenData.en,
            category: subcategory.id,
            source: 'user',
            uniqueId: `user_${category.id}_${subcategory.id}_${tokenData.en?.replace(/\s+/g, '_') || tokenData.zh?.replace(/\s+/g, '_')}`
        };

        const success = await addUserToken(newToken, category, subcategory);
        return success ? newToken : null;
    };

    const saveUserTokenData = async () => {
        return await saveUserTokens({ categories: userTokens.value });
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

    const reloadData = async () => {
        tokenCategories.value = [];
        systemTokens.value = [];
        userTokens.value = [];
        isInitialized = false;
        return await loadTokenData();
    };

    return {
        tokenCategories,
        userTokens,
        systemTokens,
        loadTokenData,
        addNewToken,
        searchTokens,
        updateUserToken,
        addUserToken,
        deleteUserToken,
        reloadData,
        saveUserTokens,
        saveUserTokenData,
        refreshMergedData,
        saveTokenIncremental,
        saveTokensIncremental,
    };
}