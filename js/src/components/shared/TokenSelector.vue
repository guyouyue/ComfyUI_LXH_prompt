<template>
  <div class="token-selector-overlay" @click.self="handleClose">
    <div class="token-selector-content">
      <!-- 头部 -->
      <div class="selector-header">
        <h3>选择词元</h3>
        <button class="close-btn" @click="handleClose" title="关闭 (ESC)">
          &times;
        </button>
      </div>

      <!-- 主体 -->
      <div class="selector-body">
        <!-- 搜索框 -->
        <div class="search-box">
          <input
            ref="searchInputRef"
            type="text"
            v-model="state.searchQuery.value"
            placeholder="搜索词元（支持中文、英文、分类）..."
            class="search-input"
            @keydown.esc="handleClose"
          />
          <span v-if="search.isSearching.value" class="search-hint">
            找到 {{ search.filteredTokens.value.length }} 个结果
          </span>
        </div>

        <!-- 词元列表 -->
        <div class="token-list">
          <TokenSelectorItem
            v-for="token in search.filteredTokens.value"
            :key="token.id"
            :token="token"
            :language="language"
            :search-query="state.searchQuery.value"
            @select="handleSelect"
          />

          <!-- 空状态 -->
          <div v-if="search.filteredTokens.value.length === 0" class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-text">
              {{ search.isSearching.value ? '未找到匹配的词元' : '暂无词元' }}
            </div>
            <div v-if="search.isSearching.value" class="empty-hint">
              尝试使用其他关键词搜索
            </div>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="selector-footer">
        <div class="footer-tips">
          💡 点击词元选择 | ESC 关闭
        </div>
        <div class="footer-stats">
          共 {{ allTokens.length }} 个词元
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { toRef, onMounted, nextTick, ref } from 'vue';
import TokenSelectorItem from './TokenSelectorItem.vue';
import { useTokenSelectorState } from '../../composables/useTokenSelectorState.js';
import { useTokenSelectorSearch } from '../../composables/useTokenSelectorSearch.js';

const props = defineProps({
  allTokens: {
    type: Array,
    default: () => [],
  },
  language: {
    type: String,
    default: 'zh',
  },
});

const emit = defineEmits(['close', 'select']);

// ========== Composables ==========
const allTokensRef = toRef(props, 'allTokens');
const state = useTokenSelectorState();
const search = useTokenSelectorSearch(allTokensRef, state.searchQuery);

// ========== Refs ==========
const searchInputRef = ref(null);

// ========== 事件处理 ==========
/**
 * 关闭选择器
 */
const handleClose = () => {
  state.resetSearch();
  emit('close');
};

/**
 * 选择词元
 */
const handleSelect = (token) => {
  emit('select', token);
  handleClose();
};

// ========== 生命周期 ==========
onMounted(() => {
  // 自动聚焦搜索框
  nextTick(() => {
    searchInputRef.value?.focus();
  });
});
</script>

<style scoped>
.token-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000001;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.token-selector-content {
  background: #2a2a2a;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  border: 1px solid #404040;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: scale(0.95) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.selector-header {
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
  background: #252525;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  color: #fafafa;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #404040;
  color: #fff;
}

.selector-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.search-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 13px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #0d7dd8;
  box-shadow: 0 0 0 2px rgba(13, 125, 216, 0.2);
}

.search-hint {
  color: #888;
  font-size: 11px;
  padding-left: 4px;
}

.token-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 200px;
}

.token-list::-webkit-scrollbar {
  width: 8px;
}

.token-list::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 4px;
}

.token-list::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}

.token-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
  text-align: center;
  flex: 1;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 12px;
  color: #555;
}

.selector-footer {
  padding: 12px 20px;
  border-top: 1px solid #404040;
  background: #252525;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-tips {
  font-size: 12px;
  color: #888;
}

.footer-stats {
  font-size: 12px;
  color: #666;
}

@media (max-width: 768px) {
  .token-selector-content {
    width: 95%;
    max-height: 85vh;
  }

  .selector-header {
    padding: 12px 16px;
  }

  h3 {
    font-size: 14px;
  }

  .selector-body {
    padding: 12px;
  }

  .search-input {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>