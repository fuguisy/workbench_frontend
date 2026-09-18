<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SwapOutlined,
  CalendarOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  FileZipOutlined,
  EnvironmentOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { backupApi, type BackupLog } from '@/api/modules'

type BackupStatus = 'success' | 'running' | 'pending' | 'failed'

const CATEGORY_COLOR: Record<string, string> = {
  '代码快照': '#0A84FF',
  '素材备份': '#BF5AF2',
  '模型文件': '#5E6AD2',
  '数据库': '#FF9F0A',
  '全量快照': '#34C759'
}

const DEST_COLOR: Record<string, string> = {
  '本地硬盘': '#34C759',
  'NAS': '#0A84FF',
  '阿里云': '#FF6B00',
  '腾讯云': '#0052D9',
  'OneDrive': '#0078D4',
  '百度网盘': '#2932E1'
}

const loading = ref(false)
const dataList = ref<BackupLog[]>([])
const searchKeyword = ref('')
const categoryFilter = ref<string>('')
const nowTick = ref(Date.now())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => { nowTick.value = Date.now() }, 60 * 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const statusOptions = [
  { label: '全部', value: '' },
  { label: '成功', value: 'success' },
  { label: '运行中', value: 'running' },
  { label: '待执行', value: 'pending' },
  { label: '失败', value: 'failed' }
]

const categoryOptions = [
  { label: '全部分类', value: '' },
  { label: '代码快照', value: '代码快照' },
  { label: '素材备份', value: '素材备份' },
  { label: '模型文件', value: '模型文件' },
  { label: '数据库', value: '数据库' },
  { label: '全量快照', value: '全量快照' }
]

const inferStatus = (b: BackupLog): BackupStatus => {
  const m = (b.mood || '').toLowerCase()
  const c = (b.content || '').toLowerCase()
  if (m.includes('失败') || m.includes('failed') || c.includes('损坏')) return 'failed'
  if (m.includes('进行中') || m.includes('running') || m.includes('上传中')) return 'running'
  if (m.includes('待执行') || m.includes('pending') || m.includes('待备份')) return 'pending'
  return 'success'
}

const getStatusMeta = (s: BackupStatus) => {
  const map: Record<BackupStatus, { label: string; color: string; bg: string; icon: any }> = {
    success: { label: '成功', color: '#34C759', bg: 'rgba(52,199,89,0.12)', icon: CheckCircleOutlined },
    running: { label: '运行中', color: '#5E6AD2', bg: 'rgba(94,106,210,0.12)', icon: SyncOutlined },
    pending: { label: '待执行', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)', icon: ClockCircleOutlined },
    failed: { label: '失败', color: '#FF453A', bg: 'rgba(255,69,58,0.12)', icon: WarningOutlined }
  }
  return map[s]
}

const inferProgress = (b: BackupLog): number => {
  const s = inferStatus(b)
  if (s === 'success') return 100
  if (s === 'failed') return 60 + (Math.abs((b.id ?? 0)) % 30)
  if (s === 'running') return 30 + (Math.abs((b.id ?? 0)) % 60)
  return 0
}

const inferNextRun = (b: BackupLog): string => {
  const cat = b.category || ''
  const base = b.date || b.createTime || dayjs().format('YYYY-MM-DD')
  const baseDate = dayjs(base)
  let next = baseDate
  if (cat === '数据库') next = baseDate.add(1, 'day')
  else if (cat === '代码快照') next = baseDate.add(3, 'day')
  else if (cat === '全量快照') next = baseDate.add(7, 'day')
  else if (cat === '模型文件') next = baseDate.add(14, 'day')
  else next = baseDate.add(2, 'day')
  if (next.isBefore(dayjs())) next = dayjs().add(1, 'day').hour(2).minute(0)
  return next.format('YYYY-MM-DD HH:mm')
}

