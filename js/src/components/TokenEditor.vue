<template>
  <div class="token-editor-embedded">
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
              <div class="category-input-container">
                <select v-model="formData.categoryId" class="form-select">
                  <option value="">请选择分类</option>
                  <option
                      v-for="category in mergedCategories"
                      :key="category.id"
                      :value="category.id"
                  >
                    {{ getCategoryName(category) }}
                    {{ category.isTemp ? ' (新建)' : '' }}
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
                    {{ subcategory.isTemp ? ' (新建)' : '' }}
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
          </div>

          <!-- 新增：确认/取消按钮（独立显示） -->
          <div v-if="showNewCategoryButtons" class="new-category-actions">
            <button
                class="btn-confirm-new"
                @click="confirmNewCategory(formData.categoryId === '__new__' ? 'category' : 'subcategory')"
                :disabled="!canConfirmNewCategory"
            >
              ✅ 确认新建{{ formData.categoryId === '__new__' ? '一级分类' : '二级分类' }}
            </button>
            <button
                class="btn-cancel-new"
                @click="cancelNewCategory"
            >
              ❌ 取消新建
            </button>
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
            <div class="form-group">
              <label>日文映射 (jp)</label>
              <input
                  type="text"
                  v-model="formData.jp"
                  placeholder="日文映射"
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
              <div class="category-input-container">
                <select v-model="formData.categoryId" class="form-select" required>
                  <option value="">请选择分类</option>
                  <option
                      v-for="category in mergedCategories"
                      :key="category.id"
                      :value="category.id"
                  >
                    {{ getCategoryName(category) }}
                    {{ category.isTemp ? ' (新建)' : '' }}
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
              <label>二级分类 *</label>
              <div class="category-input-container">
                <select
                    v-model="formData.subcategoryId"
                    :disabled="!formData.categoryId || formData.categoryId === '__new__'"
                    class="form-select"
                    required
                >
                  <option value="">请选择子分类</option>
                  <option
                      v-for="subcategory in getSubcategories(formData.categoryId)"
                      :key="subcategory.id"
                      :value="subcategory.id"
                  >
                    {{ getSubcategoryName(subcategory) }}
                    {{ subcategory.isTemp ? ' (新建)' : '' }}
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
          </div>

          <!-- 新增：确认/取消按钮（独立显示） -->
          <div v-if="showNewCategoryButtons" class="new-category-actions">
            <button
                class="btn-confirm-new"
                @click="confirmNewCategory(formData.categoryId === '__new__' ? 'category' : 'subcategory')"
                :disabled="!canConfirmNewCategory"
            >
              ✅ 确认新建{{ formData.categoryId === '__new__' ? '一级分类' : '二级分类' }}
            </button>
            <button
                class="btn-cancel-new"
                @click="cancelNewCategory"
            >
              ❌ 取消新建
            </button>
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
                    v-for="category in mergedCategories"
                    :key="category.id"
                    :value="category.id"
                >
                  {{ getCategoryName(category) }}
                  {{ category.isTemp ? ' (新建)' : '' }}
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
                  {{ subcategory.isTemp ? ' (新建)' : '' }}
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
                :key="token.id || index"
                class="pool-token-item"
                :class="{
                  'mapped-token': token.isReference,
                  'editing-token': editingPoolTokenIndex === index
                }"
            >
              <!-- 非编辑状态：展示模式 -->
              <div v-if="editingPoolTokenIndex !== index" class="token-content">
                <span class="token-index">#{{ index + 1 }}</span>

                <div class="token-info-detailed">
                  <!-- 词元类型标签 -->
                  <div class="token-header">
                    <span v-if="token.isReference" class="type-badge reference">
                      🔗 引用词元
                    </span>
                    <span v-else class="type-badge custom">
                      自定义词元
                    </span>

                    <div class="token-actions">
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
                          v-if="!token.isReference"
                          class="edit-btn"
                          @click="startEditPoolToken(index)"
                          title="编辑此词元"
                      >
                        编辑
                      </button>

                      <button
                          v-else
                          class="view-btn"
                          @click="viewReferencedToken(token)"
                          title="查看引用的词元"
                      >
                        👁️ 查看
                      </button>

                      <button
                          class="delete-btn"
                          @click="removePoolToken(index)"
                          title="从池中移除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <!-- 多语言内容展示 -->
                  <div class="token-languages">
                    <div class="lang-item" v-if="getTokenLanguageValue(token, 'zh')">
                      <span class="lang-label">中文:</span>
                      <span class="lang-value zh">{{ getTokenLanguageValue(token, 'zh') }}</span>
                    </div>
                    <div class="lang-item" v-if="getTokenLanguageValue(token, 'en')">
                      <span class="lang-label">英文:</span>
                      <span class="lang-value en">{{ getTokenLanguageValue(token, 'en') }}</span>
                    </div>
                    <div class="lang-item" v-if="getTokenLanguageValue(token, 'jp')">
                      <span class="lang-label">日文:</span>
                      <span class="lang-value jp">{{ getTokenLanguageValue(token, 'jp') }}</span>
                    </div>
                  </div>

                  <!-- 引用信息 -->
                  <div v-if="token.isReference" class="reference-info">
                    <span class="ref-label">引用来源:</span>
                    <span class="ref-path" v-if="token.referenceInfo">
                      {{ token.referenceInfo.categoryName }} / {{ token.referenceInfo.subcategoryName }}
                    </span>
                    <span class="ref-error" v-else>
                      ⚠️ 引用词元未找到
                    </span>
                    <!-- 显示引用词元的完整信息 -->
                    <div v-if="token.referenceData" class="reference-details">
                      <div class="ref-item">
                        <span class="ref-label">ID:</span>
                        <span class="ref-value">{{ token.referenceData.id }}</span>
                      </div>
                      <div class="ref-item" v-if="token.referenceData.zh">
                        <span class="ref-label">中文:</span>
                        <span class="ref-value zh">{{ token.referenceData.zh }}</span>
                      </div>
                      <div class="ref-item" v-if="token.referenceData.en">
                        <span class="ref-label">英文:</span>
                        <span class="ref-value en">{{ token.referenceData.en }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 编辑状态：编辑模式（仅自定义词元） -->
              <div v-else class="token-edit-form">
                <div class="edit-header">
                  <span class="token-index">#{{ index + 1 }}</span>
                  <span class="edit-title">编辑自定义词元</span>
                </div>

                <div class="edit-body">
                  <div class="edit-row">
                    <div class="edit-group">
                      <label>中文 (zh) *</label>
                      <input
                          type="text"
                          v-model="editingPoolTokenData.zh"
                          placeholder="中文内容"
                          class="form-input"
                      />
                    </div>
                    <div class="edit-group">
                      <label>英文 (en) *</label>
                      <input
                          type="text"
                          v-model="editingPoolTokenData.en"
                          placeholder="英文内容"
                          class="form-input"
                      />
                    </div>
                  </div>

                  <div class="edit-row">
                    <div class="edit-group">
                      <label>日文 (jp)</label>
                      <input
                          type="text"
                          v-model="editingPoolTokenData.jp"
                          placeholder="日文内容"
                          class="form-input"
                      />
                    </div>
                    <div class="edit-group">
                      <label>权重</label>
                      <input
                          type="number"
                          v-model.number="editingPoolTokenData.weight"
                          min="0"
                          max="10"
                          step="0.1"
                          class="form-input"
                      />
                    </div>
                  </div>

                  <div class="edit-actions">
                    <button class="btn-save" @click="saveEditPoolToken">
                      ✅ 保存
                    </button>
                    <button class="btn-cancel" @click="cancelEditPoolToken">
                      ❌ 取消
                    </button>
                  </div>
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
  isEmbedded: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close', 'save', 'view-token', 'edit-token', 'new-category']);

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
  tempCategoryId: '',
  tempSubcategoryId: ''
});

