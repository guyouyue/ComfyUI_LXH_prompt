<template>
  <div class="custom-token-pool" :class="{ focused }" @click="$emit('click')">
    <div class="pool-header">
      <h4>🎲 自定义词元组合池</h4>
      <button class="add-btn" @click="showAddDialog" title="添加组合">+</button>
    </div>

    <div class="pool-content">
      <div v-if="groups.length === 0" class="empty-state">
        暂无自定义组合，点击 + 添加
      </div>

      <div
        v-for="group in groups"
        :key="group.id"
        class="group-item"
      >
        <div class="group-header">
          <div class="group-id" :title="group.id">{{ group.id }}</div>
          <div class="group-actions">
            <button
              class="icon-btn"
              @click="$emit('edit-group', group)"
              title="编辑"
            >✏️</button>
            <button
              class="icon-btn delete"
              @click="$emit('delete-group', group.id)"
              title="删除"
            >🗑️</button>
          </div>
        </div>

        <div class="group-desc" v-if="group.description">
          {{ group.description }}
        </div>

        <div class="group-tokens">
          <div
            v-for="token in group.tokens"
            :key="token.id"
            class="group-token"
            @dblclick="$emit('use-token', token)"
            :title="`双击使用 | 权重: ${token.weight}`"
          >
            <div class="token-info">
              <span class="token-text-main">{{ language === 'zh' ? token.zh : token.en }}</span>
              <span class="token-text-sub">{{ language === 'zh' ? token.en : token.zh }}</span>
            </div>
            <div class="token-weight-control">
              <input
                type="number"
                class="weight-input"
                :value="token.weight"
                @change="$emit('update-weight', group.id, token.id, Number($event.target.value))"
                min="0"
                step="0.1"
              />
              <button
                class="remove-token-btn"
                @click="$emit('remove-token', group.id, token.id)"
                title="移除"
              >×</button>
            </div>
          </div>

          <button
            class="add-token-to-group-btn"
            @click="$emit('add-token-to-group', group.id)"
            title="添加候选词元"
          >
            + 添加候选词元
          </button>
        </div>

        <div class="group-footer">
          <button
            class="use-group-btn"
            @click="$emit('use-group', group.id)"
            title="随机选择一个词元并添加到输出"
          >
            🎲 随机使用
          </button>
          <span class="total-weight">总权重: {{ getTotalWeight(group) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  groups: Array,
  focused: Boolean,
  language: String
});

const emit = defineEmits([
  'add-token',
  'click',
  'edit-group',
  'delete-group',
  'use-token',
  'use-group',
  'update-weight',
  'remove-token',
  'add-token-to-group'
]);

const getTotalWeight = (group) => {
  return group.tokens.reduce((sum, token) => sum + (token.weight || 1), 0).toFixed(1);
};

const showAddDialog = () => {
  emit('add-token');
};
</script>

<style scoped>
.custom-token-pool {
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: border-color 0.3s;
  cursor: pointer;
}

.custom-token-pool.focused {
  border-color: #0d7dd8 !important;
  box-shadow: 0 0 0 2px rgba(13, 125, 216, 0.2);
}

.pool-header {
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2a2a2a;
}

h4 {
  margin: 0;
  color: #fafafa;
  font-size: 14px;
  font-weight: 600;
}

.add-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
  background: #0d7dd8;
  border-radius: 4px;
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #0c6dba;
  transform: scale(1.1);
}

.pool-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 20px;
  font-size: 13px;
}

.group-item {
  background: #2a2a2a;
  border: 1px solid #404040;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  transition: border-color 0.2s;
}

.group-item:hover {
  border-color: #555;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.group-id {
  font-weight: 600;
  color: #0d7dd8;
  font-size: 13px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  background: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #444;
  transform: scale(1.1);
}

.icon-btn.delete:hover {
  background: #d32f2f;
}

.group-desc {
  color: #aaa;
  font-size: 12px;
  margin-bottom: 8px;
  font-style: italic;
}

.group-tokens {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.group-token {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 8px;
}

.group-token:hover {
  background: #252525;
  transform: translateX(2px);
}

.token-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.token-text-main {
  color: #e0e0e0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-text-sub {
  color: #888;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-weight-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weight-input {
  width: 50px;
  padding: 4px 6px;
  background: #2a2a2a;
  border: 1px solid #404040;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 11px;
  text-align: center;
}

.weight-input:focus {
  outline: none;
  border-color: #0d7dd8;
}

.remove-token-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  background: #555;
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-token-btn:hover {
  background: #d32f2f;
  transform: scale(1.1);
}

.add-token-to-group-btn {
  padding: 6px 10px;
  background: #333;
  border: 1px dashed #555;
  border-radius: 4px;
  color: #aaa;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.add-token-to-group-btn:hover {
  background: #3a3a3a;
  border-color: #0d7dd8;
  color: #0d7dd8;
}

.group-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #333;
}

.use-group-btn {
  padding: 6px 12px;
  background: #0d7dd8;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.use-group-btn:hover {
  background: #0c6dba;
  transform: translateY(-1px);
}

.total-weight {
  color: #888;
  font-size: 11px;
}

.pool-content::-webkit-scrollbar {
  width: 6px;
}

.pool-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.pool-content::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 3px;
}
</style>