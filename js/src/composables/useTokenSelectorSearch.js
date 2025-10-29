import { computed } from 'vue';

/**
 * TokenSelector 搜索逻辑
 * @param {Ref} allTokensRef - 所有词元列表
 * @param {Ref} searchQueryRef - 搜索关键词
 */
export function useTokenSelectorSearch(allTokensRef, searchQueryRef) {
  /**
   * 过滤后的词元列表
   */
  const filteredTokens = computed(() => {
    const tokens = allTokensRef.value || [];
    const query = searchQueryRef.value?.trim();

    if (!query) {
      return tokens;
    }

    const lowerQuery = query.toLowerCase();
    return tokens.filter(token => {
      const zhMatch = token.zh?.toLowerCase().includes(lowerQuery);
      const enMatch = token.en?.toLowerCase().includes(lowerQuery);
      const categoryMatch = token.categoryName?.toLowerCase().includes(lowerQuery);
      const subcategoryMatch = token.subcategoryName?.toLowerCase().includes(lowerQuery);

      return zhMatch || enMatch || categoryMatch || subcategoryMatch;
    });
  });

  /**
   * 是否正在搜索
   */
  const isSearching = computed(() => {
    return !!searchQueryRef.value?.trim();
  });

  return {
    filteredTokens,
    isSearching,
  };
}