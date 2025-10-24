import { ref } from 'vue';

export function useCursor() {
  const cursorPosition = ref({
    area: null, // 'output', 'custom', null
    index: null // 光标位置索引
  });

  const setCursor = (area, index = null) => {
    cursorPosition.value = { area, index };
    console.log('[useCursor] 光标位置更新:', cursorPosition.value);
  };

  const clearCursor = () => {
    cursorPosition.value = { area: null, index: null };
  };

  return {
    cursorPosition,
    setCursor,
    clearCursor
  };
}