<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';
import FinalOutput from './components/FinalOutput.vue';
import TokenPool from './components/TokenPool.vue';
import GroupDialog from './components/GroupDialog.vue';
import TokenSelector from './components/TokenSelector.vue';

import {useTokens} from './composables/useTokens.js';
import {useCustomGroups} from './composables/useCustomGroups.js';
import {useCursor} from './composables/useCursor.js';
import {useStorage} from './composables/useStorage.js';

import {getAllTokensFlat, parseTextToTokens, tokensToText} from './utils/tokenParser.js';
import {FOCUS_AREAS, LANGUAGES, OUTPUT_MODES} from './utils/constants.js';

console.log('[LXH Prompt Vue] 组件开始初始化');

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
const {tokenCategories, loadTokenData, addNewToken} = useTokens();
const {
  customGroups,
  loadCustomGroups,
  addCustomGroup,
  updateCustomGroup,
  deleteCustomGroup,
  addTokenToGroup,
  updateTokenWeight,
  removeTokenFromGroup,
  selectRandomToken
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

// ===== 计算属性 =====
const finalText = computed(() => {
  return tokensToText(finalTokens.value, outputMode.value, outputLanguage.value);
});

const allTokensFlat = computed(() => {
  return getAllTokensFlat(tokenCategories.value);
});

// 检查是否有词元正在编辑
const hasEditingToken = computed(() => {
  return finalTokens.value.some(token => token.isEditing);
});

// ===== 生命周期 =====
onMounted(async () => {
  console.log('[LXH Prompt Vue] 组件已挂载');

  // 加载偏好设置
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

  // 先加载词库数据
  console.log('[App] 开始加载词库数据...');
  await loadTokenData();
  console.log('[App] 词库数据加载完成，词元数量:', allTokensFlat.value.length);

  // 设置词元映射给自定义组合使用
  const {setTokensMap} = useCustomGroups();
  setTokensMap(allTokensFlat.value);
  console.log('[App] 词元映射设置完成');

  // 然后加载自定义组合
  console.log('[App] 开始加载自定义组合...');
  await loadCustomGroups();
  console.log('[App] 自定义组合加载完成，组合数量:', customGroups.value.length);

  // 解析初始文本
  if (props.initialText) {
    parseInitialText(props.initialText);
  }

  // 监听键盘事件
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  console.log('[LXH Prompt Vue] 组件即将卸载');
  document.removeEventListener('keydown', handleKeyDown);
});

// ===== 方法 =====

// 解析初始文本
const parseInitialText = (text) => {
  finalTokens.value = parseTextToTokens(text, tokenCategories.value, outputMode.value);

  // 确保每个词元都有原始值
  finalTokens.value.forEach(token => {
    if (!token.original) {
      token.original = token.value;
    }
  });

  console.log('[LXH Prompt Vue] 解析初始文本，得到', finalTokens.value.length, '个词元');
};

// 键盘事件处理
const handleKeyDown = (e) => {
  // 防止在对话框打开时触发
  if (showingGroupDialog.value || showingTokenSelector.value) {
    if (e.key === 'Escape') {
      showingGroupDialog.value = false;
      showingTokenSelector.value = false;
    }
    return;
  }

  // 如果有词元正在编辑中，不处理全局快捷键（除了 Esc 和 Ctrl+Enter）
  if (hasEditingToken.value) {
    // 只允许 Esc 和 Ctrl+Enter
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.ctrlKey && e.key === 'Enter') {
      // 如果正在编辑，先完成编辑再确认
      const editingIndex = finalTokens.value.findIndex(t => t.isEditing);
      if (editingIndex !== -1) {
        handleEditConfirm(editingIndex);
      }
      // 稍微延迟一下再确认，让编辑完成
      setTimeout(() => {
        handleConfirm();
      }, 100);
    }
    // 其他按键（包括空格）不处理，让输入框自己处理
    return;
  }

  // 没有词元在编辑时，处理正常的快捷键
  if (e.key === 'Escape') {
    handleCancel();
  } else if (e.ctrlKey && e.key === 'Enter') {
    handleConfirm();
  } else if (e.key === ' ' && focusedArea.value === FOCUS_AREAS.OUTPUT) {
    // 空格键：在光标后插入新的编辑词元
    // 检查是否有词元被选中
    if (cursorPosition.value.index !== null) {
      e.preventDefault();
      handleInsertNewToken();
    }
  }
};

