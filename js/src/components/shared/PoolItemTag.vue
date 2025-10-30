<!--src/components/shared/PoolItemTag.vue-->
<template>
  <div
      class="pool-item-tag"
      :title="tooltip"
      @click="$emit('click', poolItem)"
      @dblclick.stop="$emit('dblclick', poolItem)"
  >
    <span class="pool-item-icon">🎲</span>
    <span class="pool-item-text">{{ displayName }}</span>
    <span class="pool-item-key">{#%{{ poolItem.id }}#%}</span>
    <span class="pool-item-count">{{ poolItem.tokens?.length || 0 }}</span>
  </div>
</template>

<script setup>
const props = defineProps({
  poolItem: Object,
  displayName: String,
  tooltip: String,
});

defineEmits(['click', 'dblclick']);
</script>

<style scoped>
.pool-item-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: 1px solid #764ba2;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 150px;
  box-shadow: 0 2px 8px rgba(118, 75, 162, 0.3);
}

.pool-item-tag:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 4px 16px rgba(118, 75, 162, 0.5);
}

.pool-item-icon {
  font-size: 14px;
}

.pool-item-text {
  flex: 1;
  font-weight: 600;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pool-item-key {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 10px;
  opacity: 0.9;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
}

.pool-item-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.pool-item-tag::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.pool-item-tag:active::after {
  opacity: 1;
}
</style>