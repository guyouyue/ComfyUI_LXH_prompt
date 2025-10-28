<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';
import FinalOutput from './components/FinalOutput.vue';
import TokenPool from './components/TokenPool.vue';
import GroupDialog from './components/GroupDialog.vue';
import TokenSelector from './components/TokenSelector.vue';
import TokenEditor from './components/TokenEditor.vue';

import {useTokens} from './composables/useTokens.js';
import {useCustomGroups} from './composables/useCustomGroups.js';
import {useCursor} from './composables/useCursor.js';
import {useStorage} from './composables/useStorage.js';

import {getAllTokensFlat, parseTextToTokens, tokensToText} from './utils/tokenParser.js';
import {FOCUS_AREAS, LANGUAGES, OUTPUT_MODES} from './utils/constants.js';

const props = defineProps({
  initialText: String,
});

const emit = defineEmits(['close']);

// ===== 状态管理 =====
const outputMode = ref(OUTPUT_MODES.TOKEN);
const outputLanguage = ref(LANGUAGES.ZH);
const viewLanguage = ref(LANGUAGES.ZH);
const focusedArea = ref(FOCUS_AREAS.OUTPUT);

// 组合式函数
const {
  tokenCategories,
  userTokens,
  systemTokens,
  loadTokenData,
  addNewToken,
  updateUserToken,
  addUserToken,
  saveUserTokens,
  saveUserTokenData,
  refreshMergedData,
  reloadData
} = useTokens();

const {
  customGroups,
  loadCustomGroups,
  addCustomGroup,
  updateCustomGroup,
  deleteCustomGroup,
  addTokenToGroup,
  updateTokenWeight,
  removeTokenFromGroup,
  selectRandomToken,
  reloadGroups,
  setTokensMap
} = useCustomGroups();

const {cursorPosition, setCursor} = useCursor();
const {preferences, loadPreferences, updatePreferences} = useStorage();

// 最终词元列表
const finalTokens = ref([]);

// 对话框状态
const showingGroupDialog = ref(false);
const editingGroup = ref(null);
const showingTokenSelector = ref(false);
const currentGroupForToken = ref(null);

// 左侧面板编辑状态
const editingToken = ref(null);
const editingTokenType = ref('single'); // 'single', 'unmapped', 'pool'
const showEditor = ref(false); // 是否显示编辑器

// ===== 计算属性 =====
const finalText = computed(() => {
  return tokensToText(finalTokens.value, outputMode.value, outputLanguage.value);
});

const allTokensFlat = computed(() => {
  return getAllTokensFlat(tokenCategories.value);
});

const hasEditingToken = computed(() => {
  return finalTokens.value.some(token => token.isEditing);
});

// 统计信息
const mappedTokensCount = computed(() => {
  return finalTokens.value.filter(t => t.mapping && !t.isCustomPool).length;
});

const unmappedTokensCount = computed(() => {
  return finalTokens.value.filter(t => !t.mapping && !t.isCustomPool && !t.isEditing).length;
});

const poolTokensCount = computed(() => {
  return finalTokens.value.filter(t => t.isCustomPool).length;
});

