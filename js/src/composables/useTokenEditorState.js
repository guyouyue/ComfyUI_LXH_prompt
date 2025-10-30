// src/composables/useTokenEditorState.js
import {computed, ref} from 'vue';

/**
 * TokenEditor 状态管理
 */
export function useTokenEditorState() {
    // 表单数据
    const formData = ref({
        id: '',
        zh: '',
        en: '',
        jp: '',
        categoryId: '',
        subcategoryId: '',
        description: '',
        name: {zh: '', en: ''},
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
            name: {zh: '', en: ''},
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

    return {
        formData,
        tempCategories,
        tempSubcategories,
        poolTokens,
        isInitializing,
        isSystemToken,
        originalValue,
        editingPoolTokenIndex,
        editingPoolTokenData,
        showNewCategoryButtons,
        resetForm,
    };
}