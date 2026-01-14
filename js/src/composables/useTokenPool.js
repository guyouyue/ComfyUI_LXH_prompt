// src/composables/useTokenPool.js
import { computed, ref } from 'vue';

/**
 * TokenPool 统一管理
 * 包含：状态管理、搜索功能、操作方法
 *
 * @param {Object} props - 组件 props
 * @param {Function} emit - emit 函数
 */
export function useTokenPool(props, emit) {
  // ═══════════════════════════════════════════════════════════════
  // 状态定义
  // ═══════════════════════════════════════════════════════════════

  // 展开状态
  const expandedCategories = ref(new Set());
  const expandedSubcategories = ref(new Set());
  const expandedCustomGroups = ref(new Set());
  const isCustomPoolExpanded = ref(false);

  // 搜索状态
  const searchQuery = ref('');

  // ═══════════════════════════════════════════════════════════════
  // 计算属性
  // ═══════════════════════════════════════════════════════════════

  /**
   * 是否处于搜索状态
   */
  const isSearching = computed(() => {
    return searchQuery.value.trim().length > 0;
  });

  /**
   * 是否有自定义分组
   */
  const hasCustomGroups = computed(() => {
    return props.customGroups && props.customGroups.length > 0;
  });

  /**
   * 过滤后的系统词库分类
   */
  const filteredCategories = computed(() => {
    if (!searchQuery.value.trim() || !props.categories) {
      return props.categories || [];
    }

    const query = searchQuery.value.toLowerCase();
    return props.categories
      .map((cat) => {
        const filteredSubs = cat.subcategories
          .map((sub) => {
            const filteredTokens = sub.tokens.filter(
              (token) =>
                token.zh?.toLowerCase().includes(query) ||
                token.en?.toLowerCase().includes(query)
            );
            return { ...sub, tokens: filteredTokens };
          })
          .filter((sub) => sub.tokens.length > 0);

        return { ...cat, subcategories: filteredSubs };
      })
      .filter((cat) => cat.subcategories.length > 0);
  });

  /**
   * 过滤后的自定义词元池分组
   */
  const filteredCustomGroups = computed(() => {
    if (!props.customGroups || !isSearching.value) {
      return props.customGroups || [];
    }

    const query = searchQuery.value.toLowerCase();

    return props.customGroups
      .map((group) => {
        const filteredPool = (group.pool || []).filter((poolItem) => {
          if (poolItem.id?.toLowerCase().includes(query)) return true;
          if (poolItem.name?.zh?.toLowerCase().includes(query)) return true;
          if (poolItem.name?.en?.toLowerCase().includes(query)) return true;
          if (poolItem.description?.toLowerCase().includes(query)) return true;
          return false;
        });

        return { ...group, pool: filteredPool };
      })
      .filter((group) => group.pool.length > 0);
  });

  // ═══════════════════════════════════════════════════════════════
  // 搜索相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 获取过滤后的自定义词元池数量
   */
  const getFilteredCustomPoolCount = () => {
    if (!isSearching.value) {
      if (!props.customGroups) return 0;
      return props.customGroups.reduce((total, group) => {
        return total + (group.pool?.length || 0);
      }, 0);
    } else {
      return filteredCustomGroups.value.reduce((total, group) => {
        return total + (group.pool?.length || 0);
      }, 0);
    }
  };

  /**
   * 清除搜索
   */
  const clearSearch = () => {
    searchQuery.value = '';
  };

  // ═══════════════════════════════════════════════════════════════
  // 展开/收起相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 切换一级分类（系统词库）
   */
  const toggleCategory = (categoryId) => {
    if (isSearching.value) {
      // 搜索模式：简单切换
      if (expandedCategories.value.has(categoryId)) {
        expandedCategories.value.delete(categoryId);
        const category = props.categories?.find((c) => c.id === categoryId);
        if (category) {
          category.subcategories.forEach((sub) => {
            expandedSubcategories.value.delete(`${categoryId}-${sub.id}`);
          });
        }
      } else {
        expandedCategories.value.add(categoryId);
        const category = props.categories?.find((c) => c.id === categoryId);
        if (category) {
          category.subcategories.forEach((sub) => {
            expandedSubcategories.value.add(`${categoryId}-${sub.id}`);
          });
        }
      }
      return;
    }

    // 非搜索模式：手风琴模式
    const isCurrentlyExpanded = expandedCategories.value.has(categoryId);

    // 收起自定义词元池
    isCustomPoolExpanded.value = false;
    expandedCustomGroups.value.clear();

    // 收起所有系统词库分类
    expandedCategories.value.clear();
    expandedSubcategories.value.clear();

    // 展开目标分类
    if (!isCurrentlyExpanded) {
      expandedCategories.value.add(categoryId);
      const category = props.categories?.find((c) => c.id === categoryId);
      if (category) {
        category.subcategories.forEach((sub) => {
          expandedSubcategories.value.add(`${categoryId}-${sub.id}`);
        });
      }
    }
  };

  /**
   * 切换二级分类（子分类）
   */
  const toggleSubcategory = (categoryId, subcategoryId) => {
    const key = `${categoryId}-${subcategoryId}`;
    if (expandedSubcategories.value.has(key)) {
      expandedSubcategories.value.delete(key);
    } else {
      expandedSubcategories.value.add(key);
    }
  };

  /**
   * 切换自定义词元池一级分类
   */
  const toggleCustomPoolCategory = () => {
    const willExpand = !isCustomPoolExpanded.value;

    // 如果不是搜索状态，收起所有系统词库分类
    if (!isSearching.value) {
      expandedCategories.value.clear();
      expandedSubcategories.value.clear();
    }

    // 切换自定义词元池状态
    isCustomPoolExpanded.value = willExpand;

    if (willExpand) {
      // 展开时，自动展开所有二级分组
      const groupsToExpand = isSearching.value
        ? filteredCustomGroups.value
        : props.customGroups;
      if (groupsToExpand) {
        groupsToExpand.forEach((group) => {
          expandedCustomGroups.value.add(group.id);
        });
      }
    } else {
      // 收起时，同时收起所有子分组
      expandedCustomGroups.value.clear();
    }
  };

  /**
   * 切换自定义词元池二级分组
   */
  const toggleCustomGroup = (groupId) => {
    if (expandedCustomGroups.value.has(groupId)) {
      expandedCustomGroups.value.delete(groupId);
    } else {
      expandedCustomGroups.value.add(groupId);
    }
  };

  /**
   * 搜索时自动展开所有匹配项
   */
  const expandSearchResults = () => {
    // 展开匹配的自定义词元池
    if (filteredCustomGroups.value.length > 0) {
      isCustomPoolExpanded.value = true;
      filteredCustomGroups.value.forEach((group) => {
        expandedCustomGroups.value.add(group.id);
      });
    } else {
      isCustomPoolExpanded.value = false;
      expandedCustomGroups.value.clear();
    }

    // 展开匹配的系统词库
    if (filteredCategories.value.length > 0) {
      filteredCategories.value.forEach((cat) => {
        expandedCategories.value.add(cat.id);
        cat.subcategories.forEach((sub) => {
          expandedSubcategories.value.add(`${cat.id}-${sub.id}`);
        });
      });
    }
  };

  /**
   * 收起所有
   */
  const collapseAll = () => {
    isCustomPoolExpanded.value = false;
    expandedCustomGroups.value.clear();
    expandedCategories.value.clear();
    expandedSubcategories.value.clear();
  };

  // ═══════════════════════════════════════════════════════════════
  // 操作相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 处理词元单击（打开编辑器）
   */
  const handleTokenClick = (token) => {
    // 查找 token 所属的分类
    let categoryId = '';
    let subcategoryId = '';

    if (props.categories) {
      for (const category of props.categories) {
        for (const subcategory of category.subcategories) {
          const foundToken = subcategory.tokens.find(
            (t) => t.id === token.id || t === token
          );

          if (foundToken) {
            categoryId = category.id;
            subcategoryId = subcategory.id;
            break;
          }
        }
        if (categoryId) break;
      }
    }

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
    emit('token-dblclick', token);
  };

  /**
   * 处理词元池项目单击（打开编辑器）
   */
  const handlePoolItemClick = (poolItem) => {
    emit('pool-item-click', poolItem);
  };

  /**
   * 处理词元池项目双击（插入到输出区）
   */
  const handlePoolItemDoubleClick = (poolItem) => {
    emit('use-pool-item', poolItem);
  };

  // ═══════════════════════════════════════════════════════════════
  // 显示相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 获取显示文本
   */
  const getDisplayText = (token) => {
    return props.language === 'zh' ? token.zh : token.en;
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
    return props.language === 'zh' ? category.name.zh : category.name.en;
  };

  /**
   * 获取子分类名称
   */
  const getSubcategoryName = (subcategory) => {
    return props.language === 'zh' ? subcategory.name.zh : subcategory.name.en;
  };

  /**
   * 获取分组名称
   */
  const getGroupName = (group) => {
    if (group.name) {
      return props.language === 'zh' ? group.name.zh : group.name.en;
    }
    return group.id;
  };

  /**
   * 获取池项目名称
   */
  const getPoolItemName = (poolItem) => {
    if (poolItem.name) {
      return props.language === 'zh' ? poolItem.name.zh : poolItem.name.en;
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
    return category.subcategories.reduce(
      (sum, sub) => sum + sub.tokens.length,
      0
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════

  return {
    // ===== 状态 =====
    expandedCategories,
    expandedSubcategories,
    expandedCustomGroups,
    isCustomPoolExpanded,
    searchQuery,

    // ===== 计算属性 =====
    isSearching,
    hasCustomGroups,
    filteredCategories,
    filteredCustomGroups,

    // ===== 搜索方法 =====
    getFilteredCustomPoolCount,
    clearSearch,

    // ===== 展开/收起方法 =====
    toggleCategory,
    toggleSubcategory,
    toggleCustomPoolCategory,
    toggleCustomGroup,
    expandSearchResults,
    collapseAll,

    // ===== 操作方法 =====
    handleTokenClick,
    handleTokenDoubleClick,
    handlePoolItemClick,
    handlePoolItemDoubleClick,

    // ===== 显示方法 =====
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