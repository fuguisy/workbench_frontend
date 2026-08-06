<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  getTodoList,
  getTodoPage,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodoDone,
  type Todo
} from '@/api/todo'

const loading = ref(false)
const dataList = ref<Todo[]>([])

const searchKeyword = ref('')
const priorityFilter = ref<string | undefined>(undefined)
const categoryFilter = ref<string | undefined>(undefined)

// 分页
const hasSearch = computed(() => searchKeyword.value || priorityFilter.value || categoryFilter.value)
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
  pageSizeOptions: ['10', '20', '50', '100']
})

const priorityOptions = [
  { label: '全部', value: '' },
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' }
]

const categoryOptions = [
  { label: '全部', value: '' },
  { label: '工作', value: 'work' },
  { label: '学习', value: 'study' },
  { label: '生活', value: 'life' },
  { label: '其他', value: 'other' }
]

const priorityColorMap: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue'
}

const priorityTextMap: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
}

const categoryTextMap: Record<string, string> = {
  work: '工作',
  study: '学习',
  life: '生活',
  other: '其他'
}

const filteredList = computed(() => {
  if (hasSearch.value) {
    const filtered = dataList.value.filter((item) => {
      const matchKeyword =
        !searchKeyword.value ||
        item.title.toLowerCase().includes(searchKeyword.value.toLowerCase())
      const matchPriority = !priorityFilter.value || item.priority === priorityFilter.value
      const matchCategory = !categoryFilter.value || item.category === categoryFilter.value
      return matchKeyword && matchPriority && matchCategory
    })
    pagination.total = filtered.length
    const start = (pagination.current - 1) * pagination.pageSize
    return filtered.slice(start, start + pagination.pageSize)
  }
  return dataList.value
})

const columns: TableColumnsType = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
    width: 220
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 90,
    align: 'center'
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    align: 'center'
  },
  {
    title: '截止日期',
    dataIndex: 'deadline',
    key: 'deadline',
    width: 140
  },
  {
    title: '状态',
    dataIndex: 'done',
    key: 'done',
    width: 100,
    align: 'center'
  },
  {
    title: '番茄钟',
    key: 'pomo',
    width: 110,
    align: 'center'
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    align: 'center',
    fixed: 'right'
  }
]

// 弹窗
const modalVisible = ref(false)
const modalTitle = ref('新增任务')
const submitting = ref(false)
const editingId = ref<number | undefined>(undefined)

const form = reactive<Todo>({
  title: '',
  priority: 'medium',
  done: 0,
  note: '',
  category: 'work',
  deadline: '',
  recurring: 'none',
  estPom: 1,
  pomoCount: 0,
  pomoMinutes: 0
})

const recurringOptions = [
  { label: '不循环', value: 'none' },
  { label: '每日', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' }
]

const resetForm = () => {
  form.title = ''
  form.priority = 'medium'
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
      pagination.current = 1
    }
    modalVisible.value = false
    await fetchData()
  } catch {
    // 错误已在拦截器提示
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
        // 忽略
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
    // 忽略
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    if (hasSearch.value) {
      // 搜索模式：全量加载 + 前端过滤分页
      const res: any = await getTodoList()
      dataList.value = Array.isArray(res) ? res : (res?.records ?? [])
    } else {
      // 后端分页
      const res: any = await getTodoPage({ current: pagination.current, size: pagination.pageSize })
      dataList.value = (res && res.records) || []
      pagination.total = Number((res && res.total) || 0)
    }
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const onTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  if (!hasSearch.value) {
    fetchData()
  }
}

const doSearch = () => {
  pagination.current = 1
  fetchData()
}

const resetFilters = () => {
  searchKeyword.value = ''
  priorityFilter.value = undefined
  categoryFilter.value = undefined
  pagination.current = 1
  fetchData()
}

const formatDeadline = (date?: string) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const pomoProgress = (record: Todo) => {
  const est = record.estPom ?? 0
  const done = record.pomoCount ?? 0
  if (!est) return `${done}`
  return `${done} / ${est}`
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="todo-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <a-input
          v-model:value="searchKeyword"
          placeholder="搜索任务标题"
          allow-clear
          style="width: 220px"
          @press-enter="doSearch"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
        <a-select
          v-model:value="priorityFilter"
          placeholder="优先级"
          allow-clear
          style="width: 130px"
          :options="priorityOptions"
          @change="doSearch"
        />
        <a-select
          v-model:value="categoryFilter"
          placeholder="分类"
          allow-clear
          style="width: 130px"
          :options="categoryOptions"
          @change="doSearch"
        />
        <a-button @click="resetFilters">重置</a-button>
      </div>
      <div class="toolbar-right">
        <a-button @click="fetchData">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" @click="openAdd">
          <template #icon><PlusOutlined /></template>
          新增任务
        </a-button>
      </div>
    </div>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="filteredList"
      :loading="loading"
      row-key="id"
      :pagination="pagination"
      :scroll="{ x: 960 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- 优先级 -->
        <template v-if="column.key === 'priority'">
          <a-tag :color="priorityColorMap[record.priority] || 'default'">
            {{ priorityTextMap[record.priority] || record.priority }}
          </a-tag>
        </template>

        <!-- 分类 -->
        <template v-else-if="column.key === 'category'">
          {{ categoryTextMap[record.category] || record.category || '-' }}
        </template>

        <!-- 截止日期 -->
        <template v-else-if="column.key === 'deadline'">
          {{ formatDeadline(record.deadline) }}
        </template>

        <!-- 状态 -->
        <template v-else-if="column.key === 'done'">
          <a-tag v-if="record.done === 1" color="success">
            <CheckOutlined /> 已完成
          </a-tag>
          <a-tag v-else color="default">
            <CloseOutlined /> 未完成
          </a-tag>
        </template>

        <!-- 番茄钟 -->
        <template v-else-if="column.key === 'pomo'">
          <span class="pomo-text">🍅 {{ pomoProgress(record) }}</span>
        </template>

        <!-- 操作 -->
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-tooltip :title="record.done === 1 ? '标记未完成' : '标记完成'">
              <a-button
                size="small"
                :type="record.done === 1 ? 'default' : 'primary'"
                :ghost="record.done !== 1"
                @click="handleToggle(record)"
              >
                <CheckOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="编辑">
              <a-button size="small" @click="openEdit(record)">
                <EditOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="删除">
              <a-button size="small" danger @click="handleDelete(record)">
                <DeleteOutlined />
              </a-button>
            </a-tooltip>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑弹窗 -->
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
          <a-input
            v-model:value="form.title"
            placeholder="请输入任务标题"
            :maxlength="100"
            show-count
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="优先级">
              <a-select v-model:value="form.priority" :options="priorityOptions.filter(o => o.value)" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="分类">
              <a-select v-model:value="form.category" :options="categoryOptions.filter(o => o.value)" />
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
.todo-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pomo-text {
  font-size: 14px;
}

.todo-form {
  padding-top: 8px;
}
</style>
