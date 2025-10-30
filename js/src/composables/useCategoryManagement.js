// src/composables/useCategoryManagement.js
import {useAppStore} from './useAppStore.js';
import {useTokens} from './useTokens.js';
import {useCustomGroups} from './useCustomGroups.js';

export function useCategoryManagement() {
    const store = useAppStore();
    const {userTokens, saveUserTokens, refreshMergedData} = useTokens();
    const {customGroups, saveCustomGroups} = useCustomGroups();

    /**
     * 打开分类编辑器
     */
    const openCategoryEditor = (categoryData, categoryType) => {
        console.log('[CategoryMgmt] 打开分类编辑器:', {categoryData, categoryType});

        store.openCategoryEditor(categoryData, categoryType);
    };

    /**
     * 保存分类编辑
     */
    const saveCategoryEdit = async (saveData) => {
        console.log('[CategoryMgmt] 保存分类编辑:', saveData);

        try {
            if (saveData.categoryType === 'pool') {
                // 词元池分组编辑
                return await savePoolGroupEdit(saveData);
            } else {
                // 分类/子分类编辑
                return await saveCategoryData(saveData);
            }
        } catch (error) {
            console.error('[CategoryMgmt] 保存失败:', error);
            alert('❌ 保存失败: ' + error.message);
            return false;
        }
    };

    /**
     * 保存分类/子分类数据
     */
    const saveCategoryData = async (saveData) => {
        const {id, name, description, categoryType, isSystem} = saveData;

        if (isSystem) {
            // 系统分类：创建用户副本
            console.log('[CategoryMgmt] 创建系统分类的用户副本');

            if (categoryType === 'category') {
                // 一级分类副本
                const newCategory = {
                    id: id,
                    name: {...name},
                    description: description,
                    source: 'user',
                    subcategories: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                userTokens.value.push(newCategory);
            } else {
                // 二级分类副本
                const parentId = saveData.parentId;
                let parentCategory = userTokens.value.find(cat => cat.id === parentId);

                if (!parentCategory) {
                    // 父级分类也不存在，需要先创建
                    const systemParent = saveData.parentData;
                    parentCategory = {
                        id: systemParent.id,
                        name: {...systemParent.name},
                        description: systemParent.description || '',
                        source: 'user',
                        subcategories: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };
                    userTokens.value.push(parentCategory);
                }

                const newSubcategory = {
                    id: id,
                    name: {...name},
                    description: description,
                    source: 'user',
                    tokens: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                parentCategory.subcategories.push(newSubcategory);
            }

            await saveUserTokens();
            await refreshMergedData();

            alert('✅ 已创建用户副本');
            return true;
        } else {
            // 用户分类：直接更新
            console.log('[CategoryMgmt] 更新用户分类');

            if (categoryType === 'category') {
                const category = userTokens.value.find(cat => cat.id === id);
                if (category) {
                    category.name = {...name};
                    category.description = description;
                    category.updatedAt = Date.now();
                }
            } else {
                const parentId = saveData.parentId;
                const parentCategory = userTokens.value.find(cat => cat.id === parentId);
                if (parentCategory) {
                    const subcategory = parentCategory.subcategories.find(sub => sub.id === id);
                    if (subcategory) {
                        subcategory.name = {...name};
                        subcategory.description = description;
                        subcategory.updatedAt = Date.now();
                    }
                }
            }

            await saveUserTokens();
            await refreshMergedData();

            alert('✅ 分类已更新');
            return true;
        }
    };

    /**
     * 保存词元池分组编辑
     */
    const savePoolGroupEdit = async (saveData) => {
        const {id, name, description} = saveData;

        console.log('[CategoryMgmt] 更新词元池分组:', id);

        const group = customGroups.value.find(g => g.id === id);
        if (group) {
            group.name = {...name};
            group.description = description;
            group.updatedAt = Date.now();

            await saveCustomGroups();

            alert('✅ 词元池分组已更新');
            return true;
        }

        throw new Error('未找到词元池分组');
    };

    return {
        openCategoryEditor,
        saveCategoryEdit,
    };
}