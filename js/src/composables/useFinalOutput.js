// src/composables/useFinalOutput.js
import { computed, nextTick, ref, watch } from 'vue';

/**
 * FinalOutput 统一管理
 * 包含：状态管理、拖拽逻辑、编辑逻辑、显示逻辑
 *
 * @param {Object} props - 组件 props
 * @param {Function} emit - emit 函数
 */
export function useFinalOutput(props, emit) {
  // ═══════════════════════════════════════════════════════════════
  // 状态定义
  // ═══════════════════════════════════════════════════════════════

  // 聚焦的区域（original / mapped）
  const focusedSection = ref('mapped');

  // 编辑输入框引用
  const editInputRefs = ref(new Map());

  // 上次编辑的索引（避免重复聚焦）
  const lastEditingIndex = ref(-1);

  // 拖拽状态
  const isDragging = ref(false);
  const dragInfo = ref({
    sourceIndex: -1,
    sourceArea: null,
    startX: 0,
    startY: 0,
  });
  const dropTargetIndex = ref(-1);
  const dropTargetArea = ref(null);

  // 长按状态
  const longPressActive = ref(false);
  const longPressProgress = ref(0);
  const longPressToken = ref({ area: null, index: -1 });

  // 定时器
  let longPressTimer = null;
  let blurTimer = null;

  // 常量
  const LONG_PRESS_DURATION = 1000;

  // ═══════════════════════════════════════════════════════════════
  // 状态管理方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 设置编辑输入框引用
   */
  const setEditInputRef = (el, index) => {
    if (el) {
      editInputRefs.value.set(index, el);
    } else {
      editInputRefs.value.delete(index);
    }
  };

  /**
   * 获取编辑输入框引用
   */
  const getEditInputRef = (index) => {
    return editInputRefs.value.get(index);
  };

  /**
   * 切换聚焦区域
   */
  const setFocusedSection = (section) => {
    focusedSection.value = section;
  };

  // ═══════════════════════════════════════════════════════════════
  // 显示相关方法
  // ═══════════════════════════════════════════════════════════════

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
        jp: [
          `日文查看: ${token.mapping?.jp || '无'}`,
          `中文: ${token.mapping?.zh || '无'}`,
          `英文: ${token.mapping?.en || '无'}`,
        ],
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

  // ═══════════════════════════════════════════════════════════════
  // 拖拽相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 开始长按进度
   */
  const startLongPressProgress = (area, index) => {
    longPressProgress.value = 0;
    longPressActive.value = true;
    longPressToken.value = { area, index };

    const startTime = Date.now();
    const updateProgress = () => {
      if (!longPressActive.value) return;

      const elapsed = Date.now() - startTime;
      longPressProgress.value = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);

      if (elapsed < LONG_PRESS_DURATION) {
        requestAnimationFrame(updateProgress);
      } else {
        startDrag(area, index);
      }
    };

    requestAnimationFrame(updateProgress);
  };

  /**
   * 取消长按
   */
  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressActive.value = false;
    longPressProgress.value = 0;
    longPressToken.value = { area: null, index: -1 };
  };

  /**
   * 鼠标按下
   */
  const handleMouseDown = (event, token, index, area) => {
    event.preventDefault();
    dragInfo.value = {
      sourceIndex: index,
      sourceArea: area,
      startX: event.clientX,
      startY: event.clientY,
    };
    startLongPressProgress(area, index);
  };

  /**
   * 触摸开始
   */
  const handleTouchStart = (event, token, index, area) => {
    const touch = event.touches[0];
    dragInfo.value = {
      sourceIndex: index,
      sourceArea: area,
      startX: touch.clientX,
      startY: touch.clientY,
    };
    startLongPressProgress(area, index);
  };

  /**
   * 开始拖拽
   */
  const startDrag = (area, index) => {
    isDragging.value = true;

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);
  };

  /**
   * 全局鼠标移动
   */
  const handleGlobalMouseMove = (event) => {
    if (!isDragging.value) return;
    event.preventDefault();
    updateDropTarget(event.clientX, event.clientY);
  };

  /**
   * 全局触摸移动
   */
  const handleGlobalTouchMove = (event) => {
    if (!isDragging.value) return;
    event.preventDefault();
    const touch = event.touches[0];
    updateDropTarget(touch.clientX, touch.clientY);
  };

  /**
   * 更新拖放目标
   */
  const updateDropTarget = (clientX, clientY) => {
    const elements = document.querySelectorAll(
      `.${dragInfo.value.sourceArea}-section .token-tag`
    );
    let closestIndex = -1;
    let minDistance = Infinity;

    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - centerX);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== -1) {
      dropTargetIndex.value = closestIndex;
      dropTargetArea.value = dragInfo.value.sourceArea;
    }
  };

  /**
   * 拖拽悬停
   */
  const handleDragOver = (event) => {
    if (!isDragging.value) return;
    event.preventDefault();
  };

  /**
   * 放置
   */
  const handleDrop = (area) => {
    if (!isDragging.value || area !== dragInfo.value.sourceArea) return;

    const sourceIndex = dragInfo.value.sourceIndex;
    const targetIndex = dropTargetIndex.value;

    if (sourceIndex !== targetIndex && targetIndex !== -1) {
      emit('reorder-tokens', { from: sourceIndex, to: targetIndex });
    }

    endDrag();
  };

  /**
   * 全局鼠标松开
   */
  const handleGlobalMouseUp = () => {
    if (isDragging.value) completeDrag();
  };

  /**
   * 全局触摸结束
   */
  const handleGlobalTouchEnd = () => {
    if (isDragging.value) completeDrag();
  };

  /**
   * 完成拖拽
   */
  const completeDrag = () => {
    if (isDragging.value) {
      const sourceIndex = dragInfo.value.sourceIndex;
      const targetIndex = dropTargetIndex.value;

      if (sourceIndex !== targetIndex && targetIndex !== -1) {
        emit('reorder-tokens', { from: sourceIndex, to: targetIndex });
      }
    }
    endDrag();
  };

  /**
   * 结束拖拽
   */
  const endDrag = () => {
    isDragging.value = false;
    dropTargetIndex.value = -1;
    dropTargetArea.value = null;

    cancelLongPress();

    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.removeEventListener('touchmove', handleGlobalTouchMove);
    document.removeEventListener('touchend', handleGlobalTouchEnd);
  };

  // ═══════════════════════════════════════════════════════════════
  // 编辑相关方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 编辑确认
   */
  const handleEditConfirm = (index) => {
    emit('edit-confirm', index);
  };

  /**
   * 编辑取消
   */
  const handleEditCancel = (index) => {
    emit('edit-cancel', index);
  };

  /**
   * 输入框失焦
   */
  const handleEditBlur = (index) => {
    blurTimer = setTimeout(() => {
      if (props.tokens[index]?.isEditing) {
        handleEditConfirm(index);
      }
    }, 150);
  };

  // ═══════════════════════════════════════════════════════════════
  // 清理方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 清理所有资源
   */
  const cleanup = () => {
    endDrag();
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (blurTimer) {
      clearTimeout(blurTimer);
      blurTimer = null;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 监听器
  // ═══════════════════════════════════════════════════════════════

  // 监听 tokens 变化，自动聚焦编辑输入框
  watch(
    () => props.tokens,
    (newTokens) => {
      const editingIndex = newTokens.findIndex((t) => t.isEditing);

      if (editingIndex !== -1 && editingIndex !== lastEditingIndex.value) {
        lastEditingIndex.value = editingIndex;

        nextTick(() => {
          const input = getEditInputRef(editingIndex);
          if (input) {
            input.focus();
            if (newTokens[editingIndex].value === '') {
              input.select();
            }
          }
        });
      } else if (editingIndex === -1) {
        lastEditingIndex.value = -1;
      }
    },
    { deep: true, immediate: true }
  );

  // 监听聚焦状态
  watch(
    () => props.focused,
    (newVal) => {
      if (newVal) {
        setFocusedSection('mapped');
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════

  return {
    // ===== 状态 =====
    focusedSection,
    editInputRefs,
    lastEditingIndex,
    isDragging,
    dragInfo,
    dropTargetIndex,
    dropTargetArea,
    longPressActive,
    longPressProgress,
    longPressToken,

    // ===== 计算属性 =====
    getViewTextPreview,
    getFinalTextPreview,

    // ===== 状态管理方法 =====
    setEditInputRef,
    getEditInputRef,
    setFocusedSection,

    // ===== 显示方法 =====
    getViewTokenDisplay,
    getMappedTokenDisplay,
    getOriginalTokenTitle,
    getMappedTokenTitle,

    // ===== 拖拽方法 =====
    handleMouseDown,
    handleTouchStart,
    handleDragOver,
    handleDrop,
    cancelLongPress,

    // ===== 编辑方法 =====
    handleEditConfirm,
    handleEditCancel,
    handleEditBlur,

    // ===== 清理方法 =====
    cleanup,
  };
}