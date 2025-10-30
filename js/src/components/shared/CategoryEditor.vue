<!-- src/components/shared/CategoryEditor.vue -->
<template>
  <div class="category-editor">
    <!-- 编辑器头部 -->
    <div class="editor-header">
      <div class="header-info">
        <span class="editor-icon">{{ getEditorIcon() }}</span>
        <h4>{{ getEditorTitle() }}</h4>
      </div>
      <span v-if="isSystemCategory" class="source-badge system">
        ⚙️ 系统{{ categoryType === 'category' ? '分类' : '子分类' }}
      </span>
      <span v-else class="source-badge user">
        👤 用户{{ categoryType === 'category' ? '分类' : categoryType === 'subcategory' ? '子分类' : '词元池' }}
      </span>
    </div>

    <!-- 警告提示 -->
    <div v-if="isSystemCategory" class="warning-banner">
      ⚠️ 系统分类不可直接编辑，保存后将创建用户副本
    </div>

    <!-- 基本信息 -->
    <div class="form-section">
      <h5>📋 基本信息</h5>
      <div class="form-group">
        <label>ID <span class="readonly-tip">(只读)</span></label>
        <input
            type="text"
            :value="formData.id"
            disabled
            class="form-input readonly"
        />
      </div>
    </div>

    <!-- 多语言名称 -->
    <div class="form-section">
      <h5>🌐 多语言名称</h5>
      <div class="form-row">
        <div class="form-group">
          <label>中文名称 (zh) <span class="required">*</span></label>
          <input
              type="text"
              v-model="formData.name.zh"
              placeholder="中文名称"
              class="form-input"
              @input="handleNameChange"
          />
        </div>
        <div class="form-group">
          <label>英文名称 (en) <span class="required">*</span></label>
          <input
              type="text"
              v-model="formData.name.en"
              placeholder="英文名称"
              class="form-input"
              @input="handleNameChange"
          />
        </div>
      </div>
    </div>

    <!-- 描述信息 -->
    <div class="form-section">
      <h5>📝 描述信息</h5>
      <textarea
          v-model="formData.description"
          placeholder="添加描述..."
          class="form-textarea"
          rows="3"
      ></textarea>
    </div>

    <!-- 统计信息 -->
    <div v-if="categoryType !== 'pool'" class="form-section">
      <h5>📊 统计信息</h5>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">{{ categoryType === 'category' ? '子分类数' : '词元数' }}</span>
          <span class="stat-value">{{ getItemCount() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">创建时间</span>
          <span class="stat-value">{{ formatDate(formData.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="editor-footer">
      <button @click="$emit('close')" class="btn-secondary">取消</button>
      <button
          @click="handleSave"
          class="btn-primary"
          :disabled="!canSave"
      >
        {{ getSaveButtonText() }}
      </button>
    </div>
  </div>
</template>

<script setup>
import {computed, reactive, watch} from 'vue';

const props = defineProps({
  categoryData: Object,
  categoryType: String, // 'category' | 'subcategory' | 'pool'
  language: String,
});

const emit = defineEmits(['close', 'save']);

// ========== 表单数据 ==========
const formData = reactive({
  id: '',
  name: {zh: '', en: ''},
  description: '',
  source: 'user',
  createdAt: null,
  subcategories: [],
  tokens: [],
  parentId: null,
  parentData: null,
});

// ========== 计算属性 ==========
const isSystemCategory = computed(() => {
  return props.categoryData?.source === 'system';
});

const canSave = computed(() => {
  return formData.name.zh && formData.name.en;
});

// ========== 方法 ==========
const getEditorIcon = () => {
  const icons = {
    category: '📁',
    subcategory: '📂',
    pool: '🎲'
  };
  return icons[props.categoryType] || '📁';
};

const getEditorTitle = () => {
  const titles = {
    category: '编辑一级分类',
    subcategory: '编辑二级分类',
    pool: '编辑词元池分组'
  };
  return titles[props.categoryType] || '编辑分类';
};

const getSaveButtonText = () => {
  return isSystemCategory.value ? '保存为用户副本' : '保存修改';
};

const getItemCount = () => {
  if (props.categoryType === 'category') {
    return formData.subcategories?.length || 0;
  }
  return formData.tokens?.length || 0;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '未知';
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN');
};

const handleNameChange = () => {
  // 实时验证
};

const handleSave = () => {
  if (!canSave.value) {
    alert('请填写必填字段');
    return;
  }

  emit('save', {
    ...formData,
    categoryType: props.categoryType,
    isSystem: isSystemCategory.value,
  });
};

// ========== 初始化 ==========
watch(() => props.categoryData, (newData) => {
  if (newData) {
    formData.id = newData.id;
    formData.name = {...newData.name};
    formData.description = newData.description || '';
    formData.source = newData.source || 'user';
    formData.createdAt = newData.createdAt;
    formData.subcategories = newData.subcategories || [];
    formData.tokens = newData.tokens || [];
    // ⭐ 保存父级信息（用于二级分类）
    formData.parentId = newData.parentId;
    formData.parentData = newData.parentData;
  }
}, {immediate: true});
</script>

<style scoped>
.category-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #404040;
}

.header-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-icon {
  font-size: 20px;
}

.editor-header h4 {
  margin: 0;
  color: #fafafa;
  font-size: 14px;
  font-weight: 600;
}

.source-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.source-badge.system {
  background: #666;
  color: white;
}

.source-badge.user {
  background: #0d7dd8;
  color: white;
}

.warning-banner {
  background: #ff9800;
  color: #000;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.form-section {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #333;
}

.form-section h5 {
  margin: 0 0 12px 0;
  color: #0d7dd8;
  font-size: 13px;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  color: #ddd;
  font-size: 12px;
  font-weight: 500;
}

.required {
  color: #f44336;
}

.readonly-tip {
  color: #888;
  font-size: 10px;
}

.form-input,
.form-textarea {
  padding: 8px 12px;
  background: #252525;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #0d7dd8;
}

.form-input.readonly {
  background: #1a1a1a;
  color: #666;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #252525;
  border-radius: 6px;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  color: #888;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #0d7dd8;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #404040;
}

.btn-secondary,
.btn-primary {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #404040;
  color: #fff;
}

.btn-secondary:hover {
  background: #4a4a4a;
}

.btn-primary {
  background: #0d7dd8;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #0c6dba;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>