<!--src/components/layout/TokenEditorSection.vue-->
<template>
  <div class="token-editor-embedded">
    <div class="editor-body-embedded">
      <!-- ⭐ 分类编辑器 -->
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
          v-else-if="tokenType === 'single'"
          :form-data="editor.formData.value"
          :is-system-token="editor.isSystemToken.value"
          :categories="categories"
          :temp-categories="editor.tempCategories.value"
          :temp-subcategories="editor.tempSubcategories.value"
          :language="language"
          :get-category-name="editor.getCategoryName"
          :get-subcategory-name="editor.getSubcategoryName"
          :get-subcategories="editor.getSubcategories"
          @update:form-data="editor.formData.value = $event"
          @confirm-category="editor.confirmNewCategory"
          @cancel-new="editor.cancelNewCategory"
      />

      <!-- 未映射词元编辑 -->
      <TokenEditorUnmapped
          v-else-if="tokenType === 'unmapped'"
          :form-data="editor.formData.value"
          :original-value="editor.originalValue.value"
          :categories="categories"
          :temp-categories="editor.tempCategories.value"
          :temp-subcategories="editor.tempSubcategories.value"
          :language="language"
          :get-category-name="editor.getCategoryName"
          :get-subcategory-name="editor.getSubcategoryName"
          :get-subcategories="editor.getSubcategories"
          @update:form-data="editor.formData.value = $event"
          @confirm-category="editor.confirmNewCategory"
          @cancel-new="editor.cancelNewCategory"
      />

      <!-- 词元池编辑 -->
      <TokenEditorPool
          v-else-if="tokenType === 'pool'"
          :form-data="editor.formData.value"
          :pool-tokens="editor.poolTokens.value"
          :editing-pool-token-index="editor.editingPoolTokenIndex.value"
          :editing-pool-token-data="editor.editingPoolTokenData.value"
          :get-token-language-value="editor.getTokenLanguageValue"
          @update:form-data="editor.formData.value = $event"
          @update:pool-tokens="editor.poolTokens.value = $event"
          @update:edit-data="editor.editingPoolTokenData.value = $event"
          @start-edit="editor.startEditPoolToken"
          @save-edit="editor.saveEditPoolToken"
          @cancel-edit="editor.cancelEditPoolToken"
          @view-token="editor.viewReferencedToken"
          @remove-token="editor.removePoolToken"
      />
    </div>

    <!-- 底部操作栏 -->
    <div v-if="!categoryType" class="editor-footer-embedded">
      <button @click="$emit('close')" class="btn-secondary">取消</button>
      <button
          class="primary"
          @click="editor.handleSave"
          :disabled="!editor.canSave.value"
      >
        {{ editor.getSaveButtonText() }}
      </button>
    </div>
  </div>
</template>

<script setup>
import TokenEditorSingle from '../shared/TokenEditorSingle.vue';
import TokenEditorUnmapped from '../shared/TokenEditorUnmapped.vue';
import TokenEditorPool from '../shared/TokenEditorPool.vue';
import CategoryEditor from '../shared/CategoryEditor.vue';
import { useTokenEditor } from '../../composables/useTokenEditor.js';

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

const emit = defineEmits([
  'close',
  'save',
  'view-token',
  'edit-token',
  'new-category',
  'save-category',
]);

// ========== 统一的 Composable ==========
const editor = useTokenEditor(props, emit);
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
  padding: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-footer-embedded {
  padding: 6px 6px;
  border-top: 1px solid #404040;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
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