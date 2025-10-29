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

        // 如果是最终提示词区域的词元，添加分类信息
        if (type === 'single' && token.mapping) {
            tokenWithCategory = {
                ...token,
                categoryId: token.mapping.categoryId,
                subcategoryId: token.mapping.subcategoryId,
                categoryName: token.mapping.categoryName,
                subcategoryName: token.mapping.subcategoryName,
            };
        }

        // 如果是未映射词元，添加默认分类信息
        if (type === 'unmapped' && !token.categoryId) {
            tokenWithCategory = {
                ...token,
                categoryId: '',
                subcategoryId: '',
            };
        }

        // 如果是词元池，确保包含完整信息
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

    /**
     * 打开新建词元编辑器
     */
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

    /**
     * 刷新编辑器中的词元数据
     */
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

    /**
     * 刷新词元池编辑器数据
     */
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

    /**
     * 处理词元保存
     */
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

                // 刷新编辑器数据
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
     * 双击输出区词元编辑
     */
    const handleTokenEdit = (token) => {
        if (token.isCustomPool) {
            const fullPoolData = customGroups.value.find(
                group =>
                    group.id === token.poolData?.id ||
                    group.key === token.poolData?.key ||
                    group.id === token.poolKey ||
                    group.key === token.poolKey
            );

            if (fullPoolData) {
                openTokenEditor(
                    {
                        ...fullPoolData,
                        poolId: fullPoolData.id,
                        poolKey: fullPoolData.key,
                    },
                    'pool'
                );
            } else {
                console.error('[EditorOperations] 未找到词元池数据:', token);
                alert('⚠️ 未找到对应的词元池数据');
            }
        } else {
            const tokenType = token.mapping ? 'single' : 'unmapped';
            openTokenEditor(token, tokenType);
        }
    };

    /**
     * 点击词库词元打开编辑器
     */
    const handlePoolTokenClick = (token) => {
        console.log('[EditorOperations] 词库词元被点击:', token);
        openTokenEditor(token, 'single');
    };

    /**
     * 点击词元池项目打开编辑器
     */
    const handlePoolItemClick = (poolItem) => {
        console.log('[EditorOperations] 词元池项目被点击:', poolItem);

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