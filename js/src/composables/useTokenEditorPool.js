/**
 * TokenEditor 词元池操作
 * @param {Object} props - 组件 props
 * @param {Object} state - 状态对象
 * @param {Function} emit - emit 函数
 */
export function useTokenEditorPool(props, state, emit) {
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
      console.warn('[useTokenEditorPool] 引用词元数据缺失:', token);
      return;
    }
    emit('view-token', token.referenceData);
  };

  /**
   * 开始编辑池中的词元
   */
  const startEditPoolToken = (index) => {
    const token = state.poolTokens.value[index];
    if (token.isReference) {
      console.warn('[useTokenEditorPool] 引用词元不支持直接编辑');
      return;
    }

    state.editingPoolTokenIndex.value = index;
    state.editingPoolTokenData.value = {
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
      !state.editingPoolTokenData.value.zh &&
      !state.editingPoolTokenData.value.en
    ) {
      alert('至少需要填写中文或英文');
      return;
    }

    state.poolTokens.value[state.editingPoolTokenIndex.value] = {
      ...state.poolTokens.value[state.editingPoolTokenIndex.value],
      zh: state.editingPoolTokenData.value.zh,
      en: state.editingPoolTokenData.value.en,
      jp: state.editingPoolTokenData.value.jp,
      weight: state.editingPoolTokenData.value.weight,
    };

    cancelEditPoolToken();
  };

  /**
   * 取消池中词元的编辑
   */
  const cancelEditPoolToken = () => {
    state.editingPoolTokenIndex.value = null;
    state.editingPoolTokenData.value = {};
  };

  /**
   * 移除池中的词元
   */
  const removePoolToken = (index) => {
    if (confirm('确定要从词元池中移除此词元吗？')) {
      state.poolTokens.value.splice(index, 1);
    }
  };

  return {
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