const tempCategories = ref([]);
const tempSubcategories = ref([]);
const isInitializing = ref(false);
const poolTokens = ref([]);
const originalValue = ref('');
const isSystemToken = ref(false);

// 新增：词元池编辑状态
const editingPoolTokenIndex = ref(null);
const editingPoolTokenData = ref({});

// 计算属性
const tokenSource = computed(() => {
  return isSystemToken.value ? 'system' : 'user';
});

const canSave = computed(() => {
  if (props.tokenType === 'single' || props.tokenType === 'unmapped') {
    return formData.value.id && (formData.value.zh || formData.value.en || formData.value.jp);
  }
  return true;
});

const mergedCategories = computed(() => {
  return [...props.categories, ...tempCategories.value];
});

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

// 方法
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
  if (!categoryId) return [];

  // 首先在现有分类中查找
  const category = mergedCategories.value.find(cat => cat.id === categoryId);
  if (category) {
    const tempSubs = tempSubcategories.value.filter(sub => sub.parentId === categoryId);
    return [...category.subcategories, ...tempSubs];
  }

  // 如果在现有分类中没找到，检查临时分类
  const tempCategory = tempCategories.value.find(cat => cat.id === categoryId);
  if (tempCategory) {
    const tempSubs = tempSubcategories.value.filter(sub => sub.parentId === categoryId);
    return tempSubs;
  }

  // 如果都没找到，返回空数组而不是抛出错误
  console.warn(`[TokenEditor] 未找到分类: ${categoryId}`);
  return [];
};