const countdownText = (nextDate: string): string => {
  const n = dayjs(nextDate)
  const diff = n.valueOf() - nowTick.value
  if (diff <= 0) return '即将执行'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}天 ${hours}小时后`
  if (hours > 0) return `${hours}小时 ${mins}分钟后`
  return `${mins}分钟后`
}

const filteredList = computed(() => {
  return [...dataList.value]
    .sort((a, b) => dayjs(b.date || b.updateTime || 0).valueOf() - dayjs(a.date || a.updateTime || 0).valueOf())
    .filter(b => {
      if (searchKeyword.value) {
        const kw = searchKeyword.value.toLowerCase()
        const match =
          (b.title || '').toLowerCase().includes(kw) ||
          (b.content || '').toLowerCase().includes(kw) ||
          (b.destination || '').toLowerCase().includes(kw) ||
          (b.category || '').toLowerCase().includes(kw)
        if (!match) return false
      }
      if (categoryFilter.value && b.category !== categoryFilter.value) return false
      return true
    })
})

const stats = computed(() => {
  const list = dataList.value
  const totalSizeGb = list.reduce((s, b) => s + (Number(b.sizeGb ?? 0) || 0), 0)
  const thisMonthCount = list.filter(b => {
    const d = dayjs(b.date || b.createTime || 0)
    return d.isSame(dayjs(), 'month')
  }).length
  const remoteDests = ['阿里云', '腾讯云', 'OneDrive', '百度网盘', 'NAS']
  const hasRemote = list.some(b => remoteDests.includes(b.destination || ''))
  const remoteCount = list.filter(b => remoteDests.includes(b.destination || '')).length
  const remoteCoverage = list.length > 0 ? Math.round((remoteCount / list.length) * 100) : 0
  return {
    totalSizeGb: totalSizeGb.toFixed(1),
    thisMonthCount,
    remoteCoverage: hasRemote ? `${remoteCoverage}%` : '0%',
    remoteCount
  }
})

const modalVisible = ref(false)
const modalTitle = ref('新增备份记录')
const submitting = ref(false)
const editingId = ref<number | undefined>(undefined)

const categoryFormOptions = [
  { label: '代码仓库快照', value: '代码快照' },
  { label: '自媒体素材', value: '素材备份' },
  { label: 'AI模型文件', value: '模型文件' },
  { label: 'MySQL数据库dump', value: '数据库' },
  { label: '全量系统/硬盘快照', value: '全量快照' }
]
const destFormOptions = [
  { label: '本地硬盘', value: '本地硬盘' },
  { label: 'NAS 局域网存储', value: 'NAS' },
  { label: '阿里云 OSS', value: '阿里云' },
  { label: '腾讯云 COS', value: '腾讯云' },
  { label: 'OneDrive / 谷歌云盘', value: 'OneDrive' },
  { label: '百度网盘', value: '百度网盘' }
]

const form = reactive<BackupLog>({
  title: '',
  category: '代码快照',
  sizeGb: 0,
  destination: '本地硬盘',
  date: dayjs().format('YYYY-MM-DD'),
  mood: '✅MD5校验通过',
  content: ''
})

const resetForm = () => {
  form.title = ''
  form.category = '代码快照'
  form.sizeGb = 0
  form.destination = '本地硬盘'
  form.date = dayjs().format('YYYY-MM-DD')
  form.mood = '✅MD5校验通过'
  form.content = ''
  editingId.value = undefined
}

const openAdd = () => {
  resetForm()
  modalTitle.value = '新增备份记录'
  modalVisible.value = true
}

const openEdit = (b: BackupLog) => {
  resetForm()
  modalTitle.value = '编辑备份记录'
  editingId.value = b.id
  form.title = b.title
  form.category = b.category || '代码快照'
  form.sizeGb = b.sizeGb ?? 0
  form.destination = b.destination || '本地硬盘'
  form.date = b.date || ''
  form.mood = b.mood || ''
  form.content = b.content || ''
  modalVisible.value = true
}

const handleSubmit = async () => {
  if (!form.title.trim()) {
    message.warning('请输入备份名称')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await backupApi.update({ ...form, id: editingId.value })
      message.success('更新成功')
    } else {
      await backupApi.add({ ...form })
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

const handleDelete = (b: BackupLog) => {
  if (!b.id) return
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除备份「${b.title}」记录吗？（不影响实际备份文件）`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await backupApi.remove(b.id!)
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
    const res: any = await backupApi.list()
    dataList.value = Array.isArray(res) ? res : (res?.records ?? [])
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const formatSize = (gb?: number) => {
  const n = Number(gb ?? 0)
  if (n < 1) return `${(n * 1024).toFixed(0)} MB`
  if (n < 1024) return `${n.toFixed(2)} GB`
  return `${(n / 1024).toFixed(2)} TB`
}

