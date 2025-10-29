<template>
  <div
    class="token-item"
    :class="{ highlighted: isHighlighted }"
    @click="$emit('select', token)"
  >
    <div class="token-text">
      <span class="token-main">{{ mainText }}</span>
      <span class="token-sub">{{ subText }}</span>
    </div>
    <div class="token-meta">
      <span class="token-category">{{ categoryPath }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  token: {
    type: Object,
    required: true,
  },
  language: {
    type: String,
    default: 'zh',
  },
  searchQuery: {
    type: String,
    default: '',
  },
});

defineEmits(['select']);

/**
 * 主显示文本
 */
const mainText = computed(() => {
  return props.language === 'zh' ? props.token.zh : props.token.en;
});

/**
 * 副显示文本
 */
const subText = computed(() => {
  return props.language === 'zh' ? props.token.en : props.token.zh;
});

/**
 * 分类路径
 */
const categoryPath = computed(() => {
  const parts = [];
  if (props.token.categoryName) parts.push(props.token.categoryName);
  if (props.token.subcategoryName) parts.push(props.token.subcategoryName);
  return parts.join(' / ') || '未分类';
});

/**
 * 是否高亮（匹配搜索）
 */
const isHighlighted = computed(() => {
  if (!props.searchQuery) return false;

  const query = props.searchQuery.toLowerCase();
  const zh = props.token.zh?.toLowerCase() || '';
  const en = props.token.en?.toLowerCase() || '';

  return zh.includes(query) || en.includes(query);
});
</script>

<style scoped>
.token-item {
  padding: 10px 12px;
  background: #1e1e1e;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 2px solid transparent;
}

.token-item:hover {
  background: #2a2a2a;
  transform: translateX(4px);
  border-left-color: #0d7dd8;
}

.token-item.highlighted {
  background: #2a2a2a;
  border-left-color: #42a5f5;
}

.token-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-main {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 500;
}

.token-sub {
  color: #888;
  font-size: 11px;
}

.token-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-category {
  color: #666;
  font-size: 11px;
  padding: 2px 6px;
  background: #252525;
  border-radius: 3px;
}

@media (max-width: 768px) {
  .token-item {
    padding: 8px 10px;
  }

  .token-main {
    font-size: 12px;
  }

  .token-sub,
  .token-category {
    font-size: 10px;
  }
}
</style>