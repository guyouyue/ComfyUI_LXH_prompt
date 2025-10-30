// src/composables/useAppStore.js
import {computed, ref} from 'vue';
import {FOCUS_AREAS, LANGUAGES, OUTPUT_MODES} from '../utils/constants.js';

// 全局状态（单例模式）
const state = {
    // ========== UI 状态 ==========
    outputMode: ref(OUTPUT_MODES.TOKEN),
    outputLanguage: ref(LANGUAGES.ZH),
    viewLanguage: ref(LANGUAGES.ZH),
    focusedArea: ref(FOCUS_AREAS.OUTPUT),

    // ========== 词元数据 ==========
    finalTokens: ref([]),

    // ========== 对话框状态 ==========
    showingGroupDialog: ref(false),
    editingGroup: ref(null),
    showingTokenSelector: ref(false),
    currentGroupForToken: ref(null),

    // ========== 编辑器状态 ==========
    editingToken: ref(null),
    editingTokenType: ref('single'), // 'single', 'unmapped', 'pool'
    showEditor: ref(false),
};

// 在现有的 ref 定义后添加：
const showCategoryEditor = ref(false);
const editingCategory = ref(null);
const editingCategoryType = ref(null); // 'category' | 'subcategory' | 'pool'

export function useAppStore() {
    // ========== Getters (计算属性) ==========
    const hasEditingToken = computed(() => {
        return state.finalTokens.value.some(token => token.isEditing);
    });

    const mappedTokensCount = computed(() => {
        return state.finalTokens.value.filter(t => t.mapping && !t.isCustomPool).length;
    });

    const unmappedTokensCount = computed(() => {
        return state.finalTokens.value.filter(
            t => !t.mapping && !t.isCustomPool && !t.isEditing
        ).length;
    });

    const poolTokensCount = computed(() => {
        return state.finalTokens.value.filter(t => t.isCustomPool).length;
    });

    // ========== Actions (状态修改方法) ==========
    const setOutputMode = (mode) => {
        state.outputMode.value = mode;
    };

    const setOutputLanguage = (lang) => {
        state.outputLanguage.value = lang;
    };

    const setViewLanguage = (lang) => {
        state.viewLanguage.value = lang;
    };

    const setFocusedArea = (area) => {
        state.focusedArea.value = area;
    };

    const setFinalTokens = (tokens) => {
        state.finalTokens.value = tokens;
    };

    const addFinalToken = (token, position = null) => {
        if (position !== null) {
            state.finalTokens.value.splice(position, 0, token);
        } else {
            state.finalTokens.value.push(token);
        }
    };

    const removeFinalToken = (index) => {
        state.finalTokens.value.splice(index, 1);
    };

    const updateFinalToken = (index, updates) => {
        if (index >= 0 && index < state.finalTokens.value.length) {
            state.finalTokens.value[index] = {
                ...state.finalTokens.value[index],
                ...updates
            };
        }
    };

    const replaceFinalToken = (index, newToken) => {
        if (index >= 0 && index < state.finalTokens.value.length) {
            state.finalTokens.value[index] = newToken;
        }
    };

    const reorderTokens = (fromIndex, toIndex) => {
        const tokens = [...state.finalTokens.value];
        const [movedToken] = tokens.splice(fromIndex, 1);
        tokens.splice(toIndex, 0, movedToken);
        state.finalTokens.value = tokens;
    };

    const openEditor = (token, type) => {
        state.editingToken.value = token;
        state.editingTokenType.value = type;
        state.showEditor.value = true;
    };

    const closeEditor = () => {
        state.editingToken.value = null;
        state.editingTokenType.value = 'single';
        state.showEditor.value = false;
    };

    const updateEditingToken = (updates) => {
        if (state.editingToken.value) {
            state.editingToken.value = {
                ...state.editingToken.value,
                ...updates
            };
        }
    };

    const openGroupDialog = (group = null) => {
        state.editingGroup.value = group;
        state.showingGroupDialog.value = true;
    };

    const closeGroupDialog = () => {
        state.editingGroup.value = null;
        state.showingGroupDialog.value = false;
    };

    const openTokenSelector = (groupId = null) => {
        state.currentGroupForToken.value = groupId;
        state.showingTokenSelector.value = true;
    };

    const closeTokenSelector = () => {
        state.currentGroupForToken.value = null;
        state.showingTokenSelector.value = false;
    };

    /**
     * 打开分类编辑器
     */
    const openCategoryEditor = (categoryData, categoryType) => {
        editingCategory.value = categoryData;
        editingCategoryType.value = categoryType;
        showCategoryEditor.value = true;
        state.showEditor.value = true; // 显示编辑面板
        console.log('[AppStore] 打开分类编辑器:', {categoryType, categoryData});
    };

    /**
     * 关闭分类编辑器
     */
    const closeCategoryEditor = () => {
        editingCategory.value = null;
        editingCategoryType.value = null;
        showCategoryEditor.value = false;
        state.showEditor.value = false;
        console.log('[AppStore] 关闭分类编辑器');
    };

    // ========== 返回接口 ==========
    return {
        // State
        outputMode: state.outputMode,
        outputLanguage: state.outputLanguage,
        viewLanguage: state.viewLanguage,
        focusedArea: state.focusedArea,
        finalTokens: state.finalTokens,
        showingGroupDialog: state.showingGroupDialog,
        editingGroup: state.editingGroup,
        showingTokenSelector: state.showingTokenSelector,
        currentGroupForToken: state.currentGroupForToken,
        editingToken: state.editingToken,
        editingTokenType: state.editingTokenType,
        showEditor: state.showEditor,

        // Getters
        hasEditingToken,
        mappedTokensCount,
        unmappedTokensCount,
        poolTokensCount,

        // Actions
        setOutputMode,
        setOutputLanguage,
        setViewLanguage,
        setFocusedArea,
        setFinalTokens,
        addFinalToken,
        removeFinalToken,
        updateFinalToken,
        replaceFinalToken,
        reorderTokens,
        openEditor,
        closeEditor,
        updateEditingToken,
        openGroupDialog,
        closeGroupDialog,
        openTokenSelector,
        closeTokenSelector,
        showCategoryEditor,
        editingCategory,
        editingCategoryType,
        openCategoryEditor,
        closeCategoryEditor,
    };
}