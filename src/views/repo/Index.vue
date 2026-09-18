<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GithubOutlined,
  GitlabOutlined,
  SearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
  LinkOutlined,
  CodeOutlined,
  FolderOpenOutlined,
  DatabaseOutlined,
  RobotOutlined,
  AppstoreOutlined,
  BranchesOutlined,
  GlobalOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { repoApi, type Repo } from '@/api/modules'

type RepoStatus = '维护中' | '已上线' | '暂停' | '开发中'

interface StatusMeta {
  label: RepoStatus
  color: string
  bg: string
  border: string
}

const STATUS_META: Record<string, StatusMeta> = {
  '维护中': { label: '维护中', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)', border: 'rgba(10,132,255,0.30)' },
  '已上线': { label: '已上线', color: '#34C759', bg: 'rgba(52,199,89,0.12)', border: 'rgba(52,199,89,0.30)' },
  '暂停': { label: '暂停', color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.30)' },
  '开发中': { label: '开发中', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)', border: 'rgba(255,159,10,0.30)' }
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: any }> = {
  'Java后端': { label: 'Java后端', color: '#FF453A', icon: CodeOutlined },
  '前端项目': { label: '前端项目', color: '#0A84FF', icon: GlobalOutlined },
  '全栈项目': { label: '全栈项目', color: '#5E6AD2', icon: AppstoreOutlined },
  'AI工程': { label: 'AI工程', color: '#BF5AF2', icon: RobotOutlined },
  '数据库脚本': { label: '数据库脚本', color: '#FF9F0A', icon: DatabaseOutlined },
  '其他': { label: '其他', color: '#A1A1AA', icon: FolderOpenOutlined }
}

const loading = ref(false)
const dataList = ref<Repo[]>([])
const searchKeyword = ref('')
const categoryFilter = ref<string>('')
const statusFilter = ref<string>('')

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '维护中', value: '维护中' },
  { label: '已上线', value: '已上线' },
  { label: '暂停', value: '暂停' },
  { label: '开发中', value: '开发中' }
]

const categoryOptions = [
  { label: '全部分类', value: '' },
  { label: 'Java后端', value: 'Java后端' },
  { label: '前端项目', value: '前端项目' },
  { label: '全栈项目', value: '全栈项目' },
  { label: 'AI工程', value: 'AI工程' },
  { label: '数据库脚本', value: '数据库脚本' },
  { label: '其他', value: '其他' }
]

const inferStatus = (r: Repo): RepoStatus => {
  const mood = (r.mood || '').toLowerCase()
  const content = (r.content || '').toLowerCase()
  if (mood.includes('暂停') || mood.includes('stop') || content.includes('暂停')) return '暂停'
  if (mood.includes('上线') || mood.includes('prod') || mood.includes('已上线') || content.includes('已上线')) return '已上线'
  if (mood.includes('维护') || mood.includes('迭代') || content.includes('维护')) return '维护中'
  if (mood.includes('开发') || mood.includes('doing') || mood.includes('wip') || content.includes('开发中')) return '开发中'
  return '维护中'
}

const getStatusMeta = (r: Repo): StatusMeta => STATUS_META[inferStatus(r)]

const getCategoryMeta = (cat?: string) => {
  const key = cat && CATEGORY_META[cat] ? cat : '其他'
  return CATEGORY_META[key]
}

const filteredList = computed(() => {
  return dataList.value.filter(r => {
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      const match =
        (r.title || '').toLowerCase().includes(kw) ||
        (r.repo || '').toLowerCase().includes(kw) ||
        (r.content || '').toLowerCase().includes(kw) ||
        (r.category || '').toLowerCase().includes(kw)
      if (!match) return false
    }
    if (categoryFilter.value && r.category !== categoryFilter.value) return false
    if (statusFilter.value && inferStatus(r) !== statusFilter.value) return false
    return true
  })
})

const stats = computed(() => {
  const total = dataList.value.length
  const online = dataList.value.filter(r => inferStatus(r) === '已上线').length
  const dev = dataList.value.filter(r => inferStatus(r) === '开发中').length
  const maintain = dataList.value.filter(r => inferStatus(r) === '维护中').length
  const paused = dataList.value.filter(r => inferStatus(r) === '暂停').length
  return { total, online, dev, maintain, paused }
})

const modalVisible = ref(false)
const modalTitle = ref('新增仓库')
const submitting = ref(false)
const editingId = ref<number | undefined>(undefined)

const formCategoryOptions = [
  { label: 'Java后端项目', value: 'Java后端' },
  { label: '前端项目', value: '前端项目' },
  { label: '全栈项目', value: '全栈项目' },
  { label: 'AI工程/Agent', value: 'AI工程' },
  { label: 'SQL脚本库', value: '数据库脚本' },
  { label: '其他工程', value: '其他' }
]

const form = reactive<Repo>({
  title: '',
  category: '前端项目',
  repo: '',
  branch: 'main',
  date: '',
  mood: '维护中',
  content: ''
})

