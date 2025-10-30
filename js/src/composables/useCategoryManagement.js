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
        store.openCategoryEditor(categoryData, categoryType);
    };

    /**
     * 保存分类编辑
     */
    const saveCategoryEdit = async (saveData) => {
        try {
            if (saveData.categoryType === 'category') {
                return await saveCategoryData(saveData);
            } else if (saveData.categoryType === 'subcategory') {
                return await saveSubcategoryData(saveData);
            } else if (saveData.categoryType === 'pool') {
                return await savePoolGroupData(saveData);
            }
            return false;
        } catch (error) {
            console.error('[CategoryManagement] 保存失败:', error);
            alert('❌ 保存失败: ' + error.message);
            return false;
        }
    };

    /**
     * 保存一级分类
     */
    const saveCategoryData = async (saveData) => {
        // 查找目标分类
        let targetCategory = userTokens.value.find(cat => cat.id === saveData.id);

        if (!targetCategory) {
            // 新建分类
            targetCategory = {
                id: saveData.id,
                name: saveData.name,
                description: saveData.description,
                source: 'user',
                subcategories: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            userTokens.value.push(targetCategory);
        } else {
            // 更新现有分类
            targetCategory.name = saveData.name;
            targetCategory.description = saveData.description;
            targetCategory.updatedAt = Date.now();
        }

        // 保存到文件
        const saved = await saveUserTokens();
        if (saved) {
            await refreshMergedData();
            alert('✅ 一级分类已保存');
            return true;
        }
        return false;
    };

    /**
     * 保存二级分类
     */
    const saveSubcategoryData = async (saveData) => {
        // ⭐ 关键：需要从 saveData 中获取父级分类信息
        const parentId = saveData.parentId || saveData.parentData?.id;
        if (!parentId) {
            throw new Error('缺少父级分类信息');
        }

        // 查找父级分类
        let parentCategory = userTokens.value.find(cat => cat.id === parentId);

        if (!parentCategory) {
            // 如果父级分类不存在，创建它
            const parentData = saveData.parentData;
            if (!parentData) {
                throw new Error('未找到父级分类数据');
            }

            parentCategory = {
                id: parentData.id,
                name: parentData.name,
                description: parentData.description || '',
                source: 'user',
                subcategories: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            userTokens.value.push(parentCategory);
        }

        // 查找目标子分类
        let targetSubcategory = parentCategory.subcategories.find(sub => sub.id === saveData.id);

        if (!targetSubcategory) {
            // 新建子分类
            targetSubcategory = {
                id: saveData.id,
                name: saveData.name,
                description: saveData.description,
                source: 'user',
                tokens: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            parentCategory.subcategories.push(targetSubcategory);
        } else {
            // 更新现有子分类
            targetSubcategory.name = saveData.name;
            targetSubcategory.description = saveData.description;
            targetSubcategory.updatedAt = Date.now();
        }

        // 更新父级分类的更新时间
        parentCategory.updatedAt = Date.now();

        // 保存到文件
        const saved = await saveUserTokens();
        if (saved) {
            await refreshMergedData();
            alert('✅ 二级分类已保存');
            return true;
        }
        return false;
    };

    /**
     * 保存词元池分组
     */
    const savePoolGroupData = async (saveData) => {
        // 查找目标分组
        const targetGroup = customGroups.value.find(group => group.id === saveData.id);

        if (!targetGroup) {
            throw new Error(`未找到词元池分组: ${saveData.id}`);
        }

        // 更新分组数据
        targetGroup.name = saveData.name;
        targetGroup.description = saveData.description;
        targetGroup.updatedAt = Date.now();

        // 保存到文件
        const saved = await saveCustomGroups();
        if (saved) {
            alert('✅ 词元池分组已保存');
            return true;
        }
        return false;
    };

    return {
        openCategoryEditor,
        saveCategoryEdit,
    };
}