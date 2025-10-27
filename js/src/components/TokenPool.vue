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
      <!-- 自定义词元池 - 修改：搜索状态下也显示（如果有匹配结果） -->
      <div v-if="hasCustomGroups && (filteredCustomGroups.length > 0 || !isSearching)" class="category custom-category">
        <div
            class="category-header"
            @click="toggleCustomPoolCategory"
        >
          <span class="category-icon">{{ isCustomPoolExpanded ? '▼' : '▶' }}</span>
          <span class="category-title">自定义词元池</span>
          <span class="category-count">({{ getFilteredCustomPoolCount() }})</span>
          <span class="category-source custom">🎲</span>
        </div>

        <div v-show="isCustomPoolExpanded" class="category-content">
          <!-- 二级分组 (groups) - 使用过滤后的结果 -->
          <div
              v-for="group in filteredCustomGroups"
              :key="group.id"
              class="subcategory custom-group"
          >
            <div
                class="subcategory-header"
                @click.stop="toggleCustomGroup(group.id)"
            >
              <span class="subcategory-icon">{{ expandedCustomGroups.has(group.id) ? '▼' : '▶' }}</span>
              <span class="subcategory-title">{{ getGroupName(group) }}</span>
              <span class="subcategory-count">({{ group.pool?.length || 0 }})</span>
            </div>

            <!-- 三级池项目 (pool items) -->
            <div v-show="expandedCustomGroups.has(group.id)" class="token-list-container">
              <div class="pool-items-grid">
                <div
                    v-for="poolItem in group.pool"
                    :key="poolItem.id"
                    class="pool-item-tag"
                    @click="handlePoolItemClick(poolItem)"
                    @dblclick.stop="handlePoolItemDoubleClick(poolItem)"
                    :title="getPoolItemTooltip(poolItem)"
                >
                  <span class="pool-item-icon">🎲</span>
                  <span class="pool-item-text">
                    {{ getPoolItemName(poolItem) }}
                  </span>
                  <span class="pool-item-key">{#%{{ poolItem.id }}#%}</span>
                  <span class="pool-item-count">{{ poolItem.tokens?.length || 0 }}</span>
                </div>
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
              <span class="subcategory-icon">{{
                  expandedSubcategories.has(`${category.id}-${subcategory.id}`) ? '▼' : '▶'
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

            <div v-show="expandedSubcategories.has(`${category.id}-${subcategory.id}`)" class="token-list-container">
              <div class="token-tags-grid">
                <div
                    v-for="token in subcategory.tokens"
                    :key="token.id"
                    class="token-tag"
                    :class="[token.source, { 'no-mapping': !token.mapping }]"
                    @click="handleTokenClick(token)"
                    @dblclick.stop="handleTokenDoubleClick(token)"
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
      <div v-if="filteredCategories.length === 0 && filteredCustomGroups.length === 0" class="empty-state">
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

// 修改 emit 声明，添加新事件
const emit = defineEmits([
  'token-click',      // 单击词元（打开编辑器）
  'token-dblclick',   // 双击词元（插入到输出区）
  'pool-item-click',  // 单击词元池（打开编辑器）
  'add-token',
  'use-pool-item'     // 双击词元池（插入到输出区）
]);

const searchQuery = ref('');

// 使用 Set 来管理展开状态
const expandedCategories = ref(new Set());
const expandedSubcategories = ref(new Set());
const expandedCustomGroups = ref(new Set());
const isCustomPoolExpanded = ref(false);

// 是否有自定义词元池
const hasCustomGroups = computed(() => {
  return props.customGroups && props.customGroups.length > 0;
});

// 是否正在搜索
const isSearching = computed(() => {
  return searchQuery.value.trim().length > 0;
});

// 新增：过滤自定义词元池
const filteredCustomGroups = computed(() => {
  if (!props.customGroups || !isSearching.value) {
    return props.customGroups || [];
  }

  const query = searchQuery.value.toLowerCase();

  // 过滤 groups，并过滤每个 group 中的 pool 项
  return props.customGroups.map(group => {
    // 过滤 pool 项
    const filteredPool = (group.pool || []).filter(poolItem => {
      // 匹配池项目的 id
      if (poolItem.id?.toLowerCase().includes(query)) return true;

      // 匹配池项目的中文名称
      if (poolItem.name?.zh?.toLowerCase().includes(query)) return true;

      // 匹配池项目的英文名称
      if (poolItem.name?.en?.toLowerCase().includes(query)) return true;

      // 匹配池项目的描述
      if (poolItem.description?.toLowerCase().includes(query)) return true;

      return false;
    });

    // 返回包含过滤后 pool 的 group
    return {
      ...group,
      pool: filteredPool
    };
  }).filter(group => group.pool.length > 0); // 只保留有匹配项的 group
});

// 新增：计算过滤后的词元池总数
const getFilteredCustomPoolCount = () => {
  if (!isSearching.value) {
    // 非搜索状态，返回总数
    if (!props.customGroups) return 0;
    return props.customGroups.reduce((total, group) => {
      return total + (group.pool?.length || 0);
    }, 0);
  } else {
    // 搜索状态，返回过滤后的数量
    return filteredCustomGroups.value.reduce((total, group) => {
      return total + (group.pool?.length || 0);
    }, 0);
  }
};

const handleTokenClick = (token) => {
  console.log('[TokenPool] 单击词元，打开编辑器:', token);
  emit('token-click', token);
};

const handleTokenDoubleClick = (token) => {
  console.log('[TokenPool] 双击词元，插入到输出区:', token);
  emit('token-dblclick', token);
};

// 修改：处理词元池项目的单击
const handlePoolItemClick = (poolItem) => {
  console.log('[TokenPool] 单击词元池项目，打开编辑器:', poolItem);
  emit('pool-item-click', poolItem);
};

// 原有的双击处理改名
const handlePoolItemDoubleClick = (poolItem) => {
  console.log('[TokenPool] 双击词元池项目，插入到输出区:', poolItem);
  emit('use-pool-item', poolItem);
};

// 监听搜索状态变化 - 修改：搜索时也展开自定义词元池
watch(isSearching, (newValue) => {
  if (newValue) {
    console.log('[TokenPool] 开始搜索');

    // 如果有匹配的自定义词元池，展开它
    if (filteredCustomGroups.value.length > 0) {
      isCustomPoolExpanded.value = true;
      // 自动展开所有有匹配结果的分组
      filteredCustomGroups.value.forEach(group => {
        expandedCustomGroups.value.add(group.id);
      });
    } else {
      // 没有匹配结果，收起
      isCustomPoolExpanded.value = false;
      expandedCustomGroups.value.clear();
    }

    // 自动展开所有系统词库搜索结果
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
    isCustomPoolExpanded.value = false;
    expandedCustomGroups.value.clear();
    expandedCategories.value.clear();
    expandedSubcategories.value.clear();
    console.log('[TokenPool] 清除搜索，收起所有分类');
  }
});

// 切换自定义词元池一级分类
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
    const groupsToExpand = isSearching.value ? filteredCustomGroups.value : props.customGroups;
    if (groupsToExpand) {
      groupsToExpand.forEach(group => {
        expandedCustomGroups.value.add(group.id);
      });
    }
  } else {
    // 收起时，同时收起所有子分组
    expandedCustomGroups.value.clear();
  }

  console.log('[TokenPool] 切换自定义词元池，状态:', willExpand ? '展开' : '收起');
};

// 切换自定义词元池的二级分组
const toggleCustomGroup = (groupId) => {
  if (expandedCustomGroups.value.has(groupId)) {
    expandedCustomGroups.value.delete(groupId);
  } else {
    expandedCustomGroups.value.add(groupId);
  }
};

// 一级分类切换
const toggleCategory = (categoryId) => {
  // 如果在搜索状态，不使用手风琴模式
  if (isSearching.value) {
    if (expandedCategories.value.has(categoryId)) {
      expandedCategories.value.delete(categoryId);
      const category = props.categories.find(c => c.id === categoryId);
      if (category) {
        category.subcategories.forEach(sub => {
          expandedSubcategories.value.delete(`${categoryId}-${sub.id}`);
        });
      }
    } else {
      expandedCategories.value.add(categoryId);
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

  // 收起自定义词元池
  isCustomPoolExpanded.value = false;
  expandedCustomGroups.value.clear();

  // 收起所有系统词库分类和子分类
  expandedCategories.value.clear();
  expandedSubcategories.value.clear();

  // 如果之前是收起的，展开目标分类和它的所有子分类
  if (!isCurrentlyExpanded) {
    expandedCategories.value.add(categoryId);

    const category = props.categories.find(c => c.id === categoryId);
    if (category) {
      category.subcategories.forEach(sub => {
        expandedSubcategories.value.add(`${categoryId}-${sub.id}`);
      });
    }
  }

  console.log('[TokenPool] 切换系统词库分类:', categoryId, '状态:', !isCurrentlyExpanded ? '展开' : '收起');
};

// 二级分类切换
const toggleSubcategory = (categoryId, subcategoryId) => {
  const key = `${categoryId}-${subcategoryId}`;
  if (expandedSubcategories.value.has(key)) {
    expandedSubcategories.value.delete(key);
  } else {
    expandedSubcategories.value.add(key);
  }
};

// 过滤系统词库分类
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

// 获取分组名称
const getGroupName = (group) => {
  if (group.name) {
    return props.language === 'zh' ? group.name.zh : group.name.en;
  }
  return group.id;
};

// 获取池项目名称
const getPoolItemName = (poolItem) => {
  if (poolItem.name) {
    return props.language === 'zh' ? poolItem.name.zh : poolItem.name.en;
  }
  return poolItem.description || poolItem.id;
};

// 获取池项目的 tooltip
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
  parts.push('双击使用此词元池');
  return parts.join('\n');
};

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
</script>

<style scoped>
/* 自定义词元池样式 */
.custom-category {
  border-left: 3px solid #667eea;
  background: rgba(102, 126, 234, 0.05);
  margin-bottom: 8px;
}

.custom-category .category-header {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
}

.category-source.custom {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}

.custom-group {
  border-left: 2px solid #8b5cf6;
  margin-left: 8px;
}

.custom-group .subcategory-header {
  background: rgba(139, 92, 246, 0.05);
}

.custom-group .subcategory-header:hover {
  background: rgba(139, 92, 246, 0.1);
}

/* 池项目网格 */
.pool-items-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

/* 池项目标签 */
.pool-item-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: 1px solid #764ba2;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 150px;
  box-shadow: 0 2px 8px rgba(118, 75, 162, 0.3);
}

.pool-item-tag:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 4px 16px rgba(118, 75, 162, 0.5);
}

.pool-item-icon {
  font-size: 14px;
}

.pool-item-text {
  flex: 1;
  font-weight: 600;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pool-item-key {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 10px;
  opacity: 0.9;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
}

.pool-item-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

/* 保留原有样式 */
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

  .pool-item-tag {
    min-width: 120px;
    padding: 6px 10px;
  }
}

.token-tag {
  cursor: pointer;
  position: relative;
}

.token-tag::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(13, 125, 216, 0.1);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.token-tag:active::after {
  opacity: 1;
}

.pool-item-tag {
  cursor: pointer;
  position: relative;
}

.pool-item-tag::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.pool-item-tag:active::after {
  opacity: 1;
}

/* 添加提示文本（可选） */
.token-tag:hover::before,
.pool-item-tag:hover::before {
  content: '单击编辑 | 双击插入';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
  margin-bottom: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 100;
}

.token-tag:hover::before,
.pool-item-tag:hover::before {
  opacity: 1;
  transition-delay: 0.5s;
}

</style>