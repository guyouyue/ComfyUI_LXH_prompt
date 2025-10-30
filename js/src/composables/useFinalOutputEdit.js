<!--src/composables/useFinalOutputEdit.js-->
import {nextTick, watch} from 'vue';

/**
 * FinalOutput 编辑逻辑
 * @param {Object} props - 组件 props
 * @param {Object} state - 状态对象
 * @param {Function} emit - emit 函数
 */
export function useFinalOutputEdit(props, state, emit) {
    let blurTimer = null;

    /**
     * 监听 tokens 变化，自动聚焦编辑输入框
     */
    watch(
        () => props.tokens,
        (newTokens) => {
            const editingIndex = newTokens.findIndex((t) => t.isEditing);

            if (editingIndex !== -1 && editingIndex !== state.lastEditingIndex.value) {
                state.lastEditingIndex.value = editingIndex;

                nextTick(() => {
                    const input = state.getEditInputRef(editingIndex);
                    if (input) {
                        input.focus();
                        if (newTokens[editingIndex].value === '') {
                            input.select();
                        }
                    }
                });
            } else if (editingIndex === -1) {
                state.lastEditingIndex.value = -1;
            }
        },
        {deep: true, immediate: true}
    );

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

    /**
     * 清理
     */
    const cleanup = () => {
        if (blurTimer) {
            clearTimeout(blurTimer);
            blurTimer = null;
        }
    };

    return {
        handleEditConfirm,
        handleEditCancel,
        handleEditBlur,
        cleanup,
    };
}