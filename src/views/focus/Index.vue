<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip, Progress } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  ClockCircleOutlined, ThunderboltOutlined, CoffeeOutlined, TrophyOutlined,
  SearchOutlined, PlayCircleOutlined, PauseCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, LinkOutlined,
  FlagOutlined, HistoryOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { focusApi, todoApi, type FocusRecord } from '@/api/modules'
import type { Todo } from '@/api/todo'

// ============ 常量映射 ============
const SCENE_LIST = [
  { key: '深度工作', api: 'DEEP', icon: ThunderboltOutlined, color: '#5E6AD2', bg: 'rgba(94,106,210,0.15)' },
  { key: '内容创作', api: 'CREATE', icon: EditOutlined, color: '#FF375F', bg: 'rgba(255,55,95,0.15)' },
  { key: '学习阅读', api: 'READ', icon: CheckCircleOutlined, color: '#34C759', bg: 'rgba(52,199,89,0.15)' },
  { key: '会议沟通', api: 'MEET', icon: CoffeeOutlined, color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
  { key: '运动冥想', api: 'SPORT', icon: TrophyOutlined, color: '#00D4AA', bg: 'rgba(0,212,170,0.15)' }
] as const

const SCENE_TO_API: Record<string, string> = Object.fromEntries(SCENE_LIST.map(s => [s.key, s.api]))
const API_TO_SCENE: Record<string, string> = Object.fromEntries(SCENE_LIST.map(s => [s.api, s.key]))

const STATUS_MAP: Record<string, string> = {
  DOING: '进行中',
  DONE: '已完成',
  CANCEL: '已打断'
}

// ============ 计时器状态 ============
const timerState = reactive({
  running: false,
  paused: false,
  startTime: 0,       // 开始时间戳
  elapsed: 0,         // 已经过的毫秒数
  totalSeconds: 0,     // 已用秒数
  scene: '深度工作',
  duration: 25,        // 预设时长（分钟）
  title: '',
  taskId: undefined as number | undefined,
  taskTitle: '',
  taskDoneOnFinish: false
})

const timerTick = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

const startTimer = () => {
  if (!timerState.running) {
    timerState.running = true
    timerState.paused = false
    timerState.startTime = Date.now() - timerState.elapsed
    timerInterval = setInterval(() => {
      timerState.elapsed = Date.now() - timerState.startTime
      timerState.totalSeconds = Math.floor(timerState.elapsed / 1000)
      timerTick.value++
    }, 200)
  }
}

const pauseTimer = () => {
  if (timerState.running && !timerState.paused) {
    timerState.paused = true
    if (timerInterval) clearInterval(timerInterval)
  }
}

const resumeTimer = () => {
  if (timerState.running && timerState.paused) {
    timerState.paused = false
    timerState.startTime = Date.now() - timerState.elapsed
    timerInterval = setInterval(() => {
      timerState.elapsed = Date.now() - timerState.startTime
      timerState.totalSeconds = Math.floor(timerState.elapsed / 1000)
      timerTick.value++
    }, 200)
  }
}

const resetTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  timerState.running = false
  timerState.paused = false
  timerState.elapsed = 0
  timerState.totalSeconds = 0
}

