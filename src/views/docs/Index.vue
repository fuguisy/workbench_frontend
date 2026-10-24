<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  FileTextOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  RiseOutlined, AuditOutlined, FileDoneOutlined,
  BookOutlined, BulbOutlined, RocketOutlined,
  ShopOutlined, VideoCameraOutlined, FormOutlined,
  EyeOutlined, ClockCircleOutlined, SearchOutlined,
  ReloadOutlined, FolderOutlined, ReadOutlined,
  BarsOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { docsApi, type Docs } from '@/api/modules'

const loading = ref(false)
const dataList = ref<Docs[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const docsCategoryList = [
  { key: '小说大纲', label: '小说大纲', icon: BookOutlined, color: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.15)' },
  { key: '小说章节', label: '小说章节', icon: FormOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' },
  { key: '口播稿', label: '短视频口播', icon: VideoCameraOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' },
  { key: '技术稿', label: '技术干货', icon: RocketOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '公众号', label: '公众号', icon: BulbOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: '其他', label: '其他文案', icon: FileTextOutlined, color: '#5E6AD2', bg: 'rgba(94, 106, 210, 0.15)' }
]
const docsTagList = ['高优先级', '已发布', '草稿', '🔥爆款选题', '10w+收藏', '待修改']

const docsCategoryColorMap: Record<string, string> = {
  '小说大纲': '#BF5AF2',
  '小说章节': '#FF375F',
  '口播稿': '#FF9F0A',
  '技术稿': '#0A84FF',
  '公众号': '#34C759',
  '其他': '#5E6AD2'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime || r.date
    return t && dayjs(t).isAfter(monthStart)
  }).length
  let totalWords = 0
  dataList.value.forEach(r => { totalWords += (r.wordCount || 0) })
  return { total, monthNew, totalWords }
})

const categoryCounts = computed(() => {
  const counts: Record<string, number> = {}
  docsCategoryList.forEach(c => { counts[c.key] = 0 })
  dataList.value.forEach(r => {
    const cat = r.category || '其他'
    if (counts[cat] !== undefined) counts[cat]++
    else counts['其他']++
  })
  return counts
})

