/**
 * App 键盘事件处理
 * @param {Object} store - 应用状态
 * @param {Object} handlers - 事件处理器集合
 */
export function useAppKeyboard(store, handlers) {
  /**
   * 全局键盘事件处理
   */
  const handleKeyDown = (e) => {
    // 1️⃣ 对话框打开时的键盘处理（最高优先级）
    if (store.showingGroupDialog.value || store.showingTokenSelector.value) {
      if (e.key === 'Escape') {
        e.stopPropagation(); // 阻止事件冒泡
        store.closeGroupDialog();
        store.closeTokenSelector();
      }
      return;
    }

    // 2️⃣ 编辑状态的键盘处理（次优先级）
    if (store.hasEditingToken.value) {
      if (e.key === 'Escape') {
        e.stopPropagation(); // 阻止事件冒泡
        const editingIndex = store.finalTokens.value.findIndex(t => t.isEditing);
        if (editingIndex !== -1) {
          console.log('[useAppKeyboard] ESC 取消词元编辑，索引:', editingIndex);
          handlers.handleEditCancel(editingIndex);
        }
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.stopPropagation();
        const editingIndex = store.finalTokens.value.findIndex(t => t.isEditing);
        if (editingIndex !== -1) {
          handlers.handleEditConfirm(editingIndex);
        }
        setTimeout(() => {
          handlers.handleConfirm();
        }, 100);
      }
      return; // ⭐ 重要：阻止继续执行后续逻辑
    }

    // 3️⃣ 全局键盘快捷键（最低优先级）
    if (e.key === 'Escape') {
      handlers.handleCancel();
    } else if (e.ctrlKey && e.key === 'Enter') {
      handlers.handleConfirm();
    } else if (e.key === ' ' && store.focusedArea.value === 'output') {
      if (handlers.cursorPosition.value?.index !== null) {
        e.preventDefault();
        handlers.handleInsertNewToken();
      }
    }
  };

  return {
    handleKeyDown,
  };
}