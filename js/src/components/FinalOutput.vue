<template>
  <div class="final-output" @click="$emit('focus')">
    <!-- 头部保持不变 -->
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
          💬 自然语言
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
              title="查看语言：中文"
          >
            🇨🇨🇳🇳 查看语言
          </button>
        </div>
      </div>
      <div class="output-content" :class="{ focused: focused && focusedSection === 'original' }">
        <div
            class="token-list"
            @dragover.prevent="handleDragOver"
            @drop="handleDrop('original')"
        >
          <span
              v-for="(token, index) in tokens"
              :key="token.id"
              class="token-tag original-token"
              :class="{
              'cursor-active': cursorIndex === index && focusedSection === 'original',
              'no-mapping': !token.mapping,
              'dragging': isDragging && dragInfo.sourceIndex === index && dragInfo.sourceArea === 'original',
              'drop-target': dropTargetIndex === index && dropTargetArea === 'original',
              'long-press-active': longPressActive && longPressToken.area === 'original' && longPressToken.index === index,
              'long-press-complete': longPressProgress === 100 && longPressToken.area === 'original' && longPressToken.index === index
            }"
              :style="{
              '--long-press-progress': `${longPressProgress}%`
            }"
              :title="getOriginalTokenTitle(token)"
              @mousedown="handleMouseDown($event, token, index, 'original')"
              @touchstart="handleTouchStart($event, token, index, 'original')"
              @click="handleOriginalTokenClick(token, index)"
              @dblclick="$emit('token-dblclick', token, index)"
              draggable="false"
          >
            {{ getViewTokenDisplay(token) }}
            <button class="token-remove" @click.stop="$emit('remove-token', index)">×</button>
          </span>
          <span
              class="cursor-placeholder"
              v-if="focused && focusedSection === 'original'"
              :style="{ order: cursorIndex !== null ? cursorIndex + 1 : tokens.length + 1 }"
          >|</span>
          <span class="cursor-indicator" v-if="tokens.length === 0">
            点击下方词库添加词元...
          </span>
        </div>
        <div class="text-preview">
          <span class="preview-label">查看预览:</span>
          <span class="preview-text">{{ getViewTextPreview() }}</span>
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
            cn 输出中文
          </button>
          <button
              class="lang-btn"
              :class="{ active: language === 'en' }"
              @click="$emit('update:language', 'en')"
              title="输出语言：英文"
          >
            en 输出英文
          </button>
        </div>
      </div>
      <div class="output-content" :class="{ focused: focused && focusedSection === 'mapped' }">
        <div
            class="token-list"
            @dragover.prevent="handleDragOver"
            @drop="handleDrop('mapped')"
        >
          <span
              v-for="(token, index) in tokens"
              :key="token.id"
              class="token-tag mapped-token"
              :class="{
              'cursor-active': cursorIndex === index && focusedSection === 'mapped',
              'no-mapping': !token.mapping,
              'dragging': isDragging && dragInfo.sourceIndex === index && dragInfo.sourceArea === 'mapped',
              'drop-target': dropTargetIndex === index && dropTargetArea === 'mapped',
              'long-press-active': longPressActive && longPressToken.area === 'mapped' && longPressToken.index === index,
              'long-press-complete': longPressProgress === 100 && longPressToken.area === 'mapped' && longPressToken.index === index
            }"
              :style="{
              '--long-press-progress': `${longPressProgress}%`
            }"
              :title="getMappedTokenTitle(token)"
              @mousedown="handleMouseDown($event, token, index, 'mapped')"
              @touchstart="handleTouchStart($event, token, index, 'mapped')"
              @click="handleMappedTokenClick(token, index)"
              @dblclick="$emit('token-dblclick', token, index)"
              draggable="false"
          >
            {{ getMappedTokenDisplay(token) }}
            <button class="token-remove" @click.stop="$emit('remove-token', index)">×</button>
          </span>
          <span
              class="cursor-placeholder"
              v-if="focused && focusedSection === 'mapped'"
              :style="{ order: cursorIndex !== null ? cursorIndex + 1 : tokens.length + 1 }"
          >|</span>
        </div>
        <div class="text-preview">
          <span class="preview-label">最终输出:</span>
          <span class="preview-text final-text">{{ getFinalTextPreview() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onUnmounted, ref, watch} from 'vue';

const props = defineProps({
  tokens: Array,
  mode: String,
  language: String,
  viewLanguage: String,
  focused: Boolean,
  cursorIndex: Number
});

const emit = defineEmits([
  'update:mode',
  'update:language',
  'update:view-language',
  'token-click',
  'token-dblclick',
  'remove-token',
  'focus',
  'reorder-tokens' // 新增：词元重新排序事件
]);

const focusedSection = ref('mapped');

// 拖拽相关状态
const isDragging = ref(false);
const dragInfo = ref({
  sourceIndex: -1,
  sourceArea: null,
  startX: 0,
  startY: 0
});
const dropTargetIndex = ref(-1);
const dropTargetArea = ref(null);
let longPressTimer = null;
const LONG_PRESS_DURATION = 1000; // 长按1秒

// 清理定时器
onUnmounted(() => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
  }
});

