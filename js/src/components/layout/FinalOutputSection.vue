<template>
  <div class="final-output" @click="$emit('focus')">
    <!-- 头部 -->
    <div class="output-header">
      <div class="output-controls">
        <button
            class="mode-btn"
            :class="{ active: mode === 'token' }"
            @click="$emit('update:mode', 'token')"
            title="提示词词元形式"
        >
          📝 词元模式
        </button>
        <button
            class="mode-btn"
            :class="{ active: mode === 'natural' }"
            @click="$emit('update:mode', 'natural')"
            title="自然语言模式"
        >
          💬 自然语言(待开发)
        </button>
      </div>
    </div>

    <!-- 原始输入区域 -->
    <div class="output-section original-section">
      <div class="section-header">
        <div class="section-title-wrapper">
          <span class="section-title">📋 原始输入</span>
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
          :class="{ focused: focused && state.focusedSection.value === 'original' }"
      >
        <div
            class="token-list"
            @dragover.prevent="drag.handleDragOver"
            @drop="drag.handleDrop('original')"
        >
          <template v-for="(token, index) in tokens" :key="token.id">
            <OutputTokenTag
                :ref="(el) => token.isEditing && state.setEditInputRef(el?.$el, index)"
                :token="token"
                :display-text="display.getViewTokenDisplay(token)"
                :title="display.getOriginalTokenTitle(token)"
                :is-editing="token.isEditing"
                :is-cursor-active="cursorIndex === index"
                :is-dragging="drag.isDragging.value && drag.dragInfo.value.sourceIndex === index && drag.dragInfo.value.sourceArea === 'original'"
                :is-drop-target="drag.dropTargetIndex.value === index && drag.dropTargetArea.value === 'original'"
                :is-long-press-active="drag.longPressActive.value && drag.longPressToken.value.area === 'original' && drag.longPressToken.value.index === index"
                :long-press-progress="drag.longPressToken.value.area === 'original' && drag.longPressToken.value.index === index ? drag.longPressProgress.value : 0"
                :model-value="token.value"
                area="original"
                @update:model-value="token.value = $event"
                @mousedown="drag.handleMouseDown($event, token, index, 'original')"
                @touchstart="drag.handleTouchStart($event, token, index, 'original')"
                @click="handleOriginalTokenClick(token, index)"
                @remove="$emit('remove-token', index)"
                @edit-confirm="edit.handleEditConfirm(index)"
                @edit-cancel="edit.handleEditCancel(index)"
                @edit-blur="edit.handleEditBlur(index)"
            />
          </template>

          <span
              class="cursor-placeholder"
              v-if="focused && state.focusedSection.value === 'original'"
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
          <span class="preview-text">{{ display.getViewTextPreview.value }}</span>
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
          :class="{ focused: focused && state.focusedSection.value === 'mapped' }"
      >
        <div
            class="token-list"
            @dragover.prevent="drag.handleDragOver"
            @drop="drag.handleDrop('mapped')"
        >
          <template v-for="(token, index) in tokens" :key="token.id">
            <OutputTokenTag
                :ref="(el) => token.isEditing && state.setEditInputRef(el?.$el, index)"
                :token="token"
                :display-text="display.getMappedTokenDisplay(token)"
                :title="display.getMappedTokenTitle(token)"
                :is-editing="token.isEditing"
                :is-cursor-active="cursorIndex === index"
                :is-dragging="drag.isDragging.value && drag.dragInfo.value.sourceIndex === index && drag.dragInfo.value.sourceArea === 'mapped'"
                :is-drop-target="drag.dropTargetIndex.value === index && drag.dropTargetArea.value === 'mapped'"
                :is-long-press-active="drag.longPressActive.value && drag.longPressToken.value.area === 'mapped' && drag.longPressToken.value.index === index"
                :long-press-progress="drag.longPressToken.value.area === 'mapped' && drag.longPressToken.value.index === index ? drag.longPressProgress.value : 0"
                :model-value="token.value"
                area="mapped"
                @update:model-value="token.value = $event"
                @mousedown="drag.handleMouseDown($event, token, index, 'mapped')"
                @touchstart="drag.handleTouchStart($event, token, index, 'mapped')"
                @click="handleMappedTokenClick(token, index)"
                @remove="$emit('remove-token', index)"
                @edit-confirm="edit.handleEditConfirm(index)"
                @edit-cancel="edit.handleEditCancel(index)"
                @edit-blur="edit.handleEditBlur(index)"
            />
          </template>

          <span
              class="cursor-placeholder"
              v-if="focused && state.focusedSection.value === 'mapped'"
              :style="{ order: cursorIndex !== null ? cursorIndex + 1 : tokens.length + 1 }"
          >
            |
          </span>
        </div>

        <div class="text-preview">
          <span class="preview-label">最终输出:</span>
          <span class="preview-text final-text">{{ display.getFinalTextPreview.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onUnmounted, watch} from 'vue';
import OutputTokenTag from '../shared/OutputTokenTag.vue';
import {useFinalOutputState} from '../../composables/useFinalOutputState.js';
import {useFinalOutputDrag} from '../../composables/useFinalOutputDrag.js';
import {useFinalOutputEdit} from '../../composables/useFinalOutputEdit.js';
import {useFinalOutputDisplay} from '../../composables/useFinalOutputDisplay.js';

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

// ========== Composables ==========
const state = useFinalOutputState();
const drag = useFinalOutputDrag(emit);
const edit = useFinalOutputEdit(props, state, emit);
const display = useFinalOutputDisplay(props);

// ========== 事件处理 ==========
const handleOriginalTokenClick = (token, index) => {
  drag.cancelLongPress();
  state.setFocusedSection('original');
  emit('token-click', token, index);
  emit('token-dblclick', token, index);
};

const handleMappedTokenClick = (token, index) => {
  drag.cancelLongPress();
  state.setFocusedSection('mapped');
  emit('token-click', token, index);
  emit('token-dblclick', token, index);
};

// ========== 监听聚焦状态 ==========
watch(
    () => props.focused,
    (newVal) => {
      if (newVal) {
        state.setFocusedSection('mapped');
      }
    }
);

// ========== 清理 ==========
onUnmounted(() => {
  drag.cleanup();
  edit.cleanup();
});
</script>

<style scoped>
/* ... 保持原有样式，只移除已在 OutputTokenTag 中的样式 ... */
/* 这里只保留布局相关的样式 */

.final-output {
  background: #252525;
  border-radius: 8px;
  border: 1px solid #404040;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  max-height: 400px;
  transition: border-color 0.3s;
}

.final-output:hover {
  border-color: #555;
}

.output-header {
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.output-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mode-btn,
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
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

.output-content {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
  cursor: text;
  transition: background 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.output-content.focused {
  background: #2a2a2a;
  box-shadow: inset 0 0 0 2px rgba(13, 125, 216, 0.3);
}

.token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  position: relative;
  min-height: 32px;
}

.cursor-placeholder {
  color: #0d7dd8;
  font-size: 16px;
  font-weight: bold;
  animation: blink 1s infinite;
  padding: 0 2px;
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
}

.text-preview {
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  border-left: 3px solid #444;
  font-size: 12px;
  line-height: 1.4;
}

.preview-label {
  color: #888;
  font-weight: 600;
  margin-right: 8px;
}

.preview-text {
  color: #e0e0e0;
  word-break: break-all;
}

.final-text {
  color: #2196f3;
  font-weight: 500;
}

.output-content::-webkit-scrollbar {
  width: 8px;
}

.output-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.output-content::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}
</style>