// ===== 生命周期 =====
onMounted(async () => {
  loadPreferences();

  if (preferences.value.outputMode) {
    outputMode.value = preferences.value.outputMode;
  }
  if (preferences.value.outputLanguage) {
    outputLanguage.value = preferences.value.outputLanguage;
  }
  if (preferences.value.viewLanguage) {
    viewLanguage.value = preferences.value.viewLanguage;
  }

  await loadTokenData();
  const {setTokensMap} = useCustomGroups();
  setTokensMap(allTokensFlat.value);
  await loadCustomGroups();

  if (props.initialText) {
    parseInitialText(props.initialText);
  }

  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// ===== 方法 =====
const parseInitialText = (text) => {
  finalTokens.value = parseTextToTokens(text, tokenCategories.value, outputMode.value);
  finalTokens.value.forEach(token => {
    if (!token.original) {
      token.original = token.value;
    }
  });
};

const handleKeyDown = (e) => {
  if (showingGroupDialog.value || showingTokenSelector.value) {
    if (e.key === 'Escape') {
      showingGroupDialog.value = false;
      showingTokenSelector.value = false;
    }
    return;
  }

  if (hasEditingToken.value) {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.ctrlKey && e.key === 'Enter') {
      const editingIndex = finalTokens.value.findIndex(t => t.isEditing);
      if (editingIndex !== -1) {
        handleEditConfirm(editingIndex);
      }
      setTimeout(() => {
        handleConfirm();
      }, 100);
    }
    return;
  }

  if (e.key === 'Escape') {
    handleCancel();
  } else if (e.ctrlKey && e.key === 'Enter') {
    handleConfirm();
  } else if (e.key === ' ' && focusedArea.value === FOCUS_AREAS.OUTPUT) {
    if (cursorPosition.value.index !== null) {
      e.preventDefault();
      handleInsertNewToken();
    }
  }
};

const handleInsertNewToken = () => {
  const pos = cursorPosition.value.area === 'output' && cursorPosition.value.index != null
      ? cursorPosition.value.index + 1
      : finalTokens.value.length;

  const newToken = {
    id: `editing_${Date.now()}_${Math.random()}`,
    value: '',
    original: '',
    display: '',
    mapping: null,
    isEditing: true
  };

  finalTokens.value.splice(pos, 0, newToken);
  setCursor('output', pos);
};

const handleEditConfirm = (index) => {
  const token = finalTokens.value[index];
  if (!token || !token.isEditing) return;

  const value = token.value.trim();

  if (!value) {
    finalTokens.value.splice(index, 1);
    if (index > 0) {
      setCursor('output', index - 1);
    }
    return;
  }

  const mapping = findTokenMappingByValue(value);

  finalTokens.value[index] = {
    id: `token_${Date.now()}_${Math.random()}`,
    value: value,
    original: value,
    display: mapping
        ? (outputLanguage.value === LANGUAGES.ZH ? mapping.zh : mapping.en)
        : value,
    mapping: mapping,
    isEditing: false
  };

  setCursor('output', index);
};

const handleEditCancel = (index) => {
  finalTokens.value.splice(index, 1);

  if (index > 0) {
    setCursor('output', index - 1);
  } else if (finalTokens.value.length > 0) {
    setCursor('output', 0);
  } else {
    setCursor('output', null);
  }
};

const handleReorderTokens = ({from, to}) => {
  if (from === to || from < 0 || to < 0 || from >= finalTokens.value.length || to >= finalTokens.value.length) {
    return;
  }

  const newTokens = [...finalTokens.value];
  const [movedToken] = newTokens.splice(from, 1);
  newTokens.splice(to, 0, movedToken);

  finalTokens.value = newTokens;

  if (cursorPosition.value.area === 'output') {
    setCursor('output', to);
  }
};

const handleOutputLanguageChange = (lang) => {
  outputLanguage.value = lang;
  updatePreferences({outputLanguage: lang});

  finalTokens.value.forEach(token => {
    if (token.mapping) {
      token.display = lang === LANGUAGES.ZH ? token.mapping.zh : token.mapping.en;
    }
  });
};

const handleViewLanguageChange = (lang) => {
  viewLanguage.value = lang;
  updatePreferences({viewLanguage: lang});
};

const handleTokenClick = (token, index) => {
  setCursor('output', index);
  focusedArea.value = 'output';
};

// 修改：双击输出区词元时打开编辑器
const handleTokenEdit = (token, index) => {
  const tokenType = token.isCustomPool ? 'pool' :
      token.mapping ? 'single' : 'unmapped';
  openTokenEditor(token, tokenType);
};

const handleRemoveToken = (index) => {
  finalTokens.value.splice(index, 1);
  if (cursorPosition.value.index >= finalTokens.value.length) {
    setCursor('output', finalTokens.value.length - 1);
  }
};

// 修改：点击词库词元时打开编辑器
const handlePoolTokenClick = (token) => {
  console.log('[App] 词库词元被点击，打开编辑器:', token);
  openTokenEditor(token, 'single');
};

// 双击词库词元时插入到输出区
const handlePoolTokenDoubleClick = (token) => {
  console.log('[App] 词库词元被双击，插入到输出区:', token);
  insertToken(token);
};

const insertToken = (token, isCustomGroup = false) => {
  const pos = cursorPosition.value.area === 'output' && cursorPosition.value.index != null
      ? cursorPosition.value.index + 1
      : finalTokens.value.length;

  const newToken = {
    id: Date.now() + Math.random(),
    value: token.en || token.value,
    original: token.en || token.value,
    display: outputLanguage.value === LANGUAGES.ZH ? (token.zh || token.value) : (token.en || token.value),
    mapping: token,
    isCustomGroup
  };

  finalTokens.value.splice(pos, 0, newToken);
  setCursor('output', pos);
};

const findTokenMappingByValue = (value) => {
  const lowerValue = value.toLowerCase();
  for (const token of allTokensFlat.value) {
    if (token.en.toLowerCase() === lowerValue || token.zh.toLowerCase() === lowerValue) {
      return token;
    }
  }
  return null;
};

const handleAddNewToken = (category, subcategory) => {
  const zh = prompt('中文:');
  if (!zh) return;

  const en = prompt('英文:');
  if (!en) return;

  addNewToken(category, subcategory, {zh, en});
};

const handleUseCustomGroup = (group) => {
  const pos = cursorPosition.value.area === 'output' && cursorPosition.value.index != null
      ? cursorPosition.value.index + 1
      : finalTokens.value.length;

  const placeholderToken = {
    id: `custom_pool_${group.key}_${Date.now()}`,
    value: `{#%${group.key}#%}`,
    original: `{#%${group.key}#%}`,
    display: group.zh || group.en || group.key,
    mapping: null,
    isCustomPool: true,
    poolKey: group.key,
    poolData: group
  };

  finalTokens.value.splice(pos, 0, placeholderToken);
  setCursor('output', pos);
};

const handleUseCustomToken = (token) => {
  insertToken(token, true);
};

const handleGroupConfirm = (groupData) => {
  if (editingGroup.value) {
    updateCustomGroup(editingGroup.value.id, groupData);
  } else {
    addCustomGroup(groupData);
  }
  showingGroupDialog.value = false;
  editingGroup.value = null;
};

// 打开词元编辑器（在左侧面板）
// 修改：打开词元编辑器时添加分类信息
const openTokenEditor = (token, type = 'single') => {
  let tokenWithCategory = token;

  // 如果是最终提示词区域的词元，尝试从映射中获取分类信息
  if (type === 'single' && token.mapping) {
    tokenWithCategory = {
      ...token,
      categoryId: token.mapping.categoryId,
      subcategoryId: token.mapping.subcategoryId,
      categoryName: token.mapping.categoryName,
      subcategoryName: token.mapping.subcategoryName
    };
  }

  // 如果是未映射词元，添加默认分类信息
  if (type === 'unmapped' && !token.categoryId) {
    tokenWithCategory = {
      ...token,
      categoryId: '',
      subcategoryId: '',
      categoryName: '',
      subcategoryName: ''
    };
  }

  editingToken.value = tokenWithCategory;
  editingTokenType.value = type;
  showEditor.value = true;
  console.log('[App] 打开词元编辑器:', type, tokenWithCategory);
};

// 打开新建词元编辑器
const openNewTokenEditor = () => {
  editingToken.value = {
    id: `user_${Date.now()}`,
    zh: '',
    en: '',
    jp: '',
    source: 'user'
  };
  editingTokenType.value = 'single';
  showEditor.value = true;
};

// 处理词元保存
// 在 handleTokenSave 方法中添加对新分类的处理
const handleTokenSave = (saveData) => {
  console.log('[App] 保存词元数据:', saveData);

  // 处理新分类创建
  if (saveData.newCategory) {
    handleNewCategoryCreation(saveData.newCategory);
  }

  if (saveData.tokenType === 'single') {
    handleSingleTokenSave(saveData);
  } else if (saveData.tokenType === 'unmapped') {
    handleUnmappedTokenSave(saveData);
  } else if (saveData.tokenType === 'pool') {
    handlePoolTokenSave(saveData);
  }

  showEditor.value = false;
};

// 新增方法：处理新分类创建
const handleNewCategoryCreation = (categoryData) => {
  console.log('[App] 创建新分类:', categoryData);
  // 这里可以调用API创建新分类，然后更新本地分类数据
  alert(`✅ 新分类 "${categoryData.name}" 已创建（功能待实现）`);
};

// 新增：创建临时分类到用户词库
const createTempCategories = async (tempCategories, tempSubcategories) => {
  if (!tempCategories || tempCategories.length === 0) {
    return true;
  }

  // ⭐ 直接使用顶层的 userTokens 和 saveUserTokens，不要重新调用 useTokens()
  try {
    console.log('[App] 开始创建临时分类:', {
      categories: tempCategories.length,
      subcategories: tempSubcategories.length
    });

    // 处理临时一级分类
    for (const tempCat of tempCategories) {
      let existingCategory = userTokens.value.find(cat => cat.id === tempCat.id);

      if (!existingCategory) {
        const newCategory = {
          id: tempCat.id,
          name: tempCat.name,
          source: 'user',
          subcategories: []
        };
        userTokens.value.push(newCategory);
        existingCategory = newCategory;
        console.log('[App] 创建新一级分类:', newCategory);
      }

      // 处理该分类下的临时子分类
      const relatedSubcats = tempSubcategories.filter(sub => sub.parentId === tempCat.id);
      for (const tempSub of relatedSubcats) {
        const existingSub = existingCategory.subcategories.find(sub => sub.id === tempSub.id);

        if (!existingSub) {
          const newSubcategory = {
            id: tempSub.id,
            name: tempSub.name,
            source: 'user',
            tokens: []
          };
          existingCategory.subcategories.push(newSubcategory);
          console.log('[App] 创建新二级分类:', newSubcategory);
        }
      }
    }

    // 保存到用户词库（会自动更新内存数据）
    const saved = await saveUserTokens();

    console.log('[App] 临时分类已保存并同步到内存');

    return saved;
  } catch (error) {
    console.error('[App] 创建临时分类失败:', error);
    return false;
  }
};

// 新增方法：自动创建缺失的分类
const autoCreateMissingCategory = async (categoryId, subcategoryId, saveData) => {
  try {
    console.log('[App] 开始自动创建缺失的分类:', {categoryId, subcategoryId});

    // ⭐ 直接使用顶层的变量，不要重新调用 useTokens()
    // 查找系统词库中对应的分类信息（用于复制）
    let systemCategory = null;
    let systemSubcategory = null;

    for (const category of tokenCategories.value) {
      if (category.source === 'system' && category.id === categoryId) {
        systemCategory = category;
        if (systemCategory.subcategories) {
          systemSubcategory = systemCategory.subcategories.find(sub => sub.id === subcategoryId);
        }
        break;
      }
    }

    let needsConfirmation = false;
    const categoriesToCreate = [];
    const subcategoriesToCreate = [];

    // 检查并创建一级分类
    let userCategory = userTokens.value.find(cat => cat.id === categoryId);
    if (!userCategory) {
      const newCategoryName = systemCategory?.name || {
        zh: `新建分类-${categoryId}`,
        en: `New Category-${categoryId}`
      };

      categoriesToCreate.push({
        id: categoryId,
        name: newCategoryName,
        source: systemCategory ? 'system' : 'custom'
      });

      needsConfirmation = true;
    }

    // 检查并创建二级分类
    if (!userCategory) {
      const newSubcategoryName = systemSubcategory?.name || {
        zh: `新建子分类-${subcategoryId}`,
        en: `New Subcategory-${subcategoryId}`
      };

      subcategoriesToCreate.push({
        id: subcategoryId,
        name: newSubcategoryName,
        parentId: categoryId,
        source: systemSubcategory ? 'system' : 'custom'
      });

      needsConfirmation = true;
    } else {
      const userSubcategory = userCategory.subcategories.find(sub => sub.id === subcategoryId);
      if (!userSubcategory) {
        const newSubcategoryName = systemSubcategory?.name || {
          zh: `新建子分类-${subcategoryId}`,
          en: `New Subcategory-${subcategoryId}`
        };

        subcategoriesToCreate.push({
          id: subcategoryId,
          name: newSubcategoryName,
          parentId: categoryId,
          source: systemSubcategory ? 'system' : 'custom'
        });

        needsConfirmation = true;
      }
    }

    // 如果需要创建，弹出确认对话框
    if (needsConfirmation) {
      const categoryNames = [
        ...categoriesToCreate.map(cat => {
          const name = typeof cat.name === 'string' ? cat.name : cat.name.zh;
          return `"${name}"${cat.source === 'system' ? '（复制自系统分类）' : ''}`;
        }),
        ...subcategoriesToCreate.map(sub => {
          const name = typeof sub.name === 'string' ? sub.name : sub.name.zh;
          return `"${name}"${sub.source === 'system' ? '（复制自系统子分类）' : ''}`;
        })
      ].join('、');

      const userConfirmed = confirm(
          `系统将自动创建以下分类到用户词库：\n${categoryNames}\n\n是否确认创建？`
      );

      if (!userConfirmed) {
        return false;
      }

      // 执行创建
      for (const catData of categoriesToCreate) {
        const newCategory = {
          id: catData.id,
          name: catData.name,
          source: 'user',
          subcategories: [],
          description: systemCategory?.description || `用户创建的 ${catData.id} 分类`
        };
        userTokens.value.push(newCategory);
        userCategory = newCategory;
        console.log('[App] 创建新一级分类:', newCategory);
      }

      for (const subData of subcategoriesToCreate) {
        const newSubcategory = {
          id: subData.id,
          name: subData.name,
          source: 'user',
          tokens: [],
          description: systemSubcategory?.description || `用户创建的 ${subData.id} 子分类`
        };

        if (userCategory) {
          userCategory.subcategories.push(newSubcategory);
          console.log('[App] 创建新二级分类:', newSubcategory);
        }
      }

      // 保存到用户词库（会自动更新内存数据）
      await saveUserTokens();

      console.log('[App] 分类创建完成并同步到内存');
      return true;
    }

    return true;
  } catch (error) {
    console.error('[App] 自动创建分类失败:', error);
    return false;
  }
};

const handleSingleTokenSave = async (saveData) => {
  console.log('[App] 保存单个词元:', saveData);

  try {
    // 先创建临时分类（如果有）
    if (saveData.tempCategories && saveData.tempCategories.length > 0) {
      const created = await createTempCategories(
          saveData.tempCategories,
          saveData.tempSubcategories || []
      );
      if (!created) {
        throw new Error('创建临时分类失败');
      }
    }

    // ⭐ 直接使用顶层的变量，不要重新调用 useTokens()
    // 检查目标分类是否存在
    let targetCategory = tokenCategories.value.find(cat => cat.id === saveData.categoryId);
    let targetSubcategory = null;

    if (targetCategory) {
      targetSubcategory = targetCategory.subcategories.find(sub => sub.id === saveData.subcategoryId);
    }

    // 如果分类不存在，自动创建
    if (!targetCategory || !targetSubcategory) {
      const created = await autoCreateMissingCategory(saveData.categoryId, saveData.subcategoryId, saveData);
      if (!created) {
        throw new Error('自动创建分类失败，请手动选择已有分类');
      }

      // 重新查找分类
      targetCategory = tokenCategories.value.find(cat => cat.id === saveData.categoryId);
      if (targetCategory) {
        targetSubcategory = targetCategory.subcategories.find(sub => sub.id === saveData.subcategoryId);
      }
    }

    // 验证分类是否存在
    if (!targetCategory || !targetSubcategory) {
      throw new Error(`目标分类不存在: ${saveData.categoryId}/${saveData.subcategoryId}`);
    }

    // 检查是否为系统词元
    if (saveData.isSystem) {
      const newTokenData = {
        id: saveData.id,
        zh: saveData.zh,
        en: saveData.en,
        jp: saveData.jp,
        description: saveData.description,
        source: 'user',
        originalId: saveData.id
      };

      const success = await addUserToken(newTokenData, targetCategory, targetSubcategory);
      if (!success) {
        throw new Error('添加用户词元失败');
      }

      console.log('[App] 系统词元已保存为用户副本:', newTokenData);
    } else {
      const updateData = {
        zh: saveData.zh,
        en: saveData.en,
        jp: saveData.jp,
        description: saveData.description
      };

      const currentToken = userTokens.value.flatMap(cat =>
          cat.subcategories.flatMap(sub =>
              sub.tokens.find(token => token.id === saveData.id)
          )
      ).find(Boolean);

      if (currentToken) {
        const oldCategoryId = currentToken.categoryId;
        const oldSubcategoryId = currentToken.subcategoryId;

        if (oldCategoryId !== saveData.categoryId || oldSubcategoryId !== saveData.subcategoryId) {
          console.log('[App] 转移词元分类:', {
            from: `${oldCategoryId}/${oldSubcategoryId}`,
            to: `${saveData.categoryId}/${saveData.subcategoryId}`
          });

          await removeTokenFromCategory(saveData.id, oldCategoryId, oldSubcategoryId);

          const success = await addUserToken(
              {...updateData, id: saveData.id},
              targetCategory,
              targetSubcategory
          );

          if (!success) {
            throw new Error('转移词元到新分类失败');
          }
        } else {
          const success = await updateUserToken(saveData.id, updateData);
          if (!success) {
            throw new Error('更新词元失败');
          }
        }
      } else {
        throw new Error('未找到要更新的词元');
      }
    }

    const envMsg = import.meta.env.DEV ? '（开发环境 - 已保存到内存）' : '（生产环境 - 已保存到服务器）';
    alert(`✅ 词元已保存到用户词库 ${envMsg}`);

  } catch (error) {
    console.error('[App] 保存单个词元失败:', error);
    alert('❌ 保存失败: ' + error.message);
  }
};

const handleUnmappedTokenSave = async (saveData) => {
  console.log('[App] 保存未映射词元:', saveData);

  try {
    if (saveData.tempCategories && saveData.tempCategories.length > 0) {
      const created = await createTempCategories(
          saveData.tempCategories,
          saveData.tempSubcategories || []
      );
      if (!created) {
        throw new Error('创建临时分类失败');
      }
    }

    // ⭐ 直接使用顶层的变量
    if (!saveData.categoryId || !saveData.subcategoryId) {
      throw new Error('请选择分类和子分类');
    }

    if (!saveData.zh && !saveData.en) {
      throw new Error('请至少填写中文或英文');
    }

    let targetCategory = tokenCategories.value.find(cat => cat.id === saveData.categoryId);
    let targetSubcategory = null;

    if (targetCategory) {
      targetSubcategory = targetCategory.subcategories.find(sub => sub.id === saveData.subcategoryId);
    }

    if (!targetCategory || !targetSubcategory) {
      const created = await autoCreateMissingCategory(saveData.categoryId, saveData.subcategoryId, saveData);
      if (!created) {
        throw new Error(`选择的分类不存在且自动创建失败`);
      }

      targetCategory = tokenCategories.value.find(cat => cat.id === saveData.categoryId);
      if (targetCategory) {
        targetSubcategory = targetCategory.subcategories.find(sub => sub.id === saveData.subcategoryId);
      }
    }

    if (!targetCategory || !targetSubcategory) {
      throw new Error(`分类不存在，请选择有效的分类`);
    }

    const newTokenData = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      zh: saveData.zh || saveData.originalValue,
      en: saveData.en || saveData.originalValue,
      jp: saveData.jp || '',
      description: saveData.description || `未映射词元: ${saveData.originalValue}`,
      source: 'user',
      originalValue: saveData.originalValue
    };

    await addUserToken(newTokenData, targetCategory, targetSubcategory);
    console.log('[App] 未映射词元已保存:', newTokenData);

    const success = await saveUserTokenData();
    if (success) {
      alert('✅ 未映射词元已保存到用户词库');
    } else {
      throw new Error('保存到文件失败');
    }
  } catch (error) {
    console.error('[App] 保存未映射词元失败:', error);
    alert('❌ 保存失败: ' + error.message);
  }
};
const handlePoolTokenSave = (saveData) => {
  console.log('[App] 保存词元池:', saveData);

  try {

    const poolGroup = customGroups.value.find(group =>
        group.key === saveData.poolKey || group.id === saveData.poolKey
    );

    if (!poolGroup) {
      throw new Error('未找到要更新的词元池');
    }

    const updateData = {
      name: saveData.name,
      description: saveData.description,
      tokens: saveData.poolTokens || []
    };

    // ⭐ 直接使用顶层的 updateCustomGroup
    const success = updateCustomGroup(poolGroup.id, updateData);

    if (success) {
      // ⭐ 直接使用顶层的 saveCustomGroups（注意：这可能需要改成 async/await）
      saveCustomGroups();
      console.log('[App] 词元池已更新:', updateData);
      alert('✅ 词元池已更新');
    } else {
      throw new Error('更新词元池失败');
    }
  } catch (error) {
    console.error('[App] 保存词元池失败:', error);
    alert('❌ 保存失败: ' + error.message);
  }
};