// 新增：获取词元的语言值（支持引用词元）
const getTokenLanguageValue = (token, lang) => {
  // 优先使用引用词元的完整数据
  if (token.isReference && token.referenceData) {
    const value = token.referenceData[lang];
    if (value) {
      return value;
    }
  }

  // 其次使用词元自身的值
  if (token[lang]) {
    return token[lang];
  }

  // 最后尝试从映射数据中获取
  if (token.mapping && token.mapping[lang]) {
    return token.mapping[lang];
  }

  return '无数据';
};

// 新增：查找引用的词元数据
// 修改：增强查找引用的词元数据
const findReferencedToken = (tokenId) => {
  if (!tokenId || !props.categories) return null;

  console.log(`[findReferencedToken] 开始查找引用词元 ID: ${tokenId}`);

  // 首先尝试通过ID直接匹配
  for (const category of props.categories) {
    for (const subcategory of category.subcategories) {
      const found = subcategory.tokens.find(t => {
        // 多种匹配方式
        return t.id === tokenId ||
            t.uniqueId === tokenId ||
            t.en === tokenId ||
            t.zh === tokenId;
      });

      if (found) {
        console.log(`[findReferencedToken] 找到引用词元:`, {
          id: found.id,
          zh: found.zh,
          en: found.en,
          category: category.name,
          subcategory: subcategory.name
        });

        return {
          ...found,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          categoryName: category.name,
          subcategoryName: subcategory.name
        };
      }
    }
  }

  // 如果直接匹配失败，尝试通过词元值匹配
  const lowerTokenId = tokenId.toLowerCase();
  for (const category of props.categories) {
    for (const subcategory of category.subcategories) {
      const found = subcategory.tokens.find(t => {
        const tokenEn = t.en?.toLowerCase() || '';
        const tokenZh = t.zh?.toLowerCase() || '';
        return tokenEn === lowerTokenId || tokenZh === lowerTokenId;
      });

      if (found) {
        console.log(`[findReferencedToken] 通过值匹配找到引用词元:`, found);
        return {
          ...found,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          categoryName: category.name,
          subcategoryName: subcategory.name
        };
      }
    }
  }

  console.warn(`[findReferencedToken] 未找到引用词元 ID: ${tokenId}`);
  return null;
};

// 新增：查看引用的词元
const viewReferencedToken = (token) => {
  if (!token.referenceData) {
    console.warn('[TokenEditor] 引用词元数据缺失:', token);
    return;
  }

  emit('view-token', token.referenceData);
};

// 新增：开始编辑词元池中的词元
const startEditPoolToken = (index) => {
  const token = poolTokens.value[index];
  if (token.isReference) {
    console.warn('[TokenEditor] 引用词元不支持直接编辑');
    return;
  }

  editingPoolTokenIndex.value = index;
  editingPoolTokenData.value = {
    zh: token.zh || '',
    en: token.en || '',
    jp: token.jp || '',
    weight: token.weight !== undefined ? token.weight : 1
  };
};

// 新增:保存词元池词元编辑
const saveEditPoolToken = () => {
  if (!editingPoolTokenData.value.zh && !editingPoolTokenData.value.en) {
    alert('至少需要填写中文或英文');
    return;
  }

  poolTokens.value[editingPoolTokenIndex.value] = {
    ...poolTokens.value[editingPoolTokenIndex.value],
    zh: editingPoolTokenData.value.zh,
    en: editingPoolTokenData.value.en,
    jp: editingPoolTokenData.value.jp,
    weight: editingPoolTokenData.value.weight
  };

  cancelEditPoolToken();
};

