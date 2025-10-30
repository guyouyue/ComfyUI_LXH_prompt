<!--src/components/shared/CategoryTree.vue-->
<template>
  <div
      v-for="category in categories"
      :key="category.id"
      class="category"
  >
    <!-- 一级分类标题 -->
    <div
        class="category-header"
        @click="$emit('toggle-category', category.id)"
    >
      <span class="category-icon">{{ isExpanded(category.id) ? '▼' : '▶' }}</span>
      <span class="category-title">{{ getCategoryName(category) }}</span>
      <span class="category-count">({{ getCategoryTokenCount(category) }})</span>
    </div>

    <!-- 二级分类内容 -->
    <div v-show="isExpanded(category.id)" class="category-content">
      <div
          v-for="subcategory in category.subcategories"
          :key="subcategory.id"
          class="subcategory"
      >
        <!-- 二级分类标题 -->
        <div
            class="subcategory-header"
            @click.stop="$emit('toggle-subcategory', category.id, subcategory.id)"
        >
          <span class="subcategory-icon">{{
              isSubcategoryExpanded(category.id, subcategory.id) ? '▼' : '▶'
            }}</span>
          <span class="subcategory-title">{{ getSubcategoryName(subcategory) }}</span>
          <span class="subcategory-count">({{ subcategory.tokens.length }})</span>
          <button
              class="add-token-btn"
              @click.stop="$emit('add-token', category, subcategory)"
              title="添加新词元"
          >
            +
          </button>
        </div>

        <!-- 词元列表 -->
        <div
            v-show="isSubcategoryExpanded(category.id, subcategory.id)"
            class="token-list-container"
        >
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

defineEmits([
  'toggle-category',
  'toggle-subcategory',
  'token-click',
  'token-dblclick',
  'add-token',
]);

const isExpanded = (categoryId) => {
  return props.expandedCategories.has(categoryId);
};

const isSubcategoryExpanded = (categoryId, subcategoryId) => {
  return props.expandedSubcategories.has(`${categoryId}-${subcategoryId}`);
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

.category-title {
  color: #fafafa;
  font-weight: 600;
  font-size: 13px;
  flex: 1;
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
  cursor: pointer;
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