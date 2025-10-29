import { computed } from 'vue';

/**
 * GroupDialog 验证逻辑
 * @param {Ref} formDataRef - 表单数据引用
 */
export function useGroupDialogValidation(formDataRef) {
  /**
   * 是否有效
   */
  const isValid = computed(() => {
    return !!formDataRef.value.id?.trim();
  });

  /**
   * ID 验证错误信息
   */
  const idError = computed(() => {
    if (!formDataRef.value.id) {
      return '请输入唯一标识符';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(formDataRef.value.id)) {
      return '标识符只能包含字母、数字、下划线和连字符';
    }
    return '';
  });

  /**
   * 验证表单
   */
  const validate = () => {
    if (!isValid.value) {
      return {
        valid: false,
        message: idError.value || '请填写必填字段',
      };
    }

    return {
      valid: true,
      message: '',
    };
  };

  return {
    isValid,
    idError,
    validate,
  };
}