const filteredList = computed(() => {
  return dataList.value.filter(r => {
    if (searchText.value) {
      const kw = searchText.value.toLowerCase()
      const title = (r.title || '').toLowerCase()
      const content = (r.content || '').toLowerCase()
      const mood = (r.mood || '').toLowerCase()
      if (!title.includes(kw) && !content.includes(kw) && !mood.includes(kw)) return false
    }
    if (selectedCategory.value && r.category !== selectedCategory.value) return false
    if (selectedTag.value) {
      const tag = selectedTag.value
      const mood = (r.mood || '').toLowerCase()
      if (tag === '高优先级' && !mood.includes('⭐') && !mood.includes('优先级') && !mood.includes('核心')) return false
      if (tag === '已发布' && !mood.includes('已发布') && !mood.includes('发布')) return false
      if (tag === '草稿' && !mood.includes('草稿') && !mood.includes('待修改') && !mood.includes('待完善')) return false
      if (tag === '🔥爆款选题' && !mood.includes('爆') && !mood.includes('热门') && !mood.includes('🔥')) return false
      if (tag === '10w+收藏' && !mood.includes('10w') && !mood.includes('收藏')) return false
      if (tag === '待修改' && !mood.includes('待修改') && !mood.includes('修改') && !mood.includes('需调整')) return false
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

const getAbstract = (r: Docs): string => {
  const text = (r.content || '').replace(/```[\s\S]*?```/g, '').replace(/[#*`>\-]/g, '').trim()
  return text.length > 140 ? text.substring(0, 140) + '...' : text
}

const getTimeText = (r: Docs): string => {
  const t = r.updateTime || r.createTime || r.date
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await docsApi.list()
    dataList.value = res || []
  } catch (e: any) {
    dataList.value = []
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<Docs>>({})
const formRules = {
  title: [{ required: true, message: '请输入稿件标题', trigger: 'blur' }]
}

const categoryOptions = [
  { label: '小说大纲 / 世界观设定', value: '小说大纲' },
  { label: '小说章节正文', value: '小说章节' },
  { label: '短视频口播稿', value: '口播稿' },
  { label: '技术干货原创稿', value: '技术稿' },
  { label: '公众号深度文章', value: '公众号' },
  { label: '其他文案', value: '其他' }
]

const openAdd = () => {
  isEdit.value = false
  form.title = ''
  form.category = '口播稿'
  form.date = dayjs().format('YYYY-MM-DD')
  form.wordCount = 0
  form.mood = ''
  form.content = ''
  delete form.id
  modalVisible.value = true
}

const openEdit = (r: Docs) => {
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
      await docsApi.update({ ...form } as Docs)
      message.success('更新成功')
    } else {
      await docsApi.add({ ...form } as Docs)
      message.success('新增成功')
    }
    modalVisible.value = false
    await loadData()
  } catch (e: any) {
    message.error(e?.message || '保存失败')
  }
}

const handleDelete = (r: Docs) => {
  Modal.confirm({
    title: `确认删除「${r.title}」？`,
    content: '删除后不可恢复',
    okType: 'danger',
    okText: '确认删除',
    cancelText: '取消',
    onOk: async () => {
      await docsApi.remove(r.id as number)
      message.success('已删除')
      await loadData()
    }
  })
}

const totalByCategory = computed(() => {
  const out: { label: string; count: number; color: string }[] = []
  docsCategoryList.forEach(c => {
    out.push({ label: c.label, count: categoryCounts.value[c.key] || 0, color: c.color })
  })
  return out
})
</script>

<template>
  <div class="docs-page">
    <div class="docs-sider">
      <div class="sider-header">
        <span class="sider-title"><FolderOutlined /> 稿件分类</span>
      </div>
      <div class="sider-search">
        <a-input
          v-model:value="searchText"
          placeholder="搜索稿件"
          allow-clear
          size="small"
        >
          <template #prefix><SearchOutlined style="color:var(--color-text-tertiary)" /></template>
        </a-input>
      </div>
      <div class="sider-list">
        <div
          class="sider-item"
          :class="{ active: !selectedCategory }"
          @click="selectedCategory = null"
        >
          <BarsOutlined class="si-icon" style="color:#5E6AD2" />
          <span class="si-label">全部稿件</span>
          <span class="si-count" style="background:rgba(94,106,210,0.2);color:#5E6AD2">{{ dataList.length }}</span>
        </div>
        <div
          v-for="cat in docsCategoryList"
          :key="cat.key"
          class="sider-item"
          :class="{ active: selectedCategory === cat.key }"
          @click="selectedCategory = selectedCategory === cat.key ? null : cat.key"
        >
          <component :is="cat.icon" class="si-icon" :style="{ color: cat.color }" />
          <span class="si-label">{{ cat.label }}</span>
          <span
            class="si-count"
            :style="{ background: cat.bg, color: cat.color }"
          >
            {{ categoryCounts[cat.key] || 0 }}
          </span>
        </div>
      </div>
      <div class="sider-actions">
        <a-button type="primary" block @click="openAdd">
          <PlusOutlined /> 新建稿件
        </a-button>
      </div>
    </div>

    <div class="docs-main">
      <div class="main-inner">
        <a-row :gutter="16" class="stat-row">
          <a-col :xs="24" :sm="8">
            <div class="stat-card" :style="{ '--accent': '#5E6AD2', '--accent-soft': 'rgba(94, 106, 210, 0.15)' }">
              <div class="stat-icon"><FileDoneOutlined /></div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total }}<span class="stat-unit">篇</span></div>
                <div class="stat-label">稿件总数</div>
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
                <div class="stat-value">{{ (stats.totalWords / 1000).toFixed(1) }}<span class="stat-unit">K字</span></div>
                <div class="stat-label">累计字数</div>
              </div>
            </div>
          </a-col>
        </a-row>

        <div class="section-title">
          <span class="title-text">稿件分类概览</span>
          <div class="section-actions">
            <a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button>
          </div>
        </div>
        <div class="category-grid">
          <div
            v-for="cat in docsCategoryList"
            :key="cat.key"
            class="category-card"
            :class="{ active: selectedCategory === cat.key }"
            :style="{ '--cat-color': cat.color, '--cat-bg': cat.bg }"
            @click="selectedCategory = selectedCategory === cat.key ? null : cat.key"
          >
            <div class="cat-badge">{{ categoryCounts[cat.key] || 0 }}</div>
            <div class="cat-icon"><component :is="cat.icon" /></div>
            <div class="cat-label">{{ cat.label }}</div>
          </div>
        </div>

        <div class="section-title">
          <span class="title-text">
            <BookOutlined style="color:#5E6AD2;margin-right:6px" />
            {{ selectedCategory ? (docsCategoryList.find(c => c.key === selectedCategory)?.label || '稿件') : '全部稿件' }}
            <span class="sub-count">({{ sortedList.length }} 篇)</span>
          </span>
        </div>
        <div class="tag-row">
          <div
            v-for="tag in docsTagList"
            :key="tag"
            class="tag-chip"
            :class="{ active: selectedTag === tag }"
            @click="selectedTag = selectedTag === tag ? null : tag"
          >
            {{ tag }}
          </div>
        </div>

        <a-spin :spinning="loading" tip="加载中...">
          <div v-if="sortedList.length" class="card-list">
            <div
              v-for="r in sortedList"
              :key="r.id"
              class="item-card"
            >
              <div class="item-main" @click="openEdit(r)">
                <div class="item-head">
                  <h4 class="item-title">{{ r.title }}</h4>
                  <Tag
                    :color="docsCategoryColorMap[r.category || '其他'] || '#5E6AD2'"
                    class="item-cat-tag"
                  >
                    {{ r.category || '其他' }}
                  </Tag>
                </div>
                <div class="item-abstract">{{ getAbstract(r) || '暂无内容摘要，点击编辑详情' }}</div>
                <div class="item-meta">
                  <span class="meta-item"><ClockCircleOutlined /> {{ getTimeText(r) }}</span>
                  <span v-if="r.wordCount" class="meta-item"><ReadOutlined /> {{ r.wordCount }} 字</span>
                  <span v-if="r.date" class="meta-item">📅 目标：{{ r.date }}</span>
                  <span v-if="r.mood" class="meta-item mood-tag">{{ r.mood }}</span>
                </div>
              </div>
              <div class="item-actions" @click.stop>
                <Tooltip title="编辑">
                  <a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button>
                </Tooltip>
                <Tooltip title="删除">
                  <a-button type="text" size="small" danger @click="handleDelete(r)"><DeleteOutlined /></a-button>
                </Tooltip>
              </div>
            </div>
          </div>
          <div v-else class="empty-card">
            <div class="empty-icon">✍️</div>
            <div class="empty-title">暂无稿件</div>
            <div class="empty-desc">点击左侧「新建稿件」或下方按钮开始创作</div>
            <a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建稿件</a-button>
          </div>
        </a-spin>
      </div>
    </div>

    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑稿件' : '新建稿件'"
      ok-text="保存"
      cancel-text="取消"
      :width="760"
      @ok="saveForm"
      :destroyOnClose="true"
    >
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="稿件标题" name="title">
              <a-input v-model:value="form.title" placeholder="如：第一章 龙裔觉醒 / Vue3 组合式 API 深度解析" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="稿件分类">
              <a-select v-model:value="form.category">
                <a-select-option v-for="o in categoryOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="字数统计">
              <a-input-number v-model:value="form.wordCount" :min="0" style="width:100%" placeholder="可选：实际字数" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="目标/完成日期">
              <a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="质量评分/发布状态">
              <a-input v-model:value="form.mood" placeholder="⭐⭐⭐⭐⭐ / 已发布 / 待修改 / 🔥爆款选题" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="稿件正文内容">
              <a-textarea v-model:value="form.content" :rows="12" placeholder="粘贴或输入你的稿件内容，支持 Markdown" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.docs-page { display: flex; flex: 1; min-height: 0; overflow: hidden; }

.docs-sider {
  width: 260px; flex-shrink: 0; border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column; background: var(--color-bg-card);
}
.sider-header {
  padding: 16px 18px 12px;
  font-weight: 600;
  font-size: 15px;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}
.sider-search { padding: 0 16px 14px; }
.sider-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sider-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--color-text-secondary);
}
.sider-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}
.sider-item.active {
  background: var(--color-primary-soft);
  color: var(--color-text);
  font-weight: 500;
}
.si-icon { font-size: 16px; flex-shrink: 0; }
.si-label { flex: 1; font-size: 13px; }
.si-count {
  min-width: 22px;
  height: 20px;
  padding: 0 7px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
}
.sider-actions {
  padding: 12px 16px 18px;
  border-top: 1px solid var(--color-border);
}

.docs-main { flex: 1; overflow: hidden; min-height: 0; background: var(--color-bg); }
.main-inner {
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-row { margin: 0; }
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
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
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}
.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.stat-info { flex: 1; min-width: 0; }
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}
.stat-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-left: 3px;
}
.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 5px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
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
.section-actions { display: flex; gap: 8px; }

