// src/composables/useStorage.js
import {ref} from 'vue';
import {DEFAULT_CONFIG, STORAGE_KEYS} from '../utils/constants.js';

/**
 * 本地存储管理
 */
export function useStorage() {
  const preferences = ref({ ...DEFAULT_CONFIG });

  /**
   * 从 localStorage 加载数据
   * @param {string} key - 存储键
   * @param {*} defaultValue - 默认值
   * @returns {*}
   */
  const loadFromStorage = (key, defaultValue = null) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error(`[useStorage] 加载失败 (${key}):`, error);
    }
    return defaultValue;
  };

  /**
   * 保存数据到 localStorage
   * @param {string} key - 存储键
   * @param {*} value - 要保存的值
   * @returns {boolean}
   */
  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`[useStorage] 保存成功 (${key})`);
      return true;
    } catch (error) {
      console.error(`[useStorage] 保存失败 (${key}):`, error);
      return false;
    }
  };

  /**
   * 从 localStorage 删除数据
   * @param {string} key - 存储键
   * @returns {boolean}
   */
  const removeFromStorage = (key) => {
    try {
      localStorage.removeItem(key);
      console.log(`[useStorage] 删除成功 (${key})`);
      return true;
    } catch (error) {
      console.error(`[useStorage] 删除失败 (${key}):`, error);
      return false;
    }
  };

  /**
   * 清空所有相关存储
   * @returns {boolean}
   */
  const clearAllStorage = () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('[useStorage] 清空所有存储');
      return true;
    } catch (error) {
      console.error('[useStorage] 清空失败:', error);
      return false;
    }
  };

  /**
   * 加载用户偏好设置
   */
  const loadPreferences = () => {
    const stored = loadFromStorage(STORAGE_KEYS.PREFERENCES, DEFAULT_CONFIG);
    preferences.value = { ...DEFAULT_CONFIG, ...stored };
    console.log('[useStorage] 加载偏好设置:', preferences.value);
  };

  /**
   * 保存用户偏好设置
   */
  const savePreferences = () => {
    return saveToStorage(STORAGE_KEYS.PREFERENCES, preferences.value);
  };

  /**
   * 更新偏好设置
   * @param {Object} updates - 更新对象
   */
  const updatePreferences = (updates) => {
    preferences.value = { ...preferences.value, ...updates };
    savePreferences();
    console.log('[useStorage] 更新偏好设置:', updates);
  };

  /**
   * 导出所有数据（用于备份）
   * @returns {Object}
   */
  const exportAllData = () => {
    const data = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      data[name] = loadFromStorage(key);
    });
    console.log('[useStorage] 导出数据:', data);
    return data;
  };

  /**
   * 导入数据（用于恢复）
   * @param {Object} data - 要导入的数据
   * @returns {boolean}
   */
  const importAllData = (data) => {
    try {
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        if (data[name]) {
          saveToStorage(key, data[name]);
        }
      });
      console.log('[useStorage] 导入数据成功');
      return true;
    } catch (error) {
      console.error('[useStorage] 导入数据失败:', error);
      return false;
    }
  };

  /**
   * 获取存储使用情况
   * @returns {Object}
   */
  const getStorageStats = () => {
    let totalSize = 0;
    const stats = {};

    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const data = localStorage.getItem(key);
      const size = data ? new Blob([data]).size : 0;
      stats[name] = {
        key,
        size,
        sizeKB: (size / 1024).toFixed(2)
      };
      totalSize += size;
    });

    stats.total = {
      size: totalSize,
      sizeKB: (totalSize / 1024).toFixed(2),
      sizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };

    return stats;
  };

  return {
    preferences,
    loadFromStorage,
    saveToStorage,
    removeFromStorage,
    clearAllStorage,
    loadPreferences,
    savePreferences,
    updatePreferences,
    exportAllData,
    importAllData,
    getStorageStats
  };
}