// 鼠标按下事件
const handleMouseDown = (event, token, index, area) => {
  event.preventDefault();

  dragInfo.value = {
    sourceIndex: index,
    sourceArea: area,
    startX: event.clientX,
    startY: event.clientY
  };

  // 重置长按状态
  longPressProgress.value = 0;
  longPressActive.value = true;
  longPressToken.value = {area, index};

  // 开始长按进度动画
  const startTime = Date.now();
  const updateProgress = () => {
    if (!longPressActive.value) return;

    const elapsed = Date.now() - startTime;
    longPressProgress.value = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);

    if (elapsed < LONG_PRESS_DURATION) {
      requestAnimationFrame(updateProgress);
    } else {
      startDrag(area, index);
    }
  };

  requestAnimationFrame(updateProgress);

  longPressTimer = setTimeout(() => {
    // 这个逻辑现在在 updateProgress 中处理
  }, LONG_PRESS_DURATION);
};

// 触摸开始事件
const handleTouchStart = (event, token, index, area) => {
  const touch = event.touches[0];
  dragInfo.value = {
    sourceIndex: index,
    sourceArea: area,
    startX: touch.clientX,
    startY: touch.clientY
  };

  // 重置长按状态
  longPressProgress.value = 0;
  longPressActive.value = true;
  longPressToken.value = {area, index};

  // 开始长按进度动画（与鼠标相同的逻辑）
  const startTime = Date.now();
  const updateProgress = () => {
    if (!longPressActive.value) return;

    const elapsed = Date.now() - startTime;
    longPressProgress.value = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);

    if (elapsed < LONG_PRESS_DURATION) {
      requestAnimationFrame(updateProgress);
    } else {
      startDrag(area, index);
    }
  };

  requestAnimationFrame(updateProgress);

  longPressTimer = setTimeout(() => {
    // 这个逻辑现在在 updateProgress 中处理
  }, LONG_PRESS_DURATION);
};

// 开始拖拽
const startDrag = (area, index) => {
  isDragging.value = true;
  focusedSection.value = area;
  console.log(`开始拖拽: 区域=${area}, 索引=${index}`);

  // 添加全局事件监听
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
  document.addEventListener('touchmove', handleGlobalTouchMove, {passive: false});
  document.addEventListener('touchend', handleGlobalTouchEnd);
};

// 全局鼠标移动
const handleGlobalMouseMove = (event) => {
  if (!isDragging.value) return;
  event.preventDefault();
  updateDropTarget(event.clientX, event.clientY);
};

// 全局触摸移动
const handleGlobalTouchMove = (event) => {
  if (!isDragging.value) return;
  event.preventDefault();
  const touch = event.touches[0];
  updateDropTarget(touch.clientX, touch.clientY);
};

// 更新拖拽目标位置
const updateDropTarget = (clientX, clientY) => {
  // 这里简化处理，实际可以根据鼠标位置计算更精确的插入位置
  // 可以根据元素位置和大小计算具体的插入索引
  const elements = document.querySelectorAll(`.${dragInfo.value.sourceArea}-section .token-tag`);
  let closestIndex = -1;
  let minDistance = Infinity;

  elements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const distance = Math.abs(clientX - centerX);

    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  if (closestIndex !== -1) {
    dropTargetIndex.value = closestIndex;
    dropTargetArea.value = dragInfo.value.sourceArea;
  }
};

