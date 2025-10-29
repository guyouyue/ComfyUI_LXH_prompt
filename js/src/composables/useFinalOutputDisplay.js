import { computed } from 'vue';

/**
 * FinalOutput 显示逻辑
 * @param {Object} props - 组件 props
 */
export function useFinalOutputDisplay(props) {
  /**
   * 获取查看区域的词元显示
   */
  const getViewTokenDisplay = (token) => {
    if (token.isCustomPool && token.poolData) {
      return props.viewLanguage === 'zh'
        ? token.poolData.name?.zh || token.poolData.name?.en || token.poolData.id
        : token.poolData.name?.en || token.poolData.name?.zh || token.poolData.id;
    }

    if (!token.mapping) {
      return token.original || token.value;
    }

    const langMap = {
      zh: token.mapping?.zh || token.zh || token.value,
      en: token.mapping?.en || token.en || token.value,
      jp: token.mapping?.jp || token.jp || token.value,
    };

    return langMap[props.viewLanguage] || token.value;
  };

  /**
   * 获取映射输出区域的词元显示
   */
  const getMappedTokenDisplay = (token) => {
    if (token.isCustomPool && token.poolData) {
      return props.language === 'zh'
        ? token.poolData.name?.zh || token.poolData.name?.en || token.poolData.id
        : token.poolData.name?.en || token.poolData.name?.zh || token.poolData.id;
    }

    if (props.mode === 'natural') {
      return token.display || token.value;
    }

    const langMap = {
      zh: token.mapping?.zh || token.zh || token.value,
      en: token.mapping?.en || token.en || token.value,
      jp: token.mapping?.jp || token.jp || token.value,
    };

    return langMap[props.language] || token.value;
  };

  /**
   * 获取原始词元标题
   */
  const getOriginalTokenTitle = (token) => {
    const parts = [];

    if (token.isCustomPool) {
      parts.push('🎲 词元池占位符');
      parts.push(`Key: ${token.poolKey}`);
      if (token.poolData.name) {
        parts.push(`中文名: ${token.poolData.name.zh || '无'}`);
        parts.push(`英文名: ${token.poolData.name.en || '无'}`);
      }
      if (token.poolData.description) {
        parts.push(`描述: ${token.poolData.description}`);
      }
      parts.push(`候选词元: ${token.poolData.tokens?.length || 0} 个`);
      parts.push('最终输出: ' + token.value);
    } else if (token.mapping) {
      parts.push('已映射');
      const langInfo = {
        zh: [`中文查看: ${token.mapping?.zh || '无'}`, `英文: ${token.mapping?.en || '无'}`],
        en: [`英文查看: ${token.mapping?.en || '无'}`, `中文: ${token.mapping?.zh || '无'}`],
        jp: [`日文查看: ${token.mapping?.jp || '无'}`, `中文: ${token.mapping?.zh || '无'}`, `英文: ${token.mapping?.en || '无'}`],
      };
      parts.push(...(langInfo[props.viewLanguage] || langInfo.zh));
      if (token.mapping?.jp && props.viewLanguage !== 'jp') {
        parts.push(`日文: ${token.mapping.jp}`);
      }
    } else {
      parts.push('未映射');
    }

    parts.push('单击编辑 | 长按1秒拖拽');
    return parts.join('\n');
  };

  /**
   * 获取映射词元标题
   */
  const getMappedTokenTitle = (token) => {
    const parts = [];

    if (token.isCustomPool && token.poolData) {
      parts.push('🎲 词元池占位符');
      parts.push(`Key: ${token.poolKey}`);
      if (token.poolData.name) {
        parts.push(`中文名: ${token.poolData.name.zh || '无'}`);
        parts.push(`英文名: ${token.poolData.name.en || '无'}`);
      }
      if (token.poolData.description) {
        parts.push(`描述: ${token.poolData.description}`);
      }
      parts.push(`候选词元: ${token.poolData.tokens?.length || 0} 个`);
      parts.push('最终输出: ' + token.value);
    } else if (token.mapping) {
      parts.push('原始值: ' + (token.original || token.value));

      const langInfo = {
        zh: ['输出语言: 中文', `英文: ${token.mapping.en}`],
        en: ['输出语言: 英文', `中文: ${token.mapping.zh}`],
        jp: ['输出语言: 日文', `中文: ${token.mapping.zh}`, `英文: ${token.mapping.en}`],
      };

      parts.push(...(langInfo[props.language] || langInfo.zh));
      if (token.mapping.jp && props.language !== 'jp') {
        parts.push(`日文: ${token.mapping.jp}`);
      }
    } else {
      parts.push('未映射，使用原始值');
    }

    if (token.isCustomGroup) {
      parts.push('(来自自定义组合)');
    }

    parts.push('单击编辑 | 长按1秒拖拽');
    return parts.join('\n');
  };

  /**
   * 获取查看文本预览
   */
  const getViewTextPreview = computed(() => {
    if (props.tokens.length === 0) return '空';

    const parts = props.tokens
      .filter((t) => !t.isEditing)
      .map((token) => {
        if (token.isCustomPool) return token.value;
        return getViewTokenDisplay(token);
      });

    return props.mode === 'token' ? parts.join(', ') : parts.join(' ');
  });

  /**
   * 获取最终文本预览
   */
  const getFinalTextPreview = computed(() => {
    if (props.tokens.length === 0) return '空';

    const parts = props.tokens
      .filter((t) => !t.isEditing)
      .map((token) => {
        if (token.isCustomPool) return token.value;
        return getMappedTokenDisplay(token);
      });

    return props.mode === 'token' ? parts.join(', ') : parts.join(' ');
  });

  return {
    getViewTokenDisplay,
    getMappedTokenDisplay,
    getOriginalTokenTitle,
    getMappedTokenTitle,
    getViewTextPreview,
    getFinalTextPreview,
  };
}