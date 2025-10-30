<!--src/components/layout/TokenPoolSection.vue-->
<template>
  <div class="token-pool" :class="{ focused }">
    <!-- 头部 -->
    <div class="pool-header">
      <h4>📚 词元映射池</h4>
      <input
          type="text"
          class="search-input"
          v-model="searchQuery"
          placeholder="搜索词元..."
      />
    </div>

    <!-- 内容区 -->
    <div class="pool-content">
      <!-- 自定义词元池 -->
      <CustomPoolTree
          :groups="filteredCustomGroups"
          :has-custom-groups="hasCustomGroups"
          :is-searching="isSearching"
          :is-expanded="isCustomPoolExpanded"
          :expanded-groups="expandedCustomGroups"
          :total-count="getFilteredCustomPoolCount()"
          :get-group-name="operations.getGroupName"
          :get-pool-item-name="operations.getPoolItemName"
          :get-pool-item-tooltip="operations.getPoolItemTooltip"
          @toggle-category="handleToggleCustomPoolCategory"
          @toggle-group="state.toggleCustomGroup"
          @pool-item-click="operations.handlePoolItemClick"
          @pool-item-dblclick="operations.handlePoolItemDoubleClick"
          @group-click="$emit('group-click', $event)"
      />

      <!-- 系统词库分类树 -->
      <CategoryTree
          :categories="filteredCategories"
          :expanded-categories="expandedCategories"
          :expanded-subcategories="expandedSubcategories"
          :get-category-name="operations.getCategoryName"
          :get-subcategory-name="operations.getSubcategoryName"
          :get-display-text="operations.getDisplayText"
          :get-token-tooltip="operations.getTokenTooltip"
          :get-category-token-count="operations.getCategoryTokenCount"
          @toggle-category="handleToggleCategory"
          @toggle-subcategory="state.toggleSubcategory"
          @token-click="operations.handleTokenClick"
          @token-dblclick="operations.handleTokenDoubleClick"
          @add-token="(category, subcategory) => $emit('add-token', category, subcategory)"
          @category-click="$emit('category-click', $event)"
          @subcategory-click="$emit('subcategory-click', $event)"
      />

      <!-- 空状态 -->
      <div
          v-if="filteredCategories.length === 0 && filteredCustomGroups.length === 0"
          class="empty-state"
      >
        {{ isSearching ? '未找到匹配的词元，请尝试其他关键词' : '暂无词元' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, toRef, watch} from 'vue';
import CategoryTree from '../shared/CategoryTree.vue';
import CustomPoolTree from '../shared/CustomPoolTree.vue';
import {useTokenPoolState} from '../../composables/useTokenPoolState.js';
import {useTokenPoolSearch} from '../../composables/useTokenPoolSearch.js';
import {useTokenPoolOperations} from '../../composables/useTokenPoolOperations.js';

const props = defineProps({
  categories: Array,
  customGroups: Array,
  language: String,
  focused: Boolean,
});

// ⭐ 添加调试 watch
watch(() => props.categories, (newVal) => {
  console.log('[TokenPoolSection] categories 更新:', {
    length: newVal?.length,
    data: newVal
  });
}, {immediate: true, deep: true});

watch(() => props.customGroups, (newVal) => {
  console.log('[TokenPoolSection] customGroups 更新:', {
    length: newVal?.length,
    data: newVal
  });
}, {immediate: true, deep: true});

const emit = defineEmits([
  'token-click',
  'token-dblclick',
  'pool-item-click',
  'add-token',
  'use-pool-item',
  'category-click',
  'subcategory-click',
  'group-click',
]);

// ========== Composables ==========
const categoriesRef = toRef(props, 'categories');
const customGroupsRef = toRef(props, 'customGroups');
const languageRef = toRef(props, 'language');

const state = useTokenPoolState();
const search = useTokenPoolSearch(categoriesRef, customGroupsRef);
const operations = useTokenPoolOperations(emit, categoriesRef, languageRef);

// ========== 解构状态 ==========
const {
  expandedCategories,
  expandedSubcategories,
  expandedCustomGroups,
  isCustomPoolExpanded,
} = state;

const {
  searchQuery,
  isSearching,
  filteredCategories,
  filteredCustomGroups,
  getFilteredCustomPoolCount,
} = search;

// ========== 计算属性 ==========
const hasCustomGroups = computed(() => {
  return props.customGroups && props.customGroups.length > 0;
});

// ========== 事件处理 ==========
const handleToggleCategory = (categoryId) => {
  state.toggleCategory(categoryId, props.categories, isSearching.value);
};

const handleToggleCustomPoolCategory = () => {
  state.toggleCustomPoolCategory(
      props.customGroups,
      filteredCustomGroups.value,
      isSearching.value
  );
};

// ========== 监听搜索状态 ==========
watch(isSearching, (newValue) => {
  if (newValue) {
    console.log('[TokenPoolSection] 开始搜索');
    state.expandSearchResults(
        filteredCategories.value,
        filteredCustomGroups.value
    );
  } else {
    console.log('[TokenPoolSection] 清除搜索');
    state.collapseAll();
  }
});
</script>

<style scoped>
.token-pool {
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: border-color 0.3s;
}

.token-pool.focused {
  border-color: #0d7dd8 !important;
  box-shadow: 0 0 0 2px rgba(13, 125, 216, 0.2);
}

.pool-header {
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  background: #2a2a2a;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h4 {
  margin: 0;
  color: #fafafa;
  font-size: 14px;
  font-weight: 600;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #0d7dd8;
  box-shadow: 0 0 0 2px rgba(13, 125, 216, 0.2);
}

.pool-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.pool-content::-webkit-scrollbar {
  width: 8px;
}

.pool-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.pool-content::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}

.pool-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 20px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .pool-header {
    padding: 10px 12px;
  }

  h4 {
    font-size: 13px;
  }

  .search-input {
    font-size: 11px;
  }
}
</style>