// 拖拽悬停处理
const handleDragOver = (event) => {
  if (!isDragging.value) return;
  event.preventDefault();
};

// 放置处理
const handleDrop = (area) => {
  if (!isDragging.value || area !== dragInfo.value.sourceArea) return;

  const sourceIndex = dragInfo.value.sourceIndex;
  const targetIndex = dropTargetIndex.value;

  if (sourceIndex !== targetIndex && targetIndex !== -1) {
    console.log(`移动词元: 从 ${sourceIndex} 到 ${targetIndex}`);
    emit('reorder-tokens', {from: sourceIndex, to: targetIndex});
  }

  endDrag();
};

// 全局鼠标松开
const handleGlobalMouseUp = () => {
  if (!isDragging.value) return;
  completeDrag();
};

// 全局触摸结束
const handleGlobalTouchEnd = () => {
  if (!isDragging.value) return;
  completeDrag();
};

// 完成拖拽
const completeDrag = () => {
  if (isDragging.value) {
    const sourceIndex = dragInfo.value.sourceIndex;
    const targetIndex = dropTargetIndex.value;

    if (sourceIndex !== targetIndex && targetIndex !== -1) {
      console.log(`移动词元: 从 ${sourceIndex} 到 ${targetIndex}`);
      emit('reorder-tokens', {from: sourceIndex, to: targetIndex});
    }
  }
  endDrag();
};

// 结束拖拽
const endDrag = () => {
  isDragging.value = false;
  dropTargetIndex.value = -1;
  dropTargetArea.value = null;

  // 重置长按状态
  longPressActive.value = false;
  longPressProgress.value = 0;
  longPressToken.value = {area: null, index: -1};

  // 清理定时器
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  // 移除全局事件监听
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);
  document.removeEventListener('touchmove', handleGlobalTouchMove);
  document.removeEventListener('touchend', handleGlobalTouchEnd);
};

// 取消长按（如果鼠标/触摸在1秒内移动或松开）
const cancelLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  // 重置长按状态
  longPressActive.value = false;
  longPressProgress.value = 0;
  longPressToken.value = {area: null, index: -1};
};

// 修改点击事件，取消长按
const handleOriginalTokenClick = (token, index) => {
  cancelLongPress();
  focusedSection.value = 'original';
  emit('token-click', token, index);
};

const handleMappedTokenClick = (token, index) => {
  cancelLongPress();
  focusedSection.value = 'mapped';
  emit('token-click', token, index);
};

// 获取查看区域的词元显示（使用viewLanguage）
const getViewTokenDisplay = (token) => {
  if (!token.mapping) {
    return token.original || token.value;
  }
  if (props.viewLanguage === 'zh') {
    return token.mapping.zh || token.zh || token.value;
  } else {
    return token.mapping.en || token.en || token.value;
  }
};

const getMappedTokenDisplay = (token) => {
  if (props.mode === 'natural') {
    return token.display || token.value;
  }
  if (props.language === 'zh') {
    return token.mapping?.zh || token.zh || token.value;
  } else {
    return token.mapping?.en || token.en || token.value;
  }
};

const getViewTextPreview = () => {
  if (props.tokens.length === 0) return '空';
  const parts = props.tokens.map(token => getViewTokenDisplay(token));
  return props.mode === 'token' ? parts.join(', ') : parts.join(' ');
};

const getFinalTextPreview = () => {
  if (props.tokens.length === 0) return '空';
  const parts = props.tokens.map(token => getMappedTokenDisplay(token));
  return props.mode === 'token' ? parts.join(', ') : parts.join(' ');
};

const getOriginalTokenTitle = (token) => {
  const parts = [];
  if (token.mapping) {
    parts.push('已映射');
    if (props.viewLanguage === 'zh') {
      parts.push(`中文查看: ${token.mapping.zh}`);
      parts.push(`英文: ${token.mapping.en}`);
    } else {
      parts.push(`英文查看: ${token.mapping.en}`);
      parts.push(`中文: ${token.mapping.zh}`);
    }
  } else {
    parts.push('未映射');
  }
  parts.push('双击编辑 | 长按1秒拖拽（橙色高亮）'); // 修改提示
  return parts.join(' | ');
};

