// src/composables/useTokenPoolState.js
import {ref} from 'vue';

export function useTokenPoolState() {
  // 展开状态
  const expandedCategories = ref(new Set());
  const expandedSubcategories = ref(new Set());
  const expandedCustomGroups = ref(new Set());
  const isCustomPoolExpanded = ref(false);

  /**
   * 切换一级分类（系统词库）
   */
  const toggleCategory = (categoryId, categories, isSearching = false) => {
    if (isSearching) {
      // 搜索模式：简单切换
      if (expandedCategories.value.has(categoryId)) {
        expandedCategories.value.delete(categoryId);
        const category = categories.find(c => c.id === categoryId);
        if (category) {
          category.subcategories.forEach(sub => {
            expandedSubcategories.value.delete(`${categoryId}-${sub.id}`);
          });
        }
      } else {
        expandedCategories.value.add(categoryId);
        const category = categories.find(c => c.id === categoryId);
        if (category) {
          category.subcategories.forEach(sub => {
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
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        category.subcategories.forEach(sub => {
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
  const toggleCustomPoolCategory = (customGroups, filteredCustomGroups, isSearching) => {
    const willExpand = !isCustomPoolExpanded.value;

    // 如果不是搜索状态，收起所有系统词库分类
    if (!isSearching) {
      expandedCategories.value.clear();
      expandedSubcategories.value.clear();
    }

    // 切换自定义词元池状态
    isCustomPoolExpanded.value = willExpand;

    if (willExpand) {
      // 展开时，自动展开所有二级分组
      const groupsToExpand = isSearching ? filteredCustomGroups : customGroups;
      if (groupsToExpand) {
        groupsToExpand.forEach(group => {
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
  const expandSearchResults = (filteredCategories, filteredCustomGroups) => {
    // 展开匹配的自定义词元池
    if (filteredCustomGroups.length > 0) {
      isCustomPoolExpanded.value = true;
      filteredCustomGroups.forEach(group => {
        expandedCustomGroups.value.add(group.id);
      });
    } else {
      isCustomPoolExpanded.value = false;
      expandedCustomGroups.value.clear();
    }

    // 展开匹配的系统词库
    if (filteredCategories.length > 0) {
      filteredCategories.forEach(cat => {
        expandedCategories.value.add(cat.id);
        cat.subcategories.forEach(sub => {
          expandedSubcategories.value.add(`${cat.id}-${sub.id}`);
        });
      });
    }
  };

  /**
   * 清除搜索时收起所有
   */
  const collapseAll = () => {
    isCustomPoolExpanded.value = false;
    expandedCustomGroups.value.clear();
    expandedCategories.value.clear();
    expandedSubcategories.value.clear();
  };

  return {
    // State
    expandedCategories,
    expandedSubcategories,
    expandedCustomGroups,
    isCustomPoolExpanded,

    // Actions
    toggleCategory,
    toggleSubcategory,
    toggleCustomPoolCategory,
    toggleCustomGroup,
    expandSearchResults,
    collapseAll,
  };
}