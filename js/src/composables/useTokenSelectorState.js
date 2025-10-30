// src/composables/useTokenSelectorState.js
import {ref} from 'vue';

/**
 * TokenSelector 状态管理
 */
export function useTokenSelectorState() {
    // 搜索关键词
    const searchQuery = ref('');

    /**
     * 重置搜索
     */
    const resetSearch = () => {
        searchQuery.value = '';
    };

    return {
        searchQuery,
        resetSearch,
    };
}