const formatDate = (d?: string) => {
  if (!d) return '-'
  return dayjs(d).format('YYYY-MM-DD')
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="backup-page">
    <!-- 顶部3张统计卡 -->
    <div class="stats-row">
      <div class="stat-card big">
        <div class="stat-header">
          <div class="stat-icon" style="background: rgba(10,132,255,0.12); color:#0A84FF">
            <FileZipOutlined />
          </div>
          <div class="stat-trend positive">
            <SwapOutlined /> +2.4GB 较上周
          </div>
        </div>
        <div class="stat-value">{{ stats.totalSizeGb }}<span class="unit">GB</span></div>
        <div class="stat-label">已备份总大小</div>
        <div class="progress-mini">
          <div class="progress-track">
            <div class="progress-fill" style="width: 68%; background: linear-gradient(90deg, #0A84FF, #5E6AD2)"></div>
          </div>
          <div class="progress-label">
            <span>68%</span>
            <span>容量使用率</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon" style="background: rgba(52,199,89,0.12); color:#34C759">
            <CalendarOutlined />
          </div>
        </div>
        <div class="stat-value" style="color:#34C759">{{ stats.thisMonthCount }}<span class="unit">次</span></div>
        <div class="stat-label">本月备份次数</div>
        <div class="stat-sub">
          <span class="dot" style="background:#34C759"></span>
          本周 {{ Math.min(stats.thisMonthCount, 8) }} 次 · 日均 {{ stats.thisMonthCount > 0 ? (stats.thisMonthCount / 30).toFixed(1) : '0' }} 次
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon" style="background: rgba(94,106,210,0.12); color:#5E6AD2">
            <EnvironmentOutlined />
          </div>
        </div>
        <div class="stat-value" style="color:#5E6AD2">{{ stats.remoteCoverage }}</div>
        <div class="stat-label">异地备份覆盖</div>
        <div class="stat-sub">
          <span class="dot" style="background:#5E6AD2"></span>
          {{ stats.remoteCount }} 条异地 · 建议 3-2-1 策略
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="title-area">
        <h2 class="page-title">备份任务管理</h2>
        <span class="page-subtitle">共 {{ dataList.length }} 条备份记录 · {{ filteredList.length }} 匹配结果</span>
      </div>
      <div class="tools">
        <a-input
          v-model:value="searchKeyword"
          placeholder="搜索备份名 / 路径 / 存储地"
          allow-clear
          class="search"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select v-model:value="categoryFilter" :options="categoryOptions" style="width: 160px" />
        <a-button class="tool-btn" @click="fetchData"><ReloadOutlined /></a-button>
        <a-button type="primary" class="add-btn" @click="openAdd"><PlusOutlined /> 新建记录</a-button>
      </div>
    </div>

    <!-- 备份任务列表 -->
    <div class="list-wrap">
      <a-spin :spinning="loading" size="large">
        <div v-if="filteredList.length === 0 && !loading" class="empty">
          <div class="empty-icon"><InboxOutlined /></div>
          <div class="empty-title">暂无备份记录</div>
          <div class="empty-desc">点击右上角"新建记录"添加第一条备份台账</div>
        </div>
        <div v-else class="backup-list">
          <div
            v-for="b in filteredList"
            :key="b.id"
            class="backup-item"
          >
            <!-- 左侧：图标+分类 -->
            <div class="item-left">
              <div
                class="item-icon"
                :style="{
                  background: `${CATEGORY_COLOR[b.category || '代码快照'] || '#0A84FF'}1A`,
                  color: CATEGORY_COLOR[b.category || '代码快照'] || '#0A84FF',
                  borderColor: `${CATEGORY_COLOR[b.category || '代码快照'] || '#0A84FF'}33`
                }"
              >
                <component
                  :is="b.category === '数据库' ? DatabaseOutlined : b.category === '素材备份' ? FolderOpenOutlined : CloudServerOutlined"
                />
              </div>
              <div class="item-main">
                <div class="item-title-row">
                  <span class="item-title">{{ b.title }}</span>
                  <span
                    class="category-chip"
                    :style="{
                      background: `${CATEGORY_COLOR[b.category || '代码快照'] || '#0A84FF'}15`,
                      color: CATEGORY_COLOR[b.category || '代码快照'] || '#0A84FF'
                    }"
                  >
                    {{ b.category || '其他' }}
                  </span>
                </div>
                <div class="item-meta-row">
                  <span class="meta-item" :style="{ color: DEST_COLOR[b.destination || ''] || '#A1A1AA' }">
                    <EnvironmentOutlined /> {{ b.destination || '未指定' }}
                  </span>
                  <span class="meta-item">
                    <CalendarOutlined /> {{ formatDate(b.date || b.createTime) }}
                  </span>
                  <span class="meta-item size">
                    <FileZipOutlined /> {{ formatSize(b.sizeGb) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 中间：进度条 -->
            <div class="item-progress">
              <div class="progress-info">
                <span class="progress-label">进度</span>
                <span class="progress-val" :style="{ color: getStatusMeta(inferStatus(b)).color }">
                  {{ inferProgress(b) }}%
                </span>
              </div>
              <div class="progress-track-lg">
                <div
                  class="progress-fill-lg"
                  :style="{
                    width: `${inferProgress(b)}%`,
                    background: inferStatus(b) === 'failed'
                      ? 'linear-gradient(90deg, #FF453A, #FF6B6B)'
                      : inferStatus(b) === 'running'
                        ? 'linear-gradient(90deg, #5E6AD2, #7A85E0)'
                        : inferStatus(b) === 'pending'
                          ? 'linear-gradient(90deg, #FF9F0A, #FFB74D)'
                          : 'linear-gradient(90deg, #34C759, #30D158)'
                  }"
                  :class="{ running: inferStatus(b) === 'running' }"
                ></div>
              </div>
            </div>

            <!-- 状态 Chip -->
            <div class="item-status">
              <div
                class="status-chip"
                :style="{
                  background: getStatusMeta(inferStatus(b)).bg,
                  color: getStatusMeta(inferStatus(b)).color,
                  borderColor: `${getStatusMeta(inferStatus(b)).color}33`
                }"
              >
                <component
                  :is="getStatusMeta(inferStatus(b)).icon"
                  :class="{ spinning: inferStatus(b) === 'running' }"
                />
                {{ getStatusMeta(inferStatus(b)).label }}
              </div>
              <div class="next-run">
                <span class="next-label">下次执行</span>
                <div class="next-time">
                  <ClockCircleOutlined />
                  <span>{{ countdownText(inferNextRun(b)) }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：操作 -->
            <div class="item-actions">
              <a-button size="small" type="text" class="act-btn" @click="openEdit(b)">
                <EditOutlined />
              </a-button>
              <a-button size="small" type="text" danger class="act-btn" @click="handleDelete(b)">
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

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
        <a-form-item label="备份名称/说明" required>
          <a-input v-model:value="form.title" :maxlength="100" show-count placeholder="如：2026-08-01 工作项目代码全量快照" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="备份类型">
              <a-select v-model:value="form.category" :options="categoryFormOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="备份大小 (GB)">
              <a-input-number v-model:value="form.sizeGb" :min="0" :step="0.01" :precision="3" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="存储目的地">
              <a-select v-model:value="form.destination" :options="destFormOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="备份日期">
              <a-date-picker v-model:value="form.date" value-format="YYYY-MM-DD" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="校验状态/标签">
          <a-input v-model:value="form.mood" placeholder="✅MD5校验通过 / ❌损坏 / ⚠待异地备份 / 🔒加密" />
        </a-form-item>
        <a-form-item label="备份路径 / 解压密码 / MD5校验值">
          <a-textarea v-model:value="form.content" :rows="3" :maxlength="1000" show-count placeholder="如：D:\Backup\xxx.zip · 密码：xxx · MD5：xxx..." />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.backup-page {
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
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--spacing-lg);
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
}

