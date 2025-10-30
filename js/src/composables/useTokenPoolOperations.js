// src/composables/useTokenPoolOperations.js
export function useTokenPoolOperations(emit, categories, language) {
    /**
     * 处理词元单击（打开编辑器）
     */
    const handleTokenClick = (token) => {
        // 查找 token 所属的分类
        let categoryId = '';
        let subcategoryId = '';

        for (const category of categories.value) {
            for (const subcategory of category.subcategories) {
                const foundToken = subcategory.tokens.find(
                    t => t.id === token.id || t === token
                );

                if (foundToken) {
                    categoryId = category.id;
                    subcategoryId = subcategory.id;
                    break;
                }
            }
            if (categoryId) break;
        }

        console.log('[TokenPoolOps] 单击词元，打开编辑器:', {
            token,
            categoryId,
            subcategoryId,
        });

        emit('token-click', {
            ...token,
            categoryId,
            subcategoryId,
        });
    };

    /**
     * 处理词元双击（插入到输出区）
     */
    const handleTokenDoubleClick = (token) => {
        console.log('[TokenPoolOps] 双击词元，插入到输出区:', token);
        emit('token-dblclick', token);
    };

    /**
     * 处理词元池项目单击（打开编辑器）
     */
    const handlePoolItemClick = (poolItem) => {
        console.log('[TokenPoolOps] 单击词元池项目，打开编辑器:', poolItem);
        emit('pool-item-click', poolItem);
    };

    /**
     * 处理词元池项目双击（插入到输出区）
     */
    const handlePoolItemDoubleClick = (poolItem) => {
        console.log('[TokenPoolOps] 双击词元池项目，插入到输出区:', poolItem);
        emit('use-pool-item', poolItem);
    };

    /**
     * 获取显示文本
     */
    const getDisplayText = (token) => {
        return language.value === 'zh' ? token.zh : token.en;
    };

    /**
     * 获取词元 tooltip
     */
    const getTokenTooltip = (token) => {
        const parts = [];
        parts.push(token.source === 'user' ? '👤 用户词库' : '⚙️ 系统词库');
        parts.push(`中文: ${token.zh || '无'}`);
        parts.push(`英文: ${token.en || '无'}`);
        if (token.description) {
            parts.push(`描述: ${token.description}`);
        }
        parts.push(token.mapping ? '✅ 已映射' : '⚠️ 未映射');
        parts.push('单击编辑 | 双击插入');
        return parts.join('\n');
    };

    /**
     * 获取分类名称
     */
    const getCategoryName = (category) => {
        return language.value === 'zh' ? category.name.zh : category.name.en;
    };

    /**
     * 获取子分类名称
     */
    const getSubcategoryName = (subcategory) => {
        return language.value === 'zh' ? subcategory.name.zh : subcategory.name.en;
    };

    /**
     * 获取分组名称
     */
    const getGroupName = (group) => {
        if (group.name) {
            return language.value === 'zh' ? group.name.zh : group.name.en;
        }
        return group.id;
    };

    /**
     * 获取池项目名称
     */
    const getPoolItemName = (poolItem) => {
        if (poolItem.name) {
            return language.value === 'zh' ? poolItem.name.zh : poolItem.name.en;
        }
        return poolItem.description || poolItem.id;
    };

    /**
     * 获取池项目 tooltip
     */
    const getPoolItemTooltip = (poolItem) => {
        const parts = [];
        parts.push('🎲 词元池项目');
        parts.push(`ID: ${poolItem.id}`);
        parts.push(`Key: {#%${poolItem.id}#%}`);
        if (poolItem.name) {
            parts.push(`中文: ${poolItem.name.zh || '无'}`);
            parts.push(`英文: ${poolItem.name.en || '无'}`);
        }
        if (poolItem.description) {
            parts.push(`描述: ${poolItem.description}`);
        }
        parts.push(`候选词元: ${poolItem.tokens?.length || 0} 个`);
        parts.push('单击编辑 | 双击插入');
        return parts.join('\n');
    };

    /**
     * 获取分类词元总数
     */
    const getCategoryTokenCount = (category) => {
        return category.subcategories.reduce((sum, sub) => sum + sub.tokens.length, 0);
    };

    return {
        handleTokenClick,
        handleTokenDoubleClick,
        handlePoolItemClick,
        handlePoolItemDoubleClick,
        getDisplayText,
        getTokenTooltip,
        getCategoryName,
        getSubcategoryName,
        getGroupName,
        getPoolItemName,
        getPoolItemTooltip,
        getCategoryTokenCount,
    };
}