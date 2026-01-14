// src/composables/useGroupDialog.js
import { computed, ref, watch } from 'vue';

/**
 * GroupDialog 统一管理
 * 包含：状态管理、验证逻辑
 *
 * @param {Object} props - 组件 props
 */
export function useGroupDialog(props) {
  // ═══════════════════════════════════════════════════════════════
  // 状态定义
  // ═══════════════════════════════════════════════════════════════

  const formData = ref({
    id: '',
    description: '',
    tokens: [],
  });

  // ═══════════════════════════════════════════════════════════════
  // 计算属性（验证相关）
  // ═══════════════════════════════════════════════════════════════

  /**
   * 是否有效
   */
  const isValid = computed(() => {
    return !!formData.value.id?.trim();
  });

  /**
   * ID 验证错误信息
   */
  const idError = computed(() => {
    if (!formData.value.id) {
      return '请输入唯一标识符';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.value.id)) {
      return '标识符只能包含字母、数字、下划线和连字符';
    }
    return '';
  });

  // ═══════════════════════════════════════════════════════════════
  // 方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 重置表单
   */
  const resetForm = () => {
    formData.value = {
      id: '',
      description: '',
      tokens: [],
    };
  };

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

  // ═══════════════════════════════════════════════════════════════
  // 监听器
  // ═══════════════════════════════════════════════════════════════

  /**
   * 监听 group prop 变化，更新表单数据
   */
  watch(
    () => props.group,
    (newGroup) => {
      if (newGroup) {
        formData.value = {
          id: newGroup.id || '',
          description: newGroup.description || '',
          tokens: newGroup.tokens || [],
        };
      } else {
        resetForm();
      }
    },
    { immediate: true }
  );

  // ═══════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════

  return {
    // ===== 状态 =====
    formData,

    // ===== 计算属性 =====
    isValid,
    idError,

    // ===== 方法 =====
    resetForm,
    validate,
  };
}