<template>
  <div v-if="!isEmbedded" class="token-editor-overlay" @click.self="$emit('close')">
    <div class="token-editor-content">
      <div class="editor-header">
        <h3>{{ getEditorTitle() }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="editor-body">
        <!-- 单个词元编辑 -->
        <div v-if="tokenType === 'single'" class="token-form">
          <div class="form-section">
            <h4>📋 基本信息</h4>
            <div class="form-row">
              <div class="form-group">
                <label>词元ID *</label>
                <input
                    type="text"
                    v-model="formData.id"
                    :disabled="isSystemToken"
                    placeholder="唯一标识符"
                    class="form-input"
                />
                <span class="form-hint" v-if="isSystemToken">系统词元ID不可修改</span>
              </div>

              <div class="form-group">
                <label>来源</label>
                <div class="source-badge" :class="tokenSource">
                  {{ tokenSource === 'system' ? '⚙️ 系统词库' : '👤 用户词库' }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>🌐 多语言内容</h4>
            <div class="form-row">
              <div class="form-group">
                <label>中文 (zh)</label>
                <input
                    type="text"
                    v-model="formData.zh"
                    placeholder="中文词元内容"
                    class="form-input"
                />
              </div>
              <div class="form-group">
                <label>英文 (en)</label>
                <input
                    type="text"
                    v-model="formData.en"
                    placeholder="英文词元内容"
                    class="form-input"
                />
              </div>
              <div class="form-group">
                <label>日文 (jp)</label>
                <input
                    type="text"
                    v-model="formData.jp"
                    placeholder="日文词元内容"
                    class="form-input"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>📁 分类信息</h4>
            <div class="form-row">
              <div class="form-group">
                <label>一级分类</label>
                <div class="category-input-container">
                  <select v-model="formData.categoryId" class="form-select">
                    <option value="">请选择分类</option>
                    <option
                        v-for="category in categories"
                        :key="category.id"
                        :value="category.id"
                    >
                      {{ getCategoryName(category) }}
                    </option>
                    <option value="__new__">➕ 新建分类</option>
                  </select>
                  <input
                      v-if="formData.categoryId === '__new__'"
                      type="text"
                      v-model="formData.newCategoryName"
                      placeholder="输入新分类名称"
                      class="form-input new-category-input"
                      @keydown.enter="confirmNewCategory('category')"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>二级分类</label>
                <div class="category-input-container">
                  <select
                      v-model="formData.subcategoryId"
                      :disabled="!formData.categoryId || formData.categoryId === '__new__'"
                      class="form-select"
                  >
                    <option value="">请选择子分类</option>
                    <option
                        v-for="subcategory in getSubcategories(formData.categoryId)"
                        :key="subcategory.id"
                        :value="subcategory.id"
                    >
                      {{ getSubcategoryName(subcategory) }}
                    </option>
                    <option value="__new__">➕ 新建子分类</option>
                  </select>
                  <input
                      v-if="formData.subcategoryId === '__new__'"
                      type="text"
                      v-model="formData.newSubcategoryName"
                      placeholder="输入新子分类名称"
                      class="form-input new-category-input"
                      @keydown.enter="confirmNewCategory('subcategory')"
                  />
                </div>
              </div>

              <div v-if="showNewCategoryButtons" class="new-category-actions">
                <button
                    class="btn-confirm-new"
                    @click="confirmNewCategory('both')"
                    :disabled="!canConfirmNewCategory"
                >
                  ✅ 确认新建分类
                </button>
                <button
                    class="btn-cancel-new"
                    @click="cancelNewCategory"
                >
                  ❌ 取消新建
                </button>
              </div>
            </div>
          </div>

          <div class="form-section" v-if="formData.description !== undefined">
            <h4>📝 描述信息</h4>
            <textarea
                v-model="formData.description"
                placeholder="词元描述..."
                class="form-textarea"
                rows="3"
            ></textarea>
          </div>
        </div>

        <!-- 未映射词元编辑 -->
        <div v-else-if="tokenType === 'unmapped'" class="unmapped-form">
          <div class="warning-banner">
            ⚠️ 当前词元未映射到词库，您可以将其保存到用户词库
          </div>

          <div class="form-section">
            <h4>🔍 词元内容</h4>
            <div class="token-preview">
              <span class="preview-label">原始值:</span>
              <span class="preview-value">{{ originalValue }}</span>
            </div>
          </div>

          <div class="form-section">
            <h4>🌐 多语言映射</h4>
            <div class="form-row">
              <div class="form-group">
                <label>中文映射 (zh)</label>
                <input
                    type="text"
                    v-model="formData.zh"
                    :placeholder="`建议值: ${originalValue}`"
                    class="form-input"
                />
              </div>
              <div class="form-group">
                <label>英文映射 (en)</label>
                <input
                    type="text"
                    v-model="formData.en"
                    placeholder="英文映射"
                    class="form-input"
                />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>📁 保存到分类</h4>
            <div class="form-row">
              <div class="form-group">
                <label>一级分类 *</label>
                <select v-model="formData.categoryId" class="form-select" required>
                  <option value="">请选择分类</option>
                  <option
                      v-for="category in categories"
                      :key="category.id"
                      :value="category.id"
                  >
                    {{ getCategoryName(category) }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>二级分类 *</label>
                <select v-model="formData.subcategoryId" :disabled="!formData.categoryId" class="form-select"
                        required>
                  <option value="">请选择子分类</option>
                  <option
                      v-for="subcategory in getSubcategories(formData.categoryId)"
                      :key="subcategory.id"
                      :value="subcategory.id"
                  >
                    {{ getSubcategoryName(subcategory) }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h4>📝 描述信息（可选）</h4>
            <textarea
                v-model="formData.description"
                placeholder="添加词元描述..."
                class="form-textarea"
                rows="2"
            ></textarea>
          </div>
        </div>

        <!-- 词元池编辑 -->
        <div v-else-if="tokenType === 'pool'" class="pool-form">
          <div class="pool-header">
            <h4>🎲 词元池信息</h4>
            <div class="pool-meta">
              <span class="meta-item">Key: {{ formData.poolKey }}</span>
              <span class="meta-item">词元数量: {{ poolTokens.length }}</span>
            </div>
          </div>

          <div class="form-section">
            <h4>📝 池信息</h4>
            <div class="form-row">
              <div class="form-group">
                <label>池名称 (中文)</label>
                <input
                    type="text"
                    v-model="formData.name.zh"
                    placeholder="中文名称"
                    class="form-input"
                />
              </div>
              <div class="form-group">
                <label>池名称 (英文)</label>
                <input
                    type="text"
                    v-model="formData.name.en"
                    placeholder="英文名称"
                    class="form-input"
                />
              </div>
            </div>

            <div class="form-group">
              <label>描述信息</label>
              <textarea
                  v-model="formData.description"
                  placeholder="词元池描述..."
                  class="form-textarea"
                  rows="2"
              ></textarea>
            </div>
          </div>

          <div class="form-section">
            <h4>📋 词元列表</h4>
            <div class="token-list">
              <div
                  v-for="(token, index) in poolTokens"
                  :key="token.id"
                  class="pool-token-item"
                  :class="{ 'mapped-token': token.mapping }"
              >
                <div class="token-content">
                  <span class="token-index">#{{ index + 1 }}</span>

                  <div class="token-info">
                    <div class="token-text">
                      <span class="lang-zh" v-if="token.zh">{{ token.zh }}</span>
                      <span class="lang-en" v-if="token.en">{{ token.en }}</span>
                      <span class="token-original" v-if="!token.zh && !token.en">{{ token.value }}</span>
                    </div>

                    <div class="token-source" v-if="token.mapping">
                      <span class="source-badge system">⚙️ 映射词元</span>
                      <button class="view-btn" @click="viewMappedToken(token)">查看</button>
                    </div>
                    <div class="token-source" v-else>
                      <span class="source-badge custom">👤 自定义词元</span>
                    </div>
                  </div>

                  <div class="token-controls">
                    <div class="weight-control" v-if="token.weight !== undefined">
                      <label>权重:</label>
                      <input
                          type="number"
                          v-model.number="token.weight"
                          min="0"
                          max="10"
                          step="0.1"
                          class="weight-input"
                      />
                    </div>

                    <button
                        v-if="!token.mapping"
                        class="edit-btn"
                        @click="editCustomToken(token, index)"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-footer">
        <div class="footer-info">
          <span v-if="tokenType === 'single'" class="info-text">
            {{ isSystemToken ? '系统词元将在用户词库中创建副本' : '直接修改用户词元' }}
          </span>
          <span v-else-if="tokenType === 'unmapped'" class="info-text">
            将未映射词元保存到用户词库
          </span>
          <span v-else-if="tokenType === 'pool'" class="info-text">
            管理词元池中的词元权重和内容
          </span>
        </div>

        <div class="footer-actions">
          <button @click="$emit('close')">取消</button>
          <button class="primary" @click="handleSave" :disabled="!canSave">
            {{ getSaveButtonText() }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 嵌入模式：直接显示编辑器内容 -->
  <div v-else class="token-editor-embedded">
    <div class="editor-body-embedded">
      <!-- 单个词元编辑 -->
      <div v-if="tokenType === 'single'" class="token-form">
        <div class="form-section">
          <h4>📋 基本信息</h4>
          <div class="form-row">
            <div class="form-group">
              <label>词元ID *</label>
              <input
                  type="text"
                  v-model="formData.id"
                  :disabled="isSystemToken"
                  placeholder="唯一标识符"
                  class="form-input"
              />
              <span class="form-hint" v-if="isSystemToken">系统词元ID不可修改</span>
            </div>

            <div class="form-group">
              <label>来源</label>
              <div class="source-badge" :class="tokenSource">
                {{ tokenSource === 'system' ? '⚙️ 系统词库' : '👤 用户词库' }}
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>🌐 多语言内容</h4>
          <div class="form-row">
            <div class="form-group">
              <label>中文 (zh)</label>
              <input
                  type="text"
                  v-model="formData.zh"
                  placeholder="中文词元内容"
                  class="form-input"
              />
            </div>
            <div class="form-group">
              <label>英文 (en)</label>
              <input
                  type="text"
                  v-model="formData.en"
                  placeholder="英文词元内容"
                  class="form-input"
              />
            </div>
            <div class="form-group">
              <label>日文 (jp)</label>
              <input
                  type="text"
                  v-model="formData.jp"
                  placeholder="日文词元内容"
                  class="form-input"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>📁 分类信息</h4>
          <div class="form-row">
            <div class="form-group">
              <label>一级分类</label>
              <select v-model="formData.categoryId" class="form-select">
                <option value="">请选择分类</option>
                <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                >
                  {{ getCategoryName(category) }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>二级分类</label>
              <select v-model="formData.subcategoryId" :disabled="!formData.categoryId" class="form-select">
                <option value="">请选择子分类</option>
                <option
                    v-for="subcategory in getSubcategories(formData.categoryId)"
                    :key="subcategory.id"
                    :value="subcategory.id"
                >
                  {{ getSubcategoryName(subcategory) }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section" v-if="formData.description !== undefined">
          <h4>📝 描述信息</h4>
          <textarea
              v-model="formData.description"
              placeholder="词元描述..."
              class="form-textarea"
              rows="3"
          ></textarea>
        </div>
      </div>

      <!-- 未映射词元编辑 -->
      <div v-else-if="tokenType === 'unmapped'" class="unmapped-form">
        <div class="warning-banner">
          ⚠️ 当前词元未映射到词库，您可以将其保存到用户词库
        </div>

        <div class="form-section">
          <h4>🔍 词元内容</h4>
          <div class="token-preview">
            <span class="preview-label">原始值:</span>
            <span class="preview-value">{{ originalValue }}</span>
          </div>
        </div>

        <div class="form-section">
          <h4>🌐 多语言映射</h4>
          <div class="form-row">
            <div class="form-group">
              <label>中文映射 (zh)</label>
              <input
                  type="text"
                  v-model="formData.zh"
                  :placeholder="`建议值: ${originalValue}`"
                  class="form-input"
              />
            </div>
            <div class="form-group">
              <label>英文映射 (en)</label>
              <input
                  type="text"
                  v-model="formData.en"
                  placeholder="英文映射"
                  class="form-input"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>📁 保存到分类</h4>
          <div class="form-row">
            <div class="form-group">
              <label>一级分类 *</label>
              <select v-model="formData.categoryId" class="form-select" required>
                <option value="">请选择分类</option>
                <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                >
                  {{ getCategoryName(category) }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>二级分类 *</label>
              <select v-model="formData.subcategoryId" :disabled="!formData.categoryId" class="form-select" required>
                <option value="">请选择子分类</option>
                <option
                    v-for="subcategory in getSubcategories(formData.categoryId)"
                    :key="subcategory.id"
                    :value="subcategory.id"
                >
                  {{ getSubcategoryName(subcategory) }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>📝 描述信息（可选）</h4>
          <textarea
              v-model="formData.description"
              placeholder="添加词元描述..."
              class="form-textarea"
              rows="2"
          ></textarea>
        </div>
      </div>

      <!-- 词元池编辑 -->
      <div v-else-if="tokenType === 'pool'" class="pool-form">
        <div class="pool-header">
          <h4>🎲 词元池信息</h4>
          <div class="pool-meta">
            <span class="meta-item">Key: {{ formData.poolKey }}</span>
            <span class="meta-item">词元数量: {{ poolTokens.length }}</span>
          </div>
        </div>

        <div class="form-section">
          <h4>📝 池信息</h4>
          <div class="form-row">
            <div class="form-group">
              <label>池名称 (中文)</label>
              <input
                  type="text"
                  v-model="formData.name.zh"
                  placeholder="中文名称"
                  class="form-input"
              />
            </div>
            <div class="form-group">
              <label>池名称 (英文)</label>
              <input
                  type="text"
                  v-model="formData.name.en"
                  placeholder="英文名称"
                  class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label>描述信息</label>
            <textarea
                v-model="formData.description"
                placeholder="词元池描述..."
                class="form-textarea"
                rows="2"
            ></textarea>
          </div>
        </div>

        <div class="form-section">
          <h4>📋 词元列表</h4>
          <div class="token-list">
            <div
                v-for="(token, index) in poolTokens"
                :key="token.id"
                class="pool-token-item"
                :class="{ 'mapped-token': token.mapping }"
            >
              <div class="token-content">
                <span class="token-index">#{{ index + 1 }}</span>

                <div class="token-info">
                  <div class="token-text">
                    <span class="lang-zh" v-if="token.zh">{{ token.zh }}</span>
                    <span class="lang-en" v-if="token.en">{{ token.en }}</span>
                    <span class="token-original" v-if="!token.zh && !token.en">{{ token.value }}</span>
                  </div>

                  <div class="token-source" v-if="token.mapping">
                    <span class="source-badge system">⚙️ 映射词元</span>
                    <button class="view-btn" @click="viewMappedToken(token)">查看</button>
                  </div>
                  <div class="token-source" v-else>
                    <span class="source-badge custom">👤 自定义词元</span>
                  </div>
                </div>

                <div class="token-controls">
                  <div class="weight-control" v-if="token.weight !== undefined">
                    <label>权重:</label>
                    <input
                        type="number"
                        v-model.number="token.weight"
                        min="0"
                        max="10"
                        step="0.1"
                        class="weight-input"
                    />
                  </div>

                  <button
                      v-if="!token.mapping"
                      class="edit-btn"
                      @click="editCustomToken(token, index)"
                  >
                    编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 嵌入模式的底部操作栏 -->
    <div class="editor-footer-embedded">
      <button @click="$emit('close')" class="btn-secondary">取消</button>
      <button class="primary" @click="handleSave" :disabled="!canSave">
        {{ getSaveButtonText() }}
      </button>
    </div>
  </div>
</template>


<script setup>
import {computed, onMounted, ref, watch} from 'vue';

const props = defineProps({
  token: Object,
  tokenType: String,
  categories: Array,
  language: String,
  isEmbedded: {  // 新增：是否嵌入模式
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'save', 'view-token', 'edit-token']);

const formData = ref({
  id: '',
  zh: '',
  en: '',
  jp: '',
  categoryId: '',
  subcategoryId: '',
  description: '',
  name: {zh: '', en: ''},
  poolKey: '',
  isSystem: false,
  newCategoryName: '',
  newSubcategoryName: '',
  tempCategoryId: '', // 临时保存原有分类ID
  tempSubcategoryId: '' // 临时保存原有子分类ID

});


const poolTokens = ref([]);
const originalValue = ref('');
const isSystemToken = ref(false);

// 计算属性
const tokenSource = computed(() => {
  return isSystemToken.value ? 'system' : 'user';
});

const canSave = computed(() => {
  if (props.tokenType === 'single' || props.tokenType === 'unmapped') {
    return formData.value.id && formData.value.zh && formData.value.en;
  }
  return true;
});

// 方法
const getEditorTitle = () => {
  const titles = {
    single: '编辑词元',
    unmapped: '保存未映射词元',
    pool: '编辑词元池'
  };
  return titles[props.tokenType] || '编辑词元';
};

const getSaveButtonText = () => {
  const texts = {
    single: isSystemToken.value ? '保存到用户词库' : '保存修改',
    unmapped: '保存到用户词库',
    pool: '保存修改'
  };
  return texts[props.tokenType] || '保存';
};

const getCategoryName = (category) => {
  return props.language === 'zh' ? category.name.zh : category.name.en;
};

const getSubcategoryName = (subcategory) => {
  return props.language === 'zh' ? subcategory.name.zh : subcategory.name.en;
};

const getSubcategories = (categoryId) => {
  const category = props.categories.find(cat => cat.id === categoryId);
  return category ? category.subcategories : [];
};

const viewMappedToken = (token) => {
  emit('view-token', token.mapping);
};

const editCustomToken = (token, index) => {
  emit('edit-token', token, index);
};

// 初始化表单数据
const initializeFormData = () => {
  if (!props.token) return;

  originalValue.value = props.token.value || props.token.original || '';

  if (props.tokenType === 'single') {
    // 单个词元编辑
    const tokenData = props.token.mapping || props.token;
    isSystemToken.value = tokenData.source === 'system';

    formData.value = {
      id: tokenData.id || tokenData.uniqueId || '',
      zh: tokenData.zh || '',
      en: tokenData.en || '',
      jp: tokenData.jp || '',
      categoryId: tokenData.categoryId || '',
      subcategoryId: tokenData.subcategoryId || '',
      description: tokenData.description || '',
      isSystem: isSystemToken.value
    };
  } else if (props.tokenType === 'unmapped') {
    // 未映射词元
    formData.value = {
      id: `user_${Date.now()}`,
      zh: originalValue.value,
      en: '',
      jp: '',
      categoryId: '',
      subcategoryId: '',
      description: `未映射词元: ${originalValue.value}`
    };
  } else if (props.tokenType === 'pool') {
    // 词元池编辑
    const poolData = props.token.poolData || props.token;
    formData.value = {
      name: poolData.name || {zh: '', en: ''},
      description: poolData.description || '',
      poolKey: poolData.key || poolData.id || ''
    };
    poolTokens.value = poolData.tokens || poolData.parsedTokens || [];
  }
};

const showNewCategoryButtons = computed(() => {
  return formData.value.categoryId === '__new__' || formData.value.subcategoryId === '__new__';
});

const canConfirmNewCategory = computed(() => {
  if (formData.value.categoryId === '__new__' && !formData.value.newCategoryName.trim()) {
    return false;
  }
  if (formData.value.subcategoryId === '__new__' && !formData.value.newSubcategoryName.trim()) {
    return false;
  }
  return true;
});

// 新增方法
const confirmNewCategory = (type) => {
  if (!canConfirmNewCategory.value) return;

  // 保存新建的分类信息到表单数据
  if (type === 'category' || type === 'both') {
    if (formData.value.categoryId === '__new__' && formData.value.newCategoryName.trim()) {
      // 在实际应用中，这里应该调用API创建新分类
      const newCategoryId = `new_category_${Date.now()}`;
      formData.value.categoryId = newCategoryId;
      // 这里可以emit事件让父组件处理新分类创建
      emit('new-category', {
        name: formData.value.newCategoryName,
        type: 'category'
      });
    }
  }

  if (type === 'subcategory' || type === 'both') {
    if (formData.value.subcategoryId === '__new__' && formData.value.newSubcategoryName.trim()) {
      // 在实际应用中，这里应该调用API创建新子分类
      const newSubcategoryId = `new_subcategory_${Date.now()}`;
      formData.value.subcategoryId = newSubcategoryId;
      emit('new-category', {
        name: formData.value.newSubcategoryName,
        parentId: formData.value.categoryId,
        type: 'subcategory'
      });
    }
  }

  // 清空临时输入
  formData.value.newCategoryName = '';
  formData.value.newSubcategoryName = '';
};

const cancelNewCategory = () => {
  // 恢复原来的分类选择
  if (formData.value.tempCategoryId) {
    formData.value.categoryId = formData.value.tempCategoryId;
  } else {
    formData.value.categoryId = '';
  }

  if (formData.value.tempSubcategoryId) {
    formData.value.subcategoryId = formData.value.tempSubcategoryId;
  } else {
    formData.value.subcategoryId = '';
  }

  // 清空临时输入
  formData.value.newCategoryName = '';
  formData.value.newSubcategoryName = '';
  formData.value.tempCategoryId = '';
  formData.value.tempSubcategoryId = '';
};

// 监听分类选择变化，保存原有选择
watch(() => formData.value.categoryId, (newVal, oldVal) => {
  if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
    formData.value.tempCategoryId = oldVal;
  }
});

watch(() => formData.value.subcategoryId, (newVal, oldVal) => {
  if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
    formData.value.tempSubcategoryId = oldVal;
  }
});

// 更新保存逻辑
const handleSave = () => {
  // 检查是否有未确认的新建分类
  if (formData.value.categoryId === '__new__' || formData.value.subcategoryId === '__new__') {
    if (!confirm('您有未确认的新建分类，是否继续保存？未确认的分类将不会被创建。')) {
      return;
    }
    // 取消新建分类
    cancelNewCategory();
  }

  const saveData = {
    ...formData.value,
    tokenType: props.tokenType,
    isSystem: isSystemToken.value,
    poolTokens: props.tokenType === 'pool' ? poolTokens.value : undefined
  };

  // 移除临时字段
  delete saveData.newCategoryName;
  delete saveData.newSubcategoryName;
  delete saveData.tempCategoryId;
  delete saveData.tempSubcategoryId;

  emit('save', saveData);
};


// 监听props变化
watch(() => props.token, initializeFormData, {immediate: true});

onMounted(() => {
  console.log('TokenEditor mounted with type:', props.tokenType, 'token:', props.token);
});
</script>

<style scoped>
.token-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000001;
}

.token-editor-content {
  background: #2a2a2a;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  border: 1px solid #404040;
  display: flex;
  flex-direction: column;
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid #404040;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h3 {
  margin: 0;
  color: #fafafa;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #404040;
  color: #fff;
}

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #1e1e1e;
  border-radius: 6px;
  border: 1px solid #333;
}

.form-section h4 {
  margin: 0 0 12px 0;
  color: #0d7dd8;
  font-size: 14px;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  color: #ddd;
  font-size: 13px;
  font-weight: 500;
}

.form-input, .form-select, .form-textarea {
  padding: 8px 12px;
  background: #252525;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: inherit;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: #0d7dd8;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-hint {
  font-size: 11px;
  color: #888;
}

.source-badge {
  padding: 4px 8px;
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
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-weight: 600;
  text-align: center;
}

.token-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #252525;
  border-radius: 4px;
}

.preview-label {
  color: #888;
  font-size: 12px;
}

.preview-value {
  color: #4CAF50;
  font-weight: 600;
  font-family: monospace;
}

.pool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pool-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #888;
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.pool-token-item {
  padding: 12px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 4px;
  transition: all 0.2s;
}

.pool-token-item:hover {
  border-color: #555;
  background: #2a2a2a;
}

.pool-token-item.mapped-token {
  border-left: 3px solid #666;
}

.token-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.token-index {
  color: #888;
  font-size: 12px;
  min-width: 30px;
}

.token-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-text {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.lang-zh {
  color: #4CAF50;
}

.lang-en {
  color: #2196F3;
}

.token-original {
  color: #ff9800;
  font-family: monospace;
}

.token-source {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-btn, .edit-btn {
  padding: 2px 8px;
  background: #0d7dd8;
  border: none;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  cursor: pointer;
}

.edit-btn {
  background: #4CAF50;
}

.token-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weight-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.weight-input {
  width: 60px;
  padding: 2px 4px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 3px;
  color: #e0e0e0;
  text-align: center;
}

.editor-footer {
  padding: 12px 20px;
  border-top: 1px solid #404040;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  font-size: 12px;
  color: #888;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #404040;
  color: #fff;
  font-size: 13px;
  transition: all 0.2s;
}

button:hover {
  background: #4a4a4a;
}

button.primary {
  background: #0d7dd8;
}

button.primary:hover:not(:disabled) {
  background: #0c6dba;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.token-editor-embedded {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.editor-body-embedded {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.editor-footer-embedded {
  padding: 12px 16px;
  border-top: 1px solid #404040;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #252525;
}

.btn-secondary {
  background: #404040;
}

.btn-secondary:hover {
  background: #4a4a4a;
}

/* 调整表单样式以适应嵌入模式 */
.token-editor-embedded .form-section {
  margin-bottom: 16px;
  padding: 12px;
}

.token-editor-embedded .form-section h4 {
  font-size: 13px;
  margin-bottom: 10px;
}

.token-editor-embedded .form-input,
.token-editor-embedded .form-select,
.token-editor-embedded .form-textarea {
  font-size: 12px;
  padding: 6px 10px;
}

.token-editor-embedded .pool-token-item {
  padding: 10px;
}

.category-input-container {
  position: relative;
}

.new-category-input {
  margin-top: 8px;
  animation: slideDown 0.2s ease-out;
}

.new-category-actions {
  margin-top: 12px;
  padding: 12px;
  background: rgba(13, 125, 216, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(13, 125, 216, 0.3);
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-confirm-new, .btn-cancel-new {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm-new {
  background: #4CAF50;
  color: white;
}

.btn-confirm-new:hover:not(:disabled) {
  background: #45a049;
}

.btn-confirm-new:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.btn-cancel-new {
  background: #f44336;
  color: white;
}

.btn-cancel-new:hover {
  background: #da190b;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .new-category-actions {
    flex-direction: column;
    gap: 8px;
  }

  .btn-confirm-new, .btn-cancel-new {
    width: 100%;
  }
}
</style>