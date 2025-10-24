<template>
  <div class="token-pool" :class="{ focused }">
    <div class="pool-header">
      <h4>📚 词元映射池</h4>
      <input
        type="text"
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索词元..."
      />
    </div>
    <div class="pool-content">
      <div
        v-for="category in filteredCategories"
        :key="category.id"
        class="category"
      >
        <div
          class="category-header"
          @click="toggleCategory(category.id)"
        >
          <span class="category-icon">{{ category.expanded ? '▼' : '▶' }}</span>
          <span class="category-title">{{ getCategoryName(category) }}</span>
          <span class="category-count">({{ getCategoryTokenCount(category) }})</span>
        </div>

        <div v-show="category.expanded" class="category-content">
          <div
            v-for="subcategory in category.subcategories"
            :key="subcategory.id"
            class="subcategory"
          >
            <div
              class="subcategory-header"
              @click="toggleSubcategory(category.id, subcategory.id)"
            >
              <span class="subcategory-icon">{{ subcategory.expanded ? '▼' : '▶' }}</span>
              <span class="subcategory-title">{{ getSubcategoryName(subcategory) }}</span>
              <span class="subcategory-count">({{ subcategory.tokens.length }})</span>
              <button
                class="add-token-btn"
                @click.stop="$emit('add-token', category, subcategory)"
                title="添加词元"
              >
                +
              </button>
            </div>

            <div v-show="subcategory.expanded" class="token-list">
              <div
                v-for="token in subcategory.tokens"
                :key="token.id"
                class="token-item"
                @dblclick="$emit('token-click', token)"
                :title="`双击添加: ${token.en} / ${token.zh}`"
              >
                <span class="token-main">{{ language === 'zh' ? token.zh : token.en }}</span>
                <span class="token-sub">{{ language === 'zh' ? token.en : token.zh }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredCategories.length === 0" class="empty-state">
        未找到匹配的词元
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  categories: Array,
  language: String,
  focused: Boolean
});

const emit = defineEmits(['token-click', 'add-token']);

const searchQuery = ref('');

const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.categories;
  }

  const query = searchQuery.value.toLowerCase();
  return props.categories.map(cat => {
    const filteredSubs = cat.subcategories.map(sub => {
      const filteredTokens = sub.tokens.filter(token =>
        token.zh.toLowerCase().includes(query) ||
        token.en.toLowerCase().includes(query)
      );
      return { ...sub, tokens: filteredTokens };
    }).filter(sub => sub.tokens.length > 0);

    return { ...cat, subcategories: filteredSubs };
  }).filter(cat => cat.subcategories.length > 0);
});

const getCategoryName = (category) => {
  return props.language === 'zh' ? category.name.zh : category.name.en;
};

const getSubcategoryName = (subcategory) => {
  return props.language === 'zh' ? subcategory.name.zh : subcategory.name.en;
};

const getCategoryTokenCount = (category) => {
  return category.subcategories.reduce((sum, sub) => sum + sub.tokens.length, 0);
};

const toggleCategory = (categoryId) => {
  const category = props.categories.find(c => c.id === categoryId);
  if (category) {
    category.expanded = !category.expanded;
  }
};

const toggleSubcategory = (categoryId, subcategoryId) => {
  const category = props.categories.find(c => c.id === categoryId);
  if (category) {
    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    if (subcategory) {
      subcategory.expanded = !subcategory.expanded;
    }
  }
};
</script>

<style scoped>
.token-pool {
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: border-color 0.3s;
}

.token-pool.focused {
  border-color: #0d7dd8 !important;
  box-shadow: 0 0 0 2px rgba(13, 125, 216, 0.2);
}

.pool-header {
  padding: 12px 16px;
  border-bottom: 1px solid #404040;
  background: #2a2a2a;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h4 {
  margin: 0;
  color: #fafafa;
  font-size: 14px;
  font-weight: 600;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 12px;
  outline: none;
}

.search-input:focus {
  border-color: #0d7dd8;
}

.pool-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.category {
  margin-bottom: 8px;
}

.category-header {
  padding: 8px 12px;
  background: #2a2a2a;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
  user-select: none;
}

.category-header:hover {
  background: #333;
}

.category-icon,
.subcategory-icon {
  color: #888;
  font-size: 10px;
  width: 12px;
}

.category-title {
  color: #fafafa;
  font-weight: 600;
  font-size: 13px;
  flex: 1;
}

.category-count {
  color: #888;
  font-size: 11px;
}

.category-content {
  padding-left: 16px;
  margin-top: 4px;
}

.subcategory {
  margin-bottom: 4px;
}

.subcategory-header {
  padding: 6px 10px;
  background: #232323;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
  user-select: none;
}

.subcategory-header:hover {
  background: #2a2a2a;
}

.subcategory-title {
  color: #ddd;
  font-size: 12px;
  flex: 1;
}

.subcategory-count {
  color: #777;
  font-size: 11px;
}

.add-token-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  background: #0d7dd8;
  border: none;
  border-radius: 3px;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.subcategory-header:hover .add-token-btn {
  opacity: 1;
}

.token-list {
  padding: 4px 0 4px 20px;
}

.token-item {
  padding: 6px 10px;
  background: #1e1e1e;
  border-radius: 4px;
  margin-bottom: 3px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.token-item:hover {
  background: #2a2a2a;
  transform: translateX(4px);
  border-left: 2px solid #0d7dd8;
}

.token-main {
  color: #e0e0e0;
  font-size: 12px;
}

.token-sub {
  color: #888;
  font-size: 11px;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 20px;
  font-size: 13px;
}

.pool-content::-webkit-scrollbar {
  width: 8px;
}

.pool-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.pool-content::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}
</style>