const getMappedTokenTitle = (token) => {
  const parts = [];
  if (token.mapping) {
    parts.push('原始值: ' + (token.original || token.value));
    if (props.language === 'zh') {
      parts.push(`输出语言: 中文`);
      parts.push(`英文: ${token.mapping.en}`);
    } else {
      parts.push(`输出语言: 英文`);
      parts.push(`中文: ${token.mapping.zh}`);
    }
  } else {
    parts.push('未映射，使用原始值');
  }
  if (token.isCustomGroup) {
    parts.push('(来自自定义组合)');
  }
  parts.push('双击编辑 | 长按1秒拖拽（橙色高亮）'); // 修改提示
  return parts.join(' | ');
};

const longPressProgress = ref(0); // 长按进度 0-100
const longPressActive = ref(false); // 是否正在长按
const longPressToken = ref({area: null, index: -1}); // 当前长按的词元信息

watch(() => props.focused, (newVal) => {
  if (newVal) {
    focusedSection.value = 'mapped';
  }
});

</script>



<style scoped>
/* 在原有样式基础上添加以下样式 */

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

.section-controls {
  display: flex;
  gap: 4px;
}

.section-controls .lang-btn {
  padding: 4px 8px;
  font-size: 11px;
  background: #1e1e1e;
  border: 1px solid #404040;
  color: #aaa;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.section-controls .lang-btn:hover {
  background: #2a2a2a;
  border-color: #555;
}

.section-controls .lang-btn.active {
  background: #0d7dd8;
  border-color: #0d7dd8;
  color: #fff;
}

.original-section .section-controls .lang-btn.active {
  background: #4CAF50; /* 绿色表示查看语言 */
  border-color: #4CAF50;
}

.mapped-section .section-controls .lang-btn.active {
  background: #2196F3; /* 蓝色表示输出语言 */
  border-color: #2196F3;
}

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

.divider {
  width: 1px;
  height: 20px;
  background: #404040;
  margin: 0 4px;
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
  padding: 8px 16px;
  background: #2a2a2a;
  border-bottom: 1px solid #333;
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
  color: #4CAF50; /* 绿色表示原始输入 */
}

.mapped-section .section-title {
  color: #2196F3; /* 蓝色表示映射输出 */
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

.token-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  position: relative;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* 声明 CSS 变量的默认值 */
  --long-press-progress: 0%;
}

.token-tag:hover {
  background: #404040;
  transform: translateY(-1px);
}

.original-token:hover {
  border-color: #4CAF50;
}

.mapped-token:hover {
  border-color: #2196F3;
}

/* 光标选中状态 - 蓝色背景高亮 */
.token-tag.cursor-active {
  background: #1565C0 !important; /* 深蓝色背景 */
  border-color: #1E88E5 !important; /* 亮蓝色边框 */
  color: #fff !important; /* 白色文字 */
  box-shadow: 0 0 0 2px rgba(30, 136, 229, 0.3),
              0 2px 8px rgba(30, 136, 229, 0.2);
  transform: translateY(-1px);
}

/* 原始输入区域光标选中 - 使用绿色调的蓝色 */
.original-token.cursor-active {
  background: #0277BD !important;
  border-color: #29B6F6 !important;
}

/* 映射输出区域光标选中 - 使用标准蓝色 */
.mapped-token.cursor-active {
  background: #1565C0 !important;
  border-color: #42A5F5 !important;
}

/* 未映射词元 - 虚线橙色边框 */
.token-tag.no-mapping {
  border: 2px dashed #FF9800; /* 加粗虚线边框 */
  border-style: dashed;
  padding: 3px 7px; /* 调整padding以保持总尺寸一致 */
}

/* 未映射且被光标选中 - 蓝色背景 + 橙色虚线边框 */
.token-tag.no-mapping.cursor-active {
  background: #1565C0 !important;
  border: 2px dashed #FFB74D !important; /* 更亮的橙色虚线 */
  color: #fff !important;
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.2),
              0 0 0 4px rgba(30, 136, 229, 0.2),
              0 2px 8px rgba(30, 136, 229, 0.2);
}

