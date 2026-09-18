<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  TagOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  getTodoList,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodoDone,
  type Todo
} from '@/api/todo'

type KanbanStatus = 'todo' | 'doing' | 'review' | 'done'

interface KanbanColumn {
  key: KanbanStatus
  title: string
  accent: string
  soft: string
  countAccent: string
}

const loading = ref(false)
const dataList = ref<Todo[]>([])
const searchKeyword = ref('')

const dragItem = ref<Todo | null>(null)
const dragOverCol = ref<KanbanStatus | null>(null)

const columns: KanbanColumn[] = [
  { key: 'todo', title: '待办', accent: '#A1A1AA', soft: 'rgba(161,161,170,0.10)', countAccent: '#A1A1AA' },
  { key: 'doing', title: '进行中', accent: '#5E6AD2', soft: 'rgba(94,106,210,0.12)', countAccent: '#5E6AD2' },
  { key: 'review', title: '评审', accent: '#FF9F0A', soft: 'rgba(255,159,10,0.12)', countAccent: '#FF9F0A' },
  { key: 'done', title: '已完成', accent: '#34C759', soft: 'rgba(52,199,89,0.12)', countAccent: '#34C759' }
]

const priorityMeta: Record<string, { label: string; color: string; soft: string }> = {
  P0: { label: 'P0', color: '#FF453A', soft: 'rgba(255,69,58,0.15)' },
  P1: { label: 'P1', color: '#FF9F0A', soft: 'rgba(255,159,10,0.15)' },
  P2: { label: 'P2', color: '#0A84FF', soft: 'rgba(10,132,255,0.15)' },
  P3: { label: 'P3', color: '#A1A1AA', soft: 'rgba(161,161,170,0.15)' },
  high: { label: '高', color: '#FF453A', soft: 'rgba(255,69,58,0.15)' },
  medium: { label: '中', color: '#FF9F0A', soft: 'rgba(255,159,10,0.15)' },
  low: { label: '低', color: '#0A84FF', soft: 'rgba(10,132,255,0.15)' }
}

const categoryMeta: Record<string, { label: string; color: string }> = {
  work: { label: '工作', color: '#5E6AD2' },
  study: { label: '学习', color: '#0A84FF' },
  life: { label: '生活', color: '#34C759' },
  other: { label: '其他', color: '#A1A1AA' }
}

const todoStatusMap = (t: Todo): KanbanStatus => {
  if (t.done === 1) return 'done'
  const note = (t.note || '').toLowerCase()
  const cat = (t.category || '').toLowerCase()
  const title = (t.title || '').toLowerCase()
  if (note.includes('review') || note.includes('评审') || cat.includes('review') || title.includes('review')) return 'review'
  if (note.includes('doing') || note.includes('进行') || note.includes('开发') || cat.includes('doing') || (t.pomoCount ?? 0) > 0) return 'doing'
  return 'todo'
}

const statusFromKanban = (k: KanbanStatus): Partial<Todo> => {
  if (k === 'done') return { done: 1 }
  if (k === 'review') return { done: 0, note: '评审中' }
  if (k === 'doing') return { done: 0, note: '进行中' }
  return { done: 0, note: '' }
}

const stats = computed(() => {
  const total = filteredAll.value.length
  const todoCount = filteredAll.value.filter(t => todoStatusMap(t) === 'todo').length
  const doing = filteredAll.value.filter(t => todoStatusMap(t) === 'doing').length
  const review = filteredAll.value.filter(t => todoStatusMap(t) === 'review').length
  const done = filteredAll.value.filter(t => todoStatusMap(t) === 'done').length
  const overdue = filteredAll.value.filter(t => {
    if (!t.deadline || todoStatusMap(t) === 'done') return false
    return dayjs(t.deadline).isBefore(dayjs(), 'day')
  }).length
  return { total, todoCount, doing, review, done, overdue }
})

const filteredAll = computed(() => {
  if (!searchKeyword.value) return dataList.value
  const kw = searchKeyword.value.toLowerCase()
  return dataList.value.filter(t =>
    (t.title || '').toLowerCase().includes(kw) ||
    (t.note || '').toLowerCase().includes(kw) ||
    (t.category || '').toLowerCase().includes(kw)
  )
})