// 辅助函数：从分类中移除词元
const removeTokenFromCategory = async (tokenId, categoryId, subcategoryId) => {
  // ⭐ 直接使用顶层的变量
  const categoryIndex = userTokens.value.findIndex(cat => cat.id === categoryId);
  if (categoryIndex === -1) return false;

  const subcategoryIndex = userTokens.value[categoryIndex].subcategories.findIndex(
      sub => sub.id === subcategoryId
  );
  if (subcategoryIndex === -1) return false;

  const tokenIndex = userTokens.value[categoryIndex].subcategories[subcategoryIndex]
      .tokens.findIndex(token => token.id === tokenId);

  if (tokenIndex !== -1) {
    userTokens.value[categoryIndex].subcategories[subcategoryIndex]
        .tokens.splice(tokenIndex, 1);

    if (userTokens.value[categoryIndex].subcategories[subcategoryIndex].tokens.length === 0) {
      userTokens.value[categoryIndex].subcategories.splice(subcategoryIndex, 1);
    }

    if (userTokens.value[categoryIndex].subcategories.length === 0) {
      userTokens.value.splice(categoryIndex, 1);
    }

    await saveUserTokens();
    return true;
  }

  return false;
};

const reloadTokenData = async () => {
  // ⭐ 直接使用顶层的方法
  await reloadData();
  const {getAllTokensFlat} = await import('./utils/tokenParser.js');
  setTokensMap(getAllTokensFlat(tokenCategories.value));
  await reloadGroups();
};

