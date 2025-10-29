<template>
  <div
    class="pool-token-item"
    :class="{
      'mapped-token': token.isReference,
      'editing-token': isEditing,
    }"
  >
    <!-- 查看模式 -->
    <div v-if="!isEditing" class="token-content">
      <span class="token-index">#{{ index + 1 }}</span>

      <div class="token-info-detailed">
        <!-- 词元类型标签 -->
        <div class="token-header">
          <span v-if="token.isReference" class="type-badge reference">
            🔗 引用词元
          </span>
          <span v-else class="type-badge custom">自定义词元</span>

          <div class="token-actions">
            <div class="weight-control" v-if="token.weight !== undefined">
              <label>权重:</label>
              <input
                type="number"
                :value="token.weight"
                @input="$emit('update-weight', index, parseFloat($event.target.value))"
                min="0"
                max="10"
                step="0.1"
                class="weight-input"
              />
            </div>

            <button
              v-if="!token.isReference"
              class="edit-btn"
              @click="$emit('edit', index)"
              title="编辑此词元"
            >
              编辑
            </button>

            <button
              v-else
              class="view-btn"
              @click="$emit('view', token)"
              title="查看引用的词元"
            >
              👁️ 查看
            </button>

            <button
              class="delete-btn"
              @click="$emit('remove', index)"
              title="从池中移除"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- 多语言内容展示 -->
        <div class="token-languages">
          <div class="lang-item" v-if="getLanguageValue('zh')">
            <span class="lang-label">中文:</span>
            <span class="lang-value zh">{{ getLanguageValue('zh') }}</span>
          </div>
          <div class="lang-item" v-if="getLanguageValue('en')">
            <span class="lang-label">英文:</span>
            <span class="lang-value en">{{ getLanguageValue('en') }}</span>
          </div>
          <div class="lang-item" v-if="getLanguageValue('jp')">
            <span class="lang-label">日文:</span>
            <span class="lang-value jp">{{ getLanguageValue('jp') }}</span>
          </div>
        </div>

        <!-- 引用信息 -->
        <div v-if="token.isReference" class="reference-info">
          <span class="ref-label">引用来源:</span>
          <span class="ref-path" v-if="token.referenceInfo">
            {{ token.referenceInfo.categoryName }} / {{ token.referenceInfo.subcategoryName }}
          </span>
          <span class="ref-error" v-else>⚠️ 引用词元未找到</span>

          <div v-if="token.referenceData" class="reference-details">
            <div class="ref-item">
              <span class="ref-label">ID:</span>
              <span class="ref-value">{{ token.referenceData.id }}</span>
            </div>
            <div class="ref-item" v-if="token.referenceData.zh">
              <span class="ref-label">中文:</span>
              <span class="ref-value zh">{{ token.referenceData.zh }}</span>
            </div>
            <div class="ref-item" v-if="token.referenceData.en">
              <span class="ref-label">英文:</span>
              <span class="ref-value en">{{ token.referenceData.en }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑模式 -->
    <div v-else class="token-edit-form">
      <div class="edit-header">
        <span class="token-index">#{{ index + 1 }}</span>
        <span class="edit-title">编辑自定义词元</span>
      </div>

      <div class="edit-body">
        <div class="edit-row">
          <div class="edit-group">
            <label>中文 (zh) *</label>
            <input
              type="text"
              :value="editData.zh"
              @input="$emit('update:edit-data', { ...editData, zh: $event.target.value })"
              placeholder="中文内容"
              class="form-input"
            />
          </div>
          <div class="edit-group">
            <label>英文 (en) *</label>
            <input
              type="text"
              :value="editData.en"
              @input="$emit('update:edit-data', { ...editData, en: $event.target.value })"
              placeholder="英文内容"
              class="form-input"
            />
          </div>
        </div>

        <div class="edit-row">
          <div class="edit-group">
            <label>日文 (jp)</label>
            <input
              type="text"
              :value="editData.jp"
              @input="$emit('update:edit-data', { ...editData, jp: $event.target.value })"
              placeholder="日文内容"
              class="form-input"
            />
          </div>
          <div class="edit-group">
            <label>权重</label>
            <input
              type="number"
              :value="editData.weight"
              @input="$emit('update:edit-data', { ...editData, weight: parseFloat($event.target.value) })"
              min="0"
              max="10"
              step="0.1"
              class="form-input"
            />
          </div>
        </div>

        <div class="edit-actions">
          <button class="btn-save" @click="$emit('save-edit')">✅ 保存</button>
          <button class="btn-cancel" @click="$emit('cancel-edit')">❌ 取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  token: Object,
  index: Number,
  isEditing: Boolean,
  editData: {
    type: Object,
    default: () => ({}),
  },
  getLanguageValue: Function,
});

