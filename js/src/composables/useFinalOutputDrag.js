import { ref } from 'vue';

/**
 * FinalOutput 拖拽逻辑
 */
export function useFinalOutputDrag(emit) {
  // 拖拽状态
  const isDragging = ref(false);
  const dragInfo = ref({
    sourceIndex: -1,
    sourceArea: null,
    startX: 0,
    startY: 0,
  });
  const dropTargetIndex = ref(-1);
  const dropTargetArea = ref(null);

  // 长按状态
  const longPressActive = ref(false);
  const longPressProgress = ref(0);
  const longPressToken = ref({ area: null, index: -1 });
  let longPressTimer = null;

  const LONG_PRESS_DURATION = 1000;

  /**
   * 开始长按进度
   */
  const startLongPressProgress = (area, index) => {
    longPressProgress.value = 0;
    longPressActive.value = true;
    longPressToken.value = { area, index };

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
  };

  /**
   * 取消长按
   */
  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressActive.value = false;
    longPressProgress.value = 0;
    longPressToken.value = { area: null, index: -1 };
  };

  /**
   * 鼠标按下
   */
  const handleMouseDown = (event, token, index, area) => {
    event.preventDefault();
    dragInfo.value = {
      sourceIndex: index,
      sourceArea: area,
      startX: event.clientX,
      startY: event.clientY,
    };
    startLongPressProgress(area, index);
  };

  /**
   * 触摸开始
   */
  const handleTouchStart = (event, token, index, area) => {
    const touch = event.touches[0];
    dragInfo.value = {
      sourceIndex: index,
      sourceArea: area,
      startX: touch.clientX,
      startY: touch.clientY,
    };
    startLongPressProgress(area, index);
  };

  /**
   * 开始拖拽
   */
  const startDrag = (area, index) => {
    isDragging.value = true;
    console.log(`[Drag] 开始拖拽: area=${area}, index=${index}`);

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);
  };

  /**
   * 全局鼠标移动
   */
  const handleGlobalMouseMove = (event) => {
    if (!isDragging.value) return;
    event.preventDefault();
    updateDropTarget(event.clientX, event.clientY);
  };

  /**
   * 全局触摸移动
   */
  const handleGlobalTouchMove = (event) => {
    if (!isDragging.value) return;
    event.preventDefault();
    const touch = event.touches[0];
    updateDropTarget(touch.clientX, touch.clientY);
  };

  /**
   * 更新拖放目标
   */
  const updateDropTarget = (clientX, clientY) => {
    const elements = document.querySelectorAll(
      `.${dragInfo.value.sourceArea}-section .token-tag`
    );
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

  /**
   * 拖拽悬停
   */
  const handleDragOver = (event) => {
    if (!isDragging.value) return;
    event.preventDefault();
  };

  /**
   * 放置
   */
  const handleDrop = (area) => {
    if (!isDragging.value || area !== dragInfo.value.sourceArea) return;

    const sourceIndex = dragInfo.value.sourceIndex;
    const targetIndex = dropTargetIndex.value;

    if (sourceIndex !== targetIndex && targetIndex !== -1) {
      console.log(`[Drag] 移动词元: ${sourceIndex} → ${targetIndex}`);
      emit('reorder-tokens', { from: sourceIndex, to: targetIndex });
    }

    endDrag();
  };

  /**
   * 全局鼠标松开
   */
  const handleGlobalMouseUp = () => {
    if (isDragging.value) completeDrag();
  };

  /**
   * 全局触摸结束
   */
  const handleGlobalTouchEnd = () => {
    if (isDragging.value) completeDrag();
  };

  /**
   * 完成拖拽
   */
  const completeDrag = () => {
    if (isDragging.value) {
      const sourceIndex = dragInfo.value.sourceIndex;
      const targetIndex = dropTargetIndex.value;

      if (sourceIndex !== targetIndex && targetIndex !== -1) {
        emit('reorder-tokens', { from: sourceIndex, to: targetIndex });
      }
    }
    endDrag();
  };

  /**
   * 结束拖拽
   */
  const endDrag = () => {
    isDragging.value = false;
    dropTargetIndex.value = -1;
    dropTargetArea.value = null;

    cancelLongPress();

    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.removeEventListener('touchmove', handleGlobalTouchMove);
    document.removeEventListener('touchend', handleGlobalTouchEnd);
  };

  /**
   * 清理
   */
  const cleanup = () => {
    endDrag();
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  return {
    isDragging,
    dragInfo,
    dropTargetIndex,
    dropTargetArea,
    longPressActive,
    longPressProgress,
    longPressToken,
    handleMouseDown,
    handleTouchStart,
    handleDragOver,
    handleDrop,
    cancelLongPress,
    cleanup,
  };
}