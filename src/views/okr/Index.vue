<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, AimOutlined,
  FlagOutlined, TrophyOutlined, DashboardOutlined,
  ClockCircleOutlined, SearchOutlined,
  CheckCircleOutlined, DownOutlined, RightOutlined,
  LinkOutlined, FileDoneOutlined, InboxOutlined,
  StarOutlined, InfoCircleOutlined, FireOutlined, ThunderboltOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { okrApi, okrKrApi, type OkrObjective, type OkrKeyResult } from '@/api/modules'
import { todoApi } from '@/api/modules'
import type { Todo } from '@/api/todo'

type ApiCategory = OkrObjective['category']

const CAT_TO_API: Record<string, ApiCategory> = {
  '职业发展': 'WORK', '自媒体': 'MEDIA', '技术成长': 'TECH',
  '学习成长': 'READ', '健康生活': 'HEALTH'
}
const API_TO_CAT: Record<ApiCategory, string> = {
  WORK: '职业发展', MEDIA: '自媒体', TECH: '技术成长',
  READ: '学习成长', HEALTH: '健康生活'
}

// —— O 视图模型 ——
interface OItem {
  id: number
  title: string
  category: string
  period: string
  status: string
  startDate: string
  endDate: string
  score?: number | null
  review?: string
  createTime: string
  updateTime: string
  krList: KrItem[]
  krLoaded: boolean
  expanded: boolean
}

interface KrItem {
  id: number
  title: string
  currValue: number
  targetValue: number
  unit: string
  progress: number
  progressMode: 'MANUAL' | 'TASK_LINKED'
  taskId?: number | null
  taskTitle?: string
  weight: number
  status: string
}

const loading = ref(false)

const entityToOItem = (e: OkrObjective): OItem => ({
  id: e.id ?? 0,
  title: e.title,
  category: API_TO_CAT[e.category] || '职业发展',
  period: e.period || '',
  status: e.status || 'ACTIVE',
  startDate: e.startDate || '',
  endDate: e.endDate || '',
  score: (e as any).score ?? null,
  review: (e as any).review || '',
  createTime: (e as any).createTime || '',
  updateTime: (e as any).updateTime || '',
  krList: [],
  krLoaded: false,
  expanded: false
})

const krEntityToItem = (k: OkrKeyResult): KrItem => ({
  id: k.id ?? 0,
  title: k.title,
  currValue: Number(k.currValue ?? 0),
  targetValue: Number(k.targetValue ?? 100),
  unit: k.unit || '%',
  progress: k.progress ?? 0,
  progressMode: (k.progressMode as 'MANUAL' | 'TASK_LINKED') || 'MANUAL',
  taskId: k.taskId ?? undefined,
  taskTitle: '',
  weight: k.weight ?? 1,
  status: k.status || 'ACTIVE'
})

