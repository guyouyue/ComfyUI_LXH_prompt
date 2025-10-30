// src/composables/useAppInit.js
import {useAppStore} from './useAppStore.js';
import {useStorage} from './useStorage.js';
import {getAllTokensFlat, parseTextToTokens} from '../utils/tokenParser.js';

export function useAppInit(props, tokensComposable, groupsComposable) {
    const store = useAppStore();
    const {preferences, loadPreferences} = useStorage();

    const initializeApp = async () => {
        try {
            // 1. 加载用户偏好设置
            loadPreferences();

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
            await tokensComposable.loadTokenData();

            // 3. 设置词元映射
            const allTokensFlat = getAllTokensFlat(tokensComposable.tokenCategories.value);

            groupsComposable.setTokensMap(allTokensFlat);

            // 4. 加载自定义组合
            await groupsComposable.loadCustomGroups();

            // 5. 解析初始文本
            if (props.initialText) {
                parseInitialText(props.initialText);
            }

            return true;
        } catch (error) {
            console.error('❌ [AppInit] 初始化失败:', error);
            return false;
        }
    };

    const parseInitialText = (text) => {
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
    };

    return {
        initializeApp,
        parseInitialText,
    };
}