/* 光标选中时的移除按钮样式 */
.token-tag.cursor-active .token-remove {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.token-tag.cursor-active .token-remove:hover {
  background: #d32f2f !important;
  border-color: #d32f2f !important;
  transform: scale(1.2);
}

/* 长按激活状态 */
.token-tag.long-press-active {
  position: relative;
  overflow: hidden;
  z-index: 10;
}

/* 长按进度填充效果 - 覆盖在蓝色背景之上 */
.token-tag.long-press-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: var(--long-press-progress, 0%);
  height: 100%;
  background: linear-gradient(90deg,
    rgba(255, 152, 0, 0.5) 0%,
    rgba(255, 152, 0, 0.7) 50%,
    rgba(255, 152, 0, 0.9) 100%);
  z-index: -1;
  transition: width 0.05s linear;
  border-radius: inherit;
}

/* 长按完成时的橙色高亮效果 - 完全覆盖 */
.token-tag.long-press-complete {
  background: #ff9800 !important;
  border: 2px solid #FFB74D !important;
  color: #000 !important;
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.4),
              0 4px 12px rgba(255, 152, 0, 0.5);
  animation: pulse-glow 0.5s ease-in-out;
  z-index: 20;
  padding: 3px 7px; /* 调整padding以保持总尺寸一致 */
}

/* 原始词元的长按完成样式 */
.original-token.long-press-complete {
  background: #ff9800 !important;
  border-color: #FFB74D !important;
}

/* 映射词元的长按完成样式 */
.mapped-token.long-press-complete {
  background: #ff9800 !important;
  border-color: #FFB74D !important;
}

/* 脉冲发光动画 */
@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7),
                0 4px 12px rgba(255, 152, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(255, 152, 0, 0.4),
                0 6px 16px rgba(255, 152, 0, 0.6);
  }
  100% {
    box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.4),
                0 4px 12px rgba(255, 152, 0, 0.5);
  }
}

/* 长按进度指示器 */
.token-tag.long-press-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: var(--long-press-progress, 0%);
  height: 3px;
  background: linear-gradient(90deg, #FF9800, #FFB74D);
  border-radius: 0 0 4px 4px;
  transition: width 0.05s linear;
  box-shadow: 0 0 4px rgba(255, 152, 0, 0.5);
}

/* 拖拽中的词元保持橙色高亮 */
.token-tag.dragging.long-press-complete {
  background: #ff9800 !important;
  border-color: #FFB74D !important;
  transform: scale(0.95) rotate(2deg);
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.5),
              0 8px 20px rgba(255, 152, 0, 0.4);
}

/* 长按过程中的文字颜色渐变 */
.token-tag.long-press-active {
  color: #fff !important; /* 保持白色，更容易看清 */
  font-weight: 600;
}

/* 长按完成时的文字颜色 */
.token-tag.long-press-complete {
  color: #000 !important;
  font-weight: 700;
}

/* 移除按钮在长按时的样式 */
.token-tag.long-press-active .token-remove {
  background: rgba(0, 0, 0, 0.2) !important;
  color: #fff !important;
  border: 1px solid rgba(0, 0, 0, 0.3);
}

.token-tag.long-press-complete .token-remove {
  background: rgba(0, 0, 0, 0.3) !important;
  color: #000 !important;
  border: 1px solid rgba(0, 0, 0, 0.4);
}

.token-tag.long-press-complete .token-remove:hover {
  background: #d32f2f !important;
  color: #fff !important;
  transform: scale(1.2);
}

/* 拖拽目标位置指示器 */
.token-tag.drop-target {
  position: relative;
}

.token-tag.drop-target::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -4px;
  right: -4px;
  height: 4px;
  background: #0d7dd8;
  border-radius: 2px;
  transform: translateY(-50%);
  animation: pulse-insert 0.8s infinite;
  box-shadow: 0 0 8px rgba(13, 125, 216, 0.6);
}

.original-token.drop-target::before {
  background: #4CAF50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
}

.mapped-token.drop-target::before {
  background: #2196F3;
  box-shadow: 0 0 8px rgba(33, 150, 243, 0.6);
}