// —— 数据加载 ——
const dataList = ref<OItem[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const list = await okrApi.list()
    dataList.value = (list || []).map(entityToOItem)
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

// —— KR 加载 ——
const loadKrs = async (o: OItem) => {
  try {
    const list = await okrKrApi.list(o.id) as any
    o.krList = (list || []).map(krEntityToItem)
    o.krLoaded = true
    // 加载关联任务标题
    await loadTaskTitles(o.krList)
    // 同步O进度
    syncOProgress(o)
  } catch {
    o.krList = []
    o.krLoaded = true
  }
}

const loadTaskTitles = async (krs: KrItem[]) => {
  const linkedKrs = krs.filter(k => k.taskId)
  if (!linkedKrs.length) return
  try {
    const allTodos = await todoApi.list() as any[]
    const todoMap = new Map<number, string>()
    ;(allTodos as Todo[]).forEach(t => { if (t.id) todoMap.set(t.id, t.title) })
    linkedKrs.forEach(k => {
      k.taskTitle = todoMap.get(k.taskId!) || '(任务已删除)'
    })
  } catch { /* ignore */ }
}

// —— O 进度聚合计算（由KR加权平均） ——
const calcOProgress = (krs: KrItem[]): number => {
  const active = krs.filter(k => k.status !== 'CANCEL')
  if (!active.length) return 0
  const totalWeight = active.reduce((s, k) => s + (k.weight || 1), 0)
  const weighted = active.reduce((s, k) => s + (k.progress || 0) * (k.weight || 1), 0)
  return Math.min(100, Math.round(weighted / totalWeight))
}

const syncOProgress = async (o: OItem) => {
  const progress = calcOProgress(o.krList)
  // 更新后端
  try {
    const cat: ApiCategory = CAT_TO_API[o.category] || 'WORK'
    await okrApi.update({
      id: o.id,
      title: o.title,
      category: cat,
      period: o.period,
      status: o.status,
      progress,
      startDate: o.startDate,
      endDate: o.endDate,
      score: o.score ?? undefined,
      review: o.review
    } as OkrObjective)
  } catch { /* ignore */ }
}

// —— 折叠/展开 ——
const toggleExpand = async (o: OItem) => {
  o.expanded = !o.expanded
  if (o.expanded && !o.krLoaded) {
    await loadKrs(o)
  }
}

// —— 统计卡片 ——
const stats = computed(() => {
  const total = dataList.value.length
  const archived = dataList.value.filter(r => r.status === 'ARCHIVED').length
  const active = total - archived
  const done = dataList.value.filter(r => r.status === 'DONE').length
  // 即将到期：7天内到期且未完成
  const expiring = dataList.value.filter(r => {
    if (r.status === 'DONE' || r.status === 'ARCHIVED') return false
    if (!r.endDate) return false
    const days = dayjs(r.endDate).diff(dayjs(), 'day')
    return days >= 0 && days <= 7
  }).length
  return { total, active, done, archived, expiring }
})

// —— 维度分类 ——
const categoryList = [
  { key: '职业发展', label: '职业/工作', icon: FlagOutlined, color: '#5E6AD2', bg: 'rgba(94, 106, 210, 0.15)' },
  { key: '自媒体', label: '内容/自媒体', icon: TrophyOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' },
  { key: '技术成长', label: '技术/学习', icon: AimOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '学习成长', label: '阅读/认知', icon: DashboardOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: '健康生活', label: '健康/生活', icon: CheckCircleOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' }
]

const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    if (r.status === 'ARCHIVED') return
    if (c[r.category] !== undefined) c[r.category]++
  })
  return c
})

// —— 筛选 ——
const selectedCategory = ref<string | null>(null)
const selectedTags = ref<string[]>([])
const searchText = ref('')

const tagList = [
  { key: '2026 Q3', label: '2026 Q3', tip: '' },
  { key: '2026 全年', label: '2026 全年', tip: '' },
  { key: '进行中', label: '进行中', tip: '' },
  { key: '已完成', label: '已完成', tip: '' },
  { key: '高优先级', label: '高优先级', tip: '进度低于30%的目标，需要重点关注' },
  { key: '需要加速', label: '需要加速', tip: '进度低于预期（时间过半但进度未过半）', icon: FireOutlined },
  { key: '即将到期', label: '即将到期', tip: '7天内到期的目标', icon: ClockCircleOutlined },
  { key: '超预期', label: '超预期', tip: '进度超过预期（进度过半但时间未过半）', icon: ThunderboltOutlined }
]

const toggleTag = (key: string) => {
  const idx = selectedTags.value.indexOf(key)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(key)
}

const clearFilters = () => {
  selectedCategory.value = null
  selectedTags.value = []
  searchText.value = ''
}

const hasFilters = computed(() => selectedCategory.value || selectedTags.value.length || searchText.value)

const getStatusText = (o: OItem) => {
  if (o.status === 'ARCHIVED') return '已归档'
  if (o.status === 'DONE') return '已完成'
  return '进行中'
}

const getOProgress = (o: OItem) => {
  if (!o.krLoaded || !o.krList.length) return 0
  return calcOProgress(o.krList)
}

