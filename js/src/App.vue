<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';

// ========== 组件导入 ==========
import FinalOutputSection from './components/layout/FinalOutputSection.vue';
import TokenPoolSection from './components/layout/TokenPoolSection.vue';
import TokenEditorSection from './components/layout/TokenEditorSection.vue';
import TokenSelector from './components/shared/TokenSelector.vue';
import GroupDialog from './components/shared/GroupDialog.vue';
import ConfirmDialog from './components/shared/ConfirmDialog.vue';

// ========== Composables 导入 ==========
import {useAppStore} from './composables/useAppStore.js';
import {useAppInit} from './composables/useAppInit.js';
import {useTokenManagement} from './composables/useTokenManagement.js';
import {useGroupManagement} from './composables/useGroupManagement.js';
import {useEditorOperations} from './composables/useEditorOperations.js';
import {useTokens} from './composables/useTokens.js';
import {useCustomGroups} from './composables/useCustomGroups.js';
import {useCursor} from './composables/useCursor.js';
import {useStorage} from './composables/useStorage.js';
import {useAppKeyboard} from './composables/useAppKeyboard.js';
import {useAppConfirm} from './composables/useAppConfirm.js';

// ========== 工具函数导入 ==========
import {tokensToText} from './utils/tokenParser.js';
import {LANGUAGES} from './utils/constants.js';

// ========== Props & Emits ==========
const props = defineProps({
  initialText: String,
});

const emit = defineEmits(['close']);

// ========== 状态管理 ==========
const store = useAppStore();

// ⭐ 关键：在 App 顶层获取 composables 实例
const tokensComposable = useTokens();
const groupsComposable = useCustomGroups();

// ⭐ 解构出响应式数据
const {tokenCategories, addNewToken} = tokensComposable;
const {customGroups} = groupsComposable;

// ⭐ 将 composables 实例传递给其他 composables
const {initializeApp} = useAppInit(props, tokensComposable, groupsComposable);
const tokenMgmt = useTokenManagement();
const groupMgmt = useGroupManagement();
const editorOps = useEditorOperations();

// ========== 其他 Composables ==========
const {cursorPosition, setCursor} = useCursor();
const {updatePreferences} = useStorage();
const confirmDialog = useAppConfirm();

// ⭐ 添加加载状态
const isInitialized = ref(false);

// ========== 计算属性 ==========
const finalText = computed(() => {
  return tokensToText(
      store.finalTokens.value,
      store.outputMode.value,
      store.outputLanguage.value
  );
});

// ========== 输出区操作 ==========
const handleInsertNewToken = () => {
  const pos =
      cursorPosition.value.area === 'output' && cursorPosition.value.index != null
          ? cursorPosition.value.index + 1
          : store.finalTokens.value.length;

  const newToken = {
    id: `editing_${Date.now()}_${Math.random()}`,
    value: '',
    original: '',
    display: '',
    mapping: null,
    isEditing: true,
  };

  store.addFinalToken(newToken, pos);
  setCursor('output', pos);
};

const handleEditConfirm = (index) => {
  const token = store.finalTokens.value[index];
  if (!token || !token.isEditing) return;

  const value = token.value.trim();

  if (!value) {
    store.removeFinalToken(index);
    if (index > 0) {
      setCursor('output', index - 1);
    }
    return;
  }

  const mapping = tokenMgmt.findTokenMappingByValue(value);

  store.replaceFinalToken(index, {
    id: `token_${Date.now()}_${Math.random()}`,
    value: value,
    original: value,
    display: mapping
        ? store.outputLanguage.value === LANGUAGES.ZH
            ? mapping.zh
            : mapping.en
        : value,
    mapping: mapping,
    isEditing: false,
  });

  setCursor('output', index);
};

const handleEditCancel = (index) => {
  console.log('[App.vue] 取消词元编辑，索引:', index);
  store.removeFinalToken(index);

  if (index > 0) {
    setCursor('output', index - 1);
  } else if (store.finalTokens.value.length > 0) {
    setCursor('output', 0);
  } else {
    setCursor('output', null);
  }
};