const stopTimer = async (complete: boolean) => {
  if (!timerState.running && timerState.totalSeconds === 0) return
  if (timerInterval) clearInterval(timerInterval)
  
  const minutes = Math.round(timerState.totalSeconds / 60)
  const entity: FocusRecord = {
    title: timerState.title || timerState.scene,
    scene: SCENE_TO_API[timerState.scene] as any,
    minutesActual: Math.max(1, minutes),
    minutesStandard: timerState.duration,
    pomosExpected: 1,
    status: complete ? 'DONE' : 'CANCEL',
    recordDate: dayjs().format('YYYY-MM-DD'),
    taskId: timerState.taskId
  }
  
  try {
    await focusApi.add(entity)
    message.success(complete ? `🎉 番茄钟完成！专注 ${minutes} 分钟` : '已保存专注记录')
    
    // 如果关联了任务且勾选完成
    if (complete && timerState.taskId && timerState.taskDoneOnFinish) {
      try {
        await todoApi.toggleDone(timerState.taskId)
        message.success(`✅ 关联任务已标记完成`)
      } catch { /* 静默失败 */ }
    }
    
    loadData()
  } catch {
    message.error('保存失败')
  }
  
  // 重置
  Object.assign(timerState, {
    running: false, paused: false, startTime: 0, elapsed: 0, totalSeconds: 0,
    title: '', taskId: undefined, taskTitle: '', taskDoneOnFinish: false
  })
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const progressPercent = computed(() => {
  const totalSec = timerState.duration * 60
  return Math.min(100, (timerState.totalSeconds / totalSec) * 100)
})

const timerProgressColor = computed(() => {
  if (progressPercent.value >= 100) return '#34C759'
  if (progressPercent.value > 80) return '#FF9F0A'
  return SCENE_LIST.find(s => s.key === timerState.scene)?.color || '#5E6AD2'
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

// ============ 待办任务列表（用于关联选择） ============
const todoList = ref<Todo[]>([])
const loadTodoList = async () => {
  try {
    const list = await todoApi.list()
    // 只显示未完成的任务
    todoList.value = (list || []).filter((t: Todo) => !t.done).slice(0, 20)
  } catch {
    todoList.value = []
  }
}

const selectTask = (todo: Todo) => {
  timerState.taskId = todo.id
  timerState.taskTitle = todo.title
  if (!timerState.title) {
    timerState.title = todo.title
  }
}

const clearTask = () => {
  timerState.taskId = undefined
  timerState.taskTitle = ''
}

const handleTaskSelect = (e: Event) => {
  const target = e.target as HTMLSelectElement
  const value = Number(target.value)
  const t = todoList.value.find(x => x.id === value)
  if (t) selectTask(t)
}

// ============ 历史记录 ============
type FocusItem = {
  id: number
  title: string
  category: string
  duration: number
  actualMinutes: number
  status: string
  date: string
  time: string
  taskTitle?: string
}

const loading = ref(false)
const today = dayjs().format('YYYY-MM-DD')
const dataList = ref<FocusItem[]>([])

const entityToItem = (e: FocusRecord): FocusItem => {
  const scene = API_TO_SCENE[e.scene] || '深度工作'
  const status = e.status ? (STATUS_MAP[e.status] || '进行中') : '未开始'
  const rd = e.recordDate ? dayjs(e.recordDate) : null
  const ct = (e as any).createTime ? dayjs((e as any).createTime) : null
  return {
    id: e.id ?? 0,
    title: e.title,
    category: scene,
    duration: e.minutesStandard || 25,
    actualMinutes: e.minutesActual || 0,
    status,
    date: rd ? rd.format('YYYY-MM-DD') : today,
    time: ct ? ct.format('HH:mm') : '--:--',
    taskTitle: e.taskTitle || ''
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const list = await focusApi.list()
    dataList.value = (list || []).map(entityToItem).sort((a, b) => 
      (b.date + b.time).localeCompare(a.date + a.time)
    )
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loadData()
  await loadTodoList()
})

// ============ 筛选 ============
const selectedCategory = ref<string | null>(null)
const searchText = ref('')
const tagList = ['今日', '本周', '已完成', '进行中', '超时长']

const catColorMap: Record<string, string> = Object.fromEntries(SCENE_LIST.map(s => [s.key, s.color]))

const getDayStart = (d: string) => dayjs(d).startOf('day')
const stats = computed(() => {
  const todayMin = dataList.value.filter(r => getDayStart(r.date).isSame(getDayStart(today))).reduce((s, r) => s + r.actualMinutes, 0)
  const totalCount = dataList.value.length
  const doneCount = dataList.value.filter(r => r.status === '已完成').length
  return { todayMin, totalCount, doneCount, doneRate: totalCount ? Math.round((doneCount / totalCount) * 100) : 0 }
})

const catCounts = computed(() => {
  const c: Record<string, number> = {}
  SCENE_LIST.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => { if (c[r.category] !== undefined) c[r.category]++ })
  return c
})

const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = r.title.toLowerCase() + (r.taskTitle || '').toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value && r.category !== selectedCategory.value) return false
  return true
}))