// 新增：取消词元池词元编辑
const cancelEditPoolToken = () => {
  editingPoolTokenIndex.value = null;
  editingPoolTokenData.value = {};
};

// 新增：移除词元池中的词元
const removePoolToken = (index) => {
  if (confirm('确定要从词元池中移除此词元吗？')) {
    poolTokens.value.splice(index, 1);
  }
};

const confirmNewCategory = (type) => {
  if (!canConfirmNewCategory.value) return;

  if (type === 'category' || type === 'both') {
    if (formData.value.categoryId === '__new__' && formData.value.newCategoryName.trim()) {
      const newCategoryId = `new_category_${Date.now()}`;
      const newCategoryName = formData.value.newCategoryName.trim();

      const tempCategory = {
        id: newCategoryId,
        name: {
          zh: newCategoryName,
          en: newCategoryName
        },
        subcategories: [],
        isTemp: true
      };

      tempCategories.value.push(tempCategory);
      formData.value.categoryId = newCategoryId;
      formData.value.newCategoryName = '';

      emit('new-category', {
        id: newCategoryId,
        name: newCategoryName,
        type: 'category'
      });

      console.log('[TokenEditor] 创建临时一级分类:', tempCategory);
    }
  }

  if (type === 'subcategory' || type === 'both') {
    if (formData.value.subcategoryId === '__new__' && formData.value.newSubcategoryName.trim()) {
      const newSubcategoryId = `new_subcategory_${Date.now()}`;
      const newSubcategoryName = formData.value.newSubcategoryName.trim();

      const tempSubcategory = {
        id: newSubcategoryId,
        name: {
          zh: newSubcategoryName,
          en: newSubcategoryName
        },
        parentId: formData.value.categoryId,
        tokens: [],
        isTemp: true
      };

      tempSubcategories.value.push(tempSubcategory);
      formData.value.subcategoryId = newSubcategoryId;
      formData.value.newSubcategoryName = '';

      emit('new-category', {
        id: newSubcategoryId,
        name: newSubcategoryName,
        parentId: formData.value.categoryId,
        type: 'subcategory'
      });

      console.log('[TokenEditor] 创建临时二级分类:', tempSubcategory);
    }
  }
};

const cancelNewCategory = () => {
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

  formData.value.newCategoryName = '';
  formData.value.newSubcategoryName = '';
  formData.value.tempCategoryId = '';
  formData.value.tempSubcategoryId = '';
};

watch(() => formData.value.categoryId, (newVal, oldVal) => {
  console.log('[TokenEditor] categoryId 变化:', {newVal, oldVal, isInitializing: isInitializing.value});

  if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
    formData.value.tempCategoryId = oldVal;
  }

  if (!isInitializing.value && newVal !== oldVal && newVal !== '__new__') {
    console.log('[TokenEditor] 清空二级分类选择');
    formData.value.subcategoryId = '';
  }
});

watch(() => formData.value.subcategoryId, (newVal, oldVal) => {
  if (newVal === '__new__' && oldVal && oldVal !== '__new__') {
    formData.value.tempSubcategoryId = oldVal;
  }
});

// 在现有的 watch 后面添加
watch(() => props.categories, (newCategories, oldCategories) => {
  // 只在分类数据变化且不是初始化阶段时刷新
  if (!isInitializing.value && props.token && props.tokenType === 'single') {
    console.log('[TokenEditor] 检测到分类数据变化，尝试刷新词元数据');

    // 从最新的分类中查找当前编辑的词元
    const tokenId = formData.value.id;
    const categoryId = formData.value.categoryId;
    const subcategoryId = formData.value.subcategoryId;

    if (tokenId && categoryId && subcategoryId) {
      const category = newCategories.find(cat => cat.id === categoryId);
      if (category) {
        const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
        if (subcategory) {
          const updatedToken = subcategory.tokens.find(t => t.id === tokenId);
          if (updatedToken) {
            console.log('[TokenEditor] 发现更新的词元数据，刷新表单');

            // 更新表单数据
            formData.value = {
              ...formData.value,
              zh: updatedToken.zh || '',
              en: updatedToken.en || '',
              jp: updatedToken.jp || '',
              description: updatedToken.description || ''
            };

            // 更新系统词元标记
            isSystemToken.value = updatedToken.source === 'system';
          }
        }
      }
    }
  }
}, {deep: true});

