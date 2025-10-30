<!--src/components/shared/TokenEditorPool.vue-->
<template>
  <div class="pool-form">
    <!-- 词元池头部 -->
    <div class="pool-header">
      <h4>🎲 词元池信息</h4>
      <div class="pool-meta">
        <span class="meta-item">Key: {{ formData.poolKey }}</span>
        <span class="meta-item">词元数量: {{ poolTokens.length }}</span>
      </div>
    </div>

    <!-- 池信息 -->
    <div class="form-section">
      <h4>📝 池信息</h4>
      <div class="form-row">
        <div class="form-group">
          <label>池名称 (中文)</label>
          <input
              type="text"
              :value="formData.name.zh"
              @input="updateName('zh', $event.target.value)"
              placeholder="中文名称"
              class="form-input"
          />
        </div>
        <div class="form-group">
          <label>池名称 (英文)</label>
          <input
              type="text"
              :value="formData.name.en"
              @input="updateName('en', $event.target.value)"
              placeholder="英文名称"
              class="form-input"
          />
        </div>
      </div>

      <div class="form-group">
        <label>描述信息</label>
        <textarea
            :value="formData.description"
            @input="$emit('update:form-data', { ...formData, description: $event.target.value })"
            placeholder="词元池描述..."
            class="form-textarea"
            rows="2"
        ></textarea>
      </div>
    </div>

    <!-- 词元列表 -->
    <div class="form-section">
      <h4>📋 词元列表</h4>
      <div class="token-list">
        <PoolTokenItem
            v-for="(token, index) in poolTokens"
            :key="token.id || index"
            :token="token"
            :index="index"
            :is-editing="editingPoolTokenIndex === index"
            :edit-data="editingPoolTokenData"
            :get-language-value="getTokenLanguageValue"
            @update-weight="handleUpdateWeight"
            @edit="$emit('start-edit', index)"
            @view="$emit('view-token', $event)"
            @remove="$emit('remove-token', index)"
            @update:edit-data="$emit('update:edit-data', $event)"
            @save-edit="$emit('save-edit')"
            @cancel-edit="$emit('cancel-edit')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import PoolTokenItem from './PoolTokenItem.vue';

const props = defineProps({
  formData: Object,
  poolTokens: Array,
  editingPoolTokenIndex: Number,
  editingPoolTokenData: Object,
  getTokenLanguageValue: Function,
});

const emit = defineEmits([
  'update:form-data',
  'update:pool-tokens',
  'update:edit-data',
  'start-edit',
  'save-edit',
  'cancel-edit',
  'view-token',
  'remove-token',
]);

const updateName = (lang, value) => {
  const newName = {...props.formData.name, [lang]: value};
  emit('update:form-data', {...props.formData, name: newName});
};

const handleUpdateWeight = (index, weight) => {
  const newTokens = [...props.poolTokens];
  newTokens[index] = {...newTokens[index], weight};
  emit('update:pool-tokens', newTokens);
};
</script>

<style scoped>
.pool-form {
  display: flex;
  flex-direction: column;
}

.pool-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #1e1e1e;
  border-radius: 6px;
  border: 1px solid #333;
}

.pool-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #888;
}

.meta-item {
  padding: 4px 8px;
  background: #252525;
  border-radius: 4px;
}

.form-section {
  margin-bottom: 16px;
  padding: 6px;
  background: #1e1e1e;
  border-radius: 6px;
  border: 1px solid #333;
  flex-shrink: 0;
}

.form-section h4 {
  margin: 0 0 10px 0;
  color: #0d7dd8;
  font-size: 13px;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  color: #ddd;
  font-size: 13px;
  font-weight: 500;
}

.form-input,
.form-textarea {
  padding: 6px 10px;
  background: #252525;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #0d7dd8;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
  padding-bottom: 8px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .pool-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .pool-meta {
    flex-direction: column;
    gap: 6px;
  }
}
</style>