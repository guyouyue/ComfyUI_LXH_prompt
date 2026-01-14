// src/composables/useTokenEditor.js
import { computed, ref, watch } from 'vue';

/**
 * TokenEditor 统一管理
 * 包含：状态、验证、表单操作、分类操作、词元池操作
 *
 * @param {Object} props - 组件 props
 * @param {Function} emit - emit 函数
 */
export function useTokenEditor(props, emit) {
  // ═══════════════════════════════════════════════════════════════
  // 状态定义
  // ═══════════════════════════════════════════════════════════════

  // 表单数据
  const formData = ref({
    id: '',
    zh: '',
    en: '',
    jp: '',
    categoryId: '',
    subcategoryId: '',
    description: '',
    name: { zh: '', en: '' },
    poolKey: '',
    groupId: '',
    groupKey: '',
    poolId: '',
    isSystem: false,
    newCategoryName: '',
    newSubcategoryName: '',
    tempCategoryId: '',
    tempSubcategoryId: '',
  });

  // 临时分类
  const tempCategories = ref([]);
  const tempSubcategories = ref([]);

  // 词元池词元
  const poolTokens = ref([]);

  // 编辑状态
  const isInitializing = ref(false);
  const isSystemToken = ref(false);
  const originalValue = ref('');

  // 词元池编辑状态
  const editingPoolTokenIndex = ref(null);
  const editingPoolTokenData = ref({});

  // ═══════════════════════════════════════════════════════════════
  // 计算属性
  // ═══════════════════════════════════════════════════════════════

  /**
   * 是否显示新建分类按钮
   */
  const showNewCategoryButtons = computed(() => {
    return (
      formData.value.categoryId === '__new__' ||
      formData.value.subcategoryId === '__new__'
    );
  });

  /**
   * 是否可以保存
   */
  const canSave = computed(() => {
    if (props.tokenType === 'single' || props.tokenType === 'unmapped') {
      const hasId = !!formData.value.id;
      const hasContent =
        formData.value.zh || formData.value.en || formData.value.jp;
      return hasId && hasContent;
    }
    return true; // pool 类型总是可以保存
  });

  /**
   * 是否可以确认新建分类
   */
  const canConfirmNewCategory = computed(() => {
    if (
      formData.value.categoryId === '__new__' &&
      !formData.value.newCategoryName?.trim()
    ) {
      return false;
    }
    if (
      formData.value.subcategoryId === '__new__' &&
      !formData.value.newSubcategoryName?.trim()
    ) {
      return false;
    }
    return true;
  });

  /**
   * 合并后的分类列表（包含临时分类）
   */
  const mergedCategories = computed(() => {
    return [...(props.categories || []), ...tempCategories.value];
  });

  // ═══════════════════════════════════════════════════════════════
  // 基础方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 重置表单
   */
  const resetForm = () => {
    formData.value = {
      id: '',
      zh: '',
      en: '',
      jp: '',
      categoryId: '',
      subcategoryId: '',
      description: '',
      name: { zh: '', en: '' },
      poolKey: '',
      groupId: '',
      groupKey: '',
      poolId: '',
      isSystem: false,
      newCategoryName: '',
      newSubcategoryName: '',
      tempCategoryId: '',
      tempSubcategoryId: '',
    };
    tempCategories.value = [];
    tempSubcategories.value = [];
    poolTokens.value = [];
    isSystemToken.value = false;
    originalValue.value = '';
  };

  // ═══════════════════════════════════════════════════════════════
  // 分类相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 获取分类名称
   */
  const getCategoryName = (category) => {
    if (!category?.name) return '';
    return props.language === 'zh' ? category.name.zh : category.name.en;
  };

  /**
   * 获取子分类名称
   */
  const getSubcategoryName = (subcategory) => {
    if (!subcategory?.name) return '';
    return props.language === 'zh' ? subcategory.name.zh : subcategory.name.en;
  };

  /**
   * 获取子分类列表
   */
  const getSubcategories = (categoryId) => {
    if (!categoryId) return [];

    const category = mergedCategories.value.find((cat) => cat.id === categoryId);
    if (category) {
      const tempSubs = tempSubcategories.value.filter(
        (sub) => sub.parentId === categoryId
      );
      return [...category.subcategories, ...tempSubs];
    }

    const tempCategory = tempCategories.value.find(
      (cat) => cat.id === categoryId
    );
    if (tempCategory) {
      return tempSubcategories.value.filter(
        (sub) => sub.parentId === categoryId
      );
    }

    console.warn(`[useTokenEditor] 未找到分类: ${categoryId}`);
    return [];
  };

  /**
   * 确认新建分类
   */
  const confirmNewCategory = (type) => {
    if (type === 'category' || type === 'both') {
      if (
        formData.value.categoryId === '__new__' &&
        formData.value.newCategoryName.trim()
      ) {
        const newCategoryId = `new_category_${Date.now()}`;
        const newCategoryName = formData.value.newCategoryName.trim();

        const tempCategory = {
          id: newCategoryId,
          name: {
            zh: newCategoryName,
            en: newCategoryName,
          },
          subcategories: [],
          isTemp: true,
        };

        tempCategories.value.push(tempCategory);
        formData.value.categoryId = newCategoryId;
        formData.value.newCategoryName = '';

        emit('new-category', {
          id: newCategoryId,
          name: newCategoryName,
          type: 'category',
        });
      }
    }

    if (type === 'subcategory' || type === 'both') {
      if (
        formData.value.subcategoryId === '__new__' &&
        formData.value.newSubcategoryName.trim()
      ) {
        const newSubcategoryId = `new_subcategory_${Date.now()}`;
        const newSubcategoryName = formData.value.newSubcategoryName.trim();

        const tempSubcategory = {
          id: newSubcategoryId,
          name: {
            zh: newSubcategoryName,
            en: newSubcategoryName,
          },
          parentId: formData.value.categoryId,
          tokens: [],
          isTemp: true,
        };

        tempSubcategories.value.push(tempSubcategory);
        formData.value.subcategoryId = newSubcategoryId;
        formData.value.newSubcategoryName = '';

        emit('new-category', {
          id: newSubcategoryId,
          name: newSubcategoryName,
          parentId: formData.value.categoryId,
          type: 'subcategory',
        });
      }
    }
  };

  /**
   * 取消新建分类
   */
  const cancelNewCategory = () => {
    if (formData.value.tempCategoryId) {
      formData.value.categoryId = formData.value.tempCategoryId;
    } else {
      formData.value.categoryId = '';
    }

    if (formData.value.tempSubcategoryId) {
      formData.value.subcategoryId = formData.value.tempSubcategoryId;
    } else {
      formData.value.subcategoryId = '';
    }

    formData.value.newCategoryName = '';
    formData.value.newSubcategoryName = '';
    formData.value.tempCategoryId = '';
    formData.value.tempSubcategoryId = '';
  };

  // ═══════════════════════════════════════════════════════════════
  // 词元池相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 查找引用的词元
   */
  const findReferencedToken = (tokenId) => {
    if (!tokenId || !props.categories) return null;

    for (const category of props.categories) {
      for (const subcategory of category.subcategories) {
        const found = subcategory.tokens.find(
          (t) =>
            t.id === tokenId ||
            t.uniqueId === tokenId ||
            t.en === tokenId ||
            t.zh === tokenId
        );

        if (found) {
          return {
            ...found,
            categoryId: category.id,
            subcategoryId: subcategory.id,
            categoryName: category.name,
            subcategoryName: subcategory.name,
          };
        }
      }
    }

    // 模糊匹配
    const lowerTokenId = tokenId.toLowerCase();
    for (const category of props.categories) {
      for (const subcategory of category.subcategories) {
        const found = subcategory.tokens.find((t) => {
          const tokenEn = t.en?.toLowerCase() || '';
          const tokenZh = t.zh?.toLowerCase() || '';
          return tokenEn === lowerTokenId || tokenZh === lowerTokenId;
        });

        if (found) {
          return {
            ...found,
            categoryId: category.id,
            subcategoryId: subcategory.id,
            categoryName: category.name,
            subcategoryName: subcategory.name,
          };
        }
      }
    }

    return null;
  };

  /**
   * 获取分类显示名称
   */
  const getCategoryDisplayName = (nameObj) => {
    if (!nameObj) return '未知';
    if (typeof nameObj === 'string') return nameObj;
    return props.language === 'zh' ? nameObj.zh : nameObj.en;
  };

  /**
   * 处理词元池词元
   */
  const processPoolTokens = (tokens) => {
    if (!tokens || !Array.isArray(tokens)) return [];

    return tokens.map((token) => {
      const isReference =
        token.isReference ||
        token.type === 'quote' ||
        (token.mapping && !token.zh && !token.en);

      if (isReference) {
        const referenceId = token.id || token.mapping || token.referenceId;
        const referenceData = findReferencedToken(referenceId);

        if (referenceData) {
          return {
            ...token,
            isReference: true,
            referenceData: referenceData,
            referenceInfo: {
              categoryName: getCategoryDisplayName(referenceData.categoryName),
              subcategoryName: getCategoryDisplayName(referenceData.subcategoryName),
              categoryId: referenceData.categoryId,
              subcategoryId: referenceData.subcategoryId,
            },
            zh: referenceData.zh || token.zh,
            en: referenceData.en || token.en,
            jp: referenceData.jp || token.jp,
          };
        } else {
          return {
            ...token,
            isReference: true,
            referenceData: null,
            referenceInfo: null,
          };
        }
      } else {
        return {
          ...token,
          isReference: false,
          referenceData: null,
          referenceInfo: null,
        };
      }
    });
  };

  /**
   * 获取词元语言值
   */
  const getTokenLanguageValue = (token, lang) => {
    if (token.isReference && token.referenceData) {
      const value = token.referenceData[lang];
      if (value) return value;
    }

    if (token[lang]) return token[lang];

    if (token.mapping && token.mapping[lang]) {
      return token.mapping[lang];
    }

    return '无数据';
  };

  /**
   * 查看引用的词元
   */
  const viewReferencedToken = (token) => {
    if (!token.referenceData) {
      console.warn('[useTokenEditor] 引用词元数据缺失:', token);
      return;
    }
    emit('view-token', token.referenceData);
  };

  /**
   * 开始编辑池中的词元
   */
  const startEditPoolToken = (index) => {
    const token = poolTokens.value[index];
    if (token.isReference) {
      console.warn('[useTokenEditor] 引用词元不支持直接编辑');
      return;
    }

    editingPoolTokenIndex.value = index;
    editingPoolTokenData.value = {
      zh: token.zh || '',
      en: token.en || '',
      jp: token.jp || '',
      weight: token.weight !== undefined ? token.weight : 1,
    };
  };

  /**
   * 保存池中词元的编辑
   */
  const saveEditPoolToken = () => {
    if (
      !editingPoolTokenData.value.zh &&
      !editingPoolTokenData.value.en
    ) {
      alert('至少需要填写中文或英文');
      return;
    }

    poolTokens.value[editingPoolTokenIndex.value] = {
      ...poolTokens.value[editingPoolTokenIndex.value],
      zh: editingPoolTokenData.value.zh,
      en: editingPoolTokenData.value.en,
      jp: editingPoolTokenData.value.jp,
      weight: editingPoolTokenData.value.weight,
    };

    cancelEditPoolToken();
  };

  /**
   * 取消池中词元的编辑
   */
  const cancelEditPoolToken = () => {
    editingPoolTokenIndex.value = null;
    editingPoolTokenData.value = {};
  };

  /**
   * 移除池中的词元
   */
  const removePoolToken = (index) => {
    if (confirm('确定要从词元池中移除此词元吗？')) {
      poolTokens.value.splice(index, 1);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 表单操作方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 初始化表单数据
   */
  const initializeFormData = () => {
    if (!props.token) return;

    isInitializing.value = true;
    tempCategories.value = [];
    tempSubcategories.value = [];
    originalValue.value = props.token.value || props.token.original || '';

    if (props.tokenType === 'single') {
      const tokenData = props.token.mapping || props.token;
      isSystemToken.value = tokenData.source === 'system';

      const categoryId = props.token.categoryId || tokenData.categoryId || '';
      const subcategoryId =
        props.token.subcategoryId || tokenData.subcategoryId || '';

      formData.value = {
        id: tokenData.id || tokenData.uniqueId || '',
        zh: tokenData.zh || '',
        en: tokenData.en || '',
        jp: tokenData.jp || '',
        categoryId: categoryId,
        subcategoryId: subcategoryId,
        description: tokenData.description || '',
        isSystem: isSystemToken.value,
        newCategoryName: '',
        newSubcategoryName: '',
        tempCategoryId: '',
        tempSubcategoryId: '',
      };
    } else if (props.tokenType === 'unmapped') {
      formData.value = {
        id: `user_${Date.now()}`,
        zh: originalValue.value,
        en: '',
        jp: '',
        categoryId: props.token.categoryId || '',
        subcategoryId: props.token.subcategoryId || '',
        description: `未映射词元: ${originalValue.value}`,
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

      formData.value = {
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
      poolTokens.value = processPoolTokens(rawTokens);
    }

    setTimeout(() => {
      isInitializing.value = false;
    }, 0);
  };

  /**
   * 保存按钮文本
   */
  const getSaveButtonText = () => {
    const texts = {
      single: isSystemToken.value ? '保存到用户词库' : '保存修改',
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
      formData.value.categoryId === '__new__' ||
      formData.value.subcategoryId === '__new__'
    ) {
      if (
        !confirm('您有未确认的新建分类，是否继续保存？未确认的分类将不会被创建。')
      ) {
        return;
      }
      cancelNewCategory();
    }

    const saveData = {
      ...formData.value,
      tokenType: props.tokenType,
      isSystem: isSystemToken.value,
      poolTokens: props.tokenType === 'pool' ? poolTokens.value : undefined,
      tempCategories: tempCategories.value,
      tempSubcategories: tempSubcategories.value,
    };

    delete saveData.newCategoryName;
    delete saveData.newSubcategoryName;
    delete saveData.tempCategoryId;
    delete saveData.tempSubcategoryId;

    emit('save', saveData);
  };

  // ═══════════════════════════════════════════════════════════════
  // 监听器
  // ═══════════════════════════════════════════════════════════════

  // 监听 token 变化，重新初始化
  watch(() => props.token, initializeFormData, { immediate: true });

  // 监听分类变化
  watch(
    () => formData.value.categoryId,
    (newVal, oldVal) => {
      if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
        formData.value.tempCategoryId = oldVal;
      }

      if (!isInitializing.value && newVal !== oldVal && newVal !== '__new__') {
        formData.value.subcategoryId = '';
      }
    }
  );

  watch(
    () => formData.value.subcategoryId,
    (newVal, oldVal) => {
      if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
        formData.value.tempSubcategoryId = oldVal;
      }
    }
  );

  // 监听分类数据变化，刷新词元数据
  watch(
    () => props.categories,
    (newCategories) => {
      if (
        !isInitializing.value &&
        props.token &&
        props.tokenType === 'single'
      ) {
        const tokenId = formData.value.id;
        const categoryId = formData.value.categoryId;
        const subcategoryId = formData.value.subcategoryId;

        if (tokenId && categoryId && subcategoryId) {
          const cat = newCategories.find((c) => c.id === categoryId);
          if (cat) {
            const subcategory = cat.subcategories.find(
              (sub) => sub.id === subcategoryId
            );
            if (subcategory) {
              const updatedToken = subcategory.tokens.find(
                (t) => t.id === tokenId
              );
              if (updatedToken) {
                formData.value = {
                  ...formData.value,
                  zh: updatedToken.zh || '',
                  en: updatedToken.en || '',
                  jp: updatedToken.jp || '',
                  description: updatedToken.description || '',
                };
                isSystemToken.value = updatedToken.source === 'system';
              }
            }
          }
        }
      }
    },
    { deep: true }
  );

  // ═══════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════

  return {
    // ===== 状态 =====
    formData,
    tempCategories,
    tempSubcategories,
    poolTokens,
    isInitializing,
    isSystemToken,
    originalValue,
    editingPoolTokenIndex,
    editingPoolTokenData,

    // ===== 计算属性 =====
    showNewCategoryButtons,
    canSave,
    canConfirmNewCategory,
    mergedCategories,

    // ===== 基础方法 =====
    resetForm,
    initializeFormData,
    getSaveButtonText,
    handleSave,

    // ===== 分类方法 =====
    getCategoryName,
    getSubcategoryName,
    getSubcategories,
    confirmNewCategory,
    cancelNewCategory,

    // ===== 词元池方法 =====
    findReferencedToken,
    getCategoryDisplayName,
    processPoolTokens,
    getTokenLanguageValue,
    viewReferencedToken,
    startEditPoolToken,
    saveEditPoolToken,
    cancelEditPoolToken,
    removePoolToken,
  };
}