@keyframes pulse-insert {
  0%, 100% {
    opacity: 0.6;
    transform: translateY(-50%) scaleY(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) scaleY(1.5);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .token-tag.cursor-active {
    transform: scale(1.02);
  }

  .token-tag.long-press-complete {
    transform: scale(1.05);
  }

  .token-tag.dragging.long-press-complete {
    transform: scale(0.92) rotate(2deg);
  }
}

.token-remove {
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #555;
  border: none;
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.token-remove:hover {
  background: #d32f2f;
  transform: scale(1.2);
}

.cursor-placeholder {
  color: #0d7dd8;
  font-size: 16px;
  font-weight: bold;
  animation: blink 1s infinite;
  padding: 0 2px;
}

@keyframes blink {
  0%, 50%, 100% {
    opacity: 1;
  }
  25%, 75% {
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
  color: #2196F3;
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

.token-tag {
  /* 添加过渡效果 */
  transition: all 0.2s ease;
  position: relative;
}

/* 拖拽中的词元样式 */
.token-tag.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  z-index: 1000;
}

/* 拖拽目标位置指示器 */
.token-tag.drop-target {
  position: relative;
}

.token-tag.drop-target::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -2px;
  right: -2px;
  height: 3px;
  background: #0d7dd8;
  border-radius: 2px;
  transform: translateY(-50%);
  animation: pulse 1s infinite;
}

.original-token.drop-target::before {
  background: #4CAF50;
}

.mapped-token.drop-target::before {
  background: #2196F3;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* 拖拽过程中的列表样式 */
.token-list.dragging {
  cursor: grabbing;
}

/* 防止文本选中 */
.token-tag {
  user-select: none;
  -webkit-user-select: none;
}

/* 其他现有样式保持不变 */
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

/* 在现有的样式后添加长按拖拽动画效果 */

/* 长按激活状态 */
.token-tag.long-press-active {
  position: relative;
  overflow: hidden;
  z-index: 10;
}

/* 长按进度填充效果 */
.token-tag.long-press-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: var(--long-press-progress, 0%);
  height: 100%;
  background: linear-gradient(90deg,
  rgba(255, 152, 0, 0.3) 0%,
  rgba(255, 152, 0, 0.6) 50%,
  rgba(255, 152, 0, 0.9) 100%);
  z-index: -1;
  transition: width 0.1s linear;
  border-radius: inherit;
}

/* 长按完成时的橙色高亮效果 */
.token-tag.long-press-complete {
  background: #ff9800 !important;
  border-color: #ff9800 !important;
  color: #000 !important;
  transform: scale(1.05);
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.3),
  0 4px 12px rgba(255, 152, 0, 0.4);
  animation: pulse-glow 0.5s ease-in-out;
  z-index: 20;
}

/* 原始词元的长按完成样式 */
.original-token.long-press-complete {
  background: #ff9800 !important;
  border-color: #ff9800 !important;
}

/* 映射词元的长按完成样式 */
.mapped-token.long-press-complete {
  background: #ff9800 !important;
  border-color: #ff9800 !important;
}

/* 脉冲发光动画 */
@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.6),
    0 4px 12px rgba(255, 152, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(255, 152, 0, 0.3),
    0 6px 16px rgba(255, 152, 0, 0.5);
  }
  100% {
    box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.3),
    0 4px 12px rgba(255, 152, 0, 0.4);
  }
}

/* 长按进度指示器 */
.token-tag.long-press-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: var(--long-press-progress, 0%);
  height: 2px;
  background: #ff9800;
  border-radius: 1px;
  transition: width 0.1s linear;
}

/* 拖拽中的词元保持橙色高亮 */
.token-tag.dragging.long-press-complete {
  background: #ff9800 !important;
  border-color: #ff9800 !important;
  transform: scale(0.95) rotate(2deg);
  box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.5),
  0 8px 20px rgba(255, 152, 0, 0.3);
}

/* 长按过程中的文字颜色变化 */
.token-tag.long-press-active {
  color: #333 !important;
  font-weight: 600;
}

/* 移除按钮在长按时的样式 */
.token-tag.long-press-active .token-remove {
  background: rgba(0, 0, 0, 0.3) !important;
  color: #fff !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .token-tag.long-press-complete {
    transform: scale(1.03);
  }

  .token-tag.dragging.long-press-complete {
    transform: scale(0.92) rotate(2deg);
  }
}
</style>