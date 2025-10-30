// src/composables/useAppKeyboard.js
import {FOCUS_AREAS} from '../utils/constants.js';

export function useAppKeyboard(store, handlers) {
    const {
        handleEditConfirm,
        handleEditCancel,
        handleConfirm,
        handleCancel,
        handleInsertNewToken,
        cursorPosition,
    } = handlers;

    // ⭐ 防抖标记
    let isProcessing = false;

    const handleKeyDown = async (e) => {
        // ⭐ 防止重复处理
        if (isProcessing) {
            return;
        }

        // 1. 对话框打开时的键盘处理
        if (store.showingGroupDialog.value || store.showingTokenSelector.value) {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                store.closeGroupDialog();
                store.closeTokenSelector();
            }
            return;
        }

        // 2. ⭐ 编辑状态的键盘处理（最高优先级）
        if (store.hasEditingToken.value) {

            if (e.key === 'Escape') {

                // ⭐ 彻底阻止事件传播
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                // ⭐ 设置处理标记，防止重复触发
                isProcessing = true;

                // 找到正在编辑的词元并取消
                const editingIndex = store.finalTokens.value.findIndex(t => t.isEditing);
                if (editingIndex !== -1) {
                    handleEditCancel(editingIndex);
                }

                // ⭐ 延迟重置标记
                setTimeout(() => {
                    isProcessing = false;
                }, 150);

                return; // ⭐ 直接返回，不再执行后续代码
            }

            if (e.key === 'Enter' && !e.shiftKey) {

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                isProcessing = true;

                const editingIndex = store.finalTokens.value.findIndex(t => t.isEditing);
                if (editingIndex !== -1) {
                    handleEditConfirm(editingIndex);
                }

                setTimeout(() => {
                    isProcessing = false;
                }, 150);

                return;
            }

            if (e.ctrlKey && e.key === 'Enter') {

                e.preventDefault();
                e.stopPropagation();

                isProcessing = true;

                const editingIndex = store.finalTokens.value.findIndex(t => t.isEditing);
                if (editingIndex !== -1) {
                    handleEditConfirm(editingIndex);
                }

                setTimeout(() => {
                    handleConfirm();
                    isProcessing = false;
                }, 150);

                return;
            }

            // ⭐ 编辑状态下，阻止其他所有全局快捷键
            return;
        }

        // 3. 全局键盘快捷键（仅在非编辑状态时生效）
        if (e.key === 'Escape') {
            e.preventDefault();
            isProcessing = true;

            // ⭐ 异步处理，避免阻塞
            await handleCancel();

            setTimeout(() => {
                isProcessing = false;
            }, 150);
        } else if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        } else if (e.key === ' ' && store.focusedArea.value === FOCUS_AREAS.OUTPUT) {
            if (cursorPosition.value.index !== null) {
                e.preventDefault();
                handleInsertNewToken();
            }
        }
    };

    return {
        handleKeyDown,
    };
}