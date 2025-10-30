<!--src/components/layout/TokenEditorSection.vue-->
<template>
  <div class="token-editor-embedded">
    <div class="editor-body-embedded">
      <!-- ⭐ 新增：分类编辑器 -->
      <CategoryEditor
          v-if="categoryType"
          :category-data="categoryData"
          :category-type="categoryType"
          :language="language"
          @close="$emit('close')"
          @save="$emit('save-category', $event)"
      />
      <!-- 单个词元编辑 -->
      <TokenEditorSingle
          v-if="tokenType === 'single'"
          :form-data="state.formData.value"
          :is-system-token="state.isSystemToken.value"
          :categories="categories"
          :temp-categories="state.tempCategories.value"
          :temp-subcategories="state.tempSubcategories.value"
          :language="language"
          :get-category-name="category.getCategoryName"
          :get-subcategory-name="category.getSubcategoryName"
          :get-subcategories="category.getSubcategories"
          @update:form-data="state.formData.value = $event"
          @confirm-category="category.confirmNewCategory"
          @cancel-new="category.cancelNewCategory"
      />

      <!-- 未映射词元编辑 -->
      <TokenEditorUnmapped
          v-else-if="tokenType === 'unmapped'"
          :form-data="state.formData.value"
          :original-value="state.originalValue.value"
          :categories="categories"
          :temp-categories="state.tempCategories.value"
          :temp-subcategories="state.tempSubcategories.value"
          :language="language"
          :get-category-name="category.getCategoryName"
          :get-subcategory-name="category.getSubcategoryName"
          :get-subcategories="category.getSubcategories"
          @update:form-data="state.formData.value = $event"
          @confirm-category="category.confirmNewCategory"
          @cancel-new="category.cancelNewCategory"
      />

      <!-- 词元池编辑 -->
      <TokenEditorPool
          v-else-if="tokenType === 'pool'"
          :form-data="state.formData.value"
          :pool-tokens="state.poolTokens.value"
          :editing-pool-token-index="state.editingPoolTokenIndex.value"
          :editing-pool-token-data="state.editingPoolTokenData.value"
          :get-token-language-value="pool.getTokenLanguageValue"
          @update:form-data="state.formData.value = $event"
          @update:pool-tokens="state.poolTokens.value = $event"
          @update:edit-data="state.editingPoolTokenData.value = $event"
          @start-edit="pool.startEditPoolToken"
          @save-edit="pool.saveEditPoolToken"
          @cancel-edit="pool.cancelEditPoolToken"
          @view-token="pool.viewReferencedToken"
          @remove-token="pool.removePoolToken"
      />
    </div>

    <!-- 底部操作栏 -->
    <div v-if="!categoryType" class="editor-footer-embedded">
      <button @click="$emit('close')" class="btn-secondary">取消</button>
      <button class="primary" @click="formOps.handleSave" :disabled="!validation.canSave.value">
        {{ formOps.getSaveButtonText() }}
      </button>
    </div>
  </div>
</template>

<script setup>
import TokenEditorSingle from '../shared/TokenEditorSingle.vue';
import TokenEditorUnmapped from '../shared/TokenEditorUnmapped.vue';
import TokenEditorPool from '../shared/TokenEditorPool.vue';
import {useTokenEditorState} from '../../composables/useTokenEditorState.js';
import {useTokenEditorValidation} from '../../composables/useTokenEditorValidation.js';
import {useTokenEditorCategory} from '../../composables/useTokenEditorCategory.js';
import {useTokenEditorPool} from '../../composables/useTokenEditorPool.js';
import {useTokenEditorForm} from '../../composables/useTokenEditorForm.js';
import CategoryEditor from '../shared/CategoryEditor.vue';

const props = defineProps({
  token: Object,
  tokenType: String,
  categoryData: Object,
  categoryType: String,
  categories: Array,
  language: String,
  isEmbedded: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['close', 'save', 'view-token', 'edit-token', 'new-category', 'save-category',]);

// ========== Composables ==========
const state = useTokenEditorState();
const validation = useTokenEditorValidation(state.formData, props.tokenType);
const category = useTokenEditorCategory(props, state, emit);
const pool = useTokenEditorPool(props, state, emit);
const formOps = useTokenEditorForm(props, state, category, pool, emit);
</script>

<style scoped>
.token-editor-embedded {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.editor-body-embedded {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-footer-embedded {
  padding: 12px 16px;
  border-top: 1px solid #404040;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #252525;
  flex-shrink: 0;
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
  font-weight: 500;
}

button:hover {
  background: #4a4a4a;
  transform: translateY(-1px);
}

button.primary {
  background: #0d7dd8;
}

button.primary:hover:not(:disabled) {
  background: #0c6dba;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #404040;
}

.btn-secondary:hover {
  background: #4a4a4a;
}
</style>