const filtered = computed(() => dataList.value.filter(o => {
  // 搜索：同时检索O标题和KR标题
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const oTitle = o.title.toLowerCase()
    const krTitles = o.krList.map(k => k.title.toLowerCase()).join(' ')
    if (!oTitle.includes(kw) && !krTitles.includes(kw)) return false
  }
  if (selectedCategory.value && o.category !== selectedCategory.value) return false
  if (selectedTags.value.length) {
    for (const t of selectedTags.value) {
      if (t === '2026 Q3' && o.period !== '2026 Q3') return false
      if (t === '2026 全年' && o.period !== '2026 全年') return false
      if (t === '进行中' && o.status !== 'ACTIVE') return false
      if (t === '已完成' && o.status !== 'DONE') return false
      const pct = getOProgress(o)
      if (t === '高优先级' && pct >= 30) return false
      if (t === '即将到期') {
        if (!o.endDate || o.status === 'DONE' || o.status === 'ARCHIVED') return false
        const days = dayjs(o.endDate).diff(dayjs(), 'day')
        if (days < 0 || days > 7) return false
      }
      if (t === '需要加速') {
        if (o.status === 'DONE' || o.status === 'ARCHIVED') return false
        // 时间过半但进度未过半
        if (!o.startDate || !o.endDate) return false
        const totalDays = dayjs(o.endDate).diff(dayjs(o.startDate), 'day')
        const passedDays = dayjs().diff(dayjs(o.startDate), 'day')
        if (totalDays <= 0 || passedDays < 0) return false
        const timeRatio = passedDays / totalDays
        if (timeRatio < 0.5 || pct >= timeRatio * 100) return false
      }
      if (t === '超预期') {
        if (o.status === 'DONE' || o.status === 'ARCHIVED') return false
        if (!o.startDate || !o.endDate) return false
        const totalDays = dayjs(o.endDate).diff(dayjs(o.startDate), 'day')
        const passedDays = dayjs().diff(dayjs(o.startDate), 'day')
        if (totalDays <= 0 || passedDays < 0) return false
        const timeRatio = passedDays / totalDays
        if (timeRatio >= 0.5 || pct < timeRatio * 100) return false
      }
    }
  }
  return true
}))

const sorted = computed(() => [...filtered.value].sort((a, b) => {
  // 归档的排最后
  if (a.status === 'ARCHIVED' && b.status !== 'ARCHIVED') return 1
  if (b.status === 'ARCHIVED' && a.status !== 'ARCHIVED') return -1
  return (b.updateTime || '').localeCompare(a.updateTime || '')
}))

// —— 颜色/工具函数 ——
const catColorMap: Record<string, string> = {
  '职业发展': '#5E6AD2', '自媒体': '#FF375F', '技术成长': '#0A84FF',
  '学习成长': '#34C759', '健康生活': '#FF9F0A'
}
const getProgressColor = (pct: number) => pct >= 100 ? '#34C759' : pct >= 60 ? '#5E6AD2' : pct >= 30 ? '#FF9F0A' : '#FF375F'
const getTime = (t: string) => {
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}

