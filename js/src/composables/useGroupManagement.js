// src/composables/useGroupManagement.js
import {useCustomGroups} from './useCustomGroups.js';

export function useGroupManagement() {
    const {
        customGroups,
        addCustomGroup,
        updateCustomGroup,
        deleteCustomGroup,
        addTokenToGroup,
        updateTokenWeight,
        removeTokenFromGroup,
        selectRandomToken,
    } = useCustomGroups();

    /**
     * 处理分组确认
     */
    const handleGroupConfirm = (groupData, editingGroup) => {
        if (editingGroup) {
            updateCustomGroup(editingGroup.id, groupData);
        } else {
            addCustomGroup(groupData);
        }
    };

    /**
     * 添加词元到分组
     */
    const handleAddTokenToGroup = (groupId, token, weight = 1) => {
        addTokenToGroup(groupId, {
            ...token,
            weight,
        });
    };

    /**
     * 获取词元池项目显示名称
     */
    const getPoolItemDisplayName = (poolItem, language = 'zh') => {
        if (poolItem.name) {
            return language === 'zh' ? poolItem.name.zh : poolItem.name.en;
        }
        return poolItem.description || poolItem.id;
    };

    return {
        customGroups,
        handleGroupConfirm,
        handleAddTokenToGroup,
        getPoolItemDisplayName,
        addCustomGroup,
        updateCustomGroup,
        deleteCustomGroup,
        addTokenToGroup,
        updateTokenWeight,
        removeTokenFromGroup,
        selectRandomToken,
    };
}