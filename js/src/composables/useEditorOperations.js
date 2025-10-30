// src/composables/useEditorOperations.js
import {useAppStore} from './useAppStore.js';
import {useTokenManagement} from './useTokenManagement.js';
import {useTokens} from './useTokens.js';
import {useCustomGroups} from './useCustomGroups.js';

export function useEditorOperations() {
    const store = useAppStore();
    const {
        saveSingleToken,
        saveUnmappedToken,
        savePoolToken,
        findTokenById,
    } = useTokenManagement();
    const {tokenCategories} = useTokens();
    const {customGroups} = useCustomGroups();

    /**
     * 打开词元编辑器
     */
    const openTokenEditor = (token, type = 'single') => {
        let tokenWithCategory = token;

        if (type === 'single' && token.mapping) {
            tokenWithCategory = {
                ...token,
                categoryId: token.mapping.categoryId,
                subcategoryId: token.mapping.subcategoryId,
                categoryName: token.mapping.categoryName,
                subcategoryName: token.mapping.subcategoryName,
            };
        }

        if (type === 'unmapped' && !token.categoryId) {
            tokenWithCategory = {
                ...token,
                categoryId: '',
                subcategoryId: '',
            };
        }

        if (type === 'pool' && token.isCustomPool) {
            const fullPoolData = customGroups.value.find(
                group =>
                    group.id === token.poolData?.id ||
                    group.key === token.poolData?.key ||
                    group.id === token.poolKey ||
                    group.key === token.poolKey
            );

            if (fullPoolData) {
                tokenWithCategory = {
                    ...fullPoolData,
                    poolId: fullPoolData.id,
                    poolKey: fullPoolData.key,
                };
            }
        }

        store.openEditor(tokenWithCategory, type);
        console.log('[EditorOperations] 打开编辑器:', type, tokenWithCategory);
    };

    const openNewTokenEditor = () => {
        const newToken = {
            id: `user_${Date.now()}`,
            zh: '',
            en: '',
            jp: '',
            source: 'user',
        };
        store.openEditor(newToken, 'single');
    };

    const refreshEditingToken = (tokenId, categoryId, subcategoryId) => {
        console.log('[EditorOperations] 刷新编辑器词元数据:', {
            tokenId,
            categoryId,
            subcategoryId,
        });

        try {
            const category = tokenCategories.value.find(cat => cat.id === categoryId);
            if (!category) {
                console.warn('[EditorOperations] 未找到分类:', categoryId);
                return;
            }

            const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
            if (!subcategory) {
                console.warn('[EditorOperations] 未找到子分类:', subcategoryId);
                return;
            }

            const updatedToken = subcategory.tokens.find(t => t.id === tokenId);
            if (!updatedToken) {
                console.warn('[EditorOperations] 未找到词元:', tokenId);
                return;
            }

            store.updateEditingToken({
                ...updatedToken,
                categoryId: category.id,
                subcategoryId: subcategory.id,
                categoryName: category.name,
                subcategoryName: subcategory.name,
            });

            console.log('[EditorOperations] 编辑器词元数据已刷新');
        } catch (error) {
            console.error('[EditorOperations] 刷新编辑器词元数据失败:', error);
        }
    };

    const refreshEditingPoolToken = (poolKey) => {
        console.log('[EditorOperations] 刷新词元池编辑器数据:', poolKey);

        try {
            const updatedPool = customGroups.value.find(
                group => group.key === poolKey || group.id === poolKey
            );

            if (!updatedPool) {
                console.warn('[EditorOperations] 未找到词元池:', poolKey);
                return;
            }

            store.updateEditingToken({
                poolData: updatedPool,
                name: updatedPool.name,
                description: updatedPool.description,
            });

            console.log('[EditorOperations] 词元池编辑器数据已刷新');
        } catch (error) {
            console.error('[EditorOperations] 刷新词元池编辑器数据失败:', error);
        }
    };

    const handleTokenSave = async (saveData) => {
        console.log('[EditorOperations] 保存词元数据:', saveData);

        try {
            let result = {success: false};
            let newTokenId = null;

            if (saveData.tokenType === 'single') {
                result = await saveSingleToken(saveData);
            } else if (saveData.tokenType === 'unmapped') {
                result = await saveUnmappedToken(saveData);
                newTokenId = result.tokenId;
            } else if (saveData.tokenType === 'pool') {
                result = await savePoolToken(saveData);
            }

            if (result.success) {
                console.log('[EditorOperations] 保存成功，刷新编辑器数据');

                if (saveData.tokenType === 'single' && store.editingToken.value) {
                    refreshEditingToken(saveData.id, saveData.categoryId, saveData.subcategoryId);
                } else if (saveData.tokenType === 'unmapped') {
                    const tokenIdToRefresh = newTokenId || saveData.id;
                    if (tokenIdToRefresh) {
                        refreshEditingToken(
                            tokenIdToRefresh,
                            saveData.categoryId,
                            saveData.subcategoryId
                        );
                    }
                } else if (saveData.tokenType === 'pool' && saveData.poolKey) {
                    refreshEditingPoolToken(saveData.poolKey);
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('[EditorOperations] 保存失败:', error);
            return false;
        }
    };

    /**
     * ⭐ 修复：双击输出区词元编辑
     */
    const handleTokenEdit = (token) => {
        console.log('[EditorOperations] 编辑词元:', token);

        // 1. 词元池类型
        if (token.isCustomPool) {
            console.log('[EditorOperations] 检测到词元池，查找完整数据');
            console.log('[EditorOperations] 查找条件:', {
                poolKey: token.poolKey,
                poolDataId: token.poolData?.id,
                poolDataKey: token.poolData?.key,
            });

            // ⭐ 修复：遍历所有分组的 pool 数组查找词元池项目
            let fullPoolData = null;
            let parentGroup = null;

            for (const group of customGroups.value) {
                if (!group.pool || !Array.isArray(group.pool)) {
                    continue;
                }

                const found = group.pool.find(poolItem => {
                    return (
                        poolItem.id === token.poolKey ||
                        poolItem.id === token.poolData?.id ||
                        poolItem.key === token.poolKey ||
                        poolItem.key === token.poolData?.key
                    );
                });

                if (found) {
                    fullPoolData = found;
                    parentGroup = group;
                    console.log('[EditorOperations] 找到词元池:', {
                        poolId: found.id,
                        groupId: group.id,
                        groupName: group.name,
                    });
                    break;
                }
            }

            if (fullPoolData && parentGroup) {
                openTokenEditor(
                    {
                        ...fullPoolData,
                        poolId: fullPoolData.id,
                        poolKey: fullPoolData.id,
                        groupId: parentGroup.id,
                        groupKey: parentGroup.id,
                        groupName: parentGroup.name,
                        poolData: fullPoolData,
                    },
                    'pool'
                );
            } else {
                console.error('[EditorOperations] 未找到词元池数据:', token);
                alert('⚠️ 未找到对应的词元池数据，请检查数据是否完整');
            }
            return;
        }

        // 2. 普通词元
        const tokenType = token.mapping ? 'single' : 'unmapped';
        openTokenEditor(token, tokenType);
    };

    const handlePoolTokenClick = (token) => {
        console.log('[EditorOperations] 词库词元被点击:', token);
        openTokenEditor(token, 'single');
    };

    /**
     * ⭐ 修复：点击词元池项目打开编辑器
     */
    const handlePoolItemClick = (poolItem) => {
        console.log('[EditorOperations] 词元池项目被点击:', poolItem);

        // 查找所属分组
        let parentGroup = null;
        for (const group of customGroups.value) {
            if (group.pool && group.pool.some(item => item.id === poolItem.id)) {
                parentGroup = group;
                break;
            }
        }

        if (!parentGroup) {
            console.error('[EditorOperations] 未找到词元池所属的分组:', poolItem);
            alert('⚠️ 未找到词元池所属的分组');
            return;
        }

        const fullPoolData = {
            ...poolItem,
            poolId: poolItem.id,
            poolKey: poolItem.id,
            groupId: parentGroup.id,
            groupKey: parentGroup.id,
            groupName: parentGroup.name,
            poolData: poolItem,
        };

        openTokenEditor(fullPoolData, 'pool');
    };

    return {
        openTokenEditor,
        openNewTokenEditor,
        refreshEditingToken,
        refreshEditingPoolToken,
        handleTokenSave,
        handleTokenEdit,
        handlePoolTokenClick,
        handlePoolItemClick,
    };
}