const handleReorderTokens = ({from, to}) => {
  if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= store.finalTokens.value.length ||
      to >= store.finalTokens.value.length
  ) {
    return;
  }

  store.reorderTokens(from, to);

  if (cursorPosition.value.area === 'output') {
    setCursor('output', to);
  }
};

const handleOutputLanguageChange = (lang) => {
  store.setOutputLanguage(lang);
  updatePreferences({outputLanguage: lang});

  store.finalTokens.value.forEach((token) => {
    if (token.mapping) {
      token.display = lang === LANGUAGES.ZH ? token.mapping.zh : token.mapping.en;
    } else if (token.isCustomPool && token.poolData) {
      token.display =
          lang === LANGUAGES.ZH ? token.poolData.name?.zh : token.poolData.name?.en;
    }
  });
};

const handleViewLanguageChange = (lang) => {
  store.setViewLanguage(lang);
  updatePreferences({viewLanguage: lang});
};

const handleTokenClick = (token, index) => {
  setCursor('output', index);
  store.setFocusedArea('output');
};

const handleRemoveToken = (index) => {
  store.removeFinalToken(index);
  if (cursorPosition.value.index >= store.finalTokens.value.length) {
    setCursor('output', store.finalTokens.value.length - 1);
  }
};

// ========== 词库操作 ==========
const handlePoolTokenClick = (token) => {
  console.log('[App] 词库词元被点击:', token);
  editorOps.handlePoolTokenClick(token);
};

const handlePoolTokenDoubleClick = (token) => {
  console.log('[App] 词库词元被双击，插入到输出区:', token);
  insertToken(token);
};

const insertToken = (token, isCustomGroup = false) => {
  const pos =
      cursorPosition.value.area === 'output' && cursorPosition.value.index != null
          ? cursorPosition.value.index + 1
          : store.finalTokens.value.length;

  const newToken = {
    id: Date.now() + Math.random(),
    value: token.en || token.value,
    original: token.en || token.value,
    display:
        store.outputLanguage.value === LANGUAGES.ZH
            ? token.zh || token.value
            : token.en || token.value,
    mapping: token,
    isCustomGroup,
  };

  store.addFinalToken(newToken, pos);
  setCursor('output', pos);
};

const handleAddNewToken = async (category, subcategory) => {
  const zh = prompt('中文:');
  if (!zh) return;

  const en = prompt('英文:');
  if (!en) return;

  const newToken = await addNewToken(category, subcategory, {zh, en});

  if (newToken) {
    tokenMgmt.syncOutputTokens(newToken);
    console.log('[App] 新词元已添加并同步到输出区');
  }
};

// ========== 词元池操作 ==========
const handleUsePoolItem = (poolItem) => {
  const pos =
      cursorPosition.value.area === 'output' && cursorPosition.value.index != null
          ? cursorPosition.value.index + 1
          : store.finalTokens.value.length;

  const placeholderToken = {
    id: `custom_pool_${poolItem.id}_${Date.now()}`,
    value: `{#%${poolItem.id}#%}`,
    original: `{#%${poolItem.id}#%}`,
    display: groupMgmt.getPoolItemDisplayName(poolItem, store.viewLanguage.value),
    mapping: null,
    isCustomPool: true,
    poolKey: poolItem.id,
    poolData: poolItem,
  };

  store.addFinalToken(placeholderToken, pos);
  setCursor('output', pos);
};

// ========== 分组对话框 ==========
const handleGroupConfirm = (groupData) => {
  groupMgmt.handleGroupConfirm(groupData, store.editingGroup.value);
  store.closeGroupDialog();
};

// ========== 词元选择器 ==========
const handleTokenSelected = (token) => {
  if (store.currentGroupForToken.value) {
    const weight = prompt('设置权重 (0-10):', '1');
    if (weight !== null) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum >= 0 && weightNum <= 10) {
        groupMgmt.handleAddTokenToGroup(
            store.currentGroupForToken.value,
            token,
            weightNum
        );
      }
    }
    store.closeTokenSelector();
  }
};

