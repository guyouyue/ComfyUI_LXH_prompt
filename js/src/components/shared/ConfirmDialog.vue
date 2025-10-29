<template>
  <Transition name="confirm-fade">
    <div v-if="show" class="confirm-overlay" @click.self="$emit('cancel')">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-header">
          <span class="confirm-icon">⚠️</span>
          <h4>确认操作</h4>
        </div>

        <div class="confirm-body">
          <p>{{ message }}</p>
        </div>

        <div class="confirm-footer">
          <button class="btn-cancel" @click="$emit('cancel')">
            取消
          </button>
          <button class="btn-confirm" @click="$emit('confirm')">
            确认
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  message: String,
});

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000002; /* 高于其他对话框 */
}

.confirm-dialog {
  background: #2a2a2a;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  border: 1px solid #404040;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  animation: confirmSlideIn 0.2s ease;
}

@keyframes confirmSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.confirm-header {
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
  background: #252525;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirm-icon {
  font-size: 24px;
}

.confirm-header h4 {
  margin: 0;
  color: #fafafa;
  font-size: 16px;
  font-weight: 600;
}

.confirm-body {
  padding: 24px 20px;
}

.confirm-body p {
  margin: 0;
  color: #ddd;
  font-size: 14px;
  line-height: 1.6;
}

.confirm-footer {
  padding: 12px 20px;
  border-top: 1px solid #404040;
  background: #252525;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel {
  background: #404040;
  color: #fff;
}

.btn-cancel:hover {
  background: #4a4a4a;
  transform: translateY(-1px);
}

.btn-confirm {
  background: #f44336;
  color: white;
}

.btn-confirm:hover {
  background: #da190b;
  transform: translateY(-1px);
}

/* 过渡动画 */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-active .confirm-dialog {
  animation: confirmSlideIn 0.2s ease;
}

.confirm-fade-leave-active .confirm-dialog {
  animation: confirmSlideOut 0.2s ease;
}

@keyframes confirmSlideOut {
  from {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  to {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .confirm-dialog {
    width: 95%;
  }

  .confirm-header {
    padding: 12px 16px;
  }

  .confirm-body {
    padding: 20px 16px;
  }

  .confirm-footer {
    padding: 10px 16px;
  }
}
</style>