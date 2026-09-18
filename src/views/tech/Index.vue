<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  FileTextOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  RiseOutlined, AuditOutlined, ReadOutlined,
  CodeOutlined, BulbOutlined, RocketOutlined,
  ShopOutlined, UserOutlined, EyeOutlined, ClockCircleOutlined,
  SearchOutlined, ReloadOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { techApi, type Tech } from '@/api/modules'

const loading = ref(false)
const dataList = ref<Tech[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: 'tech', label: '技术笔记', icon: CodeOutlined, color: '#5E6AD2', bg: 'rgba(94, 106, 210, 0.15)' },
  { key: 'ai', label: 'AI提示词', icon: BulbOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' },
  { key: 'product', label: '产品文档', icon: RocketOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: 'operation', label: '运营复盘', icon: ShopOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: 'personal', label: '个人随笔', icon: UserOutlined, color: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.15)' }
]

const tagList = ['Java', 'SQL', 'AI', '自媒体', '产品', '读书', '生活']

const categoryTagColorMap: Record<string, string> = {
  tech: '#5E6AD2',
  ai: '#FF9F0A',
  product: '#34C759',
  operation: '#0A84FF',
  personal: '#BF5AF2'
}

const categoryLabelMap: Record<string, string> = {
  tech: '技术笔记',
  ai: 'AI提示词',
  product: '产品文档',
  operation: '运营复盘',
  personal: '个人随笔'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime || r.date
    return t && dayjs(t).isAfter(monthStart)
  }).length
  const categorized = dataList.value.filter(r => r.lang || r.mood).length
  return { total, monthNew, categorized }
})

const categoryCounts = computed(() => {
  const counts: Record<string, number> = { tech: 0, ai: 0, product: 0, operation: 0, personal: 0 }
  dataList.value.forEach(r => {
    const lang = (r.lang || '').toLowerCase()
    const mood = (r.mood || '').toLowerCase()
    const content = (r.content || '').toLowerCase()
    const key = lang + ' ' + mood + ' ' + content
    if (key.includes('prompt') || key.includes('提示词') || key.includes('ai') || lang.includes('ai')) counts.ai++
    else if (key.includes('产品') || key.includes('prd') || key.includes('需求')) counts.product++
    else if (key.includes('运营') || key.includes('复盘') || key.includes('推广')) counts.operation++
    else if (key.includes('随笔') || key.includes('日记') || key.includes('个人')) counts.personal++
    else counts.tech++
  })
  return counts
})

const filteredList = computed(() => {
  return dataList.value.filter(r => {
    if (searchText.value) {
      const kw = searchText.value.toLowerCase()
      const title = (r.title || '').toLowerCase()
      const content = (r.content || '').toLowerCase()
      if (!title.includes(kw) && !content.includes(kw)) return false
    }
    if (selectedTag.value) {
      const tag = selectedTag.value.toLowerCase()
      const lang = (r.lang || '').toLowerCase()
      const mood = (r.mood || '').toLowerCase()
      const content = (r.content || '').toLowerCase()
      const key = lang + ' ' + mood + ' ' + content
      if (!key.includes(tag)) return false
    }
    if (selectedCategory.value) {
      const cat = selectedCategory.value
      const lang = (r.lang || '').toLowerCase()
      const mood = (r.mood || '').toLowerCase()
      const content = (r.content || '').toLowerCase()
      const key = lang + ' ' + mood + ' ' + content
      if (cat === 'ai') {
        if (!(key.includes('prompt') || key.includes('提示词') || key.includes('ai') || lang.includes('ai'))) return false
      } else if (cat === 'product') {
        if (!(key.includes('产品') || key.includes('prd') || key.includes('需求'))) return false
      } else if (cat === 'operation') {
        if (!(key.includes('运营') || key.includes('复盘') || key.includes('推广'))) return false
      } else if (cat === 'personal') {
        if (!(key.includes('随笔') || key.includes('日记') || key.includes('个人'))) return false
      } else {
        if (key.includes('prompt') || key.includes('提示词') || key.includes('产品') || key.includes('prd') ||
            key.includes('运营') || key.includes('复盘') || key.includes('随笔') || key.includes('日记')) return false
      }
    }
    return true
  })
})

