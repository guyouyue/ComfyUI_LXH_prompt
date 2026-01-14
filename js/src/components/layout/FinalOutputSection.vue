<!--src/components/layout/FinalOutputSection.vue-->
<template>
  <div class="final-output" @click="$emit('focus')">
    <!-- 映射查看区域 -->
    <div class="output-section original-section">
      <div class="section-header">
        <div class="section-title-wrapper">
          <span class="section-title">📋 映射查看</span>
          <span class="section-subtitle">（多种语言混合）</span>
        </div>
        <div class="section-controls">
          <button
              class="lang-btn"
              :class="{ active: viewLanguage === 'zh' }"
              @click="$emit('update:view-language', 'zh')"
              title="展示语言：中文"
          >
            cn 中文
          </button>
          <button
              class="lang-btn"
              :class="{ active: viewLanguage === 'en' }"
              @click="$emit('update:view-language', 'en')"
              title="show language：English"
          >
            en English
          </button>
          <button
              class="lang-btn"
              :class="{ active: viewLanguage === 'jp' }"
              @click="$emit('update:view-language', 'jp')"
              title="プレゼン言語:日本語です"
          >
            jp 日本語です
          </button>
        </div>
      </div>

      <div
          class="output-content"
          :class="{ focused: focused && output.focusedSection.value === 'original' }"
      >
        <div
            class="token-list"
            @dragover.prevent="output.handleDragOver"
            @drop="output.handleDrop('original')"
        >
          <template v-for="(token, index) in tokens" :key="token.id">
            <OutputTokenTag
                :ref="(el) => token.isEditing && output.setEditInputRef(el?.$el, index)"
                :token="token"
                :display-text="output.getViewTokenDisplay(token)"
                :title="output.getOriginalTokenTitle(token)"
                :is-editing="token.isEditing"
                :is-cursor-active="cursorIndex === index"
                :is-dragging="output.isDragging.value && output.dragInfo.value.sourceIndex === index && output.dragInfo.value.sourceArea === 'original'"
                :is-drop-target="output.dropTargetIndex.value === index && output.dropTargetArea.value === 'original'"
                :is-long-press-active="output.longPressActive.value && output.longPressToken.value.area === 'original' && output.longPressToken.value.index === index"
                :long-press-progress="output.longPressToken.value.area === 'original' && output.longPressToken.value.index === index ? output.longPressProgress.value : 0"
                :model-value="token.value"
                area="original"
                @update:model-value="token.value = $event"
                @mousedown="output.handleMouseDown($event, token, index, 'original')"
                @touchstart="output.handleTouchStart($event, token, index, 'original')"
                @click="handleOriginalTokenClick(token, index)"
                @remove="$emit('remove-token', index)"
                @edit-confirm="output.handleEditConfirm(index)"
                @edit-cancel="output.handleEditCancel(index)"
                @edit-blur="output.handleEditBlur(index)"
            />
          </template>

          <span
              class="cursor-placeholder"
              v-if="focused && output.focusedSection.value === 'original'"
              :style="{ order: cursorIndex !== null ? cursorIndex + 1 : tokens.length + 1 }"
          >
            |
          </span>
          <span class="cursor-indicator" v-if="tokens.length === 0">
            点击下方词库添加词元...
          </span>
        </div>

        <div class="text-preview">
          <span class="preview-label">查看预览:</span>
          <span class="preview-text">{{ output.getViewTextPreview.value }}</span>
        </div>
      </div>
    </div>

    <!-- 映射输出区域 -->
    <div class="output-section mapped-section">
      <div class="section-header">
        <div class="section-title-wrapper">
          <span class="section-title">🎯 映射输出</span>
          <span class="section-subtitle">（输出语言）</span>
        </div>
        <div class="section-controls">
          <button
              class="lang-btn"
              :class="{ active: language === 'zh' }"
              @click="$emit('update:language', 'zh')"
              title="输出语言：中文"
          >
            cn 中文
          </button>
          <button
              class="lang-btn"
              :class="{ active: language === 'en' }"
              @click="$emit('update:language', 'en')"
              title="输出语言：英文"
          >
            English
          </button>
          <button
              class="lang-btn"
              :class="{ active: language === 'jp' }"
              @click="$emit('update:language', 'jp')"
              title="プレゼン言語:日本語です"
          >
            jp 日本語です
          </button>
        </div>
      </div>

      <div
          class="output-content"
          :class="{ focused: focused && output.focusedSection.value === 'mapped' }"
      >
        <div
            class="token-list"
            @dragover.prevent="output.handleDragOver"
            @drop="output.handleDrop('mapped')"
        >
          <template v-for="(token, index) in tokens" :key="token.id">
            <OutputTokenTag
                :ref="(el) => token.isEditing && output.setEditInputRef(el?.$el, index)"
                :token="token"
                :display-text="output.getMappedTokenDisplay(token)"
                :title="output.getMappedTokenTitle(token)"
                :is-editing="token.isEditing"
                :is-cursor-active="cursorIndex === index"
                :is-dragging="output.isDragging.value && output.dragInfo.value.sourceIndex === index && output.dragInfo.value.sourceArea === 'mapped'"
                :is-drop-target="output.dropTargetIndex.value === index && output.dropTargetArea.value === 'mapped'"
                :is-long-press-active="output.longPressActive.value && output.longPressToken.value.area === 'mapped' && output.longPressToken.value.index === index"
                :long-press-progress="output.longPressToken.value.area === 'mapped' && output.longPressToken.value.index === index ? output.longPressProgress.value : 0"
                :model-value="token.value"
                area="mapped"
                @update:model-value="token.value = $event"
                @mousedown="output.handleMouseDown($event, token, index, 'mapped')"
                @touchstart="output.handleTouchStart($event, token, index, 'mapped')"
                @click="handleMappedTokenClick(token, index)"
                @remove="$emit('remove-token', index)"
                @edit-confirm="output.handleEditConfirm(index)"
                @edit-cancel="output.handleEditCancel(index)"
                @edit-blur="output.handleEditBlur(index)"
            />
          </template>

          <span
              class="cursor-placeholder"
              v-if="focused && output.focusedSection.value === 'mapped'"
              :style="{ order: cursorIndex !== null ? cursorIndex + 1 : tokens.length + 1 }"
          >
            |
          </span>
        </div>

        <div class="text-preview">
          <span class="preview-label">最终输出:</span>
          <span class="preview-text final-text">{{ output.getFinalTextPreview.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onUnmounted } from 'vue';
import OutputTokenTag from '../shared/OutputTokenTag.vue';
import { useFinalOutput } from '../../composables/useFinalOutput.js';

const props = defineProps({
  tokens: Array,
  mode: String,
  language: String,
  viewLanguage: String,
  focused: Boolean,
  cursorIndex: Number,
});

const emit = defineEmits([
  'update:mode',
  'update:language',
  'update:view-language',
  'token-click',
  'token-dblclick',
  'remove-token',
  'focus',
  'reorder-tokens',
  'edit-confirm',
  'edit-cancel',
]);

// ========== 统一的 Composable ==========
const output = useFinalOutput(props, emit);

// ========== 事件处理 ==========
const handleOriginalTokenClick = (token, index) => {
  output.cancelLongPress();
  output.setFocusedSection('original');
  emit('token-click', token, index);
  emit('token-dblclick', token, index);
};

const handleMappedTokenClick = (token, index) => {
  output.cancelLongPress();
  output.setFocusedSection('mapped');
  emit('token-click', token, index);
  emit('token-dblclick', token, index);
};

// ========== 清理 ==========
onUnmounted(() => {
  output.cleanup();
});
</script>

<style scoped>
/* ==================== 最终输出区域布局 ==================== */
.final-output {
  background: #252525;
  border-radius: 8px;
  border: 1px solid #404040;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  max-height: 380px;
  transition: border-color 0.3s;
}

.final-output:hover {
  border-color: #555;
}

/* ==================== 语言/模式按钮 ==================== */
.lang-btn {
  padding: 6px 12px;
  font-size: 13px;
  background: #1e1e1e;
  border: 1px solid #404040;
  color: #aaa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover,
.lang-btn:hover {
  background: #2a2a2a;
  border-color: #555;
}

.mode-btn.active,
.lang-btn.active {
  background: #0d7dd8;
  border-color: #0d7dd8;
  color: #fff;
}

/* ==================== 输出区域 ==================== */
.output-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: 1px solid #333;
}

.output-section:last-child {
  border-bottom: none;
}

/* ==================== 区域头部 ==================== */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 16px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  color: #fafafa;
  font-size: 13px;
  font-weight: 600;
}

