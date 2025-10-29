<template>
  <div class="category-selector">
    <div class="form-row">
      <div class="form-group">
        <label>一级分类 {{ required ? '*' : '' }}</label>
        <div class="category-input-container">
          <select
            v-model="localCategoryId"
            class="form-select"
            :required="required"
          >
            <option value="">请选择分类</option>
            <option
              v-for="category in mergedCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ getCategoryName(category) }}
              {{ category.isTemp ? ' (新建)' : '' }}
            </option>
            <option v-if="allowNew" value="__new__">➕ 新建分类</option>
          </select>
          <input
            v-if="localCategoryId === '__new__'"
            type="text"
            v-model="newCategoryName"
            placeholder="输入新分类名称"
            class="form-input new-category-input"
            @keydown.enter="$emit('confirm-category', 'category')"
          />
        </div>
      </div>

      <div class="form-group">
        <label>二级分类 {{ required ? '*' : '' }}</label>
        <div class="category-input-container">
          <select
            v-model="localSubcategoryId"
            :disabled="!localCategoryId || localCategoryId === '__new__'"
            class="form-select"
            :required="required"
          >
            <option value="">请选择子分类</option>
            <option
              v-for="subcategory in currentSubcategories"
              :key="subcategory.id"
              :value="subcategory.id"
            >
              {{ getSubcategoryName(subcategory) }}
              {{ subcategory.isTemp ? ' (新建)' : '' }}
            </option>
            <option v-if="allowNew" value="__new__">➕ 新建子分类</option>
          </select>
          <input
            v-if="localSubcategoryId === '__new__'"
            type="text"
            v-model="newSubcategoryName"
            placeholder="输入新子分类名称"
            class="form-input new-category-input"
            @keydown.enter="$emit('confirm-category', 'subcategory')"
          />
        </div>
      </div>
    </div>

    <!-- 新建分类按钮 -->
    <div
      v-if="showNewCategoryButtons"
      class="new-category-actions"
    >
      <button
        class="btn-confirm-new"
        @click="handleConfirmNew"
        :disabled="!canConfirmNew"
      >
        ✅ 确认新建{{ localCategoryId === '__new__' ? '一级分类' : '二级分类' }}
      </button>
      <button class="btn-cancel-new" @click="$emit('cancel-new')">
        ❌ 取消新建
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  categoryId: String,
  subcategoryId: String,
  categories: Array,
  tempCategories: Array,
  tempSubcategories: Array,
  language: String,
  required: Boolean,
  allowNew: {
    type: Boolean,
    default: true,
  },
  newCategoryName: String,
  newSubcategoryName: String,
  getSubcategories: Function,
  getCategoryName: Function,
  getSubcategoryName: Function,
});

const emit = defineEmits([
  'update:category-id',
  'update:subcategory-id',
  'update:new-category-name',
  'update:new-subcategory-name',
  'confirm-category',
  'cancel-new',
]);

const localCategoryId = computed({
  get: () => props.categoryId,
  set: (val) => emit('update:category-id', val),
});

const localSubcategoryId = computed({
  get: () => props.subcategoryId,
  set: (val) => emit('update:subcategory-id', val),
});

const newCategoryName = computed({
  get: () => props.newCategoryName,
  set: (val) => emit('update:new-category-name', val),
});

const newSubcategoryName = computed({
  get: () => props.newSubcategoryName,
  set: (val) => emit('update:new-subcategory-name', val),
});

const mergedCategories = computed(() => {
  return [...(props.categories || []), ...(props.tempCategories || [])];
});

const currentSubcategories = computed(() => {
  if (!localCategoryId.value) return [];
  return props.getSubcategories(localCategoryId.value);
});

const showNewCategoryButtons = computed(() => {
  return localCategoryId.value === '__new__' || localSubcategoryId.value === '__new__';
});

const canConfirmNew = computed(() => {
  if (localCategoryId.value === '__new__' && !newCategoryName.value?.trim()) {
    return false;
  }
  if (localSubcategoryId.value === '__new__' && !newSubcategoryName.value?.trim()) {
    return false;
  }
  return true;
});

const handleConfirmNew = () => {
  const type = localCategoryId.value === '__new__' ? 'category' : 'subcategory';
  emit('confirm-category', type);
};
</script>

<style scoped>
/* 复用 TokenEditor 的样式 */
.category-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.category-input-container {
  position: relative;
}

.form-select,
.form-input {
  padding: 6px 10px;
  background: #252525;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  font-family: inherit;
  transition: border-color 0.2s;
  width: 100%;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #0d7dd8;
}

.form-select:disabled {
  background: #1a1a1a;
  color: #666;
  cursor: not-allowed;
}

.new-category-input {
  margin-top: 8px;
  animation: slideDown 0.2s ease-out;
}

.new-category-actions {
  margin-top: 12px;
  padding: 12px;
  background: rgba(13, 125, 216, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(13, 125, 216, 0.3);
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-confirm-new,
.btn-cancel-new {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-confirm-new {
  background: #4caf50;
  color: white;
}

.btn-confirm-new:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
}

.btn-confirm-new:disabled {
  background: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-cancel-new {
  background: #f44336;
  color: white;
}

.btn-cancel-new:hover {
  background: #da190b;
  transform: translateY(-1px);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .new-category-actions {
    flex-direction: column;
  }

  .btn-confirm-new,
  .btn-cancel-new {
    width: 100%;
  }
}
</style>