const columnData = computed(() => {
  const map: Record<KanbanStatus, Todo[]> = { todo: [], doing: [], review: [], done: [] }
  filteredAll.value.forEach(t => map[todoStatusMap(t)].push(t))
  return map
})

const modalVisible = ref(false)
const modalTitle = ref('新增任务')
const submitting = ref(false)
const editingId = ref<number | undefined>(undefined)

const priorityOptions = [
  { label: 'P0 紧急', value: 'P0' },
  { label: 'P1 高', value: 'P1' },
  { label: 'P2 中', value: 'P2' },
  { label: 'P3 低', value: 'P3' },
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' }
]

const categoryOptions = [
  { label: '工作', value: 'work' },
  { label: '学习', value: 'study' },
  { label: '生活', value: 'life' },
  { label: '其他', value: 'other' }
]

const recurringOptions = [
  { label: '不循环', value: 'none' },
  { label: '每日', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' }
]

const form = reactive<Todo>({
  title: '',
  priority: 'P2',
  done: 0,
  note: '',
  category: 'work',
  deadline: '',
  recurring: 'none',
  estPom: 1,
  pomoCount: 0,
  pomoMinutes: 0
})

const resetForm = () => {
  form.title = ''
  form.priority = 'P2'
  form.done = 0
  form.note = ''
  form.category = 'work'
  form.deadline = ''
  form.recurring = 'none'
  form.estPom = 1
  form.pomoCount = 0
  form.pomoMinutes = 0
  editingId.value = undefined
}

const openAdd = () => {
  resetForm()
  modalTitle.value = '新增任务'
  modalVisible.value = true
}

const openEdit = (record: Todo) => {
  resetForm()
  modalTitle.value = '编辑任务'
  editingId.value = record.id
  form.title = record.title
  form.priority = record.priority
  form.done = record.done
  form.note = record.note || ''
  form.category = record.category || 'work'
  form.deadline = record.deadline || ''
  form.recurring = record.recurring || 'none'
  form.estPom = record.estPom ?? 1
  form.pomoCount = record.pomoCount ?? 0
  form.pomoMinutes = record.pomoMinutes ?? 0
  modalVisible.value = true
}

const handleSubmit = async () => {
  if (!form.title.trim()) {
    message.warning('请输入任务标题')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await updateTodo({ ...form, id: editingId.value })
      message.success('更新成功')
    } else {
      await addTodo({ ...form })
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

const handleDelete = (record: Todo) => {
  if (!record.id) return
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除任务「${record.title}」吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteTodo(record.id!)
        message.success('删除成功')
        await fetchData()
      } catch {
        // ignore
      }
    }
  })
}