const handleViewMappedToken = (token) => {
  openTokenEditor(token, 'single');
};

const handleEditPoolToken = (token, index) => {
  openTokenEditor(token, 'single');
};

// 点击词元池项目打开编辑器
const handlePoolItemClick = (poolItem) => {
  console.log('[App] 词元池项目被点击，打开编辑器:', poolItem);
  openTokenEditor(poolItem, 'pool');
};

// 双击词元池项目插入到输出区
const handleUsePoolItem = (poolItem) => {
  const pos = cursorPosition.value.area === 'output' && cursorPosition.value.index != null
      ? cursorPosition.value.index + 1
      : finalTokens.value.length;

  const placeholderToken = {
    id: `custom_pool_${poolItem.id}_${Date.now()}`,
    value: `{#%${poolItem.id}#%}`,
    original: `{#%${poolItem.id}#%}`,
    display: getPoolItemDisplayName(poolItem),
    mapping: null,
    isCustomPool: true,
    poolKey: poolItem.id,
    poolData: poolItem
  };

  finalTokens.value.splice(pos, 0, placeholderToken);
  setCursor('output', pos);
};

const getPoolItemDisplayName = (poolItem) => {
  if (poolItem.name) {
    return viewLanguage.value === 'zh' ? poolItem.name.zh : poolItem.name.en;
  }
  return poolItem.description || poolItem.id;
};

