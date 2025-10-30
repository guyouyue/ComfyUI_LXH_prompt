<!--src/components/shared/GroupDialog.vue-->
<template>
  <div class="dialog-overlay" @click.self="handleClose">
    <div class="dialog-content">
      <!-- 头部 -->
      <div class="dialog-header">
        <h3>{{ isEdit ? '编辑组合' : '添加组合' }}</h3>
        <button class="close-btn" @click="handleClose" title="关闭 (ESC)">
          &times;
        </button>
      </div>

      <!-- 主体 -->
      <div class="dialog-body">
        <div class="form-group">
          <label>
            唯一标识符
            <span class="required">*</span>
          </label>
          <input
              ref="idInputRef"
              type="text"
              v-model="state.formData.value.id"
              :disabled="isEdit"
              placeholder="例如: hair_color_01"
              class="form-input"
              :class="{ error: validation.idError.value && !isEdit }"
              @keydown.enter="handleConfirm"
              @keydown.esc="handleClose"
          />
          <span class="form-hint" :class="{ error: validation.idError.value && !isEdit }">
            {{ validation.idError.value || '用于在提示词中引用此组合（仅支持字母、数字、下划线和连字符）' }}
          </span>
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea
              v-model="state.formData.value.description"
              placeholder="说明这个组合的用途..."
              class="form-textarea"
              rows="3"
              @keydown.esc="handleClose"
          ></textarea>
          <span class="form-hint">选填：帮助您记住这个组合的作用</span>
        </div>
      </div>

      <!-- 底部 -->
      <div class="dialog-footer">
        <button @click="handleClose">取消 (ESC)</button>
        <button
            class="primary"
            @click="handleConfirm"
            :disabled="!validation.isValid.value"
            :title="validation.isValid.value ? '' : '请填写必填字段'"
        >
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {nextTick, onMounted, ref} from 'vue';
import {useGroupDialogState} from '../../composables/useGroupDialogState.js';
import {useGroupDialogValidation} from '../../composables/useGroupDialogValidation.js';

const props = defineProps({
  group: {
    type: Object,
    default: null,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'confirm']);

// ========== Refs ==========
const idInputRef = ref(null);

// ========== Composables ==========
const state = useGroupDialogState(props);
const validation = useGroupDialogValidation(state.formData);

// ========== 事件处理 ==========
/**
 * 关闭对话框
 */
const handleClose = () => {
  state.resetForm();
  emit('close');
};

/**
 * 确认
 */
const handleConfirm = () => {
  const result = validation.validate();

  if (!result.valid) {
    alert(result.message);
    return;
  }

  emit('confirm', {...state.formData.value});
  handleClose();
};

// ========== 生命周期 ==========
onMounted(() => {
  // 自动聚焦 ID 输入框（编辑模式下跳过）
  if (!props.isEdit) {
    nextTick(() => {
      idInputRef.value?.focus();
    });
  }
});
</script>

<style scoped>
.dialog-overlay {
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
  z-index: 1000000;
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

.dialog-content {
  background: #2a2a2a;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  border: 1px solid #404040;
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

.dialog-header {
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

.dialog-body {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.dialog-body::-webkit-scrollbar {
  width: 8px;
}

.dialog-body::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

label {
  display: block;
  color: #ddd;
  font-size: 13px;
  margin-bottom: 8px;
  font-weight: 600;
}

.required {
  color: #f44336;
  margin-left: 4px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #0d7dd8;
  box-shadow: 0 0 0 2px rgba(13, 125, 216, 0.2);
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #252525;
}

.form-input.error {
  border-color: #f44336;
}

.form-input.error:focus {
  box-shadow: 0 0 0 2px rgba(244, 67, 54, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  display: block;
  color: #888;
  font-size: 11px;
  margin-top: 6px;
  line-height: 1.4;
}

.form-hint.error {
  color: #f44336;
}

.dialog-footer {
  padding: 12px 20px;
  border-top: 1px solid #404040;
  background: #252525;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #404040;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover {
  background: #4a4a4a;
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

button.primary {
  background: #0d7dd8;
}

button.primary:hover:not(:disabled) {
  background: #0c6dba;
}

@media (max-width: 768px) {
  .dialog-content {
    width: 95%;
  }

  .dialog-header {
    padding: 12px 16px;
  }

  h3 {
    font-size: 14px;
  }

  .dialog-body {
    padding: 16px;
  }
}
</style>