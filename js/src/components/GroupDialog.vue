<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>{{ isEdit ? '编辑组合' : '添加组合' }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="dialog-body">
        <div class="form-group">
          <label>唯一标识符 *</label>
          <input
            type="text"
            v-model="formData.id"
            :disabled="isEdit"
            placeholder="例如: hair_color_01"
            class="form-input"
          />
          <span class="form-hint">用于在提示词中引用此组合</span>
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea
            v-model="formData.description"
            placeholder="说明这个组合的用途..."
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="$emit('close')">取消</button>
        <button class="primary" @click="handleConfirm" :disabled="!formData.id">
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  group: Object,
  isEdit: Boolean
});

const emit = defineEmits(['close', 'confirm']);

const formData = ref({
  id: '',
  description: '',
  tokens: []
});

// 监听 props 变化
watch(() => props.group, (newGroup) => {
  if (newGroup) {
    formData.value = {
      id: newGroup.id || '',
      description: newGroup.description || '',
      tokens: newGroup.tokens || []
    };
  }
}, { immediate: true });

const handleConfirm = () => {
  if (!formData.value.id.trim()) {
    alert('请输入唯一标识符');
    return;
  }

  emit('confirm', { ...formData.value });
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000000;
}

.dialog-content {
  background: #2a2a2a;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  border: 1px solid #404040;
}

.dialog-header {
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
  transition: all 0.2s;
}

.close-btn:hover {
  background: #404040;
  color: #fff;
}

.dialog-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  color: #ddd;
  font-size: 13px;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #0d7dd8;
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-hint {
  display: block;
  color: #888;
  font-size: 11px;
  margin-top: 4px;
}

.dialog-footer {
  padding: 12px 20px;
  border-top: 1px solid #404040;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #404040;
  color: #fff;
  font-size: 13px;
  transition: all 0.2s;
}

button:hover {
  background: #4a4a4a;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: #0d7dd8;
}

button.primary:hover:not(:disabled) {
  background: #0c6dba;
}
</style>