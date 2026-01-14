<!--src/components/layout/TokenPoolSection.vue-->
<template>
  <div class="token-pool" :class="{ focused }">
    <!-- 头部 -->
    <div class="pool-header">
      <h4>📚 词元映射池</h4>
      <input
          type="text"
          class="search-input"
          v-model="pool.searchQuery.value"
          placeholder="搜索词元..."
      />
    </div>

    <!-- 内容区 -->
    <div class="pool-content">
      <!-- 自定义词元池 -->
      <CustomPoolTree
          :groups="pool.filteredCustomGroups.value"
          :has-custom-groups="pool.hasCustomGroups.value"
          :is-searching="pool.isSearching.value"
          :is-expanded="pool.isCustomPoolExpanded.value"
          :expanded-groups="pool.expandedCustomGroups.value"
          :total-count="pool.getFilteredCustomPoolCount()"
          :get-group-name="pool.getGroupName"
          :get-pool-item-name="pool.getPoolItemName"
          :get-pool-item-tooltip="pool.getPoolItemTooltip"
          @toggle-category="pool.toggleCustomPoolCategory"
          @pool-item-click="pool.handlePoolItemClick"
          @pool-item-dblclick="pool.handlePoolItemDoubleClick"
          @group-click="$emit('group-click', $event)"
      />

      <!-- 系统词库分类树 -->
      <CategoryTree
          :categories="pool.filteredCategories.value"
          :expanded-categories="pool.expandedCategories.value"
          :expanded-subcategories="pool.expandedSubcategories.value"
          :get-category-name="pool.getCategoryName"
          :get-subcategory-name="pool.getSubcategoryName"
          :get-display-text="pool.getDisplayText"
          :get-token-tooltip="pool.getTokenTooltip"
          :get-category-token-count="pool.getCategoryTokenCount"
          @toggle-category="pool.toggleCategory"
          @token-click="pool.handleTokenClick"
          @token-dblclick="pool.handleTokenDoubleClick"
          @add-token="(category, subcategory) => $emit('add-token', category, subcategory)"
          @category-click="$emit('category-click', $event)"
          @subcategory-click="$emit('subcategory-click', $event)"
      />

      <!-- 空状态 -->
      <div
          v-if="pool.filteredCategories.value.length === 0 && pool.filteredCustomGroups.value.length === 0"
          class="empty-state"
      >
        {{ pool.isSearching.value ? '未找到匹配的词元，请尝试其他关键词' : '暂无词元' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import CategoryTree from '../shared/CategoryTree.vue';
import CustomPoolTree from '../shared/CustomPoolTree.vue';
import { useTokenPool } from '../../composables/useTokenPool.js';

const props = defineProps({
  categories: Array,
  customGroups: Array,
  language: String,
  focused: Boolean,
});

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

// ========== 统一的 Composable ==========
const pool = useTokenPool(props, emit);

// ========== 监听搜索状态 ==========
watch(pool.isSearching, (newValue) => {
  if (newValue) {
    pool.expandSearchResults();
  } else {
    pool.collapseAll();
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
  padding: 2px 6px;
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