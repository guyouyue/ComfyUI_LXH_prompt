// src/utils/constants.js
/**
 * 常量定义
 */

// 输出模式
export const OUTPUT_MODES = {
  TOKEN: 'token',      // 词元模式
  NATURAL: 'natural'   // 自然语言模式
};

// 语言选项
export const LANGUAGES = {
  ZH: 'zh',  // 中文
  EN: 'en'   // 英文
};

// 焦点区域
export const FOCUS_AREAS = {
  OUTPUT: 'output',     // 最终输出区
  CUSTOM: 'custom',     // 自定义组合池
  POOL: 'pool',         // 词元映射池
  NONE: null
};

// 本地存储键名
export const STORAGE_KEYS = {
  USER_TOKENS: 'lxh_user_tokens',
  CUSTOM_GROUPS: 'lxh_custom_groups',
  PREFERENCES: 'lxh_preferences'
};

// 默认权重
export const DEFAULT_WEIGHT = 1;

// 最大权重
export const MAX_WEIGHT = 10;

// 最小权重
export const MIN_WEIGHT = 0;

// 词元分隔符
export const TOKEN_SEPARATORS = {
  TOKEN_MODE: ', ',     // 词元模式分隔符
  NATURAL_MODE: ' '     // 自然语言模式分隔符
};

// 颜色主题
export const COLORS = {
  PRIMARY: '#0d7dd8',
  DANGER: '#d32f2f',
  SUCCESS: '#4caf50',
  WARNING: '#ff9800',
  INFO: '#2196f3'
};

// 动画时长
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

// API 端点（如果有后端）
export const API_ENDPOINTS = {
  LOAD_TOKENS: '/api/tokens',
  SAVE_TOKENS: '/api/tokens/save',
  LOAD_GROUPS: '/api/groups',
  SAVE_GROUPS: '/api/groups/save'
};

// 错误消息
export const ERROR_MESSAGES = {
  LOAD_FAILED: '加载数据失败',
  SAVE_FAILED: '保存数据失败',
  INVALID_ID: '无效的标识符',
  DUPLICATE_ID: '标识符已存在',
  EMPTY_GROUP: '组合不能为空',
  NETWORK_ERROR: '网络错误'
};

// 成功消息
export const SUCCESS_MESSAGES = {
  SAVED: '保存成功',
  DELETED: '删除成功',
  ADDED: '添加成功',
  UPDATED: '更新成功'
};

// 默认配置
export const DEFAULT_CONFIG = {
  outputMode: OUTPUT_MODES.TOKEN,
  language: LANGUAGES.ZH,
  autoSave: true,
  showHints: true
};