// ========== UI 辅助 ==========
const getFocusTips = () => {
  if (store.hasEditingToken.value) {
    return '正在编辑词元中... (回车确认 | ESC取消)';
  }

  const tips = {
    output: '点击词元选中 | 空格插入新词元 | 双击词元编辑',
    custom: '双击词元使用 | 点击🎲随机选择',
    pool: '单击词元/词元池编辑 | 双击添加到输出区',
  };
  return tips[store.focusedArea.value] || '点击区域后双击词库添加词元';
};

// ========== 确认/取消 ==========
const handleConfirm = () => {
  if (store.hasEditingToken.value) {
    alert('请先完成词元编辑（回车确认或ESC取消）');
    return;
  }

  updatePreferences({outputMode: store.outputMode.value});
  emit('close', finalText.value);
};

// ⭐ 修改：添加确认对话框
const handleCancel = async () => {
  console.log('[App.vue] 准备关闭编辑器');

  const confirmed = await confirmDialog.confirm(
      '确定要关闭编辑器吗？未保存的更改将会丢失。'
  );

  if (confirmed) {
    console.log('[App.vue] 用户确认关闭编辑器');
    emit('close', null);
  } else {
    console.log('[App.vue] 用户取消关闭');
  }
};

// ⭐ 修改：使用新的键盘处理器
const keyboard = useAppKeyboard(store, {
  handleEditConfirm,
  handleEditCancel,
  handleConfirm,
  handleCancel,
  handleInsertNewToken,
  cursorPosition,
});

