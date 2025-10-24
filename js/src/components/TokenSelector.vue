<template>
  <div class="token-selector-overlay" @click.self="$emit('close')">
    <div class="token-selector-content">
      <div class="selector-header">
        <h3>选择词元</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="selector-body">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索词元..."
          class="search-input"
        />

        <div class="token-list">
          <div
            v-for="token in filteredTokens"
            :key="token.id"
            class="token-item"
            @click="selectToken(token)"
          >
            <div class="token-text">
              <span class="token-main">{{ language === 'zh' ? token.zh : token.en }}</span>
              <span class="token-sub">{{ language === 'zh' ? token.en : token.zh }}</span>
            </div>
            <span class="token-category">{{ token.categoryName }} / {{ token.subcategoryName }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  allTokens: Array,
  language: String
});

const emit = defineEmits(['close', 'select']);

const searchQuery = ref('');

const filteredTokens = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.allTokens;
  }

  const query = searchQuery.value.toLowerCase();
  return props.allTokens.filter(token =>
    token.zh.toLowerCase().includes(query) ||
    token.en.toLowerCase().includes(query)
  );
});

const selectToken = (token) => {
  emit('select', token);
  emit('close');
};
</script>

<style scoped>
.token-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000001;
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
}

.selector-header {
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  color: #fafafa;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
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

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: #0d7dd8;
}

.token-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.token-item {
  padding: 10px 12px;
  background: #1e1e1e;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-item:hover {
  background: #2a2a2a;
  transform: translateX(4px);
  border-left: 2px solid #0d7dd8;
}

.token-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-main {
  color: #e0e0e0;
  font-size: 13px;
}

.token-sub {
  color: #888;
  font-size: 11px;
}

.token-category {
  color: #666;
  font-size: 11px;
}

.token-list::-webkit-scrollbar {
  width: 6px;
}

.token-list::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.token-list::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 3px;
}
</style>