const handleTokenSelected = (token) => {
  if (currentGroupForToken.value) {
    const weight = prompt('设置权重 (0-10):', '1');
    if (weight !== null) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum >= 0 && weightNum <= 10) {
        addTokenToGroup(currentGroupForToken.value, {
          ...token,
          weight: weightNum
        });
      }
    }
    currentGroupForToken.value = null;
  }
};

const getFocusTips = () => {
  if (hasEditingToken.value) {
    return '正在编辑词元中... (回车确认 | ESC取消)';
  }

  const tips = {
    output: '点击词元选中 | 空格插入新词元 | 双击词元编辑',
    custom: '双击词元使用 | 点击🎲随机选择',
    pool: '单击词元/词元池编辑 | 双击添加到输出区'
  };
  return tips[focusedArea.value] || '点击区域后双击词库添加词元';
};

const handleConfirm = () => {
  if (hasEditingToken.value) {
    alert('请先完成词元编辑（回车确认或ESC取消）');
    return;
  }

  updatePreferences({outputMode: outputMode.value});
  emit('close', finalText.value);
};

const handleCancel = () => {
  if (hasEditingToken.value) {
    if (!confirm('有词元正在编辑中，确定要放弃编辑并关闭吗？')) {
      return;
    }
  }

  emit('close', null);
};
</script>