const getDeadlineInfo = (o: OItem) => {
  if (!o.endDate || o.status === 'DONE' || o.status === 'ARCHIVED') return null
  const days = dayjs(o.endDate).diff(dayjs(), 'day')
  if (days < 0) return { text: `已过期${-days}天`, color: '#FF375F', bg: 'rgba(255,55,95,0.15)' }
  if (days <= 3) return { text: `${days}天后到期`, color: '#FF375F', bg: 'rgba(255,55,95,0.15)' }
  if (days <= 7) return { text: `${days}天后到期`, color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' }
  return null
}

// —— O 弹窗 ——
const oModalVisible = ref(false)
const oIsEdit = ref(false)
const oFormRef = ref()
const oForm = reactive<Partial<OItem & { _cat: string }>>({})
const oRules = { title: [{ required: true, message: '请输入目标标题', trigger: 'blur' }] }

const openAddO = () => {
  oIsEdit.value = false
  Object.assign(oForm, {
    title: '', category: '职业发展', period: '2026 Q3',
    status: 'ACTIVE', startDate: dayjs().format('YYYY-MM-DD'),
    endDate: '2026-09-30', score: null, review: ''
  })
  oModalVisible.value = true
}

const openEditO = (o: OItem) => {
  oIsEdit.value = true
  Object.assign(oForm, { ...o })
  oModalVisible.value = true
}

const saveO = async () => {
  try { await oFormRef.value?.validate() } catch { return }
  const cat: ApiCategory = CAT_TO_API[oForm.category || '职业发展'] || 'WORK'
  const entity: OkrObjective = {
    id: oForm.id,
    title: oForm.title || '',
    category: cat,
    period: oForm.period,
    status: oForm.status,
    startDate: oForm.startDate,
    endDate: oForm.endDate,
    score: oForm.score ?? undefined,
    review: oForm.review
  }
  try {
    if (oIsEdit.value) {
      await okrApi.update(entity)
      const idx = dataList.value.findIndex(x => x.id === oForm.id)
      if (idx >= 0) {
        const old = dataList.value[idx]
        dataList.value[idx] = { ...entityToOItem(entity), krList: old.krList, krLoaded: old.krLoaded, expanded: old.expanded }
      }
      message.success('更新成功')
    } else {
      const res: any = await okrApi.add(entity)
      const newId = typeof res === 'number' ? res : (res?.id ?? Date.now())
      dataList.value.unshift({ ...entityToOItem({ ...entity, id: newId }), krList: [], krLoaded: true, expanded: false })
      message.success('新增成功')
    }
  } catch {
    message.error('保存失败')
    return
  }
  oModalVisible.value = false
}

const delO = (o: OItem) => Modal.confirm({
  title: `确认删除目标「${o.title}」？`,
  content: '该目标下的所有关键结果(KR)将一并删除',
  okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => {
    try {
      await okrApi.remove(o.id)
      dataList.value = dataList.value.filter(x => x.id !== o.id)
      message.success('已删除')
    } catch { message.error('删除失败') }
  }
})

const archiveO = async (o: OItem) => {
  try {
    const cat: ApiCategory = CAT_TO_API[o.category] || 'WORK'
    await okrApi.update({ ...o, category: cat, status: 'ARCHIVED', id: o.id } as OkrObjective)
    o.status = 'ARCHIVED'
    message.success('已归档')
  } catch { message.error('归档失败') }
}

// —— KR 弹窗 ——
const krModalVisible = ref(false)
const krIsEdit = ref(false)
const krFormRef = ref()
const krForm = reactive<Partial<KrItem & { _objectiveId: number }>>({})
const krRules = { title: [{ required: true, message: '请输入KR标题', trigger: 'blur' }] }

// 任务列表（用于绑定）
const todoList = ref<Todo[]>([])
const loadTodos = async () => {
  try {
    const list = await todoApi.list() as any[]
    todoList.value = (list as Todo[]).filter(t => !t.done)
  } catch { todoList.value = [] }
}

const openAddKr = async (o: OItem) => {
  if (!o.expanded) {
    o.expanded = true
    if (!o.krLoaded) await loadKrs(o)
  }
  krIsEdit.value = false
  Object.assign(krForm, {
    id: undefined, title: '', currValue: 0, targetValue: 100, unit: '%',
    progress: 0, progressMode: 'MANUAL', taskId: undefined, weight: 1,
    status: 'ACTIVE', _objectiveId: o.id
  })
  await loadTodos()
  krModalVisible.value = true
}

const openEditKr = async (kr: KrItem, o: OItem) => {
  krIsEdit.value = true
  Object.assign(krForm, { ...kr, _objectiveId: o.id })
  await loadTodos()
  krModalVisible.value = true
}

// 切换进度模式时，如果是关联任务模式，自动选择任务
const onProgressModeChange = () => {
  if (krForm.progressMode === 'TASK_LINKED' && !krForm.taskId) {
    loadTodos()
  }
}

// 选择任务后，自动计算进度
const onTaskChange = () => {
  if (krForm.progressMode === 'TASK_LINKED' && krForm.taskId) {
    const task = todoList.value.find(t => t.id === krForm.taskId)
    if (task) {
      // 简单逻辑：已完成任务=100%，未完成=0%
      krForm.progress = task.done ? 100 : 0
      krForm.currValue = task.done ? (krForm.targetValue || 100) : 0
    }
  }
}

const saveKr = async () => {
  try { await krFormRef.value?.validate() } catch { return }
  // 计算进度
  if (krForm.progressMode === 'MANUAL') {
    const tgt = krForm.targetValue || 100
    const cur = krForm.currValue || 0
    krForm.progress = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0
  }
  const entity: OkrKeyResult = {
    id: krForm.id,
    objectiveId: krForm._objectiveId!,
    title: krForm.title || '',
    currValue: krForm.currValue,
    targetValue: krForm.targetValue,
    unit: krForm.unit,
    progress: krForm.progress,
    progressMode: krForm.progressMode as 'MANUAL' | 'TASK_LINKED',
    taskId: krForm.taskId || undefined,
    weight: krForm.weight || 1,
    status: krForm.status
  }
  const o = dataList.value.find(x => x.id === krForm._objectiveId)
  if (!o) return
  try {
    if (krIsEdit.value) {
      await okrKrApi.update(entity)
      const idx = o.krList.findIndex(k => k.id === krForm.id)
      if (idx >= 0) {
        const taskTitle = todoList.value.find(t => t.id === krForm.taskId)?.title
        o.krList[idx] = { ...krEntityToItem(entity), taskTitle }
      }
      message.success('KR更新成功')
    } else {
      const res: any = await okrKrApi.add(entity)
      const newId = typeof res === 'number' ? res : (res?.id ?? Date.now())
      const taskTitle = todoList.value.find(t => t.id === krForm.taskId)?.title
      o.krList.push({ ...krEntityToItem({ ...entity, id: newId }), taskTitle })
      message.success('KR新增成功')
    }
    // 同步O进度
    await syncOProgress(o)
  } catch {
    message.error('保存KR失败')
    return
  }
  krModalVisible.value = false
}

const delKr = (kr: KrItem, o: OItem) => Modal.confirm({
  title: `确认删除KR「${kr.title}」？`,
  okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => {
    try {
      await okrKrApi.remove(kr.id)
      o.krList = o.krList.filter(k => k.id !== kr.id)
      await syncOProgress(o)
      message.success('已删除')
    } catch { message.error('删除失败') }
  }
})

// —— 周期闭环：打分/复盘 ——
const scoreModalVisible = ref(false)
const scoreForm = reactive<{ id?: number; score?: number; review?: string }>({})
const openScore = (o: OItem) => {
  Object.assign(scoreForm, { id: o.id, score: o.score ?? 0.7, review: o.review || '' })
  scoreModalVisible.value = true
}
const saveScore = async () => {
  const o = dataList.value.find(x => x.id === scoreForm.id)
  if (!o) return
  try {
    const cat: ApiCategory = CAT_TO_API[o.category] || 'WORK'
    await okrApi.update({
      id: o.id, title: o.title, category: cat, period: o.period,
      status: 'DONE', startDate: o.startDate, endDate: o.endDate,
      progress: getOProgress(o), score: scoreForm.score, review: scoreForm.review
    } as OkrObjective)
    o.status = 'DONE'
    o.score = scoreForm.score
    o.review = scoreForm.review
    message.success('已保存评分和复盘')
  } catch { message.error('保存失败') }
  scoreModalVisible.value = false
}

// —— 统计卡片 tooltip 文案 ——
const statTooltips: Record<string, string> = {
  total: '所有O目标总数（含已完成、已归档）',
  active: '进行中的O目标数量（不含已完成和已归档）',
  done: '已完成的O目标数量',
  expiring: '7天内到期且未完成的O目标数量'
}
</script>

<template>
  <div class="p">
    <!-- 统计卡片 -->
    <a-row :gutter="16" class="srow">
      <a-col :xs="12" :sm="6">
        <Tooltip :title="statTooltips.total" placement="bottom">
          <div class="sc" :style="{ '--a':'#5E6AD2','--as':'rgba(94,106,210,0.15)' }">
            <div class="si"><FlagOutlined /></div>
            <div class="sif">
              <div class="sv">{{ stats.total || 0 }}<span class="su">个</span></div>
              <div class="sl">O目标总数 <InfoCircleOutlined class="info-icon" /></div>
            </div>
          </div>
        </Tooltip>
      </a-col>
      <a-col :xs="12" :sm="6">
        <Tooltip :title="statTooltips.active" placement="bottom">
          <div class="sc" :style="{ '--a':'#0A84FF','--as':'rgba(10,132,255,0.15)' }">
            <div class="si"><AimOutlined /></div>
            <div class="sif">
              <div class="sv">{{ stats.active || 0 }}<span class="su">个</span></div>
              <div class="sl">进行中目标 <InfoCircleOutlined class="info-icon" /></div>
            </div>
          </div>
        </Tooltip>
      </a-col>
      <a-col :xs="12" :sm="6">
        <Tooltip :title="statTooltips.done" placement="bottom">
          <div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }">
            <div class="si"><TrophyOutlined /></div>
            <div class="sif">
              <div class="sv">{{ stats.done || 0 }}<span class="su">个</span></div>
              <div class="sl">已达成目标 <InfoCircleOutlined class="info-icon" /></div>
            </div>
          </div>
        </Tooltip>
      </a-col>
      <a-col :xs="12" :sm="6">
        <Tooltip :title="statTooltips.expiring" placement="bottom">
          <div class="sc" :style="{ '--a':'#FF9F0A','--as':'rgba(255,159,10,0.15)' }">
            <div class="si"><ClockCircleOutlined /></div>
            <div class="sif">
              <div class="sv" :class="{ 'zero-val': !stats.expiring }">{{ stats.expiring || 0 }}<span class="su">个</span></div>
              <div class="sl">即将到期 <InfoCircleOutlined class="info-icon" /></div>
            </div>
          </div>
        </Tooltip>
      </a-col>
    </a-row>

    <!-- 维度分类 -->
    <div class="st">
      <span class="stt">OKR 维度</span>
      <a-button size="small" type="primary" @click="openAddO"><PlusOutlined /> 新建O(目标)</a-button>
    </div>
    <div class="cg">
      <Tooltip v-for="c in categoryList" :key="c.key" :title="`${c.label}：${catCounts[c.key]}个进行中目标`" placement="top">
        <div class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
          <div class="cbg">{{ catCounts[c.key] }}</div>
          <div class="ci"><component :is="c.icon" /></div>
          <div class="cl">{{ c.label }}</div>
        </div>
      </Tooltip>
    </div>

    <!-- 搜索 + 筛选标签 -->
    <div class="st">
      <span class="stt"><AimOutlined style="color:var(--color-primary);margin-right:6px" />{{ selectedCategory || '全部目标' }} <span class="scu">({{ sorted.length }})</span></span>
      <Tooltip title="同时检索O目标标题和KR关键结果标题">
        <a-input v-model:value="searchText" placeholder="搜索O目标/KR关键结果" allow-clear size="small" style="width:260px">
          <template #prefix><SearchOutlined style="color:var(--color-text-tertiary)" /></template>
        </a-input>
      </Tooltip>
    </div>
    <div class="tr">
      <Tooltip v-for="t in tagList" :key="t.key" :title="t.tip || ''" placement="top">
        <div class="tc" :class="{ active: selectedTags.includes(t.key) }" @click="toggleTag(t.key)">
          <component v-if="t.icon" :is="t.icon" style="margin-right:4px" />
          {{ t.label }}
        </div>
      </Tooltip>
      <button v-if="hasFilters" class="clear-btn" @click="clearFilters">清除筛选</button>
    </div>

    <!-- OKR 列表 -->
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="o in sorted" :key="o.id" class="o-card" :class="{ archived: o.status === 'ARCHIVED' }">
          <!-- O 头部 -->
          <div class="o-header">
            <div class="o-left" @click="toggleExpand(o)">
              <component :is="o.expanded ? DownOutlined : RightOutlined" class="expand-icon" />
              <h4 class="o-title">{{ o.title }}</h4>
              <Tag :color="catColorMap[o.category]" class="dim-tag">{{ o.category }}</Tag>
              <Tag :color="o.status === 'DONE' ? 'green' : o.status === 'ARCHIVED' ? 'default' : 'blue'" class="status-tag">{{ getStatusText(o) }}</Tag>
              <span v-if="o.score != null" class="score-badge"><StarOutlined /> {{ o.score?.toFixed(1) }}</span>
              <span v-if="getDeadlineInfo(o)" class="deadline-warn" :style="{ color: getDeadlineInfo(o)!.color, background: getDeadlineInfo(o)!.bg }">
                ⚠ {{ getDeadlineInfo(o)!.text }}
              </span>
            </div>
            <div class="o-right">
              <div class="o-progress-info">
                <span class="o-progress-num" :style="{ color: getProgressColor(getOProgress(o)) }">{{ getOProgress(o) }}%</span>
              </div>
              <div class="o-actions" @click.stop>
                <Tooltip title="编辑"><a-button type="text" size="small" @click="openEditO(o)"><EditOutlined /></a-button></Tooltip>
                <Tooltip title="新增KR"><a-button type="text" size="small" @click="openAddKr(o)"><PlusOutlined /></a-button></Tooltip>
                <Tooltip v-if="o.status !== 'ARCHIVED' && o.status !== 'DONE'" title="归档"><a-button type="text" size="small" @click="archiveO(o)"><InboxOutlined /></a-button></Tooltip>
                <Tooltip v-if="o.status !== 'ARCHIVED' && o.status !== 'DONE'" title="打分/复盘"><a-button type="text" size="small" @click="openScore(o)"><FileDoneOutlined /></a-button></Tooltip>
                <Tooltip title="删除"><a-button type="text" size="small" danger @click="delO(o)"><DeleteOutlined /></a-button></Tooltip>
              </div>
            </div>
          </div>
          <!-- O 进度条 -->
          <div class="o-progress-bar">
            <div class="o-progress-fill" :style="{ width: getOProgress(o) + '%', background: getProgressColor(getOProgress(o)) }"></div>
          </div>
          <!-- O meta -->
          <div class="o-meta">
            <span class="mi"><ClockCircleOutlined /> {{ getTime(o.updateTime) }}</span>
            <span class="mi">📅 {{ o.period }}</span>
            <span v-if="o.endDate" class="mi">截止：{{ o.endDate }}</span>
            <span v-if="o.krLoaded && o.krList.length" class="mi"><AimOutlined /> {{ o.krList.length }}个KR</span>
          </div>

          <!-- KR 子列表 -->
          <div v-if="o.expanded && o.krLoaded" class="kr-list">
            <div v-if="!o.krList.length" class="kr-empty">
              暂无关键结果，点击 <a-button type="link" size="small" @click="openAddKr(o)">新增KR</a-button> 开始添加
            </div>
            <div v-for="kr in o.krList" :key="kr.id" class="kr-item" :class="{ cancelled: kr.status === 'CANCEL' }">
              <div class="kr-left">
                <span class="kr-dot" :style="{ background: getProgressColor(kr.progress) }"></span>
                <span class="kr-title">{{ kr.title }}</span>
                <Tag v-if="kr.progressMode === 'TASK_LINKED'" color="purple" class="kr-mode-tag"><LinkOutlined /> 关联任务</Tag>
                <Tag v-else color="default" class="kr-mode-tag">手动</Tag>
              </div>
              <div class="kr-mid">
                <span class="kr-val">{{ kr.currValue }}/{{ kr.targetValue }}{{ kr.unit }}</span>
                <div class="kr-bar"><div class="kr-bar-fill" :style="{ width: kr.progress + '%', background: getProgressColor(kr.progress) }"></div></div>
                <span class="kr-pct" :style="{ color: getProgressColor(kr.progress) }">{{ kr.progress }}%</span>
              </div>
              <div class="kr-right" @click.stop>
                <Tooltip v-if="kr.taskTitle" :title="`关联任务：${kr.taskTitle}`">
                  <span class="kr-task"><LinkOutlined /> {{ kr.taskTitle.length > 12 ? kr.taskTitle.slice(0,12)+'...' : kr.taskTitle }}</span>
                </Tooltip>
                <a-button type="text" size="small" @click="openEditKr(kr, o)"><EditOutlined /></a-button>
                <a-button type="text" size="small" danger @click="delKr(kr, o)"><DeleteOutlined /></a-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 空状态 -->
      <div v-else-if="!loading" class="ec">
        <div class="ei">🎯</div>
        <div class="et">{{ hasFilters ? '没有匹配的目标' : '暂无O目标' }}</div>
        <div class="ed">{{ hasFilters ? '试试调整筛选条件' : '点击「新建O(目标)」开始制定你的季度/年度目标' }}</div>
        <a-button v-if="hasFilters" style="margin-top:16px" @click="clearFilters">清除筛选</a-button>
        <a-button v-else type="primary" style="margin-top:16px" @click="openAddO"><PlusOutlined /> 新建O(目标)</a-button>
      </div>
    </a-spin>

    <!-- O 弹窗 -->
    <a-modal v-model:open="oModalVisible" :title="oIsEdit ? '编辑O目标' : '新建O目标'" ok-text="保存" cancel-text="取消" :width="680" @ok="saveO" :destroyOnClose="true">
      <a-form ref="oFormRef" :model="oForm" :rules="oRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="目标（Objective）" name="title"><a-input v-model:value="oForm.title" placeholder="如：完成个人工作台 2.0 全模块开发上线" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="维度分类"><a-select v-model:value="oForm.category"><a-select-option v-for="c in categoryList" :key="c.key" :value="c.key">{{ c.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="周期"><a-select v-model:value="oForm.period"><a-select-option value="2026 Q3">2026 Q3</a-select-option><a-select-option value="2026 Q4">2026 Q4</a-select-option><a-select-option value="2026 全年">2026 全年</a-select-option><a-select-option value="月度目标">月度目标</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="状态"><a-select v-model:value="oForm.status"><a-select-option value="ACTIVE">进行中</a-select-option><a-select-option value="DONE">已完成</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="开始日期"><a-date-picker v-model:value="oForm.startDate" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="截止日期"><a-date-picker v-model:value="oForm.endDate" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col v-if="oIsEdit && oForm.review" :span="24"><a-form-item label="复盘备注"><a-textarea v-model:value="oForm.review" :rows="3" readonly /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- KR 弹窗 -->
    <a-modal v-model:open="krModalVisible" :title="krIsEdit ? '编辑关键结果(KR)' : '新增关键结果(KR)'" ok-text="保存" cancel-text="取消" :width="620" @ok="saveKr" :destroyOnClose="true">
      <a-form ref="krFormRef" :model="krForm" :rules="krRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="KR标题" name="title"><a-input v-model:value="krForm.title" placeholder="如：完成3篇技术博客并发布" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="当前值"><a-input-number v-model:value="krForm.currValue" :min="0" :style="{width:'100%'}" :disabled="krForm.progressMode === 'TASK_LINKED'" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="目标值"><a-input-number v-model:value="krForm.targetValue" :min="1" :style="{width:'100%'}" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="单位"><a-select v-model:value="krForm.unit"><a-select-option value="%">%</a-select-option><a-select-option value="个">个</a-select-option><a-select-option value="篇">篇</a-select-option><a-select-option value="本">本</a-select-option><a-select-option value="W">W</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="进度模式"><a-select v-model:value="krForm.progressMode" @change="onProgressModeChange"><a-select-option value="MANUAL">手动录入</a-select-option><a-select-option value="TASK_LINKED">关联任务自动计算</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="权重"><a-input-number v-model:value="krForm.weight" :min="1" :max="10" :style="{width:'100%'}" /></a-form-item></a-col>
          <a-col v-if="krForm.progressMode === 'TASK_LINKED'" :span="24">
            <a-form-item label="关联任务">
              <a-select v-model:value="krForm.taskId" placeholder="选择待办任务" allow-clear @change="onTaskChange">
                <a-select-option v-for="t in todoList" :key="t.id" :value="t.id">{{ t.title }}{{ t.done ? ' (已完成)' : '' }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 打分/复盘弹窗 -->
    <a-modal v-model:open="scoreModalVisible" title="周期闭环 — 打分 & 复盘" ok-text="保存" cancel-text="取消" :width="560" @ok="saveScore" :destroyOnClose="true">
      <a-form layout="vertical">
        <a-form-item label="完成评分（0.0 - 1.0）">
          <a-input-number v-model:value="scoreForm.score" :min="0" :max="1" :step="0.1" :precision="1" :style="{width:'100%'}" />
          <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:4px">0.3=未达成，0.7=基本达成，1.0=超额完成</div>
        </a-form-item>
        <a-form-item label="复盘备注">
          <a-textarea v-model:value="scoreForm.review" :rows="5" placeholder="回顾目标执行过程，总结经验教训" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
