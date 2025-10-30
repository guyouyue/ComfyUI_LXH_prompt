// src/composables/useTokenEditorValidation.js
import {computed} from 'vue';

/**
 * TokenEditor 验证逻辑
 * @param {Ref} formDataRef - 表单数据引用
 * @param {String} tokenType - 词元类型
 */
export function useTokenEditorValidation(formDataRef, tokenType) {
  /**
   * 是否可以保存
   */
  const canSave = computed(() => {
    if (tokenType === 'single' || tokenType === 'unmapped') {
      const hasId = !!formDataRef.value.id;
      const hasContent =
        formDataRef.value.zh || formDataRef.value.en || formDataRef.value.jp;
      return hasId && hasContent;
    }
    return true; // pool 类型总是可以保存
  });

  /**
   * 是否可以确认新建分类
   */
  const canConfirmNewCategory = computed(() => {
    if (
      formDataRef.value.categoryId === '__new__' &&
      !formDataRef.value.newCategoryName?.trim()
    ) {
      return false;
    }
    if (
      formDataRef.value.subcategoryId === '__new__' &&
      !formDataRef.value.newSubcategoryName?.trim()
    ) {
      return false;
    }
    return true;
  });

  return {
    canSave,
    canConfirmNewCategory,
  };
}