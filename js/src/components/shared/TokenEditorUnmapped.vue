<template>
  <div class="unmapped-form">
    <!-- 警告横幅 -->
    <div class="warning-banner">
      ⚠️ 当前词元未映射到词库，您可以将其保存到用户词库
    </div>

    <!-- 词元内容 -->
    <div class="form-section">
      <h4>🔍 词元内容</h4>
      <div class="token-preview">
        <span class="preview-label">原始值:</span>
        <span class="preview-value">{{ originalValue }}</span>
      </div>
    </div>

    <!-- 多语言映射 -->
    <div class="form-section">
      <h4>🌐 多语言映射</h4>
      <div class="form-row">
        <div class="form-group">
          <label>中文映射 (zh)</label>
          <input
            type="text"
            :value="formData.zh"
            @input="$emit('update:form-data', { ...formData, zh: $event.target.value })"
            :placeholder="`建议值: ${originalValue}`"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>英文映射 (en)</label>
          <input
            type="text"
            :value="formData.en"
            @input="$emit('update:form-data', { ...formData, en: $event.target.value })"
            placeholder="英文映射"
            class="form-input"
          />
        </div>
      </div>
    </div>

    <!-- 保存到分类 -->
    <div class="form-section">
      <h4>📁 保存到分类</h4>
      <CategorySelector
        :category-id="formData.categoryId"
        :subcategory-id="formData.subcategoryId"
        :categories="categories"
        :temp-categories="tempCategories"
        :temp-subcategories="tempSubcategories"
        :language="language"
        :required="true"
        :allow-new="false"
        :get-subcategories="getSubcategories"
        :get-category-name="getCategoryName"
        :get-subcategory-name="getSubcategoryName"
        @update:category-id="$emit('update:form-data', { ...formData, categoryId: $event })"
        @update:subcategory-id="$emit('update:form-data', { ...formData, subcategoryId: $event })"
      />
    </div>

    <!-- 描述信息 -->
    <div class="form-section">
      <h4>📝 描述信息（可选）</h4>
      <textarea
        :value="formData.description"
        @input="$emit('update:form-data', { ...formData, description: $event.target.value })"
        placeholder="添加词元描述..."
        class="form-textarea"
        rows="2"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import CategorySelector from './CategorySelector.vue';

defineProps({
  formData: Object,
  originalValue: String,
  categories: Array,
  tempCategories: Array,
  tempSubcategories: Array,
  language: String,
  getCategoryName: Function,
  getSubcategoryName: Function,
  getSubcategories: Function,
});

defineEmits(['update:form-data']);
</script>

<style scoped>
.unmapped-form {
  display: flex;
  flex-direction: column;
}

.warning-banner {
  background: #ff9800;
  color: #000;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-weight: 600;
  text-align: center;
  font-size: 13px;
}

.form-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #1e1e1e;
  border-radius: 6px;
  border: 1px solid #333;
}

.form-section h4 {
  margin: 0 0 10px 0;
  color: #0d7dd8;
  font-size: 13px;
  font-weight: 600;
}

.token-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #252525;
  border-radius: 4px;
}

.preview-label {
  color: #888;
  font-size: 12px;
}

.preview-value {
  color: #4caf50;
  font-weight: 600;
  font-family: monospace;
  font-size: 13px;
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

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>