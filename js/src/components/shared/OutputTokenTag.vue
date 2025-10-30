<template>
  <component
    :is="isEditing ? 'input' : 'span'"
    v-bind="componentProps"
    :class="componentClasses"
    :style="componentStyle"
    @mousedown="!isEditing && $emit('mousedown', $event)"
    @touchstart="!isEditing && $emit('touchstart', $event)"
    @click="!isEditing && $emit('click', $event)"
    @keydown.enter.prevent="isEditing && $emit('edit-confirm')"
    @keydown.esc.prevent="isEditing && $emit('edit-cancel')"
    @blur="isEditing && $emit('edit-blur')"
  >
    <template v-if="!isEditing">
      {{ displayText }}
      <button
        class="token-remove"
        @click.stop="$emit('remove')"
        title="删除"
      >
        ×
      </button>
    </template>
  </component>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  token: {
    type: Object,
    required: true,
  },
  displayText: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  isCursorActive: {
    type: Boolean,
    default: false,
  },
  isDragging: {
    type: Boolean,
    default: false,
  },
  isDropTarget: {
    type: Boolean,
    default: false,
  },
  isLongPressActive: {
    type: Boolean,
    default: false,
  },
  longPressProgress: {
    type: Number,
    default: 0,
  },
  area: {
    type: String,
    validator: (val) => ['original', 'mapped'].includes(val),
  },
  modelValue: String,
});

const emit = defineEmits([
  'update:modelValue',
  'mousedown',
  'touchstart',
  'click',
  'remove',
  'edit-confirm',
  'edit-cancel',
  'edit-blur',
]);

const componentProps = computed(() => {
  if (props.isEditing) {
    return {
      type: 'text',
      value: props.modelValue,
      placeholder: '输入词元 (回车确认)',
      onInput: (e) => emit('update:modelValue', e.target.value),
    };
  }
  return {
    title: props.title,
    draggable: false,
  };
});

const componentClasses = computed(() => {
  if (props.isEditing) {
    return 'token-edit-input';
  }

  const classes = [
    'token-tag',
    `${props.area}-token`,
  ];

  if (props.isCursorActive) classes.push('cursor-active');
  if (!props.token.mapping) classes.push('no-mapping');
  if (props.token.isCustomPool) classes.push('custom-pool');
  if (props.isDragging) classes.push('dragging');
  if (props.isDropTarget) classes.push('drop-target');
  if (props.isLongPressActive) classes.push('long-press-active');
  if (props.longPressProgress === 100) classes.push('long-press-complete');

  return classes.join(' ');
});

const componentStyle = computed(() => {
  if (props.isLongPressActive) {
    return { '--long-press-progress': `${props.longPressProgress}%` };
  }
  return {};
});
</script>

<style scoped>
/* 编辑输入框样式 */
.token-edit-input {
  padding: 4px 12px;
  background: #2a2a2a;
  border: 2px solid #0d7dd8;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  outline: none;
  min-width: 120px;
  max-width: 250px;
  font-family: inherit;
  transition: all 0.2s ease;
  animation: inputGlow 0.4s ease-out;
}

.token-edit-input:focus {
  border-color: #42a5f5;
  background: #333;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.25), 0 2px 8px rgba(66, 165, 245, 0.3);
}

.token-edit-input::placeholder {
  color: #666;
  font-size: 11px;
}

@keyframes inputGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(13, 125, 216, 0.8);
    transform: scale(0.95);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(13, 125, 216, 0.2);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 3px rgba(13, 125, 216, 0.25);
    transform: scale(1);
  }
}

/* 词元标签样式 */
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
}

.token-tag:hover {
  background: #404040;
  transform: translateY(-1px);
}

.original-token:hover {
  border-color: #4caf50;
}

.mapped-token:hover {
  border-color: #2196f3;
}

.token-tag.cursor-active {
  background: #1565c0 !important;
  border-color: #1e88e5 !important;
  color: #fff !important;
  box-shadow: 0 0 0 2px rgba(30, 136, 229, 0.3), 0 2px 8px rgba(30, 136, 229, 0.2);
  transform: translateY(-1px);
}

.token-tag.no-mapping {
  border: 2px dashed #ff9800;
  padding: 3px 7px;
}

.token-tag.custom-pool {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: 2px solid #764ba2 !important;
  color: white !important;
  font-weight: 700 !important;
}

/* 长按效果 */
.token-tag.long-press-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: var(--long-press-progress, 0%);
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 152, 0, 0.5), rgba(255, 152, 0, 0.9));
  z-index: -1;
  transition: width 0.05s linear;
  border-radius: inherit;
}

.token-tag.long-press-complete {
  background: #ff9800 !important;
  border: 2px solid #ffb74d !important;
  color: #000 !important;
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.4), 0 4px 12px rgba(255, 152, 0, 0.5);
}

/* 拖拽效果 */
.token-tag.dragging {
  opacity: 0.5;
  transform: scale(0.95);
  z-index: 1000;
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
  box-shadow: 0 0 8px rgba(13, 125, 216, 0.6);
}

/* 删除按钮 */
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
</style>