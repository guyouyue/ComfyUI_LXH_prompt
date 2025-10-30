// src/composables/useFinalOutputState.js
import {ref} from 'vue';

/**
 * FinalOutput 状态管理
 */
export function useFinalOutputState() {
    // 聚焦的区域（original / mapped）
    const focusedSection = ref('mapped');

    // 编辑输入框引用
    const editInputRefs = ref(new Map());

    // 上次编辑的索引（避免重复聚焦）
    const lastEditingIndex = ref(-1);

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

    return {
        focusedSection,
        editInputRefs,
        lastEditingIndex,
        setEditInputRef,
        getEditInputRef,
        setFocusedSection,
    };
}