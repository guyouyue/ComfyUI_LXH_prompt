<template>
  <Transition name="modal">
    <div v-if="true" class="lxh-modal-overlay" @click.self="handleCancel" @mousedown.stop>
      <div class="lxh-modal-content" @mousedown.stop>
        <!-- 头部 -->
        <div class="lxh-modal-header">
          <div class="header-left">
            <h3>✨ LXH Prompt 编辑器</h3>
          </div>
          <button class="close-btn" @click="handleCancel">&times;</button>
        </div>

        <!-- 主体内容区 -->
        <div class="lxh-modal-body">
          <!-- 最终输出区 -->
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
          />

          <!-- 下方分栏区域 -->
          <div class="bottom-panels">
            <!-- 左侧：自定义词元组合池 -->
            <div class="left-panel">
              <CustomTokenPool
                  :groups="customGroups"
                  :focused="focusedArea === 'custom'"
                  :language="viewLanguage"
                  @add-token="showGroupDialog(null)"
                  @edit-group="showGroupDialog"
                  @delete-group="handleDeleteGroup"
                  @use-token="handleUseToken"
                  @use-group="handleUseGroup"
                  @update-weight="handleUpdateWeight"
                  @remove-token="handleRemoveTokenFromGroup"
                  @add-token-to-group="handleAddTokenToGroup"
                  @click="focusedArea = 'custom'"
              />
            </div>

            <!-- 右侧：词元映射池 -->
            <div class="right-panel">
              <TokenPool
                  :categories="tokenCategories"
                  :language="viewLanguage"
                  :focused="focusedArea === 'pool'"
                  @token-click="handlePoolTokenClick"
                  @add-token="handleAddNewToken"
                  @click="focusedArea = 'pool'"
              />
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="lxh-modal-footer">
          <div class="footer-tips">
            💡💡 {{ getFocusTips() }} | 词元数: {{ finalTokens.length }} | 字符数: {{ finalText.length }}
            | 查看语言: {{ viewLanguage === 'zh' ? '中文' : '英文' }}
            | 输出语言: {{ outputLanguage === 'zh' ? '中文' : '英文' }}
          </div>
          <div class="footer-actions">
            <button @click="handleCancel">取消 (Esc)</button>
            <button class="primary" @click="handleConfirm">确认 (Ctrl+Enter)</button>
          </div>
        </div>
      </div>

      <!-- 组合编辑对话框 -->
      <GroupDialog
          v-if="showingGroupDialog"
          :group="editingGroup"
          :is-edit="!!editingGroup"
          @close="showingGroupDialog = false"
          @confirm="handleGroupConfirm"
      />

      <!-- 词元选择器 -->
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

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';
import FinalOutput from './components/FinalOutput.vue';
import TokenPool from './components/TokenPool.vue';
import CustomTokenPool from './components/CustomTokenPool.vue';
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
const outputLanguage = ref(LANGUAGES.ZH);  // 输出语言
const viewLanguage = ref(LANGUAGES.ZH);   // 查看语言（新增）
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

  // 加载数据
  await loadTokenData();
  await loadCustomGroups();

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
const handleReorderTokens = ({from, to}) => {
  if (from === to || from < 0 || to < 0 || from >= finalTokens.value.length || to >= finalTokens.value.length) {
    return;
  }

  console.log(`重新排序词元: 从 ${from} 移动到 ${to}`);

  // 创建新数组（Vue 响应式要求）
  const newTokens = [...finalTokens.value];
  const [movedToken] = newTokens.splice(from, 1);
  newTokens.splice(to, 0, movedToken);

  finalTokens.value = newTokens;

  // 更新光标位置
  if (cursorPosition.value.area === 'output') {
    setCursor('output', to);
  }
};

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
  if (e.key === 'Escape') {
    if (showingGroupDialog.value || showingTokenSelector.value) {
      showingGroupDialog.value = false;
      showingTokenSelector.value = false;
    } else {
      handleCancel();
    }
  } else if (e.ctrlKey && e.key === 'Enter') {
    handleConfirm();
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

// 查看语言切换（新增）
const handleViewLanguageChange = (lang) => {
  viewLanguage.value = lang;
  updatePreferences({viewLanguage: lang});
};

// 其他方法保持不变...
const handleTokenClick = (token, index) => {
  setCursor('output', index);
  focusedArea.value = 'output';
  console.log('[App] 词元点击:', token, '索引:', index);
};

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

const handleRemoveToken = (index) => {
  finalTokens.value.splice(index, 1);
  if (cursorPosition.value.index >= finalTokens.value.length) {
    setCursor('output', finalTokens.value.length - 1);
  }
};

const handlePoolTokenClick = (token) => {
  console.log('[App] 词库词元被点击:', token);
  insertToken(token);
};

const insertToken = (token, isCustomGroup = false) => {
  const pos = cursorPosition.value.area === 'output' && cursorPosition.value.index != null
      ? cursorPosition.value.index + 1
      : finalTokens.value.length;

  const newToken = {
    id: Date.now() + Math.random(),
    value: token.en,
    original: token.en,
    display: outputLanguage.value === LANGUAGES.ZH ? token.zh : token.en,
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

// 添加新词元到词库
const handleAddNewToken = (category, subcategory) => {
  const zh = prompt('中文:');
  if (!zh) return;

  const en = prompt('英文:');
  if (!en) return;

  addNewToken(category, subcategory, {zh, en});
};

// 获取焦点提示
const getFocusTips = () => {
  const tips = {
    output: '双击词元编辑 | 点击词库添加词元',
    custom: '双击词元使用 | 点击🎲随机选择',
    pool: '双击词元添加到输出区'
  };
  return tips[focusedArea.value] || '点击区域后双击词库添加词元';
};

// 确认
const handleConfirm = () => {
  console.log('[LXH Prompt Vue] 确认，返回文本:', finalText.value);
  updatePreferences({outputMode: outputMode.value});
  emit('close', finalText.value);
};

// 取消
const handleCancel = () => {
  console.log('[LXH Prompt Vue] 取消');
  emit('close', null);
};
</script>

<style scoped>
/* 保持之前的样式不变 */
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