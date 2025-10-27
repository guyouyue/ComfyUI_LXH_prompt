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
      <!-- 自定义词元池分类 - 只在非搜索状态显示 -->
      <div
          v-show="!isSearching"
          v-for="group in customGroups"
          :key="group.id"
          class="category custom-group-category"
      >
        <div
            class="category-header"
            @click="toggleCustomGroup(group.id)"
        >
          <span class="category-icon">{{ expandedCustomGroups.has(group.id) ? '▼' : '▶' }}</span>
          <span class="category-title">{{ getGroupName(group) }}</span>
          <span class="category-count">({{ group.parsedTokens?.length || 0 }})</span>
          <span class="category-source user">🎲</span>
        </div>

        <div v-show="expandedCustomGroups.has(group.id)" class="category-content">
          <div class="token-list-container">
            <div class="token-tags-grid">
              <!-- 主词元池标签 -->
              <div
                  class="token-tag custom-pool-key"
                  @dblclick="$emit('use-custom-group', group)"
                  :title="getGroupKeyTooltip(group)"
              >
                <span class="token-text">{%{{ group.key }}%}</span>
                <span class="token-source-badge user">🎲</span>
              </div>

              <!-- 候选词元 -->
              <div
                  v-for="token in group.parsedTokens"
                  :key="token.id"
                  class="token-tag custom-group-member"
                  @dblclick="$emit('use-custom-token', token)"
                  :title="getCustomTokenTooltip(token)"
              >
                <span class="token-text">
                  {{ language === 'zh' ? token.zh : token.en }}
                </span>
                <span class="token-weight">{{ token.weight }}</span>
                <span v-if="token.isQuoted" class="token-type-badge">🔗</span>
                <span v-else-if="token.isNew" class="token-type-badge">✨</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统词库分类 -->
      <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="category"
      >
        <div
            class="category-header"
            @click="toggleCategory(category.id)"
        >
          <span class="category-icon">{{ expandedCategories.has(category.id) ? '▼' : '▶' }}</span>
          <span class="category-title">{{ getCategoryName(category) }}</span>
          <span class="category-count">({{ getCategoryTokenCount(category) }})</span>
        </div>

        <div v-show="expandedCategories.has(category.id)" class="category-content">
          <div
              v-for="subcategory in category.subcategories"
              :key="subcategory.id"
              class="subcategory"
          >
            <div
                class="subcategory-header"
                @click.stop="toggleSubcategory(category.id, subcategory.id)"
            >
              <span class="subcategory-icon">{{ expandedSubcategories.has(`${category.id}-${subcategory.id}`) ? '▼' : '▶' }}</span>
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

            <div v-show="expandedSubcategories.has(`${category.id}-${subcategory.id}`)" class="token-list-container">
              <div class="token-tags-grid">
                <div
                    v-for="token in subcategory.tokens"
                    :key="token.id"
                    class="token-tag"
                    :class="[token.source, { 'no-mapping': !token.mapping }]"
                    @dblclick="$emit('token-click', token)"
                    :title="getTokenTooltip(token)"
                >
                  <span class="token-text">{{ getDisplayText(token) }}</span>
                  <span class="token-source-badge" :class="token.source">
                    {{ token.source === 'user' ? '👤' : '⚙️' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredCategories.length === 0 && customGroups.length === 0" class="empty-state">
        {{ isSearching ? '未找到匹配的词元，请尝试其他关键词' : '暂无词元' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue';

const props = defineProps({
  categories: Array,
  customGroups: Array,
  language: String,
  focused: Boolean
});

const emit = defineEmits(['token-click', 'add-token', 'use-custom-group', 'use-custom-token']);

const searchQuery = ref('');

// 使用 Set 来管理展开状态（更高效）
const expandedCategories = ref(new Set());
const expandedSubcategories = ref(new Set());
const expandedCustomGroups = ref(new Set());

// 是否正在搜索
const isSearching = computed(() => {
  return searchQuery.value.trim().length > 0;
});

// 搜索结果计数
const searchResultCount = computed(() => {
  if (!isSearching.value) return 0;

  let count = 0;
  filteredCategories.value.forEach(cat => {
    cat.subcategories.forEach(sub => {
      count += sub.tokens.length;
    });
  });
  return count;
});

// 监听搜索状态变化
watch(isSearching, (newValue) => {
  if (newValue) {
    // 开始搜索时，收起自定义词元池
    expandedCustomGroups.value.clear();
    console.log('[TokenPool] 开始搜索，收起自定义词元池');

    // 自动展开所有搜索结果
    if (filteredCategories.value.length > 0) {
      filteredCategories.value.forEach(cat => {
        expandedCategories.value.add(cat.id);
        cat.subcategories.forEach(sub => {
          expandedSubcategories.value.add(`${cat.id}-${sub.id}`);
        });
      });
    }
  } else {
    // 清除搜索时，收起所有分类
    expandedCategories.value.clear();
    expandedSubcategories.value.clear();
    console.log('[TokenPool] 清除搜索，收起所有分类');
  }
});

// 清除搜索
const clearSearch = () => {
  searchQuery.value = '';
};

// 自定义词元池的展开/收起
const toggleCustomGroup = (groupId) => {
  if (expandedCustomGroups.value.has(groupId)) {
    expandedCustomGroups.value.delete(groupId);
  } else {
    expandedCustomGroups.value.add(groupId);
  }
};

// 一级分类切换 - 手风琴模式
const toggleCategory = (categoryId) => {
  // 如果在搜索状态，不使用手风琴模式
  if (isSearching.value) {
    if (expandedCategories.value.has(categoryId)) {
      expandedCategories.value.delete(categoryId);
      // 同时收起该分类下的所有子分类
      const category = props.categories.find(c => c.id === categoryId);
      if (category) {
        category.subcategories.forEach(sub => {
          expandedSubcategories.value.delete(`${categoryId}-${sub.id}`);
        });
      }
    } else {
      expandedCategories.value.add(categoryId);
      // 同时展开该分类下的所有子分类
      const category = props.categories.find(c => c.id === categoryId);
      if (category) {
        category.subcategories.forEach(sub => {
          expandedSubcategories.value.add(`${categoryId}-${sub.id}`);
        });
      }
    }
    return;
  }

  // 非搜索状态使用手风琴模式
  const isCurrentlyExpanded = expandedCategories.value.has(categoryId);

  // 收起所有分类和子分类
  expandedCategories.value.clear();
  expandedSubcategories.value.clear();

  // 如果之前是收起的，展开目标分类和它的所有子分类
  if (!isCurrentlyExpanded) {
    expandedCategories.value.add(categoryId);

    // 展开该分类下的所有子分类
    const category = props.categories.find(c => c.id === categoryId);
    if (category) {
      category.subcategories.forEach(sub => {
        expandedSubcategories.value.add(`${categoryId}-${sub.id}`);
      });
    }
  }
};

// 二级分类切换 - 独立控制
const toggleSubcategory = (categoryId, subcategoryId) => {
  const key = `${categoryId}-${subcategoryId}`;
  if (expandedSubcategories.value.has(key)) {
    expandedSubcategories.value.delete(key);
  } else {
    expandedSubcategories.value.add(key);
  }
};

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

const getDisplayText = (token) => {
  return props.language === 'zh' ? token.zh : token.en;
};

const getTokenTooltip = (token) => {
  const parts = [];

  parts.push(token.source === 'user' ? '👤 用户词库' : '⚙️ 系统词库');
  parts.push(`中文: ${token.zh || '无'}`);
  parts.push(`英文: ${token.en || '无'}`);

  if (token.description) {
    parts.push(`描述: ${token.description}`);
  }

  if (token.mapping) {
    parts.push('✅ 已映射');
  } else {
    parts.push('⚠️ 未映射');
  }

  parts.push('双击添加到输出区');

  return parts.join('\n');
};

// 获取组合名称
const getGroupName = (group) => {
  return props.language === 'zh' ? (group.zh || group.description || group.key) : (group.en || group.description || group.key);
};

// 获取组合 key 的 tooltip
const getGroupKeyTooltip = (group) => {
  const parts = [];
  parts.push('🎲 词元池');
  parts.push(`Key: {%${group.key}%}`);
  parts.push(`中文: ${group.zh || '无'}`);
  parts.push(`英文: ${group.en || '无'}`);
  parts.push(`候选词元: ${group.parsedTokens?.length || 0} 个`);
  parts.push(`总权重: ${getTotalWeight(group)}`);
  parts.push('双击使用词元池（将插入 {%key%} 形式）');
  return parts.join('\n');
};

// 获取自定义词元的 tooltip
const getCustomTokenTooltip = (token) => {
  const parts = [];

  if (token.isQuoted) {
    parts.push('🔗 引用词元');
    parts.push(`来源ID: ${token.id}`);
  } else if (token.isNew) {
    parts.push('✨ 新建词元');
  }

  parts.push(`中文: ${token.zh || '无'}`);
  parts.push(`英文: ${token.en || '无'}`);
  parts.push(`权重: ${token.weight}`);
  parts.push('双击直接使用此词元');

  return parts.join('\n');
};

// 计算总权重
const getTotalWeight = (group) => {
  if (!group.parsedTokens) return '0.0';
  return group.parsedTokens.reduce((sum, token) => sum + (token.weight || 1), 0).toFixed(1);
};
</script>

<style scoped>
/* 搜索信息栏样式 */
.search-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #2a2a2a;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid #0d7dd8;
}

.search-info-text {
  color: #42A5F5;
  font-size: 12px;
  font-weight: 600;
}

.clear-search-btn {
  padding: 4px 8px;
  font-size: 11px;
  background: #404040;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-search-btn:hover {
  background: #4a4a4a;
  border-color: #666;
  transform: translateY(-1px);
}

/* 保持原有样式不变 */
.custom-group-tokens {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  margin: 4px 0;
}

.custom-group-token {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: 1px solid #764ba2 !important;
  color: white !important;
  font-weight: 600;
}

.custom-group-token:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(118, 75, 162, 0.4) !important;
}

.custom-group-member {
  background: #2a2a2a !important;
  border-left: 3px solid #667eea !important;
}

.custom-group-member .token-weight {
  background: #667eea;
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
}

.category:first-child {
  margin-top: 0;
}

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

/* 添加新样式 */
.custom-group-category {
  border-left: 3px solid #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.custom-pool-key {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: 2px solid #764ba2 !important;
  color: white !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  padding: 6px 12px !important;
  box-shadow: 0 2px 8px rgba(118, 75, 162, 0.3);
}

.custom-pool-key:hover {
  transform: translateY(-2px) scale(1.02) !important;
  box-shadow: 0 4px 16px rgba(118, 75, 162, 0.5) !important;
}

.custom-pool-key .token-text {
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 0.5px;
}

.custom-group-member {
  background: #2a2a2a !important;
  border: 1px solid #667eea !important;
  position: relative;
}

.custom-group-member .token-weight {
  background: #667eea;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 4px;
}

.token-type-badge {
  font-size: 10px;
  margin-left: 2px;
}
</style>