<template>
  <div class="token-form">
    <!-- 基本信息 -->
    <div class="form-section">
      <h4>📋 基本信息</h4>
      <div class="form-row">
        <div class="form-group">
          <label>词元ID *</label>
          <input
            type="text"
            :value="formData.id"
            @input="$emit('update:form-data', { ...formData, id: $event.target.value })"
            :disabled="isSystemToken"
            placeholder="唯一标识符"
            class="form-input"
          />
          <span class="form-hint" v-if="isSystemToken">系统词元ID不可修改</span>
        </div>

        <div class="form-group">
          <label>来源</label>
          <div class="source-badge" :class="tokenSource">
            {{ tokenSource === 'system' ? '⚙️ 系统词库' : '👤 用户词库' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 多语言内容 -->
    <div class="form-section">
      <h4>🌐 多语言内容</h4>
      <div class="form-row">
        <div class="form-group">
          <label>中文 (zh)</label>
          <input
            type="text"
            :value="formData.zh"
            @input="$emit('update:form-data', { ...formData, zh: $event.target.value })"
            placeholder="中文词元内容"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>英文 (en)</label>
          <input
            type="text"
            :value="formData.en"
            @input="$emit('update:form-data', { ...formData, en: $event.target.value })"
            placeholder="英文词元内容"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>日文 (jp)</label>
          <input
            type="text"
            :value="formData.jp"
            @input="$emit('update:form-data', { ...formData, jp: $event.target.value })"
            placeholder="日文词元内容"
            class="form-input"
          />
        </div>
      </div>
    </div>

    <!-- 分类信息 -->
    <div class="form-section">
      <h4>📁 分类信息</h4>
      <CategorySelector
        :category-id="formData.categoryId"
        :subcategory-id="formData.subcategoryId"
        :categories="categories"
        :temp-categories="tempCategories"
        :temp-subcategories="tempSubcategories"
        :language="language"
        :new-category-name="formData.newCategoryName"
        :new-subcategory-name="formData.newSubcategoryName"
        :get-subcategories="getSubcategories"
        :get-category-name="getCategoryName"
        :get-subcategory-name="getSubcategoryName"
        @update:category-id="$emit('update:form-data', { ...formData, categoryId: $event })"
        @update:subcategory-id="$emit('update:form-data', { ...formData, subcategoryId: $event })"
        @update:new-category-name="$emit('update:form-data', { ...formData, newCategoryName: $event })"
        @update:new-subcategory-name="$emit('update:form-data', { ...formData, newSubcategoryName: $event })"
        @confirm-category="$emit('confirm-category', $event)"
        @cancel-new="$emit('cancel-new')"
      />
    </div>

    <!-- 描述信息 -->
    <div class="form-section" v-if="formData.description !== undefined">
      <h4>📝 描述信息</h4>
      <textarea
        :value="formData.description"
        @input="$emit('update:form-data', { ...formData, description: $event.target.value })"
        placeholder="词元描述..."
        class="form-textarea"
        rows="3"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CategorySelector from './CategorySelector.vue';

const props = defineProps({
  formData: Object,
  isSystemToken: Boolean,
  categories: Array,
  tempCategories: Array,
  tempSubcategories: Array,
  language: String,
  getCategoryName: Function,
  getSubcategoryName: Function,
  getSubcategories: Function,
});

defineEmits([
  'update:form-data',
  'confirm-category',
  'cancel-new',
]);

const tokenSource = computed(() => {
  return props.isSystemToken ? 'system' : 'user';
});
</script>

<style scoped>
.token-form {
  display: flex;
  flex-direction: column;
}

.form-section {
  margin-bottom: 16px;
  padding: 12px;
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

.form-input:disabled {
  background: #1a1a1a;
  color: #666;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}

.form-hint {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

.source-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
}

.source-badge.system {
  background: #666;
  color: white;
}

.source-badge.user {
  background: #0d7dd8;
  color: white;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>