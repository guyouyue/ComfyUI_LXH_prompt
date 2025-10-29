<template>
  <div
    class="token-tag"
    :class="[token.source, { 'no-mapping': !token.mapping }]"
    :title="tooltip"
    @click="$emit('click', token)"
    @dblclick.stop="$emit('dblclick', token)"
  >
    <span class="token-text">{{ displayText }}</span>
    <span class="token-source-badge" :class="token.source">
      {{ token.source === 'user' ? '👤' : '⚙️' }}
    </span>
  </div>
</template>

<script setup>
const props = defineProps({
  token: Object,
  displayText: String,
  tooltip: String,
});

defineEmits(['click', 'dblclick']);
</script>

<style scoped>
.token-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  max-width: 200px;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-tag:hover {
  background: #404040;
  transform: translateY(-2px);
  border-color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.token-tag.user {
  border-left: 3px solid #0d7dd8;
}

.token-tag.system {
  border-left: 3px solid #666;
}

.token-tag.no-mapping {
  border: 1px solid #666;
  background: #2a2a2a;
  opacity: 0.8;
}

.token-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-source-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  min-width: 16px;
  text-align: center;
}

.token-source-badge.user {
  background: #0d7dd8;
  color: white;
}

.token-source-badge.system {
  background: #666;
  color: white;
}

.token-tag::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(13, 125, 216, 0.1);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.token-tag:active::after {
  opacity: 1;
}
</style>