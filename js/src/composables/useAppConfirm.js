import { ref } from 'vue';

/**
 * App 确认对话框
 */
export function useAppConfirm() {
  // 确认对话框状态
  const showConfirmDialog = ref(false);
  const confirmMessage = ref('');
  const confirmResolve = ref(null);

  /**
   * 显示确认对话框
   * @param {String} message - 确认消息
   * @returns {Promise<Boolean>}
   */
  const confirm = (message) => {
    return new Promise((resolve) => {
      confirmMessage.value = message;
      confirmResolve.value = resolve;
      showConfirmDialog.value = true;
    });
  };

  /**
   * 确认操作
   */
  const handleConfirm = () => {
    if (confirmResolve.value) {
      confirmResolve.value(true);
    }
    closeConfirmDialog();
  };

  /**
   * 取消操作
   */
  const handleCancelConfirm = () => {
    if (confirmResolve.value) {
      confirmResolve.value(false);
    }
    closeConfirmDialog();
  };

  /**
   * 关闭确认对话框
   */
  const closeConfirmDialog = () => {
    showConfirmDialog.value = false;
    confirmMessage.value = '';
    confirmResolve.value = null;
  };

  return {
    showConfirmDialog,
    confirmMessage,
    confirm,
    handleConfirm,
    handleCancelConfirm,
  };
}