// 插入新的可编辑词元
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

  console.log('[App] 插入新的编辑词元，位置:', pos);
};

// 编辑确认
const handleEditConfirm = (index) => {
  const token = finalTokens.value[index];
  if (!token || !token.isEditing) return;

  const value = token.value.trim();

  // 如果为空，删除这个词元
  if (!value) {
    console.log('[App] 编辑内容为空，删除词元');
    finalTokens.value.splice(index, 1);
    if (index > 0) {
      setCursor('output', index - 1);
    }
    return;
  }

  // 查找映射
  const mapping = findTokenMappingByValue(value);

  console.log('[App] 编辑确认，值:', value, '找到映射:', !!mapping);

  // 转换为正式词元
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

  // 移动光标到当前位置（保持选中）
  setCursor('output', index);

  console.log('[App] 编辑完成，重新启用快捷键监听');
};

// 编辑取消
const handleEditCancel = (index) => {
  console.log('[App] 编辑取消，删除词元');
  // 删除编辑中的词元
  finalTokens.value.splice(index, 1);

  if (index > 0) {
    setCursor('output', index - 1);
  } else if (finalTokens.value.length > 0) {
    setCursor('output', 0);
  } else {
    setCursor('output', null);
  }

  console.log('[App] 编辑取消，重新启用快捷键监听');
};

// 重新排序词元
const handleReorderTokens = ({from, to}) => {
  if (from === to || from < 0 || to < 0 || from >= finalTokens.value.length || to >= finalTokens.value.length) {
    return;
  }

  console.log(`重新排序词元: 从 ${from} 移动到 ${to}`);

  const newTokens = [...finalTokens.value];
  const [movedToken] = newTokens.splice(from, 1);
  newTokens.splice(to, 0, movedToken);

  finalTokens.value = newTokens;

  if (cursorPosition.value.area === 'output') {
    setCursor('output', to);
  }
};

// 输出语言切换
const handleOutputLanguageChange = (lang) => {
  outputLanguage.value = lang;
  updatePreferences({outputLanguage: lang});

  // 更新所有词元的显示（用于输出）
  finalTokens.value.forEach(token => {
    if (token.mapping) {
      token.display = lang === LANGUAGES.ZH ? token.mapping.zh : token.mapping.en;
    }
  });
};

// 查看语言切换
const handleViewLanguageChange = (lang) => {
  viewLanguage.value = lang;
  updatePreferences({viewLanguage: lang});
};

// 词元点击
const handleTokenClick = (token, index) => {
  setCursor('output', index);
  focusedArea.value = 'output';
  console.log('[App] 词元点击:', token, '索引:', index);
};

// 词元编辑
const handleTokenEdit = (token, index) => {
  const newValue = prompt('编辑词元:', token.value);
  if (newValue && newValue.trim()) {
    finalTokens.value[index].value = newValue.trim();
    const mapping = findTokenMappingByValue(newValue.trim());
    finalTokens.value[index].mapping = mapping;
    finalTokens.value[index].display = mapping
        ? (outputLanguage.value === LANGUAGES.ZH ? mapping.zh : mapping.en)
        : newValue.trim();
  }
};

// 移除词元
const handleRemoveToken = (index) => {
  finalTokens.value.splice(index, 1);
  if (cursorPosition.value.index >= finalTokens.value.length) {
    setCursor('output', finalTokens.value.length - 1);
  }
};

// 词库词元点击
const handlePoolTokenClick = (token) => {
  console.log('[App] 词库词元被点击:', token);
  insertToken(token);
};

// 插入词元
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

// 查找词元映射
const findTokenMappingByValue = (value) => {
  const lowerValue = value.toLowerCase();
  for (const token of allTokensFlat.value) {
    if (token.en.toLowerCase() === lowerValue || token.zh.toLowerCase() === lowerValue) {
      return token;
    }
  }
  return null;
};

// 添加新词元到词库
const handleAddNewToken = (category, subcategory) => {
  const zh = prompt('中文:');
  if (!zh) return;

  const en = prompt('英文:');
  if (!en) return;

  addNewToken(category, subcategory, {zh, en});
};

// 使用自定义组合
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

  console.log('[App] 插入词元池占位符:', placeholderToken);
};

// 使用自定义词元
const handleUseCustomToken = (token) => {
  insertToken(token, true);
};

// 显示组合对话框
const showGroupDialog = (group) => {
  editingGroup.value = group ? {...group} : null;
  showingGroupDialog.value = true;
};