// ========== 生命周期 ==========
onMounted(async () => {
  console.log('[App.vue] 开始初始化应用');
  document.addEventListener('keydown', keyboard.handleKeyDown);

  await initializeApp();
  isInitialized.value = true;

  console.log('[App.vue] 初始化完成', {
    tokenCategories: tokenCategories.value.length,
    customGroups: customGroups.value.length,
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', keyboard.handleKeyDown);
});
</script>

<template>
  <Transition name="modal">
    <div v-if="true" class="lxh-modal-overlay" @click.self="handleCancel" @mousedown.stop>
      <div class="lxh-modal-content" @mousedown.stop>
        <!-- ========== 头部 ========== -->
        <div class="lxh-modal-header">
          <div class="header-left">
            <h3>✨ LXH Prompt 编辑器</h3>
            <span v-if="store.hasEditingToken.value" class="editing-indicator">
              ✏️ 编辑中...
            </span>
          </div>
          <button class="close-btn" @click="handleCancel">&times;</button>
        </div>

        <!-- ========== 主体 ========== -->
        <div class="lxh-modal-body">
          <!-- 最终输出区 -->
          <FinalOutputSection
              :tokens="store.finalTokens.value"
              :mode="store.outputMode.value"
              :language="store.outputLanguage.value"
              :view-language="store.viewLanguage.value"
              :focused="store.focusedArea.value === 'output'"
              :cursor-index="cursorPosition.index"
              @update:mode="store.setOutputMode($event)"
              @update:language="handleOutputLanguageChange"
              @update:view-language="handleViewLanguageChange"
              @token-click="handleTokenClick"
              @token-dblclick="editorOps.handleTokenEdit"
              @remove-token="handleRemoveToken"
              @focus="store.setFocusedArea('output')"
              @reorder-tokens="handleReorderTokens"
              @edit-confirm="handleEditConfirm"
              @edit-cancel="handleEditCancel"
          />

          <!-- 底部面板 -->
          <div class="bottom-panels">
            <!-- 左侧：词元编辑面板 -->
            <div class="left-panel">
              <div class="token-editor-panel">
                <div class="panel-header">
                  <h4>✏️ 词元编辑</h4>
                  <div class="panel-controls">
                    <button
                        class="add-token-btn"
                        @click="editorOps.openNewTokenEditor"
                        title="添加新词元到用户词库"
                    >
                      ＋ 新建词元
                    </button>
                  </div>
                </div>
                <div class="panel-content">
                  <TokenEditorSection
                      v-if="store.showEditor.value"
                      :token="store.editingToken.value"
                      :token-type="store.editingTokenType.value"
                      :categories="tokenCategories"
                      :language="store.viewLanguage.value"
                      :is-embedded="true"
                      @close="store.closeEditor"
                      @save="editorOps.handleTokenSave"
                      @view-token="editorOps.handlePoolTokenClick"
                      @edit-token="editorOps.handlePoolTokenClick"
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
                        <span class="stat-value">{{ store.finalTokens.value.length }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">已映射</span>
                        <span class="stat-value">{{ store.mappedTokensCount.value }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">未映射</span>
                        <span class="stat-value">{{ store.unmappedTokensCount.value }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">词元池</span>
                        <span class="stat-value">{{ store.poolTokensCount.value }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：词元映射池 -->
            <div class="right-panel">
              <TokenPoolSection
                  :categories="tokenCategories"
                  :custom-groups="customGroups"
                  :language="store.viewLanguage.value"
                  :focused="store.focusedArea.value === 'pool'"
                  @token-click="handlePoolTokenClick"
                  @token-dblclick="handlePoolTokenDoubleClick"
                  @pool-item-click="editorOps.handlePoolItemClick"
                  @add-token="handleAddNewToken"
                  @use-pool-item="handleUsePoolItem"
                  @click="store.setFocusedArea('pool')"
              />
            </div>
          </div>
        </div>

        <!-- ========== 底部操作栏 ========== -->
        <div class="lxh-modal-footer">
          <div class="footer-tips">
            💡 {{ getFocusTips() }} | 词元数: {{ store.finalTokens.value.length }} | 字符数: {{
              finalText.length
            }}
            | 查看语言:
            {{
              store.viewLanguage.value === 'zh'
                  ? '中文'
                  : store.viewLanguage.value === 'en'
                      ? '英文'
                      : '日文'
            }}
            | 输出语言:
            {{
              store.outputLanguage.value === 'zh'
                  ? '中文'
                  : store.outputLanguage.value === 'en'
                      ? '英文'
                      : '日文'
            }}
            <span v-if="!store.hasEditingToken.value" class="shortcut-tip">
              | <strong>选中词元后按空格插入新词元</strong>
            </span>
          </div>
          <div class="footer-actions">
            <button @click="handleCancel">取消 (Esc)</button>
            <button class="primary" @click="handleConfirm">确认 (Ctrl+Enter)</button>
          </div>
        </div>
      </div>

      <!-- ========== 对话框 ========== -->
      <GroupDialog
          v-if="store.showingGroupDialog.value"
          :group="store.editingGroup.value"
          :is-edit="!!store.editingGroup.value"
          @close="store.closeGroupDialog"
          @confirm="handleGroupConfirm"
      />

      <TokenSelector
          v-if="store.showingTokenSelector.value"
          :all-tokens="tokenMgmt.allTokensFlat.value"
          :language="store.viewLanguage.value"
          @close="store.closeTokenSelector"
          @select="handleTokenSelected"
      />

      <!-- ⭐ 新增：确认对话框 -->
      <ConfirmDialog
          :show="confirmDialog.showConfirmDialog.value"
          :message="confirmDialog.confirmMessage.value"
          @confirm="confirmDialog.handleConfirm"
          @cancel="confirmDialog.handleCancelConfirm"
      />
    </div>
  </Transition>
</template>


<style scoped>
/* ==================== 词元编辑面板样式 ==================== */
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

/* ==================== 布局 ==================== */
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
  0%,
  100% {
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
  color: #42a5f5;
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

.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #ff9800;
  color: #000;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  animation: pulse-loading 1.5s infinite;
}

@keyframes pulse-loading {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.loading-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-content {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #404040;
  border-top-color: #0d7dd8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-content p {
  color: #888;
  font-size: 14px;
}
</style>