const handleSave = () => {
  if (formData.value.categoryId === '__new__' || formData.value.subcategoryId === '__new__') {
    if (!confirm('您有未确认的新建分类，是否继续保存？未确认的分类将不会被创建。')) {
      return;
    }
    cancelNewCategory();
  }

  const saveData = {
    ...formData.value,
    tokenType: props.tokenType,
    isSystem: isSystemToken.value,
    poolTokens: props.tokenType === 'pool' ? poolTokens.value : undefined,
    tempCategories: tempCategories.value,
    tempSubcategories: tempSubcategories.value
  };

  delete saveData.newCategoryName;
  delete saveData.newSubcategoryName;
  delete saveData.tempCategoryId;
  delete saveData.tempSubcategoryId;

  emit('save', saveData);
};

// 修改：增强词元池数据处理，确保引用词元信息完整
const processPoolTokens = (tokens) => {
  if (!tokens || !Array.isArray(tokens)) return [];

  console.log(`[processPoolTokens] 开始处理词元池数据，数量: ${tokens.length}`);

  return tokens.map((token, index) => {
    console.log(`[processPoolTokens] 处理第 ${index + 1} 个词元:`, token);

    // 判断是否为引用词元
    const isReference = token.isReference ||
        token.type === 'quote' ||
        (token.mapping && !token.zh && !token.en);

    if (isReference) {
      // 引用词元：查找对应的完整词元信息
      const referenceId = token.id || token.mapping || token.referenceId;
      const referenceData = findReferencedToken(referenceId);

      if (referenceData) {
        console.log(`[processPoolTokens] 引用词元找到完整数据:`, referenceData);
        return {
          ...token,
          isReference: true,
          referenceData: referenceData,
          referenceInfo: {
            categoryName: getCategoryDisplayName(referenceData.categoryName),
            subcategoryName: getCategoryDisplayName(referenceData.subcategoryName),
            categoryId: referenceData.categoryId,
            subcategoryId: referenceData.subcategoryId
          },
          // 确保多语言数据完整
          zh: referenceData.zh || token.zh,
          en: referenceData.en || token.en,
          jp: referenceData.jp || token.jp
        };
      } else {
        console.warn(`[processPoolTokens] 引用词元未找到对应数据:`, token);
        return {
          ...token,
          isReference: true,
          referenceData: null,
          referenceInfo: null
        };
      }
    } else {
      // 自定义词元
      console.log(`[processPoolTokens] 自定义词元:`, token);
      return {
        ...token,
        isReference: false,
        referenceData: null,
        referenceInfo: null
      };
    }
  });
};

// 新增：获取分类显示名称
const getCategoryDisplayName = (nameObj) => {
  if (!nameObj) return '未知';
  if (typeof nameObj === 'string') return nameObj;
  return props.language === 'zh' ? nameObj.zh : nameObj.en;
};

const initializeFormData = () => {
  if (!props.token) return;

  isInitializing.value = true;

  tempCategories.value = [];
  tempSubcategories.value = [];

  originalValue.value = props.token.value || props.token.original || '';

  if (props.tokenType === 'single') {
    // ... 单个词元逻辑保持不变
  } else if (props.tokenType === 'unmapped') {
    // ... 未映射词元逻辑保持不变
  } else if (props.tokenType === 'pool') {
    const poolData = props.token.poolData || props.token;

    // ⭐ 确保包含完整的标识信息（包括 groupId）
    const poolId = poolData.id || props.token.poolId || props.token.id;
    const poolKey = poolData.id || props.token.poolKey;
    const groupId = props.token.groupId;  // ⭐ 新增
    const groupKey = props.token.groupKey;  // ⭐ 新增

    console.log('[TokenEditor] 词元池初始化:', {
      groupId,
      groupKey,
      groupName: props.token.groupName,
      poolId,
      poolKey,
      name: poolData.name,
      tokensCount: poolData.tokens?.length || 0
    });

    formData.value = {
      groupId: groupId,      // ⭐ 新增
      groupKey: groupKey,    // ⭐ 新增
      poolId: poolId,
      poolKey: poolKey,
      id: poolId,
      key: poolKey,
      name: poolData.name || {zh: '', en: ''},
      description: poolData.description || ''
    };

    // 处理词元池中的词元
    const rawTokens = poolData.tokens || [];
    poolTokens.value = processPoolTokens(rawTokens);

    console.log('[TokenEditor] 词元池初始化完成:', {
      groupId: formData.value.groupId,
      poolId: formData.value.poolId,
      rawCount: rawTokens.length,
      processedCount: poolTokens.value.length
    });
  }

  setTimeout(() => {
    isInitializing.value = false;
    console.log('[TokenEditor] 初始化完成');
  }, 0);
};