// 组合确认
const handleGroupConfirm = (groupData) => {
  if (editingGroup.value) {
    // 编辑
    updateCustomGroup(editingGroup.value.id, groupData);
  } else {
    // 新增
    addCustomGroup(groupData);
  }
  showingGroupDialog.value = false;
  editingGroup.value = null;
};

// 删除组合
const handleDeleteGroup = (groupId) => {
  if (confirm('确定要删除这个组合吗？')) {
    deleteCustomGroup(groupId);
  }
};

// 使用词元
const handleUseToken = (token) => {
  insertToken(token, true);
};

// 使用组合（随机选择）
const handleUseGroup = (groupId) => {
  const selectedToken = selectRandomToken(groupId);
  if (selectedToken) {
    insertToken(selectedToken, true);
  } else {
    alert('该组合没有候选词元');
  }
};

// 更新权重
const handleUpdateWeight = (groupId, tokenId, weight) => {
  updateTokenWeight(groupId, tokenId, weight);
};

// 从组合中移除词元
const handleRemoveTokenFromGroup = (groupId, tokenId) => {
  if (confirm('确定要移除这个词元吗？')) {
    removeTokenFromGroup(groupId, tokenId);
  }
};

// 添加词元到组合
const handleAddTokenToGroup = (groupId) => {
  currentGroupForToken.value = groupId;
  showingTokenSelector.value = true;
};

// 词元选择完成
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

// 获取焦点提示
const getFocusTips = () => {
  if (hasEditingToken.value) {
    return '正在编辑词元中... (回车确认 | ESC取消)';
  }

  const tips = {
    output: '点击词元选中 | 空格插入新词元 | 双击词元编辑',
    custom: '双击词元使用 | 点击🎲随机选择',
    pool: '双击词元添加到输出区'
  };
  return tips[focusedArea.value] || '点击区域后双击词库添加词元';
};

// 确认
const handleConfirm = () => {
  // 如果还有词元在编辑中，先提示
  if (hasEditingToken.value) {
    alert('请先完成词元编辑（回车确认或ESC取消）');
    return;
  }

  console.log('[LXH Prompt Vue] 确认，返回文本:', finalText.value);
  updatePreferences({outputMode: outputMode.value});
  emit('close', finalText.value);
};

// 取消
const handleCancel = () => {
  // 如果有词元在编辑中，询问是否放弃
  if (hasEditingToken.value) {
    if (!confirm('有词元正在编辑中，确定要放弃编辑并关闭吗？')) {
      return;
    }
  }

  console.log('[LXH Prompt Vue] 取消');
  emit('close', null);
};

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

  console.log('[App] 插入词元池占位符:', placeholderToken);
};

// 获取池项目的显示名称（根据当前语言）
const getPoolItemDisplayName = (poolItem) => {
  if (poolItem.name) {
    return viewLanguage.value === 'zh' ? poolItem.name.zh : poolItem.name.en;
  }
  return poolItem.description || poolItem.id;
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
              ✏✏️ 编辑中...
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
            <!-- 左侧：单点词库功能（暂时保留为空） -->
            <div class="left-panel">
              <div class="single-token-panel">
                <div class="panel-header">
                  <h4>🎯 单点词库</h4>
                </div>
                <div class="panel-content">
                  <div class="placeholder-text">
                    功能开发中...
                    <br>
                    <small>将用于单点词元的编辑和管理</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：整合后的词元映射池（包含自定义词元池） -->
            <div class="right-panel">
              <TokenPool
                  :categories="tokenCategories"
                  :custom-groups="customGroups"
                  :language="viewLanguage"
                  :focused="focusedArea === 'pool'"
                  @token-click="handlePoolTokenClick"
                  @add-token="handleAddNewToken"
                  @use-custom-group="handleUseCustomGroup"
                  @use-custom-token="handleUseCustomToken"
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

      <!-- 保持原有的对话框 -->
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
/* 新增单点词库面板样式 */
.single-token-panel {
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
}

.panel-header h4 {
  margin: 0;
  color: #fafafa;
  font-size: 14px;
  font-weight: 600;
}

.panel-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.placeholder-text {
  text-align: center;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.placeholder-text small {
  color: #444;
  font-size: 12px;
}

/* 调整布局 */
.bottom-panels {
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr; /* 调整左侧宽度 */
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

/* 编辑状态指示器 */
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

.bottom-panels {
  flex: 1;
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 16px;
  min-height: 0;
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