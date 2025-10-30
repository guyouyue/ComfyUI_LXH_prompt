// src/composables/useTokenEditorForm.js
import { watch } from 'vue';

/**
 * TokenEditor 表单操作
 * @param {Object} props - 组件 props
 * @param {Object} state - 状态对象
 * @param {Object} category - 分类操作对象
 * @param {Object} pool - 词元池操作对象
 * @param {Function} emit - emit 函数
 */
export function useTokenEditorForm(props, state, category, pool, emit) {
  /**
   * 初始化表单数据
   */
  const initializeFormData = () => {
    if (!props.token) return;

    state.isInitializing.value = true;
    state.tempCategories.value = [];
    state.tempSubcategories.value = [];
    state.originalValue.value = props.token.value || props.token.original || '';

    if (props.tokenType === 'single') {
      const tokenData = props.token.mapping || props.token;
      state.isSystemToken.value = tokenData.source === 'system';

      const categoryId = props.token.categoryId || tokenData.categoryId || '';
      const subcategoryId =
        props.token.subcategoryId || tokenData.subcategoryId || '';

      state.formData.value = {
        id: tokenData.id || tokenData.uniqueId || '',
        zh: tokenData.zh || '',
        en: tokenData.en || '',
        jp: tokenData.jp || '',
        categoryId: categoryId,
        subcategoryId: subcategoryId,
        description: tokenData.description || '',
        isSystem: state.isSystemToken.value,
        newCategoryName: '',
        newSubcategoryName: '',
        tempCategoryId: '',
        tempSubcategoryId: '',
      };
    } else if (props.tokenType === 'unmapped') {
      state.formData.value = {
        id: `user_${Date.now()}`,
        zh: state.originalValue.value,
        en: '',
        jp: '',
        categoryId: props.token.categoryId || '',
        subcategoryId: props.token.subcategoryId || '',
        description: `未映射词元: ${state.originalValue.value}`,
        newCategoryName: '',
        newSubcategoryName: '',
        tempCategoryId: '',
        tempSubcategoryId: '',
      };
    } else if (props.tokenType === 'pool') {
      const poolData = props.token.poolData || props.token;
      const poolId = poolData.id || props.token.poolId || props.token.id;
      const poolKey = poolData.id || props.token.poolKey;
      const groupId = props.token.groupId;
      const groupKey = props.token.groupKey;

      state.formData.value = {
        groupId: groupId,
        groupKey: groupKey,
        poolId: poolId,
        poolKey: poolKey,
        id: poolId,
        key: poolKey,
        name: poolData.name || { zh: '', en: '' },
        description: poolData.description || '',
      };

      const rawTokens = poolData.tokens || [];
      state.poolTokens.value = pool.processPoolTokens(rawTokens);
    }

    setTimeout(() => {
      state.isInitializing.value = false;
    }, 0);
  };

  /**
   * 保存按钮文本
   */
  const getSaveButtonText = () => {
    const texts = {
      single: state.isSystemToken.value ? '保存到用户词库' : '保存修改',
      unmapped: '保存到用户词库',
      pool: '保存修改',
    };
    return texts[props.tokenType] || '保存';
  };

  /**
   * 处理保存
   */
  const handleSave = () => {
    if (
      state.formData.value.categoryId === '__new__' ||
      state.formData.value.subcategoryId === '__new__'
    ) {
      if (
        !confirm('您有未确认的新建分类，是否继续保存？未确认的分类将不会被创建。')
      ) {
        return;
      }
      category.cancelNewCategory();
    }

    const saveData = {
      ...state.formData.value,
      tokenType: props.tokenType,
      isSystem: state.isSystemToken.value,
      poolTokens:
        props.tokenType === 'pool' ? state.poolTokens.value : undefined,
      tempCategories: state.tempCategories.value,
      tempSubcategories: state.tempSubcategories.value,
    };

    delete saveData.newCategoryName;
    delete saveData.newSubcategoryName;
    delete saveData.tempCategoryId;
    delete saveData.tempSubcategoryId;

    emit('save', saveData);
  };

  /**
   * 监听 token 变化，重新初始化
   */
  watch(() => props.token, initializeFormData, { immediate: true });

  /**
   * 监听分类数据变化，刷新词元数据
   */
  watch(
    () => props.categories,
    (newCategories) => {
      if (
        !state.isInitializing.value &&
        props.token &&
        props.tokenType === 'single'
      ) {
        const tokenId = state.formData.value.id;
        const categoryId = state.formData.value.categoryId;
        const subcategoryId = state.formData.value.subcategoryId;

        if (tokenId && categoryId && subcategoryId) {
          const category = newCategories.find((cat) => cat.id === categoryId);
          if (category) {
            const subcategory = category.subcategories.find(
              (sub) => sub.id === subcategoryId
            );
            if (subcategory) {
              const updatedToken = subcategory.tokens.find(
                (t) => t.id === tokenId
              );
              if (updatedToken) {
                state.formData.value = {
                  ...state.formData.value,
                  zh: updatedToken.zh || '',
                  en: updatedToken.en || '',
                  jp: updatedToken.jp || '',
                  description: updatedToken.description || '',
                };
                state.isSystemToken.value = updatedToken.source === 'system';
              }
            }
          }
        }
      }
    },
    { deep: true }
  );

  return {
    initializeFormData,
    getSaveButtonText,
    handleSave,
  };
}