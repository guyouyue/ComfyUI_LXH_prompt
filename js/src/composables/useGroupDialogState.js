// src/composables/useGroupDialogState.js
import {ref, watch} from 'vue';

/**
 * GroupDialog 状态管理
 * @param {Object} props - 组件 props
 */
export function useGroupDialogState(props) {
    const formData = ref({
        id: '',
        description: '',
        tokens: [],
    });

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
        {immediate: true}
    );

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

    return {
        formData,
        resetForm,
    };
}