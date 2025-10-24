<template>
  <div class="token-pool" :class="{ focused }">
    <div class="pool-header">
      <h4>📚 词元映射池</h4>
      <input
          type="text"
          class="search-input"
          v-model="searchQuery"
          placeholder="搜索词元..."
      />
    </div>
    <div class="pool-content">
      <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="category"
      >
        <div
            class="category-header"
            @click="toggleCategory(category.id)"
        >
          <span class="category-icon">{{ category.expanded ? '▼' : '▶' }}</span>
          <span class="category-title">{{ getCategoryName(category) }}</span>
          <span class="category-count">({{ getCategoryTokenCount(category) }})</span>
          <span class="category-source" :class="category.source">
            {{ category.source === 'user' ? '👤' : '⚙️' }}
          </span>
        </div>

        <div v-show="category.expanded" class="category-content">
          <div
              v-for="subcategory in category.subcategories"
              :key="subcategory.id"
              class="subcategory"
          >
            <div
                class="subcategory-header"
                @click="toggleSubcategory(category.id, subcategory.id)"
            >
              <span class="subcategory-icon">{{ subcategory.expanded ? '▼' : '▶' }}</span>
              <span class="subcategory-title">{{ getSubcategoryName(subcategory) }}</span>
              <span class="subcategory-count">({{ subcategory.tokens.length }})</span>
              <span class="subcategory-source" :class="subcategory.source">
                {{ subcategory.source === 'user' ? '👤' : '⚙️' }}
              </span>
              <button
                  class="add-token-btn"
                  @click.stop="$emit('add-token', category, subcategory)"
                  title="添加词元"
              >
                +
              </button>
            </div>

            <!-- 修改后的词元展示区域 -->
            <div v-show="subcategory.expanded" class="token-list-container">
              <div class="token-tags-grid">
                <span
                    v-for="token in subcategory.tokens"
                    :key="token.uniqueId"
                    class="token-tag"
                    :class="[token.source, { 'no-mapping': !token.mapping }]"
                    @dblclick="$emit('token-click', token)"
                    :title="getTokenTooltip(token)"
                >
                  <span class="token-text">
                    {{ getDisplayText(token) }}
                  </span>
                  <span class="token-source-badge" :class="token.source">
                    {{ token.source === 'user' ? '👤' : '⚙️' }}
                  </span>
                </span>
              </div>

              <div v-if="subcategory.tokens.length === 0" class="empty-tokens">
                该分类下暂无词元
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredCategories.length === 0" class="empty-state">
        未找到匹配的词元
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, ref} from 'vue';

const props = defineProps({
  categories: Array,
  language: String,
  focused: Boolean
});

const emit = defineEmits(['token-click', 'add-token']);

const searchQuery = ref('');

const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.categories;
  }

  const query = searchQuery.value.toLowerCase();
  return props.categories.map(cat => {
    const filteredSubs = cat.subcategories.map(sub => {
      const filteredTokens = sub.tokens.filter(token =>
          token.zh?.toLowerCase().includes(query) ||
          token.en?.toLowerCase().includes(query)
      );
      return {...sub, tokens: filteredTokens};
    }).filter(sub => sub.tokens.length > 0);

    return {...cat, subcategories: filteredSubs};
  }).filter(cat => cat.subcategories.length > 0);
});

const getCategoryName = (category) => {
  return props.language === 'zh' ? category.name.zh : category.name.en;
};

const getSubcategoryName = (subcategory) => {
  return props.language === 'zh' ? subcategory.name.zh : subcategory.name.en;
};

const getCategoryTokenCount = (category) => {
  return category.subcategories.reduce((sum, sub) => sum + sub.tokens.length, 0);
};

// 获取词元显示文本（根据当前语言）
const getDisplayText = (token) => {
  return props.language === 'zh' ? token.zh : token.en;
};

// 获取词元悬停提示信息
const getTokenTooltip = (token) => {
  const parts = [];

  // 来源信息
  parts.push(token.source === 'user' ? '👤 用户词库' : '⚙️ 系统词库');

  // 语言信息
  parts.push(`中文: ${token.zh || '无'}`);
  parts.push(`英文: ${token.en || '无'}`);

  // 其他信息
  if (token.description) {
    parts.push(`描述: ${token.description}`);
  }

  // 映射状态信息
  if (token.mapping) {
    parts.push('✅ 已映射');
  } else {
    parts.push('⚠️ 未映射');
  }

  parts.push('双击添加到输出区');

  return parts.join('\n');
};

// 修改后的一级分类切换函数 - 手风琴模式
const toggleCategory = (categoryId) => {
  const targetCategory = props.categories.find(c => c.id === categoryId);
  if (!targetCategory) return;

  const isCurrentlyExpanded = targetCategory.expanded;

  // 1. 收起所有一级分类及其二级分类
  props.categories.forEach(category => {
    category.expanded = false;
    // 同时收起所有二级分类
    category.subcategories.forEach(sub => {
      sub.expanded = false;
    });
  });

  // 2. 如果目标分类之前是收起的，则展开它和它的所有二级分类
  if (!isCurrentlyExpanded) {
    targetCategory.expanded = true;
    // 展开所有二级分类
    targetCategory.subcategories.forEach(sub => {
      sub.expanded = true;
    });
  }
  // 如果之前是展开的，现在已经被第一步收起了，保持收起状态
};

// 二级分类切换函数 - 独立控制
const toggleSubcategory = (categoryId, subcategoryId) => {
  const category = props.categories.find(c => c.id === categoryId);
  if (category) {
    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    if (subcategory) {
      subcategory.expanded = !subcategory.expanded;
    }
  }
};
</script>

<style scoped>
/* 保持原有样式不变 */
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
}

.search-input:focus {
  border-color: #0d7dd8;
}

.pool-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

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

/* 展开状态的一级分类高亮 */
.category:has(.category-header) .category-header {
  position: relative;
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

.category-source {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}

.category-source.user {
  background: #0d7dd8;
  color: white;
}

.category-source.system {
  background: #666;
  color: white;
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

.subcategory-source {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
}

.subcategory-source.user {
  background: #0d7dd8;
  color: white;
}

.subcategory-source.system {
  background: #666;
  color: white;
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

/* 词元展示样式 */
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

.token-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  max-width: 200px;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-tag:hover {
  background: #404040;
  transform: translateY(-2px);
  border-color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.token-tag.user {
  border-left: 3px solid #0d7dd8;
}

.token-tag.system {
  border-left: 3px solid #666;
}

.token-tag.no-mapping {
  border: 1px solid #666;
  background: #2a2a2a;
  opacity: 0.8;
}

.token-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-source-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  min-width: 16px;
  text-align: center;
}

.token-source-badge.user {
  background: #0d7dd8;
  color: white;
}

.token-source-badge.system {
  background: #666;
  color: white;
}

.empty-tokens {
  text-align: center;
  color: #666;
  padding: 20px;
  font-size: 12px;
  font-style: italic;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 20px;
  font-size: 13px;
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

/* 响应式调整 */
@media (max-width: 768px) {
  .token-tags-grid {
    gap: 4px;
  }

  .token-tag {
    font-size: 11px;
    padding: 3px 6px;
    max-width: 150px;
  }
}
</style>