const handleToggle = async (record: Todo) => {
  if (!record.id) return
  try {
    await toggleTodoDone(record.id!)
    message.success(record.done === 1 ? '已标记为未完成' : '已完成')
    await fetchData()
  } catch {
    // ignore
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getTodoList()
    dataList.value = Array.isArray(res) ? res : (res?.records ?? [])
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const onDragStart = (t: Todo) => {
  dragItem.value = t
}
const onDragOver = (e: DragEvent, col: KanbanStatus) => {
  e.preventDefault()
  dragOverCol.value = col
}
const onDragLeave = () => {
  dragOverCol.value = null
}
const onDrop = async (col: KanbanStatus) => {
  const item = dragItem.value
  dragItem.value = null
  dragOverCol.value = null
  if (!item) return
  const currentStatus = todoStatusMap(item)
  if (currentStatus === col) return
  try {
    await updateTodo({ ...item, ...statusFromKanban(col) })
    message.success(`已移动到「${columns.find(c => c.key === col)?.title}」`)
    await fetchData()
  } catch {
    // ignore
  }
}

const formatDeadline = (date?: string) => {
  if (!date) return null
  const d = dayjs(date)
  const today = dayjs().startOf('day')
  const diff = d.startOf('day').diff(today, 'day')
  let text = d.format('MM-DD')
  let cls = 'deadline-normal'
  if (diff < 0) { text = `逾期 ${Math.abs(diff)}天`; cls = 'deadline-overdue' }
  else if (diff === 0) { text = '今天截止'; cls = 'deadline-today' }
  else if (diff === 1) { text = '明天截止'; cls = 'deadline-today' }
  else if (diff <= 3) { cls = 'deadline-soon' }
  return { text, cls }
}

const getPriority = (p: string) => priorityMeta[p] || priorityMeta.medium
const getCategory = (c?: string) => categoryMeta[c || 'other'] || categoryMeta.other

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="kanban-page">
    <!-- 顶部统计卡 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-left">
          <div class="stat-label">总任务数</div>
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-sub">
            <span class="dot" style="background:#A1A1AA"></span>
            待办 {{ stats.todoCount }}
          </div>
        </div>
        <div class="stat-icon-wrap" style="background: rgba(161,161,170,0.12); color:#A1A1AA">
          <ClockCircleOutlined />
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-left">
          <div class="stat-label">进行中</div>
          <div class="stat-value" style="color:#5E6AD2">{{ stats.doing }}</div>
          <div class="stat-sub">
            <span class="dot" style="background:#5E6AD2"></span>
            推进中
          </div>
        </div>
        <div class="stat-icon-wrap" style="background: rgba(94,106,210,0.12); color:#5E6AD2">
          <EditOutlined />
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-left">
          <div class="stat-label">评审中</div>
          <div class="stat-value" style="color:#FF9F0A">{{ stats.review }}</div>
          <div class="stat-sub">
            <span class="dot" style="background:#FF9F0A"></span>
            等待确认
          </div>
        </div>
        <div class="stat-icon-wrap" style="background: rgba(255,159,10,0.12); color:#FF9F0A">
          <FilterOutlined />
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-left">
          <div class="stat-label">已完成</div>
          <div class="stat-value" style="color:#34C759">{{ stats.done }}</div>
          <div class="stat-sub">
            <span class="dot" style="background:#34C759"></span>
            逾期 {{ stats.overdue }}
          </div>
        </div>
        <div class="stat-icon-wrap" style="background: rgba(52,199,89,0.12); color:#34C759">
          <PlusOutlined />
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="page-title-row">
          <h2 class="page-title">任务看板</h2>
          <span class="page-desc">拖拽卡片在列间切换状态</span>
        </div>
      </div>
      <div class="toolbar-right">
        <a-input
          v-model:value="searchKeyword"
          placeholder="搜索任务..."
          allow-clear
          class="search-input"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button class="tool-btn" @click="fetchData">
          <ReloadOutlined /> 刷新
        </a-button>
        <a-button type="primary" class="add-btn" @click="openAdd">
          <PlusOutlined /> 新建任务
        </a-button>
      </div>
    </div>

    <!-- Kanban 四列 -->
    <div class="kanban-board">
      <div
        v-for="col in columns"
        :key="col.key"
        class="kanban-col"
        :class="{ 'drag-over': dragOverCol === col.key }"
        @dragover="e => onDragOver(e, col.key)"
        @dragleave="onDragLeave"
        @drop="onDrop(col.key)"
      >
        <div class="col-header">
          <div class="col-title-wrap">
            <span class="col-accent" :style="{ background: col.accent }"></span>
            <span class="col-title">{{ col.title }}</span>
            <span class="col-count" :style="{ background: col.soft, color: col.countAccent }">
              {{ columnData[col.key].length }}
            </span>
          </div>
        </div>

        <div class="col-body" :class="{ loading }">
          <a-spin v-if="loading && columnData[col.key].length === 0" size="small" />
          <template v-else>
            <div
              v-for="task in columnData[col.key]"
              :key="task.id"
              class="task-card"
              :class="{ dragging: dragItem?.id === task.id, done: col.key === 'done' }"
              draggable="true"
              @dragstart="onDragStart(task)"
              @dblclick="openEdit(task)"
            >
              <div class="card-top">
                <span
                  class="priority-chip"
                  :style="{ background: getPriority(task.priority).soft, color: getPriority(task.priority).color }"
                >
                  <span class="prio-dot" :style="{ background: getPriority(task.priority).color }"></span>
                  {{ getPriority(task.priority).label }}
                </span>
                <span
                  v-if="task.category"
                  class="cat-chip"
                  :style="{ color: getCategory(task.category).color }"
                >
                  <TagOutlined /> {{ getCategory(task.category).label }}
                </span>
              </div>

              <div class="card-title">{{ task.title }}</div>

              <div class="card-bottom">
                <div class="card-meta">
                  <template v-if="formatDeadline(task.deadline)">
                    <span class="deadline-item" :class="formatDeadline(task.deadline)!.cls">
                      <CalendarOutlined /> {{ formatDeadline(task.deadline)!.text }}
                    </span>
                  </template>
                  <template v-if="(task.estPom ?? 0) > 0">
                    <span class="pomo-chip">🍅 {{ task.pomoCount ?? 0 }}/{{ task.estPom }}</span>
                  </template>
                </div>
                <div class="card-actions">
                  <a-button size="small" type="text" class="act-btn" @click.stop="openEdit(task)">
                    <EditOutlined />
                  </a-button>
                  <a-button size="small" type="text" danger class="act-btn" @click.stop="handleDelete(task)">
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>

            <div v-if="columnData[col.key].length === 0" class="empty-col-tip">
              拖拽任务到此处
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="submitting"
      :width="560"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form layout="vertical" class="todo-form">
        <a-form-item label="标题" required>
          <a-input v-model:value="form.title" placeholder="请输入任务标题" :maxlength="100" show-count />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="优先级">
              <a-select v-model:value="form.priority" :options="priorityOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="分类">
              <a-select v-model:value="form.category" :options="categoryOptions" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="截止日期">
              <a-date-picker
                v-model:value="form.deadline"
                value-format="YYYY-MM-DD"
                placeholder="选择截止日期"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="循环周期">
              <a-select v-model:value="form.recurring" :options="recurringOptions" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="预计番茄钟">
          <a-input-number v-model:value="form.estPom" :min="0" :max="20" style="width: 100%" />
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea
            v-model:value="form.note"
            placeholder="补充说明（可选）"
            :rows="3"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.kanban-page {
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
  padding: var(--spacing-xl) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-card-hover);
}

.stat-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.stat-sub {
  font-size: 12px;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.page-title-row {
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

.page-desc {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.search-input {
  width: 240px;
}

.tool-btn {
  background: var(--color-bg-card-2);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
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

.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
  flex: 1;
  min-height: 0;
}

.kanban-col {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  min-height: 500px;
  transition: all 0.2s;
  overflow: hidden;
}

.kanban-col.drag-over {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.col-header {
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.col-title-wrap {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.col-accent {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.col-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.col-count {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  min-width: 24px;
  text-align: center;
}

.col-body {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  overflow-y: auto;
  flex: 1;
  align-content: flex-start;
}

.task-card {
  background: var(--color-bg-card-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: grab;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-card:hover {
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.task-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.task-card.done {
  opacity: 0.7;
}

.task-card.done .card-title {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
}

.priority-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  line-height: 1.4;
}

.prio-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-chip {
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: auto;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.deadline-item {
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  background: rgba(161,161,170,0.10);
  color: var(--color-text-secondary);
}

.deadline-overdue {
  background: rgba(255,69,58,0.12);
  color: #FF453A;
}

.deadline-today {
  background: rgba(255,69,58,0.12);
  color: #FF453A;
}

.deadline-soon {
  background: rgba(255,159,10,0.12);
  color: #FF9F0A;
}

.pomo-chip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  background: rgba(255,159,10,0.10);
  color: #FF9F0A;
}

.card-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.act-btn {
  color: var(--color-text-tertiary);
  padding: 0 6px !important;
}

.act-btn:hover {
  color: var(--color-text) !important;
  background: var(--color-bg-hover) !important;
}

.empty-col-tip {
  padding: var(--spacing-xl) var(--spacing-md);
  text-align: center;
  font-size: 12px;
  color: var(--color-text-disabled);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.todo-form {
  padding-top: 8px;
}

@media (max-width: 1400px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .kanban-board {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  .kanban-board {
    grid-template-columns: 1fr;
  }
}
</style>