const resetForm = () => {
  form.title = ''
  form.category = '前端项目'
  form.repo = ''
  form.branch = 'main'
  form.date = dayjs().format('YYYY-MM-DD')
  form.mood = '维护中'
  form.content = ''
  editingId.value = undefined
}

const openAdd = () => {
  resetForm()
  modalTitle.value = '新增仓库'
  modalVisible.value = true
}

const openEdit = (r: Repo) => {
  resetForm()
  modalTitle.value = '编辑仓库'
  editingId.value = r.id
  form.title = r.title
  form.category = r.category || '其他'
  form.repo = r.repo || ''
  form.branch = r.branch || 'main'
  form.date = r.date || ''
  form.mood = r.mood || ''
  form.content = r.content || ''
  modalVisible.value = true
}

const handleSubmit = async () => {
  if (!form.title.trim()) {
    message.warning('请输入项目名称')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await repoApi.update({ ...form, id: editingId.value })
      message.success('更新成功')
    } else {
      await repoApi.add({ ...form })
      message.success('添加成功')
    }
    modalVisible.value = false
    await fetchData()
  } catch {
    // ignore
  } finally {
    submitting.value = false
  }
}

const handleDelete = (r: Repo) => {
  if (!r.id) return
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除仓库「${r.title}」吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await repoApi.remove(r.id!)
        message.success('删除成功')
        await fetchData()
      } catch {
        // ignore
      }
    }
  })
}

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await repoApi.list()
    dataList.value = Array.isArray(res) ? res : (res?.records ?? [])
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const formatDate = (d?: string) => {
  if (!d) return '-'
  return dayjs(d).format('YYYY-MM-DD')
}

