// src/composables/useTokenPoolSearch.js
import {computed, ref} from 'vue';

export function useTokenPoolSearch(categories, customGroups) {
    const searchQuery = ref('');

    const isSearching = computed(() => {
        return searchQuery.value.trim().length > 0;
    });

    const filteredCategories = computed(() => {
        // ⭐ 添加调试
        console.log('[useTokenPoolSearch] 计算 filteredCategories:', {
            categoriesValue: categories.value,
            categoriesLength: categories.value?.length,
            searchQuery: searchQuery.value,
        });

        if (!searchQuery.value.trim() || !categories.value) {
            return categories.value || [];
        }

        const query = searchQuery.value.toLowerCase();
        const result = categories.value.map(cat => {
            const filteredSubs = cat.subcategories.map(sub => {
                const filteredTokens = sub.tokens.filter(token =>
                    token.zh?.toLowerCase().includes(query) ||
                    token.en?.toLowerCase().includes(query)
                );
                return {...sub, tokens: filteredTokens};
            }).filter(sub => sub.tokens.length > 0);

            return {...cat, subcategories: filteredSubs};
        }).filter(cat => cat.subcategories.length > 0);

        console.log('[useTokenPoolSearch] filteredCategories 结果:', result);
        return result;
    });

    const filteredCustomGroups = computed(() => {
        // ⭐ 添加调试
        console.log('[useTokenPoolSearch] 计算 filteredCustomGroups:', {
            customGroupsValue: customGroups.value,
            customGroupsLength: customGroups.value?.length,
            isSearching: isSearching.value,
        });

        if (!customGroups.value || !isSearching.value) {
            return customGroups.value || [];
        }

        const query = searchQuery.value.toLowerCase();

        const result = customGroups.value.map(group => {
            const filteredPool = (group.pool || []).filter(poolItem => {
                if (poolItem.id?.toLowerCase().includes(query)) return true;
                if (poolItem.name?.zh?.toLowerCase().includes(query)) return true;
                if (poolItem.name?.en?.toLowerCase().includes(query)) return true;
                if (poolItem.description?.toLowerCase().includes(query)) return true;
                return false;
            });

            return {
                ...group,
                pool: filteredPool,
            };
        }).filter(group => group.pool.length > 0);

        console.log('[useTokenPoolSearch] filteredCustomGroups 结果:', result);
        return result;
    });

    const getFilteredCustomPoolCount = () => {
        if (!isSearching.value) {
            if (!customGroups.value) return 0;
            return customGroups.value.reduce((total, group) => {
                return total + (group.pool?.length || 0);
            }, 0);
        } else {
            return filteredCustomGroups.value.reduce((total, group) => {
                return total + (group.pool?.length || 0);
            }, 0);
        }
    };

    const clearSearch = () => {
        searchQuery.value = '';
    };

    return {
        searchQuery,
        isSearching,
        filteredCategories,
        filteredCustomGroups,
        getFilteredCustomPoolCount,
        clearSearch,
    };
}