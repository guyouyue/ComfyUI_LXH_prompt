// src/composables/useAppInit.js
import {useAppStore} from './useAppStore.js';
import {useStorage} from './useStorage.js';
import {getAllTokensFlat, parseTextToTokens} from '../utils/tokenParser.js';

export function useAppInit(props, tokensComposable, groupsComposable) {
    const store = useAppStore();
    const {preferences, loadPreferences} = useStorage();

    const initializeApp = async () => {
        try {
            console.log('[AppInit] 🚀 开始初始化应用');

            // 1. 加载用户偏好设置
            loadPreferences();
            console.log('[AppInit] ✅ 偏好设置已加载');

            if (preferences.value.outputMode) {
                store.setOutputMode(preferences.value.outputMode);
            }
            if (preferences.value.outputLanguage) {
                store.setOutputLanguage(preferences.value.outputLanguage);
            }
            if (preferences.value.viewLanguage) {
                store.setViewLanguage(preferences.value.viewLanguage);
            }

            // 2. 加载词库数据
            console.log('[AppInit] 📚 开始加载词库数据');
            await tokensComposable.loadTokenData();
            console.log('[AppInit] ✅ 词库数据已加载', {
                categories: tokensComposable.tokenCategories.value.length
            });

            // 3. 设置词元映射
            console.log('[AppInit] 🔗 开始设置词元映射');
            const allTokensFlat = getAllTokensFlat(tokensComposable.tokenCategories.value);
            console.log('[AppInit] 📊 扁平化词元数量:', allTokensFlat.length);

            groupsComposable.setTokensMap(allTokensFlat);
            console.log('[AppInit] ✅ 词元映射已设置');

            // 4. 加载自定义组合
            console.log('[AppInit] 🎲 开始加载自定义组合');
            await groupsComposable.loadCustomGroups();
            console.log('[AppInit] ✅ 自定义组合已加载', {
                groups: groupsComposable.customGroups.value.length
            });

            // 5. 解析初始文本
            if (props.initialText) {
                console.log('[AppInit] 📝 开始解析初始文本');
                parseInitialText(props.initialText);
            }

            console.log('[AppInit] 🎉 应用初始化完成');
            return true;
        } catch (error) {
            console.error('❌ [AppInit] 初始化失败:', error);
            return false;
        }
    };

    const parseInitialText = (text) => {
        console.log('[AppInit] 解析初始文本:', text);

        const tokens = parseTextToTokens(
            text,
            tokensComposable.tokenCategories.value,
            groupsComposable.customGroups.value,
            store.outputMode.value
        );

        tokens.forEach(token => {
            if (!token.original) {
                token.original = token.value;
            }
        });

        store.setFinalTokens(tokens);
        console.log('[AppInit] ✅ 解析完成，词元数量:', tokens.length);
    };

    return {
        initializeApp,
        parseInitialText,
    };
}