defineEmits([
  'update-weight',
  'edit',
  'view',
  'remove',
  'update:edit-data',
  'save-edit',
  'cancel-edit',
]);
</script>

<style scoped>
/* 这里包含 TokenEditor 中词元池项目的所有样式 */
.pool-token-item {
  flex-shrink: 0;
  padding: 12px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 6px;
  transition: all 0.2s;
}

.pool-token-item:hover {
  border-color: #555;
  background: #2a2a2a;
}

.pool-token-item.mapped-token {
  border-left: 3px solid #667eea;
}

.pool-token-item.editing-token {
  border-left: 3px solid #4caf50;
  background: #2a2a2a;
}

.token-content {
  display: flex;
  gap: 12px;
}

.token-index {
  color: #888;
  font-size: 12px;
  min-width: 30px;
  font-weight: 600;
}

.token-info-detailed {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
}

.type-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.type-badge.reference {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.type-badge.custom {
  background: #4caf50;
  color: white;
}

.token-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.token-languages {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lang-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.lang-label {
  color: #888;
  min-width: 50px;
  font-size: 11px;
}

.lang-value {
  color: #e0e0e0;
  flex: 1;
  font-weight: 500;
}

.lang-value.zh {
  color: #4caf50;
}

.lang-value.en {
  color: #2196f3;
}

.lang-value.jp {
  color: #ff9800;
}

.reference-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 4px;
  font-size: 11px;
  margin-top: 4px;
}

.reference-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid rgba(102, 126, 234, 0.2);
}

.ref-item {
  display: flex;
  gap: 8px;
}

.ref-label {
  color: #888;
  min-width: 40px;
}

.ref-path,
.ref-value {
  color: #667eea;
  font-weight: 500;
}

.ref-value.zh {
  color: #4caf50;
}

.ref-value.en {
  color: #2196f3;
}

.ref-error {
  color: #f44336;
  font-weight: 500;
}

.view-btn,
.edit-btn,
.delete-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-btn {
  background: #667eea;
}

.view-btn:hover {
  background: #5568d3;
  transform: translateY(-1px);
}

.edit-btn {
  background: #4caf50;
}

.edit-btn:hover {
  background: #45a049;
  transform: translateY(-1px);
}

.delete-btn {
  background: #f44336;
}

.delete-btn:hover {
  background: #da190b;
  transform: translateY(-1px);
}

.weight-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weight-control label {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}

.weight-input {
  width: 60px;
  padding: 3px 6px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 3px;
  color: #e0e0e0;
  text-align: center;
  font-size: 12px;
  transition: border-color 0.2s;
}

.weight-input:focus {
  outline: none;
  border-color: #0d7dd8;
}

/* 编辑表单 */
.token-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
  background: rgba(76, 175, 80, 0.05);
  border-radius: 6px;
}

.edit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #4caf50;
}

.edit-title {
  color: #4caf50;
  font-weight: 600;
  font-size: 13px;
}

.edit-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.edit-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-group label {
  font-size: 11px;
  color: #ddd;
  font-weight: 500;
}

.form-input {
  padding: 6px 10px;
  background: #252525;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #0d7dd8;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #333;
}

.btn-save,
.btn-cancel {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-save {
  background: #4caf50;
  color: white;
}

.btn-save:hover {
  background: #45a049;
  transform: translateY(-1px);
}

.btn-cancel {
  background: #666;
  color: white;
}

.btn-cancel:hover {
  background: #777;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .edit-row {
    grid-template-columns: 1fr;
  }

  .token-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .token-actions {
    flex-wrap: wrap;
  }
}
</style>