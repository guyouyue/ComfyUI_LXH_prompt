<!--src/composables/useTokenEditorCategory.js-->
import {computed, watch} from 'vue';

/**
 * TokenEditor 分类操作
 * @param {Object} props - 组件 props
 * @param {Object} state - 状态对象
 * @param {Function} emit - emit 函数
 */
export function useTokenEditorCategory(props, state, emit) {
    /**
     * 合并后的分类列表（包含临时分类）
     */
    const mergedCategories = computed(() => {
        return [...(props.categories || []), ...state.tempCategories.value];
    });

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
            const tempSubs = state.tempSubcategories.value.filter(
                (sub) => sub.parentId === categoryId
            );
            return [...category.subcategories, ...tempSubs];
        }

        const tempCategory = state.tempCategories.value.find(
            (cat) => cat.id === categoryId
        );
        if (tempCategory) {
            return state.tempSubcategories.value.filter(
                (sub) => sub.parentId === categoryId
            );
        }

        console.warn(`[useTokenEditorCategory] 未找到分类: ${categoryId}`);
        return [];
    };

    /**
     * 确认新建分类
     */
    const confirmNewCategory = (type) => {
        if (type === 'category' || type === 'both') {
            if (
                state.formData.value.categoryId === '__new__' &&
                state.formData.value.newCategoryName.trim()
            ) {
                const newCategoryId = `new_category_${Date.now()}`;
                const newCategoryName = state.formData.value.newCategoryName.trim();

                const tempCategory = {
                    id: newCategoryId,
                    name: {
                        zh: newCategoryName,
                        en: newCategoryName,
                    },
                    subcategories: [],
                    isTemp: true,
                };

                state.tempCategories.value.push(tempCategory);
                state.formData.value.categoryId = newCategoryId;
                state.formData.value.newCategoryName = '';

                emit('new-category', {
                    id: newCategoryId,
                    name: newCategoryName,
                    type: 'category',
                });

                console.log('[useTokenEditorCategory] 创建临时一级分类:', tempCategory);
            }
        }

        if (type === 'subcategory' || type === 'both') {
            if (
                state.formData.value.subcategoryId === '__new__' &&
                state.formData.value.newSubcategoryName.trim()
            ) {
                const newSubcategoryId = `new_subcategory_${Date.now()}`;
                const newSubcategoryName = state.formData.value.newSubcategoryName.trim();

                const tempSubcategory = {
                    id: newSubcategoryId,
                    name: {
                        zh: newSubcategoryName,
                        en: newSubcategoryName,
                    },
                    parentId: state.formData.value.categoryId,
                    tokens: [],
                    isTemp: true,
                };

                state.tempSubcategories.value.push(tempSubcategory);
                state.formData.value.subcategoryId = newSubcategoryId;
                state.formData.value.newSubcategoryName = '';

                emit('new-category', {
                    id: newSubcategoryId,
                    name: newSubcategoryName,
                    parentId: state.formData.value.categoryId,
                    type: 'subcategory',
                });

                console.log('[useTokenEditorCategory] 创建临时二级分类:', tempSubcategory);
            }
        }
    };

    /**
     * 取消新建分类
     */
    const cancelNewCategory = () => {
        if (state.formData.value.tempCategoryId) {
            state.formData.value.categoryId = state.formData.value.tempCategoryId;
        } else {
            state.formData.value.categoryId = '';
        }

        if (state.formData.value.tempSubcategoryId) {
            state.formData.value.subcategoryId = state.formData.value.tempSubcategoryId;
        } else {
            state.formData.value.subcategoryId = '';
        }

        state.formData.value.newCategoryName = '';
        state.formData.value.newSubcategoryName = '';
        state.formData.value.tempCategoryId = '';
        state.formData.value.tempSubcategoryId = '';
    };

    /**
     * 监听分类变化
     */
    watch(
        () => state.formData.value.categoryId,
        (newVal, oldVal) => {
            if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
                state.formData.value.tempCategoryId = oldVal;
            }

            if (!state.isInitializing.value && newVal !== oldVal && newVal !== '__new__') {
                state.formData.value.subcategoryId = '';
            }
        }
    );

    watch(
        () => state.formData.value.subcategoryId,
        (newVal, oldVal) => {
            if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
                state.formData.value.tempSubcategoryId = oldVal;
            }
        }
    );

    return {
        mergedCategories,
        getCategoryName,
        getSubcategoryName,
        getSubcategories,
        confirmNewCategory,
        cancelNewCategory,
    };
}