.section-subtitle {
  color: #888;
  font-size: 11px;
}

.original-section .section-title {
  color: #4caf50;
}

.mapped-section .section-title {
  color: #2196f3;
}

.section-controls {
  display: flex;
  gap: 4px;
}

.section-controls .lang-btn {
  padding: 4px 8px;
  font-size: 11px;
}

.section-controls .lang-btn.active {
  background: #0d7dd8;
}

.original-section .section-controls .lang-btn.active {
  background: #4caf50;
}

.mapped-section .section-controls .lang-btn.active {
  background: #2196f3;
}

/* ==================== 内容区域 ==================== */
.output-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 4px 12px;
  cursor: text;
  transition: background 0.2s;
  gap: 2px;
  overflow: hidden;
}

.output-content.focused {
  background: #2a2a2a;
  box-shadow: inset 0 0 0 2px rgba(13, 125, 216, 0.3);
}

/* ==================== 词元列表 ==================== */
.token-list {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: flex-start;
  align-content: flex-start;
  position: relative;
  min-height: 0px;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

/* ==================== 滚动条样式 ==================== */
.token-list::-webkit-scrollbar {
  width: 6px;
}

.token-list::-webkit-scrollbar-track {
  background: transparent;
}

.token-list::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 3px;
}

.token-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* ==================== 光标和占位符 ==================== */
.cursor-placeholder {
  color: #0d7dd8;
  font-size: 16px;
  font-weight: bold;
  animation: blink 1s infinite;
  padding: 0 2px;
  flex-shrink: 0;
}

@keyframes blink {
  0%,
  50%,
  100% {
    opacity: 1;
  }
  25%,
  75% {
    opacity: 0;
  }
}

.cursor-indicator {
  color: #666;
  font-style: italic;
  font-size: 13px;
  flex-shrink: 0;
}

/* ==================== 文本预览 ==================== */
.text-preview {
  flex-shrink: 0;
  padding: 8px 12px;
  background: #1e1e1e;
  border-radius: 4px;
  border-left: 3px solid #444;
  font-size: 12px;
  line-height: 1.5;
  max-height: 66px;
  overflow-y: auto;
  margin-top: auto;
}

.text-preview::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.text-preview::-webkit-scrollbar-track {
  background: transparent;
}

.text-preview::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 2px;
}

.preview-label {
  color: #888;
  font-weight: 600;
  margin-right: 8px;
  white-space: nowrap;
}

.preview-text {
  color: #e0e0e0;
  word-break: break-all;
  display: inline;
}

.final-text {
  color: #2196f3;
  font-weight: 500;
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .section-controls {
    width: 100%;
    justify-content: space-between;
  }

  .output-content {
    padding: 4px;
  }

  .text-preview {
    font-size: 11px;
    padding: 6px;
  }
}
</style>