const sortedList = computed(() => {
  return [...filteredList.value].sort((a, b) => {
    const ta = a.updateTime || a.createTime || a.date || ''
    const tb = b.updateTime || b.createTime || b.date || ''
    return tb.localeCompare(ta)
  })
})

const getCategoryKey = (r: Tech): string => {
  const lang = (r.lang || '').toLowerCase()
  const mood = (r.mood || '').toLowerCase()
  const content = (r.content || '').toLowerCase()
  const key = lang + ' ' + mood + ' ' + content
  if (key.includes('prompt') || key.includes('提示词') || key.includes('ai') || lang.includes('ai')) return 'ai'
  if (key.includes('产品') || key.includes('prd') || key.includes('需求')) return 'product'
  if (key.includes('运营') || key.includes('复盘') || key.includes('推广')) return 'operation'
  if (key.includes('随笔') || key.includes('日记') || key.includes('个人')) return 'personal'
  return 'tech'
}

const getAbstract = (r: Tech): string => {
  const text = (r.content || '').replace(/```[\s\S]*?```/g, '').replace(/[#*`>\-]/g, '').trim()
  return text.length > 120 ? text.substring(0, 120) + '...' : text
}

const getTimeText = (r: Tech): string => {
  const t = r.updateTime || r.createTime || r.date
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}

const mockViews = (id?: number): number => {
  const base = (id || 1) * 37
  return 10 + (base % 990)
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await techApi.list()
    dataList.value = res || []
  } catch (e: any) {
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<Tech>>({})
const formRules = {
  title: [{ required: true, message: '请输入笔记标题', trigger: 'blur' }]
}

const langOptions = [
  { label: 'Java / Spring', value: 'Java' },
  { label: 'MySQL / Oracle SQL', value: 'SQL' },
  { label: '达梦数据库', value: '达梦' },
  { label: 'JavaScript', value: 'JS' },
  { label: 'TypeScript', value: 'TS' },
  { label: 'Vue / React', value: 'Vue' },
  { label: 'Shell 脚本', value: 'Shell' },
  { label: 'Docker / K8s', value: 'Docker' },
  { label: 'AI / Prompt', value: 'AI' },
  { label: '其他', value: '其他' }
]

const openAdd = () => {
  isEdit.value = false
  form.title = ''
  form.lang = 'Java'
  form.date = dayjs().format('YYYY-MM-DD')
  form.mood = ''
  form.content = ''
  delete form.id
  modalVisible.value = true
}

const openEdit = (r: Tech) => {
  isEdit.value = true
  Object.assign(form, r)
  modalVisible.value = true
}

const saveForm = async () => {
  try {
    await formRef.value?.validate()
  } catch { return }
  try {
    if (isEdit.value && form.id) {
      await techApi.update({ ...form } as Tech)
      message.success('更新成功')
    } else {
      await techApi.add({ ...form } as Tech)
      message.success('新增成功')
    }
    modalVisible.value = false
    await loadData()
  } catch (e: any) {
    message.error(e?.message || '保存失败')
  }
}

const handleDelete = (r: Tech) => {
  Modal.confirm({
    title: `确认删除「${r.title}」？`,
    content: '删除后不可恢复',
    okType: 'danger',
    okText: '确认删除',
    cancelText: '取消',
    onOk: async () => {
      await techApi.remove(r.id as number)
      message.success('已删除')
      await loadData()
    }
  })
}

onMounted(loadData)
</script>

<template>
  <div class="kb-page">
    <!-- 顶部统计卡 -->
    <a-row :gutter="16" class="stat-row">
      <a-col :xs="24" :sm="8">
        <div class="stat-card" :style="{ '--accent': '#5E6AD2', '--accent-soft': 'rgba(94, 106, 210, 0.15)' }">
          <div class="stat-icon"><FileTextOutlined /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}<span class="stat-unit">篇</span></div>
            <div class="stat-label">笔记总数</div>
          </div>
        </div>
      </a-col>
      <a-col :xs="24" :sm="8">
        <div class="stat-card" :style="{ '--accent': '#34C759', '--accent-soft': 'rgba(52, 199, 89, 0.15)' }">
          <div class="stat-icon"><RiseOutlined /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.monthNew }}<span class="stat-unit">篇</span></div>
            <div class="stat-label">本月新增</div>
          </div>
        </div>
      </a-col>
      <a-col :xs="24" :sm="8">
        <div class="stat-card" :style="{ '--accent': '#FF9F0A', '--accent-soft': 'rgba(255, 159, 10, 0.15)' }">
          <div class="stat-icon"><AuditOutlined /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.categorized }}<span class="stat-unit">篇</span></div>
            <div class="stat-label">已分类</div>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 分类卡片组 -->
    <div class="section-title">
      <span class="title-text">笔记分类</span>
      <a-button size="small" type="text" @click="selectedCategory = null; selectedTag = null">
        <ReloadOutlined /> 重置筛选
      </a-button>
    </div>
    <div class="category-grid">
      <div
        v-for="cat in categoryList"
        :key="cat.key"
        class="category-card"
        :class="{ active: selectedCategory === cat.key }"
        :style="{ '--cat-color': cat.color, '--cat-bg': cat.bg }"
        @click="selectedCategory = selectedCategory === cat.key ? null : cat.key"
      >
        <div class="cat-badge">{{ categoryCounts[cat.key] }}</div>
        <div class="cat-icon"><component :is="cat.icon" /></div>
        <div class="cat-label">{{ cat.label }}</div>
      </div>
    </div>

    <!-- 标签筛选区 -->
    <div class="section-title">
      <span class="title-text">标签筛选</span>
      <div class="search-wrap">
        <a-input
          v-model:value="searchText"
          placeholder="搜索标题/内容"
          size="small"
          allow-clear
          style="width: 220px"
        >
          <template #prefix><SearchOutlined style="color:#71717A" /></template>
        </a-input>
        <a-button size="small" type="primary" style="margin-left:8px" @click="openAdd">
          <PlusOutlined /> 新建笔记
        </a-button>
      </div>
    </div>
    <div class="tag-row">
      <div
        v-for="tag in tagList"
        :key="tag"
        class="tag-chip"
        :class="{ active: selectedTag === tag }"
        @click="selectedTag = selectedTag === tag ? null : tag"
      >
        {{ tag }}
      </div>
    </div>

    <!-- 最近笔记列表 -->
    <div class="section-title">
      <span class="title-text">
        <ReadOutlined style="color:#5E6AD2;margin-right:6px" />
        最近笔记 <span class="sub-count">({{ sortedList.length }} 条)</span>
      </span>
    </div>

    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sortedList.length" class="note-list">
        <div
          v-for="r in sortedList"
          :key="r.id"
          class="note-card"
        >
          <div class="note-main" @click="openEdit(r)">
            <div class="note-head">
              <h4 class="note-title">{{ r.title }}</h4>
              <Tag
                :color="categoryTagColorMap[getCategoryKey(r)]"
                class="note-cat-tag"
              >
                {{ categoryLabelMap[getCategoryKey(r)] }}
              </Tag>
            </div>
            <div class="note-abstract">{{ getAbstract(r) || '暂无内容摘要' }}</div>
            <div class="note-meta">
              <span class="meta-item"><ClockCircleOutlined /> {{ getTimeText(r) }}</span>
              <span class="meta-item"><EyeOutlined /> {{ mockViews(r.id) }} 阅读</span>
              <span v-if="r.lang" class="meta-item lang-tag">{{ r.lang }}</span>
              <span v-if="r.mood" class="meta-item">{{ r.mood }}</span>
            </div>
          </div>
          <div class="note-actions" @click.stop>
            <Tooltip title="编辑">
              <a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button>
            </Tooltip>
            <Tooltip title="删除">
              <a-button type="text" size="small" danger @click="handleDelete(r)"><DeleteOutlined /></a-button>
            </Tooltip>
          </div>
        </div>
      </div>
      <div v-else class="note-empty">
        <div class="empty-icon">📝</div>
        <div class="empty-title">暂无笔记</div>
        <div class="empty-desc">点击右上角「新建笔记」开始记录</div>
        <a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建笔记</a-button>
      </div>
    </a-spin>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑笔记' : '新建笔记'"
      ok-text="保存"
      cancel-text="取消"
      :width="720"
      @ok="saveForm"
      :destroyOnClose="true"
    >
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="笔记标题" name="title">
              <a-input v-model:value="form.title" placeholder="如：Spring 事务传播机制详解" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="编程语言/技术栈">
              <a-select v-model:value="form.lang" allow-clear>
                <a-select-option v-for="o in langOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="记录日期">
              <a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="重要程度/标签">
              <a-input v-model:value="form.mood" placeholder="⭐⭐⭐ / 核心/常见坑/备忘" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="笔记内容">
              <a-textarea v-model:value="form.content" :rows="10" placeholder="支持 Markdown，可粘贴代码块" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.kb-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 8px;
}