watch(() => props.token, initializeFormData, {immediate: true});

onMounted(() => {
  console.log('TokenEditor mounted with type:', props.tokenType, 'token:', props.token);
});
</script>

<style scoped>
/* 样式保持不变 */
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
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pool-form .form-section:last-child {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pool-form .form-section:last-child h4 {
  flex-shrink: 0; /* 标题不收缩 */
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

.form-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #1e1e1e;
  border-radius: 6px;
  border: 1px solid #333;
}

.form-section h4 {
  margin: 0 0 10px 0;
  color: #0d7dd8;
  font-size: 13px;
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
  padding: 6px 10px;
  background: #252525;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
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
  min-height: 60px;
}

.pool-form {
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许弹性布局 */
}

.token-list {
  flex: 1;
  overflow: visible; /* 确保不产生内部滚动 */
}

.pool-token-item {
  padding: 10px;
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

@media (max-width: 768px) {
  .new-category-actions {
    flex-direction: column;
    gap: 8px;
  }

  .btn-confirm-new, .btn-cancel-new {
    width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

/* 词元池增强样式 */
.pool-token-item {
  padding: 12px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 6px;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.pool-token-item:hover {
  border-color: #555;
  background: #2a2a2a;
}

.pool-token-item.mapped-token {
  border-left: 3px solid #667eea;
}

.pool-token-item.editing-token {
  border-left: 3px solid #4CAF50;
  background: #2a2a2a;
}

.token-content {
  display: flex;
  gap: 12px;
}

.token-index {
  color: #888;
  font-size: 12px;
  min-width: 30px;
  font-weight: 600;
}

.token-info-detailed {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
}

.type-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.type-badge.reference {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.type-badge.custom {
  background: #4CAF50;
  color: white;
}

.token-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-languages {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lang-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.lang-label {
  color: #888;
  min-width: 50px;
  font-size: 11px;
}

.lang-value {
  color: #e0e0e0;
  flex: 1;
  font-weight: 500;
}

.lang-value.zh {
  color: #4CAF50;
}

.lang-value.en {
  color: #2196F3;
}

.lang-value.jp {
  color: #FF9800;
}

.reference-info {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 4px;
  font-size: 11px;
}

.ref-label {
  color: #888;
}

.ref-path {
  color: #667eea;
  font-weight: 500;
}

.view-btn, .edit-btn, .delete-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn {
  background: #667eea;
}

.view-btn:hover {
  background: #5568d3;
}

.edit-btn {
  background: #4CAF50;
}

.edit-btn:hover {
  background: #45a049;
}

.delete-btn {
  background: #f44336;
}

.delete-btn:hover {
  background: #da190b;
}

.weight-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.weight-control label {
  font-size: 11px;
  color: #888;
}

.weight-input {
  width: 60px;
  padding: 3px 6px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 3px;
  color: #e0e0e0;
  text-align: center;
  font-size: 12px;
}

/* 词元编辑表单 */
.token-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #4CAF50;
}

.edit-title {
  color: #4CAF50;
  font-weight: 600;
  font-size: 13px;
}

.edit-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.edit-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.edit-group label {
  font-size: 11px;
  color: #ddd;
  font-weight: 500;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #333;
}

.btn-save, .btn-cancel {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save {
  background: #4CAF50;
  color: white;
}

.btn-save:hover {
  background: #45a049;
}

.btn-cancel {
  background: #666;
  color: white;
}

.btn-cancel:hover {
  background: #777;
}

@media (max-width: 768px) {
  .edit-row {
    grid-template-columns: 1fr;
  }

  .token-actions {
    flex-wrap: wrap;
  }
}
</style>