import {ref} from 'vue';
import {getUserDataPath} from '../utils/pathHelper.js';

export function useCustomGroups() {
    const customGroups = ref([]);

    // 加载自定义组合
    const loadCustomGroups = async () => {
        try {
            console.log('[useCustomGroups] 开始加载自定义组合');

            const groupPath = getUserDataPath('group.json');
            console.log('[useCustomGroups] 请求路径:', groupPath);

            const response = await fetch(groupPath);
            if (response.ok) {
                const data = await response.json();
                customGroups.value = data.groups || [];
                console.log('[useCustomGroups] 加载成功，共', customGroups.value.length, '个组合');
                return true;
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.warn('[useCustomGroups] 加载失败:', error);
            console.log('[useCustomGroups] 尝试从 localStorage 恢复...');

            customGroups.value = [];

            // 尝试从 localStorage 恢复
            try {
                const saved = localStorage.getItem('lxh_custom_groups');
                if (saved) {
                    customGroups.value = JSON.parse(saved);
                    console.log('[useCustomGroups] 从 localStorage 恢复', customGroups.value.length, '个组合');
                }
            } catch (e) {
                console.error('[useCustomGroups] localStorage 恢复失败:', e);
            }
        }
        return false;
    };

    // 添加新组合
    const addCustomGroup = (groupData) => {
        const newGroup = {
            id: groupData.id || `group_${Date.now()}`,
            description: groupData.description || '',
            tokens: groupData.tokens || [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        customGroups.value.push(newGroup);
        console.log('[useCustomGroups] 添加组合:', newGroup);

        saveCustomGroups();
        return newGroup;
    };

    // 更新组合
    const updateCustomGroup = (groupId, updates) => {
        const index = customGroups.value.findIndex(g => g.id === groupId);
        if (index !== -1) {
            customGroups.value[index] = {
                ...customGroups.value[index],
                ...updates,
                updatedAt: Date.now()
            };
            console.log('[useCustomGroups] 更新组合:', groupId);
            saveCustomGroups();
            return true;
        }
        return false;
    };

    // 删除组合
    const deleteCustomGroup = (groupId) => {
        const index = customGroups.value.findIndex(g => g.id === groupId);
        if (index !== -1) {
            customGroups.value.splice(index, 1);
            console.log('[useCustomGroups] 删除组合:', groupId);
            saveCustomGroups();
            return true;
        }
        return false;
    };

    // 添加候选词元到组合
    const addTokenToGroup = (groupId, tokenData) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (group) {
            const newToken = {
                id: tokenData.id || `token_${Date.now()}`,
                zh: tokenData.zh,
                en: tokenData.en,
                weight: tokenData.weight || 1,
                addedAt: Date.now()
            };

            group.tokens.push(newToken);
            group.updatedAt = Date.now();
            console.log('[useCustomGroups] 添加词元到组合:', groupId, newToken);

            saveCustomGroups();
            return newToken;
        }
        return null;
    };

    // 更新组合中的词元权重
    const updateTokenWeight = (groupId, tokenId, weight) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (group) {
            const token = group.tokens.find(t => t.id === tokenId);
            if (token) {
                token.weight = weight;
                group.updatedAt = Date.now();
                saveCustomGroups();
                return true;
            }
        }
        return false;
    };

    // 从组合中移除词元
    const removeTokenFromGroup = (groupId, tokenId) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (group) {
            const index = group.tokens.findIndex(t => t.id === tokenId);
            if (index !== -1) {
                group.tokens.splice(index, 1);
                group.updatedAt = Date.now();
                saveCustomGroups();
                return true;
            }
        }
        return false;
    };

    // 根据权重随机选择一个词元
    const selectRandomToken = (groupId) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (!group || group.tokens.length === 0) {
            return null;
        }

        // 计算总权重
        const totalWeight = group.tokens.reduce((sum, token) => sum + (token.weight || 1), 0);

        // 生成随机数
        let random = Math.random() * totalWeight;

        // 根据权重选择
        for (const token of group.tokens) {
            random -= (token.weight || 1);
            if (random <= 0) {
                console.log('[useCustomGroups] 选中词元:', token, '来自组合:', groupId);
                return token;
            }
        }

        // 兜底返回最后一个
        return group.tokens[group.tokens.length - 1];
    };

    // 保存到本地存储
    const saveCustomGroups = async () => {
        try {
            // 保存到本地存储
            localStorage.setItem('lxh_custom_groups', JSON.stringify(customGroups.value));
            console.log('[useCustomGroups] 已保存到 localStorage');

            // 保存到服务器
            if (!import.meta.env.DEV) {
                const savePath = getSaveUserDataPath();
                const response = await fetch(savePath, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({groups: customGroups.value})
                });

                if (response.ok) {
                    console.log('[useCustomGroups] 自定义组合已保存到服务器');
                }
            }

            return true;
        } catch (error) {
            console.error('[useCustomGroups] 保存失败:', error);
            return false;
        }
    };

    // 重新加载（开发用）
    const reloadGroups = async () => {
        console.log('[useCustomGroups] 🔄 重新加载组合...');
        customGroups.value = [];
        return await loadCustomGroups();
    };

    return {
        customGroups,
        loadCustomGroups,
        addCustomGroup,
        updateCustomGroup,
        deleteCustomGroup,
        addTokenToGroup,
        updateTokenWeight,
        removeTokenFromGroup,
        selectRandomToken,
        saveCustomGroups,
        reloadGroups
    };
}