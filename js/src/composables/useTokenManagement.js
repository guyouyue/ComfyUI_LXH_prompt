// src/composables/useTokenManagement.js
import {computed} from 'vue';
import {useAppStore} from './useAppStore.js';
import {useTokens} from './useTokens.js';
import {useCustomGroups} from './useCustomGroups.js';
import {getAllTokensFlat} from '../utils/tokenParser.js';
import {LANGUAGES} from '../utils/constants.js';

export function useTokenManagement() {
    const store = useAppStore();
    const {
        tokenCategories,
        userTokens,
        addUserToken,
        updateUserToken,
        saveUserTokens,
        saveUserTokenData,
        refreshMergedData,
    } = useTokens();
    const {customGroups, saveCustomGroups} = useCustomGroups();

    // ========== 计算属性 ==========
    const allTokensFlat = computed(() => {
        return getAllTokensFlat(tokenCategories.value);
    });

    // ========== 词元查找 ==========

    /**
     * 根据值查找词元映射
     */
    const findTokenMappingByValue = (value) => {
        const lowerValue = value.toLowerCase();
        for (const token of allTokensFlat.value) {
            if (
                token.en?.toLowerCase() === lowerValue ||
                token.zh?.toLowerCase() === lowerValue
            ) {
                return token;
            }
        }
        return null;
    };

    /**
     * 根据ID查找词元
     */
    const findTokenById = (tokenId) => {
        for (const category of tokenCategories.value) {
            for (const subcategory of category.subcategories) {
                const found = subcategory.tokens.find(t => t.id === tokenId);
                if (found) {
                    return {
                        ...found,
                        categoryId: category.id,
                        subcategoryId: subcategory.id,
                        categoryName: category.name,
                        subcategoryName: subcategory.name,
                    };
                }
            }
        }
        return null;
    };

    // ========== 输出区词元同步 ==========

    /**
     * 同步单个词元到输出区
     */
    const syncOutputTokens = (updatedTokenData) => {
        console.log('[TokenManagement] 开始同步输出区词元:', updatedTokenData);

        store.finalTokens.value.forEach((token, index) => {
            // 1. 已映射词元：通过 ID 匹配
            if (token.mapping && token.mapping.id === updatedTokenData.id) {
                console.log(`[TokenManagement] 更新已映射词元 #${index}`);

                // 更新映射数据
                token.mapping = {
                    ...token.mapping,
                    zh: updatedTokenData.zh,
                    en: updatedTokenData.en,
                    jp: updatedTokenData.jp,
                    description: updatedTokenData.description,
                    categoryId: updatedTokenData.categoryId,
                    subcategoryId: updatedTokenData.subcategoryId,
                };

                // 更新显示文本
                token.display =
                    store.outputLanguage.value === LANGUAGES.ZH
                        ? updatedTokenData.zh
                        : updatedTokenData.en;
                return;
            }

            // 2. 未映射词元：多种匹配方式
            if (!token.mapping) {
                const isMatch =
                    (updatedTokenData.originalValue &&
                        token.original === updatedTokenData.originalValue) ||
                    (token.value &&
                        (token.value.toLowerCase() === updatedTokenData.en?.toLowerCase() ||
                            token.value.toLowerCase() === updatedTokenData.zh?.toLowerCase())) ||
                    (token.original &&
                        (token.original.toLowerCase() === updatedTokenData.en?.toLowerCase() ||
                            token.original.toLowerCase() === updatedTokenData.zh?.toLowerCase()));

                if (isMatch) {
                    console.log(`[TokenManagement] 未映射词元变为已映射 #${index}`);

                    // 更新为已映射词元
                    token.mapping = {
                        id: updatedTokenData.id,
                        zh: updatedTokenData.zh,
                        en: updatedTokenData.en,
                        jp: updatedTokenData.jp,
                        description: updatedTokenData.description,
                        source: 'user',
                        categoryId: updatedTokenData.categoryId,
                        subcategoryId: updatedTokenData.subcategoryId,
                    };

                    token.value = updatedTokenData.en;
                    token.original = updatedTokenData.en;
                    token.display =
                        store.outputLanguage.value === LANGUAGES.ZH
                            ? updatedTokenData.zh
                            : updatedTokenData.en;
                }
            }
        });

        console.log('[TokenManagement] 输出区词元同步完成');
    };

    /**
     * 同步词元池到输出区
     */
    const syncPoolTokensInOutput = (poolKey, updatedPoolData) => {
        console.log('[TokenManagement] 同步词元池到输出区:', poolKey);

        store.finalTokens.value.forEach((token, index) => {
            if (token.isCustomPool && token.poolKey === poolKey) {
                console.log(`[TokenManagement] 更新词元池 #${index}`);

                token.poolData = {
                    ...token.poolData,
                    name: updatedPoolData.name,
                    description: updatedPoolData.description,
                    tokens: updatedPoolData.tokens,
                };

                token.display =
                    store.viewLanguage.value === LANGUAGES.ZH
                        ? updatedPoolData.name.zh
                        : updatedPoolData.name.en;
            }
        });

        console.log('[TokenManagement] 词元池同步完成');
    };

    /**
     * 同步所有输出区词元
     */
    const syncAllOutputTokens = () => {
        console.log('[TokenManagement] 同步所有输出区词元');

        store.finalTokens.value.forEach((token, index) => {
            if (token.mapping && token.mapping.id) {
                const updatedToken = allTokensFlat.value.find(
                    t => t.id === token.mapping.id
                );

                if (updatedToken) {
                    console.log(`[TokenManagement] 同步词元 #${index}`);

                    token.mapping = {...updatedToken};
                    token.display =
                        store.outputLanguage.value === LANGUAGES.ZH
                            ? updatedToken.zh
                            : updatedToken.en;
                }
            }
        });

        console.log('[TokenManagement] 所有词元同步完成');
    };

    // ========== 分类管理 ==========

    /**
     * 创建临时分类
     */
    const createTempCategories = async (tempCategories = [], tempSubcategories = []) => {
        try {
            console.log('[TokenManagement] 创建临时分类:', {
                categories: tempCategories.length,
                subcategories: tempSubcategories.length,
            });

            // 1. 处理一级分类
            for (const tempCat of tempCategories) {
                let existingCategory = userTokens.value.find(cat => cat.id === tempCat.id);
                if (!existingCategory) {
                    const newCategory = {
                        id: tempCat.id,
                        name: tempCat.name,
                        source: 'user',
                        subcategories: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };
                    userTokens.value.push(newCategory);
                    existingCategory = newCategory;
                    console.log('[TokenManagement] 创建一级分类:', newCategory);
                }

                // 挂载子分类
                const relatedSubs = tempSubcategories.filter(
                    sub => sub.parentId === tempCat.id
                );
                for (const tempSub of relatedSubs) {
                    const exists = existingCategory.subcategories.find(s => s.id === tempSub.id);
                    if (!exists) {
                        existingCategory.subcategories.push({
                            id: tempSub.id,
                            name: tempSub.name,
                            source: 'user',
                            tokens: [],
                            description: tempSub.description || '',
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                        });
                        console.log('[TokenManagement] 创建二级分类:', tempSub);
                    }
                }
            }

            // 2. 处理孤立的子分类
            for (const tempSub of tempSubcategories) {
                if (!tempSub?.parentId) continue;

                let parent = userTokens.value.find(cat => cat.id === tempSub.parentId);
                if (!parent) {
                    parent = {
                        id: tempSub.parentId,
                        name: tempSub.parentName || {
                            zh: `新建分类-${tempSub.parentId}`,
                            en: `New Category-${tempSub.parentId}`,
                        },
                        source: 'user',
                        subcategories: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };
                    userTokens.value.push(parent);
                    console.log('[TokenManagement] 兜底创建父级分类:', parent);
                }

                const exists = parent.subcategories.find(s => s.id === tempSub.id);
                if (!exists) {
                    parent.subcategories.push({
                        id: tempSub.id,
                        name: tempSub.name,
                        source: 'user',
                        tokens: [],
                        description: tempSub.description || '',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                    console.log('[TokenManagement] 创建孤立二级分类:', tempSub);
                }
            }

            // 刷新合并数据
            await refreshMergedData();

            console.log('[TokenManagement] 临时分类创建完成');
            return true;
        } catch (error) {
            console.error('[TokenManagement] 创建临时分类失败:', error);
            return false;
        }
    };

    /**
     * 自动创建缺失的分类
     */
    const autoCreateMissingCategory = async (categoryId, subcategoryId) => {
        try {
            console.log('[TokenManagement] 自动创建缺失的分类:', {
                categoryId,
                subcategoryId,
            });

            // 查找系统词库中的分类信息
            let systemCategory = null;
            let systemSubcategory = null;

            for (const category of tokenCategories.value) {
                if (category.source === 'system' && category.id === categoryId) {
                    systemCategory = category;
                    if (systemCategory.subcategories) {
                        systemSubcategory = systemCategory.subcategories.find(
                            sub => sub.id === subcategoryId
                        );
                    }
                    break;
                }
            }

            const categoriesToCreate = [];
            const subcategoriesToCreate = [];

            // 检查一级分类
            let userCategory = userTokens.value.find(cat => cat.id === categoryId);
            if (!userCategory) {
                const newCategoryName = systemCategory?.name || {
                    zh: `新建分类-${categoryId}`,
                    en: `New Category-${categoryId}`,
                };

                categoriesToCreate.push({
                    id: categoryId,
                    name: newCategoryName,
                    source: systemCategory ? 'system' : 'custom',
                });
            }

            // 检查二级分类
            if (!userCategory) {
                const newSubcategoryName = systemSubcategory?.name || {
                    zh: `新建子分类-${subcategoryId}`,
                    en: `New Subcategory-${subcategoryId}`,
                };

                subcategoriesToCreate.push({
                    id: subcategoryId,
                    name: newSubcategoryName,
                    parentId: categoryId,
                    source: systemSubcategory ? 'system' : 'custom',
                });
            } else {
                const userSubcategory = userCategory.subcategories.find(
                    sub => sub.id === subcategoryId
                );
                if (!userSubcategory) {
                    const newSubcategoryName = systemSubcategory?.name || {
                        zh: `新建子分类-${subcategoryId}`,
                        en: `New Subcategory-${subcategoryId}`,
                    };

                    subcategoriesToCreate.push({
                        id: subcategoryId,
                        name: newSubcategoryName,
                        parentId: categoryId,
                        source: systemSubcategory ? 'system' : 'custom',
                    });
                }
            }

            // 确认创建
            if (categoriesToCreate.length > 0 || subcategoriesToCreate.length > 0) {
                const categoryNames = [
                    ...categoriesToCreate.map(cat => {
                        const name = typeof cat.name === 'string' ? cat.name : cat.name.zh;
                        return `"${name}"${cat.source === 'system' ? '（复制自系统分类）' : ''}`;
                    }),
                    ...subcategoriesToCreate.map(sub => {
                        const name = typeof sub.name === 'string' ? sub.name : sub.name.zh;
                        return `"${name}"${sub.source === 'system' ? '（复制自系统子分类）' : ''}`;
                    }),
                ].join('、');

                const userConfirmed = confirm(
                    `系统将自动创建以下分类到用户词库：\n${categoryNames}\n\n是否确认创建？`
                );

                if (!userConfirmed) {
                    return false;
                }

                // 创建分类
                for (const catData of categoriesToCreate) {
                    const newCategory = {
                        id: catData.id,
                        name: catData.name,
                        source: 'user',
                        subcategories: [],
                        description: systemCategory?.description || `用户创建的 ${catData.id} 分类`,
                    };
                    userTokens.value.push(newCategory);
                    userCategory = newCategory;
                    console.log('[TokenManagement] 创建一级分类:', newCategory);
                }

                for (const subData of subcategoriesToCreate) {
                    const newSubcategory = {
                        id: subData.id,
                        name: subData.name,
                        source: 'user',
                        tokens: [],
                        description:
                            systemSubcategory?.description || `用户创建的 ${subData.id} 子分类`,
                    };

                    if (userCategory) {
                        userCategory.subcategories.push(newSubcategory);
                        console.log('[TokenManagement] 创建二级分类:', newSubcategory);
                    }
                }

                await saveUserTokens();
                console.log('[TokenManagement] 分类创建完成');
                return true;
            }

            return true;
        } catch (error) {
            console.error('[TokenManagement] 自动创建分类失败:', error);
            return false;
        }
    };

    /**
     * 从分类中移除词元
     */
    const removeTokenFromCategory = async (tokenId, categoryId, subcategoryId) => {
        const categoryIndex = userTokens.value.findIndex(cat => cat.id === categoryId);
        if (categoryIndex === -1) return false;

        const subcategoryIndex = userTokens.value[categoryIndex].subcategories.findIndex(
            sub => sub.id === subcategoryId
        );
        if (subcategoryIndex === -1) return false;

        const tokenIndex = userTokens.value[categoryIndex].subcategories[
            subcategoryIndex
            ].tokens.findIndex(token => token.id === tokenId);

        if (tokenIndex !== -1) {
            userTokens.value[categoryIndex].subcategories[subcategoryIndex].tokens.splice(
                tokenIndex,
                1
            );

            // 清理空分类
            if (
                userTokens.value[categoryIndex].subcategories[subcategoryIndex].tokens.length === 0
            ) {
                userTokens.value[categoryIndex].subcategories.splice(subcategoryIndex, 1);
            }

            if (userTokens.value[categoryIndex].subcategories.length === 0) {
                userTokens.value.splice(categoryIndex, 1);
            }

            await saveUserTokens();
            return true;
        }

        return false;
    };

    // ========== 词元保存逻辑 ==========

    /**
     * 保存单个词元
     */
    const saveSingleToken = async (saveData) => {
        console.log('[TokenManagement] 保存单个词元:', saveData);

        try {
            // 创建临时分类
            if (saveData.tempCategories?.length > 0) {
                const created = await createTempCategories(
                    saveData.tempCategories,
                    saveData.tempSubcategories || []
                );
                if (!created) {
                    throw new Error('创建临时分类失败');
                }
            }

            // 查找目标分类
            let targetCategory = tokenCategories.value.find(
                cat => cat.id === saveData.categoryId
            );
            let targetSubcategory = null;

            if (targetCategory) {
                targetSubcategory = targetCategory.subcategories.find(
                    sub => sub.id === saveData.subcategoryId
                );
            }

            // 自动创建分类
            if (!targetCategory || !targetSubcategory) {
                const created = await autoCreateMissingCategory(
                    saveData.categoryId,
                    saveData.subcategoryId
                );
                if (!created) {
                    throw new Error('自动创建分类失败');
                }

                targetCategory = tokenCategories.value.find(cat => cat.id === saveData.categoryId);
                if (targetCategory) {
                    targetSubcategory = targetCategory.subcategories.find(
                        sub => sub.id === saveData.subcategoryId
                    );
                }
            }

            if (!targetCategory || !targetSubcategory) {
                throw new Error(`目标分类不存在: ${saveData.categoryId}/${saveData.subcategoryId}`);
            }

            // 保存词元
            if (saveData.isSystem) {
                // 系统词元保存为用户副本
                const newTokenData = {
                    id: saveData.id,
                    zh: saveData.zh,
                    en: saveData.en,
                    jp: saveData.jp,
                    description: saveData.description,
                    source: 'user',
                    originalId: saveData.id,
                };

                const success = await addUserToken(newTokenData, targetCategory, targetSubcategory);
                if (!success) {
                    throw new Error('添加用户词元失败');
                }

                console.log('[TokenManagement] 系统词元已保存为用户副本');
                syncOutputTokens(newTokenData);
            } else {
                // 用户词元更新
                const updateData = {
                    zh: saveData.zh,
                    en: saveData.en,
                    jp: saveData.jp,
                    description: saveData.description,
                };

                const currentToken = userTokens.value
                    .flatMap(cat =>
                        cat.subcategories.flatMap(sub => sub.tokens.find(token => token.id === saveData.id))
                    )
                    .find(Boolean);

                if (currentToken) {
                    const oldCategoryId = currentToken.categoryId;
                    const oldSubcategoryId = currentToken.subcategoryId;

                    if (
                        oldCategoryId !== saveData.categoryId ||
                        oldSubcategoryId !== saveData.subcategoryId
                    ) {
                        // 转移分类
                        console.log('[TokenManagement] 转移词元分类');
                        await removeTokenFromCategory(saveData.id, oldCategoryId, oldSubcategoryId);

                        const success = await addUserToken(
                            {...updateData, id: saveData.id},
                            targetCategory,
                            targetSubcategory
                        );

                        if (!success) {
                            throw new Error('转移词元到新分类失败');
                        }
                    } else {
                        // 直接更新
                        const success = await updateUserToken(saveData.id, updateData);
                        if (!success) {
                            throw new Error('更新词元失败');
                        }
                    }

                    syncOutputTokens({
                        id: saveData.id,
                        ...updateData,
                    });
                } else {
                    throw new Error('未找到要更新的词元');
                }
            }

            const envMsg = import.meta.env.DEV
                ? '（开发环境 - 已保存到内存）'
                : '（生产环境 - 已保存到服务器）';
            alert(`✅ 词元已保存到用户词库 ${envMsg}`);
            return {success: true};
        } catch (error) {
            console.error('[TokenManagement] 保存单个词元失败:', error);
            alert('❌ 保存失败: ' + error.message);
            return {success: false};
        }
    };

    /**
     * 保存未映射词元
     */
    const saveUnmappedToken = async (saveData) => {
        console.log('[TokenManagement] 保存未映射词元:', saveData);

        try {
            if (saveData.tempCategories?.length > 0) {
                const created = await createTempCategories(
                    saveData.tempCategories,
                    saveData.tempSubcategories || []
                );
                if (!created) {
                    throw new Error('创建临时分类失败');
                }
            }

            if (!saveData.categoryId || !saveData.subcategoryId) {
                throw new Error('请选择分类和子分类');
            }

            if (!saveData.zh && !saveData.en) {
                throw new Error('请至少填写中文或英文');
            }

            let targetCategory = tokenCategories.value.find(
                cat => cat.id === saveData.categoryId
            );
            let targetSubcategory = null;

            if (targetCategory) {
                targetSubcategory = targetCategory.subcategories.find(
                    sub => sub.id === saveData.subcategoryId
                );
            }

            if (!targetCategory || !targetSubcategory) {
                const created = await autoCreateMissingCategory(
                    saveData.categoryId,
                    saveData.subcategoryId
                );
                if (!created) {
                    throw new Error('选择的分类不存在且自动创建失败');
                }

                targetCategory = tokenCategories.value.find(cat => cat.id === saveData.categoryId);
                if (targetCategory) {
                    targetSubcategory = targetCategory.subcategories.find(
                        sub => sub.id === saveData.subcategoryId
                    );
                }
            }

            if (!targetCategory || !targetSubcategory) {
                throw new Error('分类不存在，请选择有效的分类');
            }

            const newTokenData = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                zh: saveData.zh || saveData.originalValue,
                en: saveData.en || saveData.originalValue,
                jp: saveData.jp || '',
                description: saveData.description || `未映射词元: ${saveData.originalValue}`,
                source: 'user',
                originalValue: saveData.originalValue,
            };

            await addUserToken(newTokenData, targetCategory, targetSubcategory);
            console.log('[TokenManagement] 未映射词元已保存');

            syncOutputTokens(newTokenData);

            const success = await saveUserTokenData();
            if (success) {
                alert('✅ 未映射词元已保存到用户词库');
                return {
                    success: true,
                    tokenId: newTokenData.id,
                };
            } else {
                throw new Error('保存到文件失败');
            }
        } catch (error) {
            console.error('[TokenManagement] 保存未映射词元失败:', error);
            alert('❌ 保存失败: ' + error.message);
            return {success: false};
        }
    };

    /**
     * 保存词元池
     */
    const savePoolToken = async (saveData) => {
        console.log('[TokenManagement] 保存词元池:', saveData);

        try {
            const targetGroup = customGroups.value.find(
                group => group.id === saveData.groupId || group.id === saveData.groupKey
            );

            if (!targetGroup) {
                console.error('[TokenManagement] 未找到目标分组');
                throw new Error(`未找到目标分组（Group ID: ${saveData.groupId}）`);
            }

            console.log('[TokenManagement] 找到目标分组:', targetGroup.id);

            if (!targetGroup.pool) {
                targetGroup.pool = [];
            }

            const poolItemIndex = targetGroup.pool.findIndex(
                item => item.id === saveData.poolId || item.id === saveData.id
            );

            if (poolItemIndex === -1) {
                throw new Error(`在分组中未找到词元池项目（Pool ID: ${saveData.poolId}）`);
            }

            console.log('[TokenManagement] 找到词元池项目，索引:', poolItemIndex);

            const updateData = {
                name: saveData.name,
                description: saveData.description,
                tokens: (saveData.poolTokens || []).map(token => {
                    const cleanToken = {
                        type: token.type || (token.isReference ? 'quote' : 'new'),
                        id: token.id,
                        weight: token.weight || 1,
                    };

                    if (cleanToken.type === 'new') {
                        cleanToken.zh = token.zh;
                        cleanToken.en = token.en;
                        if (token.jp) cleanToken.jp = token.jp;
                    }

                    return cleanToken;
                }),
            };

            targetGroup.pool[poolItemIndex] = {
                ...targetGroup.pool[poolItemIndex],
                ...updateData,
            };

            console.log('[TokenManagement] 词元池项目已更新');

            await saveCustomGroups();

            syncPoolTokensInOutput(saveData.poolId, {
                ...updateData,
                id: saveData.poolId,
            });

            alert('✅ 词元池已更新');
            return {success: true};
        } catch (error) {
            console.error('[TokenManagement] 保存词元池失败:', error);
            alert('❌ 保存失败: ' + error.message);
            return {success: false};
        }
    };

    // ========== 返回接口 ==========
    return {
        // 计算属性
        allTokensFlat,

        // 查找方法
        findTokenMappingByValue,
        findTokenById,

        // 同步方法
        syncOutputTokens,
        syncPoolTokensInOutput,
        syncAllOutputTokens,

        // 分类管理
        createTempCategories,
        autoCreateMissingCategory,
        removeTokenFromCategory,

        // 保存方法
        saveSingleToken,
        saveUnmappedToken,
        savePoolToken,
    };
}