const sorted = computed(() => [...filtered.value])

// ============ 删除 ============
const del = (r: FocusItem) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => {
    try {
      if (r.id) await focusApi.remove(r.id)
      dataList.value = dataList.value.filter(x => x.id !== r.id)
      message.success('已删除')
    } catch { message.error('删除失败') }
  }
})
</script>

<template>
  <div class="focus-page">
    <!-- ============ 核心计时器面板 ============ -->
    <div class="timer-panel">
      <div class="timer-left">
        <!-- 场景选择 -->
        <div class="scene-selector">
          <button
            v-for="s in SCENE_LIST"
            :key="s.key"
            class="scene-btn"
            :class="{ active: timerState.scene === s.key }"
            :style="{ '--scene-color': s.color, '--scene-bg': s.bg }"
            @click="timerState.scene = s.key"
          >
            <component :is="s.icon" />
            <span>{{ s.key }}</span>
          </button>
        </div>
        
        <!-- 任务名称输入 -->
        <div class="task-input-row">
          <input
            v-model="timerState.title"
            class="task-name-input"
            :placeholder="timerState.running ? '专注任务中...' : '输入专注任务名称'"
            :disabled="timerState.running"
          />
        </div>

        <!-- 关联任务选择 -->
        <div class="task-link-row" v-if="!timerState.running">
          <div class="task-link-label">
            <LinkOutlined /> 关联待办任务：
          </div>
          <div v-if="timerState.taskTitle" class="selected-task">
            <FlagOutlined /> {{ timerState.taskTitle }}
            <button class="clear-task-btn" @click="clearTask">×</button>
          </div>
          <select v-else class="task-select" @change="handleTaskSelect">
            <option value="">不关联（纯番茄钟）</option>
            <option v-for="t in todoList" :key="t.id" :value="t.id">{{ t.title }}</option>
          </select>
          <button class="refresh-todo-btn" @click="loadTodoList" :disabled="timerState.running">
            <ReloadOutlined />
          </button>
        </div>
        <div class="task-link-row running-link" v-else-if="timerState.taskTitle">
          <FlagOutlined /> 关联：<strong>{{ timerState.taskTitle }}</strong>
        </div>

        <!-- 预设时长选择 -->
        <div class="duration-row" v-if="!timerState.running">
          <span class="duration-label">时长：</span>
          <button
            v-for="d in [15, 25, 50, 90]"
            :key="d"
            class="duration-btn"
            :class="{ active: timerState.duration === d }"
            @click="timerState.duration = d"
          >{{ d }}分钟</button>
          <label class="finish-on-complete">
            <input type="checkbox" v-model="timerState.taskDoneOnFinish" />
            完成番茄钟时自动标记任务完成
          </label>
        </div>
      </div>

      <!-- 计时器中心 -->
      <div class="timer-center">
        <div class="timer-circle" :class="{ running: timerState.running, paused: timerState.paused }">
          <svg viewBox="0 0 120 120" class="progress-ring">
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="var(--color-bg-card-2, #171A2E)"
              stroke-width="8"
            />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              :stroke="timerProgressColor"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 52"
              :stroke-dashoffset="2 * Math.PI * 52 * (1 - progressPercent / 100)"
              transform="rotate(-90 60 60)"
              style="transition: stroke-dashoffset 0.3s ease"
            />
          </svg>
          <div class="timer-display">
            <div class="timer-time">{{ formatTime(timerState.totalSeconds) }}</div>
            <div class="timer-duration">/ {{ timerState.duration }}:00</div>
          </div>
        </div>

        <div class="timer-controls">
          <template v-if="!timerState.running">
            <button class="timer-btn start" @click="startTimer" :disabled="!timerState.title">
              <PlayCircleOutlined /> 开始专注
            </button>
          </template>
          <template v-else-if="timerState.paused">
            <button class="timer-btn resume" @click="resumeTimer">
              <PlayCircleOutlined /> 继续
            </button>
            <button class="timer-btn finish" @click="stopTimer(true)">
              <CheckCircleOutlined /> 完成
            </button>
          </template>
          <template v-else>
            <button class="timer-btn pause" @click="pauseTimer">
              <PauseCircleOutlined /> 暂停
            </button>
            <button class="timer-btn finish" @click="stopTimer(true)">
              <CheckCircleOutlined /> 完成
            </button>
          </template>
          <button v-if="timerState.running || timerState.totalSeconds > 0" class="timer-btn cancel" @click="stopTimer(false)">
            <CloseCircleOutlined /> 放弃
          </button>
        </div>
      </div>

      <!-- 3统计卡 -->
      <div class="timer-right">
        <div class="stat-card" style="border-left-color: #5E6AD2">
          <div class="stat-icon"><ClockCircleOutlined /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayMin }}<span class="unit">分钟</span></div>
            <div class="stat-label">今日专注</div>
          </div>
        </div>
        <div class="stat-card" style="border-left-color: #FF375F">
          <div class="stat-icon"><ThunderboltOutlined /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalCount }}<span class="unit">次</span></div>
            <div class="stat-label">累计番茄钟</div>
          </div>
        </div>
        <div class="stat-card" style="border-left-color: #34C759">
          <div class="stat-icon"><TrophyOutlined /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.doneRate }}<span class="unit">%</span></div>
            <div class="stat-label">完成率</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 历史记录 ============ -->
    <div class="history-section">
      <div class="section-header">
        <div class="section-title"><HistoryOutlined /> 专注历史</div>
        <div class="section-actions">
          <button class="btn-text" @click="loadData"><ReloadOutlined /> 刷新</button>
          <a-input v-model:value="searchText" placeholder="搜索任务/关联待办" allow-clear size="small" style="width:200px">
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </div>
      </div>

      <!-- 分类筛选 -->
      <div class="category-filters">
        <div
          v-for="s in SCENE_LIST"
          :key="s.key"
          class="filter-chip"
          :class="{ active: selectedCategory === s.key }"
          :style="{ '--chip-color': s.color, '--chip-bg': s.bg }"
          @click="selectedCategory = selectedCategory === s.key ? null : s.key"
        >
          <component :is="s.icon" />
          <span>{{ s.key }}</span>
          <span class="chip-count">{{ catCounts[s.key] || 0 }}</span>
        </div>
      </div>

      <!-- 记录列表 -->
      <a-spin :spinning="loading" tip="加载中...">
        <div v-if="sorted.length" class="history-list">
          <div v-for="r in sorted" :key="r.id" class="history-card">
            <div class="history-indicator" :style="{ background: catColorMap[r.category] }"></div>
            <div class="history-body">
              <div class="history-title-row">
                <h4 class="history-title">{{ r.title }}</h4>
                <Tag :color="catColorMap[r.category]" class="history-tag">{{ r.category }}</Tag>
                <Tag v-if="r.status === '已完成'" color="#34C759" class="history-tag">✅ 已完成</Tag>
                <Tag v-else-if="r.status === '已打断'" color="#FF375F" class="history-tag">❌ 已打断</Tag>
                <Tag v-else color="#8E8E93" class="history-tag">{{ r.status }}</Tag>
              </div>
              <div class="history-meta">
                <span class="meta-item"><ClockCircleOutlined /> {{ r.date }} {{ r.time }}</span>
                <span class="meta-item" style="color:#34C759">⏱ 实际 {{ r.actualMinutes }} 分钟</span>
                <span class="meta-item" style="color:#5E6AD2">🎯 计划 {{ r.duration }} 分钟</span>
                <span v-if="r.taskTitle" class="meta-item task-linked" :title="r.taskTitle">
                  <FlagOutlined /> 关联：{{ r.taskTitle.length > 12 ? r.taskTitle.slice(0, 12) + '...' : r.taskTitle }}
                </span>
              </div>
            </div>
            <div class="history-actions">
              <Tooltip title="删除">
                <button class="action-btn" @click="del(r)"><DeleteOutlined /></button>
              </Tooltip>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">🍅</div>
          <div class="empty-text">还没有专注记录</div>
          <div class="empty-desc">点击上方「开始专注」按钮，开启你的第一个番茄钟</div>
        </div>
      </a-spin>
    </div>
  </div>