/* 统计卡 */
.stat-row { margin: 0; }
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  transition: all 0.25s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--accent);
}
.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.stat-info { flex: 1; min-width: 0; }
.stat-value {
  font-size: 30px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}
.stat-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-left: 4px;
}
.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 6px;
}

/* section 标题 */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.title-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
}
.sub-count {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-left: 4px;
}
.search-wrap { display: flex; align-items: center; }

/* 分类卡片 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}
@media (max-width: 1100px) {
  .category-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .category-grid { grid-template-columns: repeat(2, 1fr); }
}
.category-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
}
.category-card:hover {
  transform: translateY(-3px);
  border-color: var(--cat-color);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}
.category-card.active {
  background: var(--cat-bg);
  border-color: var(--cat-color);
  box-shadow: 0 0 0 2px var(--cat-color) inset;
}
.cat-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  border-radius: 11px;
  background: var(--cat-color);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cat-bg);
  color: var(--cat-color);
  font-size: 22px;
}
.cat-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

/* 标签 Chips */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tag-chip {
  padding: 6px 16px;
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.tag-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.tag-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* 笔记列表 */
.note-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.note-card {
  display: flex;
  gap: 12px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  transition: all 0.25s ease;
}
.note-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}
.note-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.note-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.note-cat-tag {
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 10px;
  flex-shrink: 0;
}
.note-abstract {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.note-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lang-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 500;
}
.note-actions {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
.note-card:hover .note-actions {
  opacity: 1;
}

/* 空状态 */
.note-empty {
  padding: 60px 24px;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
}
.empty-icon { font-size: 56px; margin-bottom: 12px; }
.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}
.empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* AntD 深色适配 */
:deep(.ant-modal),
:deep(.ant-modal-title),
:deep(.ant-modal-content) {
  background: var(--color-bg-card);
  color: var(--color-text);
}
:deep(.ant-modal-header) {
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
}
:deep(.ant-modal-footer) {
  border-top: 1px solid var(--color-border);
}
:deep(.ant-form-item-label > label) {
  color: var(--color-text-secondary);
}
:deep(.ant-input),
:deep(.ant-select-selector),
:deep(.ant-input-number),
:deep(.ant-picker) {
  background: var(--color-bg-elevated) !important;
  border-color: var(--color-border-strong) !important;
  color: var(--color-text) !important;
}
:deep(.ant-input::placeholder) {
  color: var(--color-text-tertiary);
}
:deep(.ant-spin-nested-loading > div > .ant-spin .ant-spin-dot i) {
  background-color: var(--color-primary);
}
:deep(.ant-tag) {
  border: none !important;
}
</style>
