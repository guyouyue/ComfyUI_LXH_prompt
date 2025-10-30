<!--src/composables/useCustomGroups.js-->
import {ref} from 'vue';
import {getSaveUserDataPath, getUserDataPath} from '../utils/pathHelper.js';

// ⭐ 全局单例状态（移到函数外部）
const customGroups = ref([]);
const allTokensMap = ref(new Map());

// ⭐ 初始化标记
let isInitialized = false;

export function useCustomGroups() {
    // 设置词库映射（从外部传入）
    const setTokensMap = (tokensFlat) => {
        console.log('[useCustomGroups] 设置词元映射，接收词元数量:', tokensFlat.length);
        allTokensMap.value.clear();
        tokensFlat.forEach(token => {
            if (token.id) allTokensMap.value.set(token.id, token);
            if (token.uniqueId) allTokensMap.value.set(token.uniqueId, token);
            if (token.en) allTokensMap.value.set(token.en.toLowerCase(), token);
            if (token.zh) allTokensMap.value.set(token.zh.toLowerCase(), token);
        });
        console.log('[useCustomGroups] 词元映射设置完成，映射大小:', allTokensMap.value.size);
    };

    // 查找引用的词元
    const findReferencedToken = (tokenId) => {
        if (!tokenId) return null;

        const found = allTokensMap.value.get(tokenId) ||
            allTokensMap.value.get(tokenId.toLowerCase()) ||
            Array.from(allTokensMap.value.values()).find(t =>
                t.id === tokenId ||
                t.en === tokenId ||
                t.zh === tokenId
            );

        if (found) {
            console.log(`[useCustomGroups] 找到引用词元: ${tokenId}`, found);
        } else {
            console.warn(`[useCustomGroups] 未找到引用词元: ${tokenId}`);
        }

        return found;
    };

    // 解析词元池中的词元
    const parsePoolTokens = (poolItem) => {
        if (!poolItem || !poolItem.tokens || !Array.isArray(poolItem.tokens)) {
            console.warn('[parsePoolTokens] 词元池数据无效:', poolItem);
            return [];
        }

        console.log(`[parsePoolTokens] 解析词元池 "${poolItem.id}"，词元数量:`, poolItem.tokens.length);

        return poolItem.tokens.map((tokenDef) => {
            if (tokenDef.type === 'quote') {
                const referenced = findReferencedToken(tokenDef.id);
                if (referenced) {
                    return {
                        ...referenced,
                        weight: tokenDef.weight || 1,
                        isReference: true,
                        type: 'quote'
                    };
                }
                return null;
            } else if (tokenDef.type === 'new') {
                return {
                    id: tokenDef.id,
                    zh: tokenDef.zh,
                    en: tokenDef.en,
                    jp: tokenDef.jp,
                    weight: tokenDef.weight || 1,
                    isReference: false,
                    type: 'new'
                };
            }
            return null;
        }).filter(Boolean);
    };

    // 加载自定义组合
    const loadCustomGroups = async () => {
        // ⭐ 避免重复加载
        if (isInitialized) {
            console.log('[useCustomGroups] 已初始化，跳过重复加载');
            return true;
        }

        try {
            console.log('[useCustomGroups] 📥 开始加载自定义组合');

            const groupPath = getUserDataPath('group.json');
            const response = await fetch(groupPath);

            if (response.ok) {
                const data = await response.json();
                const groupsData = data.groups || [];

                console.log('[useCustomGroups] 📊 原始数据:', groupsData.length);

                customGroups.value = groupsData.map(group => {
                    const processedPool = (group.pool || []).map(poolItem => {
                        const parsedTokens = parsePoolTokens(poolItem);

                        return {
                            ...poolItem,
                            parsedTokens
                        };
                    });

                    return {
                        ...group,
                        pool: processedPool,
                        expanded: false
                    };
                });

                // ⭐ 标记已初始化
                isInitialized = true;

                console.log('[useCustomGroups] ✅ 加载完成', {
                    count: customGroups.value.length,
                    data: customGroups.value
                });

                return true;
            } else {
                console.warn('[useCustomGroups] ⚠️ 文件不存在，使用空数组');
                customGroups.value = [];
                isInitialized = true;
                return false;
            }
        } catch (error) {
            console.error('[useCustomGroups] ❌ 加载失败:', error);
            customGroups.value = [];
            isInitialized = true;

            // 尝试从 localStorage 恢复
            try {
                const saved = localStorage.getItem('lxh_custom_groups');
                if (saved) {
                    const data = JSON.parse(saved);
                    customGroups.value = data.map(group => ({
                        ...group,
                        expanded: false,
                        pool: (group.pool || []).map(poolItem => ({
                            ...poolItem,
                            parsedTokens: parsePoolTokens(poolItem)
                        }))
                    }));
                    console.log('[useCustomGroups] 从 localStorage 恢复', customGroups.value.length, '个组合');
                }
            } catch (e) {
                console.error('[useCustomGroups] localStorage 恢复失败:', e);
            }
            return false;
        }
    };

    // 保存自定义组合
    const saveCustomGroups = async () => {
        try {
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useCustomGroups] 保存词组数据 (${env})`);

            const cleanGroups = customGroups.value.map(group => ({
                id: group.id,
                name: group.name,
                pool: (group.pool || []).map(poolItem => ({
                    id: poolItem.id,
                    name: poolItem.name,
                    description: poolItem.description,
                    tokens: poolItem.tokens
                }))
            }));

            const dataToSave = {
                version: '1.0.0',
                groups: cleanGroups,
                updatedAt: Date.now()
            };

            console.log('词组数量:', cleanGroups.length);

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

                // ⭐ 保存到 localStorage 作为备份
                try {
                    localStorage.setItem('lxh_custom_groups', JSON.stringify(customGroups.value));
                } catch (e) {
                    console.warn('localStorage 保存失败:', e);
                }

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

    const addCustomGroup = (groupData) => {
        const newGroup = {
            id: groupData.id || `group_${Date.now()}`,
            name: groupData.name || {zh: '', en: ''},
            pool: groupData.pool || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expanded: false
        };

        customGroups.value.push(newGroup);
        console.log('[useCustomGroups] 添加组合:', newGroup);

        saveCustomGroups();
        return newGroup;
    };

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

    const reloadGroups = async () => {
        console.log('[useCustomGroups] 🔄 重新加载组合...');
        customGroups.value = [];
        // ⭐ 重置初始化标记
        isInitialized = false;
        return await loadCustomGroups();
    };

    const getPoolByKey = (poolKey) => {
        for (const group of customGroups.value) {
            if (group.pool) {
                const found = group.pool.find(p => p.id === poolKey || p.key === poolKey);
                if (found) {
                    return {
                        ...found,
                        groupId: group.id,
                        groupName: group.name
                    };
                }
            }
        }
        return null;
    };

    // ⭐ 返回全局单例 ref
    return {
        customGroups,
        loadCustomGroups,
        addCustomGroup,
        updateCustomGroup,
        deleteCustomGroup,
        setTokensMap,
        saveCustomGroups,
        reloadGroups,
        getPoolByKey,
    };
}