<template>
  <Transition name="modal">
    <div v-if="true" class="lxh-modal-overlay" @click.self="handleCancel" @mousedown.stop>
      <div class="lxh-modal-content" @mousedown.stop>
        <div class="lxh-modal-header">
          <div class="header-left">
            <h3>✨ LXH Prompt 编辑器</h3>
            <span v-if="hasEditingToken" class="editing-indicator">
              ✏️ 编辑中...
            </span>
          </div>
          <button class="close-btn" @click="handleCancel">&times;</button>
        </div>

        <div class="lxh-modal-body">
          <FinalOutput
              :tokens="finalTokens"
              :mode="outputMode"
              :language="outputLanguage"
              :view-language="viewLanguage"
              :focused="focusedArea === 'output'"
              :cursor-index="cursorPosition.index"
              @update:mode="outputMode = $event"
              @update:language="handleOutputLanguageChange"
              @update:view-language="handleViewLanguageChange"
              @token-click="handleTokenClick"
              @token-dblclick="handleTokenEdit"
              @remove-token="handleRemoveToken"
              @focus="focusedArea = 'output'"
              @reorder-tokens="handleReorderTokens"
              @edit-confirm="handleEditConfirm"
              @edit-cancel="handleEditCancel"
          />

          <div class="bottom-panels">
            <!-- 左侧：词元编辑面板 -->
            <div class="left-panel">
              <div class="token-editor-panel">
                <div class="panel-header">
                  <h4>✏️ 词元编辑</h4>
                  <div class="panel-controls">
                    <button
                        class="add-token-btn"
                        @click="openNewTokenEditor"
                        title="添加新词元到用户词库"
                    >
                      ＋ 新建词元
                    </button>
                  </div>
                </div>
                <div class="panel-content">
                  <!-- 显示编辑器或默认内容 -->
                  <TokenEditor
                      v-if="showEditor"
                      :token="editingToken"
                      :token-type="editingTokenType"
                      :categories="tokenCategories"
                      :language="viewLanguage"
                      :is-embedded="true"
                      @close="showEditor = false"
                      @save="handleTokenSave"
                      @view-token="handleViewMappedToken"
                      @edit-token="handleEditPoolToken"
                  />
                  <div v-else class="editor-intro">
                    <h5>编辑功能说明</h5>
                    <ul class="feature-list">
                      <li>
                        <span class="feature-icon">📝</span>
                        <span class="feature-text">双击输出区词元进行编辑</span>
                      </li>
                      <li>
                        <span class="feature-icon">👆</span>
                        <span class="feature-text">单击词库词元查看/编辑</span>
                      </li>
                      <li>
                        <span class="feature-icon">🎲</span>
                        <span class="feature-text">单击词元池管理权重和内容</span>
                      </li>
                      <li>
                        <span class="feature-icon">⚙️</span>
                        <span class="feature-text">系统词元会创建用户副本</span>
                      </li>
                    </ul>

                    <div class="quick-stats">
                      <div class="stat-item">
                        <span class="stat-label">总词元数</span>
                        <span class="stat-value">{{ finalTokens.length }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">已映射</span>
                        <span class="stat-value">{{ mappedTokensCount }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">未映射</span>
                        <span class="stat-value">{{ unmappedTokensCount }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">词元池</span>
                        <span class="stat-value">{{ poolTokensCount }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：词元映射池 -->
            <div class="right-panel">
              <TokenPool
                  :categories="tokenCategories"
                  :custom-groups="customGroups"
                  :language="viewLanguage"
                  :focused="focusedArea === 'pool'"
                  @token-click="handlePoolTokenClick"
                  @token-dblclick="handlePoolTokenDoubleClick"
                  @pool-item-click="handlePoolItemClick"
                  @add-token="handleAddNewToken"
                  @use-pool-item="handleUsePoolItem"
                  @click="focusedArea = 'pool'"
              />
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="lxh-modal-footer">
          <div class="footer-tips">
            💡 {{ getFocusTips() }} | 词元数: {{ finalTokens.length }} | 字符数: {{ finalText.length }}
            | 查看语言: {{ viewLanguage === 'zh' ? '中文' : viewLanguage === 'en' ? '英文' : '日文' }}
            | 输出语言: {{ outputLanguage === 'zh' ? '中文' : outputLanguage === 'en' ? '英文' : '日文' }}
            <span v-if="!hasEditingToken" class="shortcut-tip">
              | <strong>选中词元后按空格插入新词元</strong>
            </span>
          </div>
          <div class="footer-actions">
            <button @click="handleCancel">取消 (Esc)</button>
            <button class="primary" @click="handleConfirm">确认 (Ctrl+Enter)</button>
          </div>
        </div>
      </div>

      <GroupDialog
          v-if="showingGroupDialog"
          :group="editingGroup"
          :is-edit="!!editingGroup"
          @close="showingGroupDialog = false"
          @confirm="handleGroupConfirm"
      />

      <TokenSelector
          v-if="showingTokenSelector"
          :all-tokens="allTokensFlat"
          :language="viewLanguage"
          @close="showingTokenSelector = false"
          @select="handleTokenSelected"
      />
    </div>
  </Transition>
</template>

<style scoped>
/* 词元编辑面板样式 */
.token-editor-panel {
  background: #252525;
  border-radius: 8px;
  border: 1px solid #404040;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  background: #2a2a2a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h4 {
  margin: 0;
  color: #fafafa;
  font-size: 14px;
  font-weight: 600;
}

.panel-controls {
  display: flex;
  gap: 8px;
}

.add-token-btn {
  padding: 4px 12px;
  background: #0d7dd8;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-token-btn:hover {
  background: #0c6dba;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.editor-intro {
  padding: 20px;
}

.editor-intro h5 {
  margin: 0 0 16px 0;
  color: #0d7dd8;
  font-size: 13px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  color: #ddd;
  font-size: 12px;
}

.feature-icon {
  font-size: 16px;
}

.feature-text {
  flex: 1;
}

.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.stat-item {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: #888;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #0d7dd8;
}

/* 其他样式保持不变 */
.bottom-panels {
  flex: 1;
  display: grid;
  grid-template-columns: 450px 1fr;
  gap: 16px;
  min-height: 0;
}

.lxh-modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background-color: rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(4px);
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  z-index: 999999 !important;
  animation: fadeIn 0.2s ease;
  pointer-events: auto !important;
}

.lxh-modal-content {
  background: #1e1e1e;
  border-radius: 12px;
  width: 95%;
  max-width: 1400px;
  height: 90vh;
  max-height: 900px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  border: 1px solid #404040;
  animation: slideIn 0.3s ease;
  position: relative;
  z-index: 1000000;
}

.lxh-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #252525;
  border-radius: 12px 12px 0 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

h3 {
  margin: 0;
  color: #fafafa;
  font-size: 18px;
  font-weight: 600;
}

.editing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #ff9800;
  color: #000;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  animation: pulse-editing 1.5s infinite;
}

@keyframes pulse-editing {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #404040;
  color: #fff;
}

.lxh-modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
}

.left-panel,
.right-panel {
  background: #252525;
  border-radius: 8px;
  border: 1px solid #404040;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.lxh-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #404040;
  background: #252525;
  border-radius: 0 0 12px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-tips {
  font-size: 12px;
  color: #888;
}

.shortcut-tip {
  color: #42A5F5;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

button {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background-color: #404040;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover {
  background-color: #4a4a4a;
  transform: translateY(-1px);
}

button.primary {
  background-color: #0d7dd8;
}

button.primary:hover {
  background-color: #0c6dba;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: scale(0.95) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>