.stat-card.big {
  background: linear-gradient(135deg, rgba(94,106,210,0.08) 0%, rgba(10,132,255,0.05) 100%);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.stat-trend {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stat-trend.positive {
  background: rgba(52,199,89,0.10);
  color: #34C759;
}

.stat-trend.negative {
  background: rgba(255,69,58,0.10);
  color: #FF453A;
}

.stat-value {
  font-size: 34px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
  letter-spacing: -1px;
}

.unit {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-left: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-sub {
  font-size: 11px;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: auto;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
}

.progress-mini {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-track {
  width: 100%;
  height: 5px;
  border-radius: var(--radius-full);
  background: rgba(161,161,170,0.15);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.4s ease;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-tertiary);
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

.search { width: 260px; }

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

.list-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.backup-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.backup-item {
  display: grid;
  grid-template-columns: 2fr 1.3fr 1.2fr auto;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-card-2);
  border: 1px solid var(--color-border);
  transition: all 0.2s;
}

.backup-item:hover {
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-card-hover);
}

.item-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

.item-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.item-meta-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.meta-item {
  font-size: 11px;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.meta-item.size {
  color: var(--color-text);
  font-weight: 600;
}

.item-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.progress-info .progress-label {
  color: var(--color-text-tertiary);
}

.progress-info .progress-val {
  font-weight: 700;
}

.progress-track-lg {
  width: 100%;
  height: 8px;
  border-radius: var(--radius-full);
  background: rgba(161,161,170,0.12);
  overflow: hidden;
}

.progress-fill-lg {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.5s ease;
}

.progress-fill-lg.running {
  animation: shimmer 2s infinite;
  background-size: 200% 100% !important;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.item-status {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid;
}

.next-run {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.next-label {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.next-time {
  font-size: 11px;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: rgba(161,161,170,0.05);
  border-radius: var(--radius-sm);
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
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  color: var(--color-text-disabled);
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
  .stats-row { grid-template-columns: 1fr 1fr; }
  .stat-card.big { grid-column: span 2; }
  .backup-item {
    grid-template-columns: 1fr 1fr;
  }
  .item-status { align-items: flex-start; }
  .item-actions { justify-self: end; }
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr; }
  .stat-card.big { grid-column: span 1; }
  .backup-item {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}
</style>