const openRepo = (r: Repo) => {
  if (r.repo) {
    window.open(r.repo.startsWith('http') ? r.repo : `https://${r.repo}`, '_blank')
  } else {
    message.warning('未配置仓库地址')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="repo-page">
    <!-- 顶部统计 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(94,106,210,0.12); color:#5E6AD2">
          <FolderOpenOutlined />
        </div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.total }}</div>
          <div class="stat-label">项目总数</div>
        </div>
        <div class="stat-badge" style="background: rgba(94,106,210,0.12); color:#5E6AD2">ALL</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(52,199,89,0.12); color:#34C759">
          <GlobalOutlined />
        </div>
        <div class="stat-info">
          <div class="stat-num" style="color:#34C759">{{ stats.online }}</div>
          <div class="stat-label">已上线</div>
        </div>
        <div class="stat-badge" style="background: rgba(52,199,89,0.12); color:#34C759">ONLINE</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(255,159,10,0.12); color:#FF9F0A">
          <CodeOutlined />
        </div>
        <div class="stat-info">
          <div class="stat-num" style="color:#FF9F0A">{{ stats.dev }}</div>
          <div class="stat-label">开发中</div>
        </div>
        <div class="stat-badge" style="background: rgba(255,159,10,0.12); color:#FF9F0A">DEV</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(10,132,255,0.12); color:#0A84FF">
          <BranchesOutlined />
        </div>
        <div class="stat-info">
          <div class="stat-num" style="color:#0A84FF">{{ stats.maintain }}</div>
          <div class="stat-label">维护中</div>
        </div>
        <div class="stat-badge" style="background: rgba(161,161,170,0.12); color:#A1A1AA">暂停 {{ stats.paused }}</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="title-area">
        <h2 class="page-title">项目 & 代码仓库</h2>
        <span class="page-subtitle">共 {{ dataList.length }} 个仓库 · {{ filteredList.length }} 个匹配</span>
      </div>
      <div class="tools">
        <a-input
          v-model:value="searchKeyword"
          placeholder="搜索项目名 / 仓库地址"
          allow-clear
          class="search"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select v-model:value="categoryFilter" :options="categoryOptions" style="width: 150px" />
        <a-select v-model:value="statusFilter" :options="statusOptions" style="width: 130px" />
        <a-button class="tool-btn" @click="fetchData"><ReloadOutlined /></a-button>
        <a-button type="primary" class="add-btn" @click="openAdd"><PlusOutlined /> 新增</a-button>
      </div>
    </div>

    <!-- 卡片网格 -->
    <a-spin :spinning="loading" size="large">
      <div class="card-grid">
        <div
          v-for="repo in filteredList"
          :key="repo.id"
          class="repo-card"
        >
          <!-- 状态角标 -->
          <div
            class="status-badge"
            :style="{
              background: getStatusMeta(repo).bg,
              color: getStatusMeta(repo).color,
              borderColor: getStatusMeta(repo).border
            }"
          >
            <span class="status-dot" :style="{ background: getStatusMeta(repo).color }"></span>
            {{ getStatusMeta(repo).label }}
          </div>

          <!-- 顶部：图标+分类 -->
          <div class="card-top">
            <div
              class="repo-icon"
              :style="{
                background: `${getCategoryMeta(repo.category).color}1A`,
                borderColor: `${getCategoryMeta(repo.category).color}33`
              }"
            >
              <component
                :is="getCategoryMeta(repo.category).icon"
                :style="{ color: getCategoryMeta(repo.category).color }"
              />
            </div>
            <div
              class="category-tag"
              :style="{
                background: `${getCategoryMeta(repo.category).color}15`,
                color: getCategoryMeta(repo.category).color
              }"
            >
              {{ getCategoryMeta(repo.category).label }}
            </div>
          </div>

          <!-- 中间：标题+描述 -->
          <div class="card-body">
            <div class="repo-title">{{ repo.title }}</div>
            <div class="repo-desc">{{ repo.content || '暂无项目说明，点击编辑补充文档/依赖/环境信息...' }}</div>
          </div>

          <!-- Meta -->
          <div class="card-meta">
            <div class="meta-item">
              <BranchesOutlined />
              <span>{{ repo.branch || 'main' }}</span>
            </div>
            <div class="meta-item">
              <CalendarOutlined />
              <span>{{ formatDate(repo.date || repo.updateTime) }}</span>
            </div>
          </div>

          <!-- 底部：操作按钮 -->
          <div class="card-footer">
            <a-button
              class="repo-link-btn"
              :disabled="!repo.repo"
              @click="openRepo(repo)"
            >
              <template #icon>
                <component :is="repo.repo?.includes('gitlab') ? GitlabOutlined : GithubOutlined" />
              </template>
              仓库地址
              <LinkOutlined class="ext-icon" />
            </a-button>
            <div class="actions">
              <a-button size="small" type="text" class="act-btn" @click="openEdit(repo)">
                <EditOutlined />
              </a-button>
              <a-button size="small" type="text" danger class="act-btn" @click="handleDelete(repo)">
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
        </div>

        <div v-if="filteredList.length === 0 && !loading" class="empty">
          <div class="empty-icon">📦</div>
          <div class="empty-title">暂无匹配的仓库</div>
          <div class="empty-desc">尝试更换筛选条件，或点击新增创建一个仓库</div>
        </div>
      </div>
    </a-spin>

    <!-- 弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="submitting"
      :width="640"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="项目/仓库名称" required>
          <a-input v-model:value="form.title" placeholder="如：workbench-frontend" :maxlength="100" show-count />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="项目分类">
              <a-select v-model:value="form.category" :options="formCategoryOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="默认分支">
              <a-input v-model:value="form.branch" placeholder="main / master / dev" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Git 仓库地址">
          <a-input v-model:value="form.repo" placeholder="https://github.com/xxx/xxx.git 或 git@xxx" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="创建/最近更新日期">
              <a-date-picker
                v-model:value="form.date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="项目状态/标签">
              <a-select
                v-model:value="form.mood"
                allow-clear
                placeholder="选择状态（可自定义文本）"
                :options="[
                  { label: '维护中', value: '维护中' },
                  { label: '开发中', value: '开发中' },
                  { label: '已上线', value: '已上线' },
                  { label: '暂停', value: '暂停' }
                ]"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="项目说明 / 文档 / 依赖环境">
          <a-textarea
            v-model:value="form.content"
            :rows="4"
            placeholder="项目简介、技术栈、接口文档、部署命令、环境变量..."
            :maxlength="1000"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.repo-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  position: relative;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-num {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.stat-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  letter-spacing: 0.5px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.title-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.tools {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.search {
  width: 260px;
}

.tool-btn {
  background: var(--color-bg-card-2);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 36px;
  padding: 0 !important;
}

.tool-btn:hover {
  border-color: var(--color-border-strong) !important;
  color: var(--color-text) !important;
}

.add-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.add-btn:hover {
  background: var(--color-primary-hover) !important;
  border-color: var(--color-primary-hover) !important;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  align-content: flex-start;
}

.repo-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  position: relative;
  transition: all 0.25s;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-height: 240px;
}

.repo-card:hover {
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.status-badge {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 80px;
}

.repo-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.category-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-full);
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.repo-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.repo-desc {
  font-size: 12px;
  color: var(--color-text-tertiary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-sm) 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
}

.repo-link-btn {
  background: var(--color-bg-card-2);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
  height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.repo-link-btn:hover {
  border-color: var(--color-primary) !important;
  color: var(--color-primary) !important;
  background: var(--color-primary-soft) !important;
}

.ext-icon {
  font-size: 10px;
  opacity: 0.7;
}

.actions {
  display: flex;
  gap: 2px;
}

.act-btn {
  color: var(--color-text-tertiary);
  padding: 0 6px !important;
}

.act-btn:hover {
  color: var(--color-text) !important;
  background: var(--color-bg-hover) !important;
}

.empty {
  grid-column: 1 / -1;
  padding: 60px 20px;
  text-align: center;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