.category-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
@media (max-width: 1300px) {
  .category-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 720px) {
  .category-grid { grid-template-columns: repeat(2, 1fr); }
}
.category-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
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
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
}
.category-card.active {
  background: var(--cat-bg);
  border-color: var(--cat-color);
  box-shadow: 0 0 0 2px var(--cat-color) inset;
}
.cat-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--cat-color);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cat-bg);
  color: var(--cat-color);
  font-size: 20px;
}
.cat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tag-chip {
  padding: 5px 14px;
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
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

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.item-card {
  display: flex;
  gap: 10px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  transition: all 0.25s ease;
}
.item-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}
.item-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.item-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.item-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.item-cat-tag {
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 10px;
  flex-shrink: 0;
}
.item-abstract {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.75;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.item-meta {
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
.mood-tag {
  padding: 2px 10px;
  border-radius: 4px;
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-weight: 500;
}
.item-actions {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
.item-card:hover .item-actions { opacity: 1; }

.empty-card {
  padding: 64px 24px;
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
  margin-bottom: 5px;
}
.empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

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
:deep(.ant-tag) { border: none !important; }
:deep(.ant-btn-text) {
  color: var(--color-text-secondary) !important;
}
:deep(.ant-btn-text:hover) {
  color: var(--color-text) !important;
  background: var(--color-bg-hover) !important;
}
</style>
