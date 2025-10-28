import {ref} from 'vue';
import {getUserDataPath} from '../utils/pathHelper.js';

export function useCustomGroups() {
    const customGroups = ref([]);
    const allTokensMap = ref(new Map()); // 用于存储所有词元的映射

    // 设置词库映射（从外部传入）
    const setTokensMap = (tokensFlat) => {
        console.log('[useCustomGroups] 设置词元映射，接收词元数量:', tokensFlat.length);
        allTokensMap.value.clear();
        tokensFlat.forEach(token => {
            allTokensMap.value.set(token.id, token);
        });
        console.log('[useCustomGroups] 词元映射设置完成，映射大小:', allTokensMap.value.size);
    };

    // 解析组合中的词元（处理 quote 和 new 类型）
    const parseGroupTokens = (group) => {
        if (!group.tokens) {
            console.log('[parseGroupTokens] 组合没有 tokens 字段:', group.key);
            return [];
        }

        console.log(`[parseGroupTokens] 开始解析组合 "${group.key}"，词元定义数量:`, group.tokens.length);

        const parsedTokens = group.tokens.map((tokenDef, index) => {
            console.log(`[parseGroupTokens] 处理第 ${index + 1} 个词元定义:`, tokenDef);

            if (tokenDef.type === 'quote') {
                // 引用类型：从词库中查找
                console.log(`[parseGroupTokens] 查找引用词元 ID: ${tokenDef.id}`);
                const referencedToken = allTokensMap.value.get(tokenDef.id);
                if (referencedToken) {
                    console.log(`[parseGroupTokens] 找到引用词元:`, referencedToken);
                    return {
                        ...referencedToken,
                        weight: tokenDef.weight || 1,
                        isQuoted: true
                    };
                } else {
                    console.warn(`[parseGroupTokens] 未找到引用词元 ID: ${tokenDef.id}`);
                    return null;
                }
            } else if (tokenDef.type === 'new') {
                // 新建类型：直接使用
                console.log(`[parseGroupTokens] 处理新建词元:`, tokenDef);
                return {
                    id: tokenDef.id,
                    zh: tokenDef.zh,
                    en: tokenDef.en,
                    weight: tokenDef.weight || 1,
                    isNew: true
                };
            }
            console.warn(`[parseGroupTokens] 未知的词元类型: ${tokenDef.type}`);
            return null;
        }).filter(Boolean);

        console.log(`[parseGroupTokens] 组合 "${group.key}" 解析完成，有效词元数量:`, parsedTokens.length);
        return parsedTokens;
    };

    // 加载自定义组合
    const loadCustomGroups = async () => {
        try {
            console.log('[useCustomGroups] 开始加载自定义组合');

            const groupPath = getUserDataPath('group.json');
            console.log('[useCustomGroups] 请求路径:', groupPath);

            const response = await fetch(groupPath);
            if (response.ok) {
                const data = await response.json();
                customGroups.value = (data.groups || []).map(group => ({
                    ...group,
                    expanded: false,
                    parsedTokens: parseGroupTokens(group) // 解析后的词元
                }));
                return true;
            }
        } catch (error) {
            console.warn('[useCustomGroups] 加载失败:', error);
            customGroups.value = [];

            try {
                const saved = localStorage.getItem('lxh_custom_groups');
                if (saved) {
                    const data = JSON.parse(saved);
                    customGroups.value = data.map(group => ({
                        ...group,
                        expanded: false,
                        parsedTokens: parseGroupTokens(group)
                    }));
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
            key: groupData.key || groupData.id || `group_${Date.now()}`,
            zh: groupData.zh || '',
            en: groupData.en || '',
            description: groupData.description || groupData.zh || groupData.en,
            tokens: groupData.tokens || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expanded: false,
            parsedTokens: parseGroupTokens(groupData)
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
                updatedAt: Date.now(),
                parsedTokens: parseGroupTokens({
                    ...customGroups.value[index],
                    ...updates
                })
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
                type: 'new',
                id: tokenData.id || `token_${Date.now()}`,
                zh: tokenData.zh,
                en: tokenData.en,
                weight: tokenData.weight || 1,
                addedAt: Date.now()
            };

            group.tokens.push(newToken);
            group.updatedAt = Date.now();
            group.parsedTokens = parseGroupTokens(group);
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
                group.parsedTokens = parseGroupTokens(group);
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
                group.parsedTokens = parseGroupTokens(group);
                saveCustomGroups();
                return true;
            }
        }
        return false;
    };

    // 根据权重随机选择一个词元
    const selectRandomToken = (groupId) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (!group || !group.parsedTokens || group.parsedTokens.length === 0) {
            return null;
        }

        const totalWeight = group.parsedTokens.reduce((sum, token) => sum + (token.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const token of group.parsedTokens) {
            random -= (token.weight || 1);
            if (random <= 0) {
                console.log('[useCustomGroups] 选中词元:', token, '来自组合:', groupId);
                return token;
            }
        }

        return group.parsedTokens[group.parsedTokens.length - 1];
    };

    // 根据 key 获取组合
    const getGroupByKey = (key) => {
        return customGroups.value.find(g => g.key === key || g.id === key);
    };

    // 保存到本地存储（合并保存）
    const saveCustomGroups = async () => {
        try {
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useCustomGroups] 保存词组数据 (${env})`);

            // 1. 读取现有数据
            let existingData = {groups: []};
            try {
                const groupPath = getUserDataPath('group.json');
                const response = await fetch(groupPath);
                if (response.ok) {
                    existingData = await response.json();
                    console.log('📖 读取现有词组，数量:', existingData.groups?.length || 0);
                }
            } catch (error) {
                console.warn('⚠️ 读取现有词组失败，使用空数据:', error);
            }

            // 2. 合并数据
            const groupMap = new Map();

            // 添加现有词组
            (existingData.groups || []).forEach(group => {
                groupMap.set(group.id, group);
            });

            // 更新/添加当前词组
            customGroups.value.forEach(group => {
                groupMap.set(group.id, {
                    ...groupMap.get(group.id),
                    ...group,
                    updatedAt: Date.now()
                });
            });

            const mergedGroups = Array.from(groupMap.values());

            const dataToSave = {
                groups: mergedGroups,
                updatedAt: Date.now()
            };

            console.log('📊 合并结果:', {
                existing: existingData.groups?.length || 0,
                current: customGroups.value.length,
                merged: mergedGroups.length
            });

            // 3. 保存
            const savePath = getSaveUserDataPath();
            console.log('保存路径:', savePath);

            const response = await fetch(savePath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 保存成功:', result);
                console.groupEnd();
                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ 保存失败:', response.status, errorText);
                console.groupEnd();
                return false;
            }
        } catch (error) {
            console.error('❌ 保存异常:', error);
            console.groupEnd();
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
        getGroupByKey,
        setTokensMap,
        saveCustomGroups,
        reloadGroups
    };
}