<!--src/components/shared/CategoryTree.vue-->
<template>
  <div
      v-for="category in categories"
      :key="category.id"
      class="category"
  >
    <!-- 一级分类标题 -->
    <div class="category-header">
      <span
          class="category-icon"
          @click.stop="$emit('toggle-category', category.id)"
      >
        {{ isExpanded(category.id) ? '▼' : '▶' }}
      </span>
      <span
          class="category-title"
          @click="handleCategoryClick(category)"
          title="单击编辑分类并展开/收起"
      >
        {{ getCategoryName(category) }}
      </span>
      <span class="category-count">({{ getCategoryTokenCount(category) }})</span>
    </div>

    <!-- 二级分类内容 -->
    <div v-show="isExpanded(category.id)" class="category-content">
      <div
          v-for="subcategory in category.subcategories"
          :key="subcategory.id"
          class="subcategory"
      >
        <!-- 二级分类标题-->
        <div class="subcategory-header">
          <span class="subcategory-icon always-expanded">▼</span>
          <span
              class="subcategory-title"
              @click.stop="$emit('subcategory-click', { category, subcategory })"
              title="单击编辑子分类"
          >
            {{ getSubcategoryName(subcategory) }}
          </span>
          <span class="subcategory-count">({{ subcategory.tokens.length }})</span>
          <button
              class="add-token-btn"
              @click.stop="$emit('add-token', category, subcategory)"
              title="添加新词元"
          >
            +
          </button>
        </div>

        <div class="token-list-container">
          <div class="token-tags-grid">
            <TokenTag
                v-for="token in subcategory.tokens"
                :key="token.id"
                :token="token"
                :display-text="getDisplayText(token)"
                :tooltip="getTokenTooltip(token)"
                @click="$emit('token-click', token)"
                @dblclick="$emit('token-dblclick', token)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import TokenTag from './TokenTag.vue';

const props = defineProps({
  categories: Array,
  expandedCategories: Set,
  expandedSubcategories: Set,
  getCategoryName: Function,
  getSubcategoryName: Function,
  getDisplayText: Function,
  getTokenTooltip: Function,
  getCategoryTokenCount: Function,
});

const emit = defineEmits([
  'toggle-category',
  'token-click',
  'token-dblclick',
  'add-token',
  'category-click',
  'subcategory-click',
]);

// ⭐ 新增：处理一级分类点击（同时触发编辑和展开/收起）
const handleCategoryClick = (category) => {
  // 先触发编辑事件
  emit('category-click', category);
  // 再触发展开/收起事件
  emit('toggle-category', category.id);
};

const isExpanded = (categoryId) => {
  return props.expandedCategories.has(categoryId);
};

</script>

<style scoped>
.category {
  margin-bottom: 8px;
}

.category-header {
  padding: 8px 12px;
  background: #2a2a2a;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  user-select: none;
}

.category-header:hover {
  background: #333;
  transform: translateX(2px);
}

.category-icon,
.subcategory-icon {
  color: #888;
  font-size: 10px;
  width: 12px;
  transition: transform 0.2s;
}

/* ⭐ 新增：永久展开的图标样式 */
.subcategory-icon.always-expanded {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.category-title {
  color: #fafafa;
  font-weight: 600;
  font-size: 13px;
  flex: 1;
  cursor: pointer;
}

.category-title:hover {
  color: #0d7dd8;
}

.category-count {
  color: #888;
  font-size: 11px;
}

.category-content {
  padding-left: 16px;
  margin-top: 4px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.subcategory {
  margin-bottom: 4px;
}

.subcategory-header {
  padding: 6px 10px;
  background: #232323;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  user-select: none;
}

.subcategory-header:hover {
  background: #2a2a2a;
  transform: translateX(2px);
}

.subcategory-title {
  color: #ddd;
  font-size: 12px;
  flex: 1;
  cursor: pointer;
}

.subcategory-title:hover {
  color: #0d7dd8;
}

.subcategory-count {
  color: #777;
  font-size: 11px;
}

.add-token-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  background: #0d7dd8;
  border: none;
  border-radius: 3px;
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.add-token-btn:hover {
  background: #0a6bc2;
  transform: scale(1.1);
}

.subcategory-header:hover .add-token-btn {
  opacity: 1;
}

.token-list-container {
  padding: 8px 0 8px 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.token-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
}
</style>