</template>

<style scoped>
.focus-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 2px 24px;
  color: var(--color-text);
}

/* ============ 计时器面板 ============ */
.timer-panel {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-xl, 18px);
  padding: 24px;
}
@media (max-width: 1100px) {
  .timer-panel { grid-template-columns: 1fr; }
}

/* 左侧：配置区 */
.timer-left { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.scene-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.scene-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--color-bg, #08090A);
  border: 1px solid var(--color-border, #1C1D22);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all .15s ease;
}
.scene-btn:hover { border-color: var(--scene-color); color: var(--scene-color); }
.scene-btn.active {
  background: var(--scene-bg);
  border-color: var(--scene-color);
  color: var(--scene-color);
}

.task-input-row { display: flex; gap: 8px; }
.task-name-input {
  flex: 1;
  padding: 12px 16px;
  border-radius: var(--radius-md, 10px);
  background: var(--color-bg, #08090A);
  border: 1px solid var(--color-border, #1C1D22);
  color: var(--color-text);
  font-size: 15px;
  outline: none;
  transition: border-color .15s ease;
}
.task-name-input:focus { border-color: var(--color-primary, #5E6AD2); }
.task-name-input::placeholder { color: var(--color-text-tertiary, #71717A); }

.task-link-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--color-bg, #08090A);
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--color-border, #1C1D22);
  font-size: 13px;
}
.task-link-label { color: var(--color-text-secondary); white-space: nowrap; }
.task-select {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.task-select option { background: var(--color-bg-card, #0D0E10); }
.selected-task {
  display: flex; align-items: center; gap: 6px;
  color: var(--color-primary, #5E6AD2);
  font-weight: 500;
}
.clear-task-btn {
  background: none; border: none; color: var(--color-text-tertiary);
  cursor: pointer; font-size: 16px; padding: 0 4px;
}
.clear-task-btn:hover { color: var(--color-error); }
.refresh-todo-btn {
  background: none; border: none; color: var(--color-text-tertiary);
  cursor: pointer; padding: 4px;
}
.refresh-todo-btn:hover { color: var(--color-primary); }
.running-link { color: var(--color-success); }

.duration-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.duration-label { font-size: 13px; color: var(--color-text-secondary); }
.duration-btn {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--color-bg, #08090A);
  border: 1px solid var(--color-border, #1C1D22);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all .15s ease;
}
.duration-btn:hover { border-color: var(--color-primary); color: var(--color-text); }
.duration-btn.active {
  background: var(--color-primary, #5E6AD2);
  border-color: var(--color-primary, #5E6AD2);
  color: #fff;
}
.finish-on-complete {
  margin-left: auto;
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--color-text-secondary);
  cursor: pointer;
}
.finish-on-complete input { accent-color: var(--color-primary); }

/* 中心计时器 */
.timer-center {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; min-width: 260px;
}
.timer-circle {
  position: relative; width: 240px; height: 240px;
  display: flex; align-items: center; justify-content: center;
}
.progress-ring { width: 100%; height: 100%; }
.timer-display {
  position: absolute; text-align: center;
}
.timer-time {
  font-size: 52px; font-weight: 300; letter-spacing: -2px;
  color: var(--color-text); font-variant-numeric: tabular-nums;
}
.timer-duration {
  font-size: 14px; color: var(--color-text-tertiary); margin-top: 4px;
}
.timer-circle.running .timer-time { animation: pulse 2s infinite; }
.timer-circle.paused .timer-time { color: var(--color-warning, #FF9F0A); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.timer-controls { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.timer-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-md, 10px);
  border: 1px solid transparent;
  font-size: 14px;
  cursor: pointer;
  transition: all .15s ease;
  font-weight: 500;
}
.timer-btn.start, .timer-btn.resume {
  background: var(--color-primary, #5E6AD2);
  color: #fff;
}
.timer-btn.start:hover, .timer-btn.resume:hover { filter: brightness(1.1); }
.timer-btn.start:disabled { opacity: 0.4; cursor: not-allowed; }
.timer-btn.pause {
  background: var(--color-warning, #FF9F0A);
  color: #fff;
}
.timer-btn.pause:hover { filter: brightness(1.1); }
.timer-btn.finish {
  background: var(--color-success, #34C759);
  color: #fff;
}
.timer-btn.finish:hover { filter: brightness(1.1); }
.timer-btn.cancel {
  background: var(--color-bg-elevated, #1C1D22);
  color: var(--color-text-secondary);
  border-color: var(--color-border, #1C1D22);
}
.timer-btn.cancel:hover { color: var(--color-error); border-color: var(--color-error); }

/* 右侧统计 */
.timer-right { display: flex; flex-direction: column; gap: 12px; }
.stat-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--color-bg, #08090A);
  border: 1px solid var(--color-border, #1C1D22);
  border-left: 3px solid #5E6AD2;
  border-radius: var(--radius-md, 10px);
}
.stat-icon {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  background: var(--color-bg-card-2, #171A2E);
  font-size: 18px;
}
.stat-value {
  font-size: 24px; font-weight: 600; color: var(--color-text);
  letter-spacing: -0.5px;
}
.stat-value .unit {
  font-size: 13px; color: var(--color-text-secondary); font-weight: 500; margin-left: 2px;
}
.stat-label { font-size: 12px; color: var(--color-text-secondary); }

/* ============ 历史记录 ============ */
.history-section {
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-xl, 18px);
  padding: 20px;
}
.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.section-title {
  font-size: 17px; font-weight: 600; color: var(--color-text);
  display: flex; align-items: center; gap: 8px;
}
.section-actions { display: flex; align-items: center; gap: 12px; }
.btn-text {
  background: none; border: 1px solid var(--color-border);
  color: var(--color-text-secondary); padding: 6px 12px;
  border-radius: var(--radius-sm); cursor: pointer; font-size: 12px;
  display: flex; align-items: center; gap: 4px;
}
.btn-text:hover { color: var(--color-text); border-color: var(--color-border-strong); }

.category-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 999px;
  background: var(--color-bg, #08090A);
  border: 1px solid var(--color-border, #1C1D22);
  color: var(--color-text-secondary);
  font-size: 13px; cursor: pointer;
  transition: all .15s ease;
}
.filter-chip:hover { border-color: var(--chip-color); color: var(--chip-color); }
.filter-chip.active {
  background: var(--chip-bg);
  border-color: var(--chip-color);
  color: var(--chip-color);
}
.chip-count {
  background: rgba(255,255,255,0.1);
  padding: 1px 7px; border-radius: 999px;
  font-size: 11px;
}

.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-card {
  display: flex; align-items: stretch;
  background: var(--color-bg, #08090A);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  transition: border-color .15s ease;
}
.history-card:hover { border-color: var(--color-border-strong, #27282F); }
.history-indicator { width: 4px; flex-shrink: 0; }
.history-body { flex: 1; padding: 12px 16px; min-width: 0; }
.history-title-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
  flex-wrap: wrap;
}
.history-title {
  margin: 0; font-size: 15px; font-weight: 600;
  color: var(--color-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.history-tag { margin: 0; }
.history-meta {
  display: flex; gap: 16px; flex-wrap: wrap;
  font-size: 12px; color: var(--color-text-secondary);
}
.meta-item { display: flex; align-items: center; gap: 4px; }
.task-linked { color: var(--color-primary, #5E6AD2); }
.history-actions {
  display: flex; align-items: center;
  padding: 0 10px;
  border-left: 1px solid var(--color-border);
}
.action-btn {
  background: none; border: none; color: var(--color-text-tertiary);
  cursor: pointer; padding: 6px; border-radius: 6px;
  display: flex; align-items: center;
}
.action-btn:hover { background: var(--color-bg-hover); color: var(--color-error); }

.empty-state {
  text-align: center; padding: 40px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.empty-icon { font-size: 48px; }
.empty-text { font-size: 16px; color: var(--color-text); font-weight: 500; }
.empty-desc { font-size: 13px; color: var(--color-text-tertiary); }
</style>
