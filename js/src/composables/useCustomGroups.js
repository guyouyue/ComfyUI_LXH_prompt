// src/composables/useCustomGroups.js
import {ref} from 'vue';
import {getDataPath, getSaveUserDataPath, getUserDataPath} from '../utils/pathHelper.js';

// ⭐ 全局单例状态（移到函数外部）
const customGroups = ref([]);
const systemGroups = ref([]);
const userGroups = ref([]);
const allTokensMap = ref(new Map());

// ⭐ 初始化标记
let isInitialized = false;

export function useCustomGroups() {
    // 设置词库映射（从外部传入）
    const setTokensMap = (tokensFlat) => {
        allTokensMap.value.clear();
        tokensFlat.forEach(token => {
            if (token.id) allTokensMap.value.set(token.id, token);
            if (token.uniqueId) allTokensMap.value.set(token.uniqueId, token);
            if (token.en) allTokensMap.value.set(token.en.toLowerCase(), token);
            if (token.zh) allTokensMap.value.set(token.zh.toLowerCase(), token);
        });
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

        return found;
    };

    // 解析词元池中的词元
    const parsePoolTokens = (poolItem) => {
        if (!poolItem || !poolItem.tokens || !Array.isArray(poolItem.tokens)) {
            console.warn('[parsePoolTokens] 词元池数据无效:', poolItem);
            return [];
        }

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

    // ⭐ 新增：加载系统词元池
    const loadSystemGroups = async () => {
        try {
            const groupPath = getDataPath('group.json');  // 系统词元池路径
            console.log('[useCustomGroups] 📂 加载系统词元池:', groupPath);

            const response = await fetch(groupPath);

            if (response.ok) {
                const data = await response.json();
                const groupsData = data.groups || [];

                // 处理系统词元池，添加来源标记
                const processedGroups = groupsData.map(group => {
                    const processedPool = (group.pool || []).map(poolItem => {
                        const parsedTokens = parsePoolTokens(poolItem);
                        return {
                            ...poolItem,
                            parsedTokens,
                            source: 'system'
                        };
                    });

                    return {
                        ...group,
                        pool: processedPool,
                        source: 'system',
                        expanded: false
                    };
                });

                systemGroups.value = processedGroups;
                console.log('[useCustomGroups] ✅ 系统词元池加载成功，组数:', processedGroups.length);
                return processedGroups;
            }

            console.warn('[useCustomGroups] ⚠️ 系统词元池文件不存在');
            return [];
        } catch (error) {
            console.warn('[useCustomGroups] ⚠️ 系统词元池加载失败:', error);
            return [];
        }
    };

    // ⭐ 新增：加载用户词元池
    const loadUserGroups = async () => {
        try {
            const groupPath = getUserDataPath('group.json');
            console.log('[useCustomGroups] 📂 加载用户词元池:', groupPath);

            const response = await fetch(groupPath);

            if (response.ok) {
                const data = await response.json();
                const groupsData = data.groups || [];

                // 处理用户词元池，添加来源标记
                const processedGroups = groupsData.map(group => {
                    const processedPool = (group.pool || []).map(poolItem => {
                        const parsedTokens = parsePoolTokens(poolItem);
                        return {
                            ...poolItem,
                            parsedTokens,
                            source: 'user'
                        };
                    });

                    return {
                        ...group,
                        pool: processedPool,
                        source: 'user',
                        expanded: false
                    };
                });

                userGroups.value = processedGroups;
                console.log('[useCustomGroups] ✅ 用户词元池加载成功，组数:', processedGroups.length);
                return processedGroups;
            }

            console.warn('[useCustomGroups] ⚠️ 用户词元池文件不存在');
            return [];
        } catch (error) {
            console.warn('[useCustomGroups] ⚠️ 用户词元池加载失败:', error);
            return [];
        }
    };

    // ⭐ 新增：合并词元池数据（用户优先）
    const mergeGroupData = (systemData, userData) => {
        console.group('[useCustomGroups] 🔄 合并词元池数据');
        console.log('系统组数:', systemData.length);
        console.log('用户组数:', userData.length);

        // 创建用户组和池的映射（用于快速查找）
        const userGroupMap = new Map();
        const userPoolMap = new Map();

        userData.forEach(group => {
            userGroupMap.set(group.id, group);
            group.pool?.forEach(pool => {
                if (pool.id) {
                    userPoolMap.set(`${group.id}_${pool.id}`, pool);
                }
            });
        });

        const mergedGroups = [];

        // 首先添加所有用户组（完全保留）
        userData.forEach(userGroup => {
            mergedGroups.push({
                ...userGroup,
                source: 'user'
            });
        });

        // 然后处理系统组
        systemData.forEach(systemGroup => {
            const existingUserGroup = userGroupMap.get(systemGroup.id);

            if (existingUserGroup) {
                // 如果用户已有同ID的组，将系统组中用户没有的池合并进去
                const mergedGroup = mergedGroups.find(g => g.id === systemGroup.id);

                if (mergedGroup && systemGroup.pool) {
                    systemGroup.pool.forEach(systemPool => {
                        const poolKey = `${systemGroup.id}_${systemPool.id}`;
                        // 检查用户是否已有这个池
                        if (!userPoolMap.has(poolKey)) {
                            mergedGroup.pool.push({
                                ...systemPool,
                                source: 'system'
                            });
                        }
                    });
                }
            } else {
                // 用户没有这个组，直接添加系统组
                mergedGroups.push({
                    ...systemGroup,
                    source: 'system',
                    pool: (systemGroup.pool || []).map(pool => ({
                        ...pool,
                        source: 'system'
                    }))
                });
            }
        });

        // 统计合并结果
        const totalPools = mergedGroups.reduce((sum, g) => sum + (g.pool?.length || 0), 0);
        console.log('合并后组数:', mergedGroups.length);
        console.log('合并后总池数:', totalPools);
        console.groupEnd();

        customGroups.value = mergedGroups;
    };

    // ⭐ 修改：加载自定义组合（同时加载系统和用户）
    const loadCustomGroups = async () => {
        // ⭐ 避免重复加载
        if (isInitialized) {
            console.log('[useCustomGroups] ⏭️ 已初始化，跳过加载');
            return true;
        }

        try {
            console.group('[useCustomGroups] 🚀 开始加载词元池数据');

            // 同时加载系统词元池和用户词元池
            const [systemData, userData] = await Promise.allSettled([
                loadSystemGroups(),
                loadUserGroups()
            ]);

            // 合并词元池数据，用户优先
            mergeGroupData(
                systemData.status === 'fulfilled' ? systemData.value : [],
                userData.status === 'fulfilled' ? userData.value : []
            );

            // ⭐ 标记已初始化
            isInitialized = true;

            console.log('[useCustomGroups] ✅ 词元池加载完成');
            console.groupEnd();
            return true;
        } catch (error) {
            console.error('[useCustomGroups] ❌ 加载失败:', error);
            console.groupEnd();

            customGroups.value = [];
            systemGroups.value = [];
            userGroups.value = [];
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
                    console.log('[useCustomGroups] 📦 从 localStorage 恢复成功');
                }
            } catch (e) {
                console.error('[useCustomGroups] localStorage 恢复失败:', e);
            }
            return false;
        }
    };

    // 保存自定义组合（只保存用户数据）
    const saveCustomGroups = async () => {
        try {
            const env = import.meta.env.DEV ? '🔧 开发环境' : '📦 生产环境';
            console.group(`💾 [useCustomGroups] 保存词组数据 (${env})`);

            // ⭐ 只保存用户创建/修改的组和池
            const cleanGroups = customGroups.value
                .filter(group => group.source === 'user' || hasUserModifiedPools(group))
                .map(group => ({
                    id: group.id,
                    name: group.name,
                    source: 'user',
                    pool: (group.pool || [])
                        .filter(poolItem => poolItem.source === 'user')
                        .map(poolItem => ({
                            id: poolItem.id,
                            name: poolItem.name,
                            description: poolItem.description,
                            tokens: poolItem.tokens
                        }))
                }))
                .filter(group => group.pool.length > 0);  // 过滤掉没有用户池的组

            const dataToSave = {
                version: '1.0.0',
                groups: cleanGroups,
                updatedAt: Date.now()
            };

            console.log('保存的组数:', cleanGroups.length);

            const savePath = getSaveUserDataPath();

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

    // ⭐ 辅助函数：检查组是否有用户修改的池
    const hasUserModifiedPools = (group) => {
        return group.pool?.some(pool => pool.source === 'user');
    };

    const addCustomGroup = (groupData) => {
        const newGroup = {
            id: groupData.id || `group_${Date.now()}`,
            name: groupData.name || {zh: '', en: ''},
            pool: groupData.pool || [],
            source: 'user',  // ⭐ 标记为用户创建
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expanded: false
        };

        customGroups.value.push(newGroup);

        // 同时更新 userGroups
        userGroups.value.push(newGroup);

        saveCustomGroups();
        return newGroup;
    };

    // ⭐ 新增：添加词元池到组
    const addPoolToGroup = (groupId, poolData) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (!group) {
            console.warn('[addPoolToGroup] 未找到组:', groupId);
            return null;
        }

        const newPool = {
            id: poolData.id || `pool_${Date.now()}`,
            name: poolData.name || {zh: '', en: ''},
            description: poolData.description || '',
            tokens: poolData.tokens || [],
            source: 'user',  // ⭐ 标记为用户创建
            parsedTokens: parsePoolTokens(poolData),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        if (!group.pool) {
            group.pool = [];
        }
        group.pool.push(newPool);

        // 如果组原本是系统组，现在有了用户池，需要更新
        if (group.source === 'system') {
            group.source = 'mixed';  // 或者保持 system，只在保存时处理
        }

        saveCustomGroups();
        return newPool;
    };

    const updateCustomGroup = (groupId, updates) => {
        const index = customGroups.value.findIndex(g => g.id === groupId);
        if (index !== -1) {
            customGroups.value[index] = {
                ...customGroups.value[index],
                ...updates,
                updatedAt: Date.now()
            };
            saveCustomGroups();
            return true;
        }
        return false;
    };

    // ⭐ 新增：更新词元池
    const updatePool = (groupId, poolId, updates) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (!group || !group.pool) {
            return false;
        }

        const poolIndex = group.pool.findIndex(p => p.id === poolId);
        if (poolIndex !== -1) {
            group.pool[poolIndex] = {
                ...group.pool[poolIndex],
                ...updates,
                source: 'user',  // 修改后标记为用户数据
                parsedTokens: parsePoolTokens({
                    ...group.pool[poolIndex],
                    ...updates
                }),
                updatedAt: Date.now()
            };
            saveCustomGroups();
            return true;
        }
        return false;
    };

    const deleteCustomGroup = (groupId) => {
        const group = customGroups.value.find(g => g.id === groupId);

        // ⭐ 如果是系统组，不允许删除（或者只删除其中的用户池）
        if (group?.source === 'system') {
            console.warn('[deleteCustomGroup] 不能删除系统组:', groupId);
            return false;
        }

        const index = customGroups.value.findIndex(g => g.id === groupId);
        if (index !== -1) {
            customGroups.value.splice(index, 1);

            // 同时从 userGroups 中移除
            const userIndex = userGroups.value.findIndex(g => g.id === groupId);
            if (userIndex !== -1) {
                userGroups.value.splice(userIndex, 1);
            }

            saveCustomGroups();
            return true;
        }
        return false;
    };

    // ⭐ 新增：删除词元池
    const deletePool = (groupId, poolId) => {
        const group = customGroups.value.find(g => g.id === groupId);
        if (!group || !group.pool) {
            return false;
        }

        const pool = group.pool.find(p => p.id === poolId);

        // ⭐ 如果是系统池，不允许删除
        if (pool?.source === 'system') {
            console.warn('[deletePool] 不能删除系统池:', poolId);
            return false;
        }

        const poolIndex = group.pool.findIndex(p => p.id === poolId);
        if (poolIndex !== -1) {
            group.pool.splice(poolIndex, 1);
            saveCustomGroups();
            return true;
        }
        return false;
    };

    const reloadGroups = async () => {
        customGroups.value = [];
        systemGroups.value = [];
        userGroups.value = [];
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

    // ⭐ 新增：刷新合并数据
    const refreshMergedData = async () => {
        mergeGroupData(systemGroups.value, userGroups.value);
    };

    // ⭐ 返回全局单例 ref
    return {
        customGroups,
        systemGroups,
        userGroups,
        loadCustomGroups,
        addCustomGroup,
        addPoolToGroup,
        updateCustomGroup,
        updatePool,
        deleteCustomGroup,
        deletePool,
        setTokensMap,
        saveCustomGroups,
        reloadGroups,
        getPoolByKey,
        refreshMergedData,
    };
}