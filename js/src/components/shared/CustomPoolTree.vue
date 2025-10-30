<!--src/components/shared/CustomPoolTree.vue-->
<template>
  <div v-if="hasCustomGroups && (groups.length > 0 || !isSearching)" class="category custom-category">
    <!-- 一级分类标题 -->
    <div class="category-header" @click="$emit('toggle-category')">
      <span class="category-icon">{{ isExpanded ? '▼' : '▶' }}</span>
      <span class="category-title">自定义词元池</span>
      <span class="category-count">({{ totalCount }})</span>
      <span class="category-source custom">🎲</span>
    </div>

    <!-- 二级分组内容 -->
    <div v-show="isExpanded" class="category-content">
      <div
          v-for="group in groups"
          :key="group.id"
          class="subcategory custom-group"
      >
        <!-- 二级分组标题 - ⭐ 修改点击逻辑 -->
        <div class="subcategory-header">
          <span
              class="subcategory-icon"
              @click.stop="$emit('toggle-group', group.id)"
          >
            {{ isGroupExpanded(group.id) ? '▼' : '▶' }}
          </span>
          <span
              class="subcategory-title"
              @click.stop="$emit('group-click', group)"
              title="单击编辑词元池分组"
          >
            {{ getGroupName(group) }}
          </span>
          <span class="subcategory-count">({{ group.pool?.length || 0 }})</span>
        </div>

        <!-- 词元池项目列表 -->
        <div v-show="isGroupExpanded(group.id)" class="token-list-container">
          <div class="pool-items-grid">
            <PoolItemTag
                v-for="poolItem in group.pool"
                :key="poolItem.id"
                :pool-item="poolItem"
                :display-name="getPoolItemName(poolItem)"
                :tooltip="getPoolItemTooltip(poolItem)"
                @click="$emit('pool-item-click', poolItem)"
                @dblclick="$emit('pool-item-dblclick', poolItem)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import PoolItemTag from './PoolItemTag.vue';

const props = defineProps({
  groups: Array,
  hasCustomGroups: Boolean,
  isSearching: Boolean,
  isExpanded: Boolean,
  expandedGroups: Set,
  totalCount: Number,
  getGroupName: Function,
  getPoolItemName: Function,
  getPoolItemTooltip: Function,
});

defineEmits([
  'toggle-category',
  'toggle-group',
  'pool-item-click',
  'pool-item-dblclick',
  'group-click',
]);

const isGroupExpanded = (groupId) => {
  return props.expandedGroups.has(groupId);
};
</script>

<style scoped>
.custom-category {
  border-left: 3px solid #667eea;
  background: rgba(102, 126, 234, 0.05);
  margin-bottom: 8px;
}

.custom-category .category-header {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  user-select: none;
}

.custom-category .category-header:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
  transform: translateX(2px);
}

.category-icon {
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

.category-source.custom {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
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

.custom-group {
  border-left: 2px solid #8b5cf6;
  margin-left: 8px;
  margin-bottom: 4px;
}

.custom-group .subcategory-header {
  background: rgba(139, 92, 246, 0.05);
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  user-select: none;
}

.custom-group .subcategory-header:hover {
  background: rgba(139, 92, 246, 0.1);
  transform: translateX(2px);
}

.subcategory-icon {
  color: #888;
  font-size: 10px;
  width: 12px;
  transition: transform 0.2s;
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

.pool-items-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.subcategory-title {
  cursor: pointer; /* ⭐ 新增 */
}

.subcategory-title:hover {
  color: #667eea; /* ⭐ 新增：鼠标悬停高亮 */
}
</style>