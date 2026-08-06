<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  CheckCircleFilled, PlusOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, CalendarOutlined,
  FireFilled, ClockCircleOutlined, TrophyOutlined,
  AimOutlined
} from '@ant-design/icons-vue'
import { checkinApi, checkinPanelApi } from '@/api/modules'
import type { HabitPanelItem, PanelStats } from '@/api/modules'

// ========== 面板数据 ==========
const loading = ref(false)
const habits = ref<HabitPanelItem[]>([])
const stats = ref<PanelStats>({ total: 0, done: 0, pending: 0, rate: 0, maxStreak: 0 })

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const weekday = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()]

// 分组
const groupColorMap: Record<string, string> = {
  '健康运动': '#52c41a', '学习成长': '#1677ff', '工作效率': '#fa8c16',
  '生活作息': '#13c2c2', '个人成长': '#722ed1'
}
const groups = computed(() => {
  const map = new Map<string, HabitPanelItem[]>()
  for (const h of habits.value) {
    const g = h.groupName || '未分组'
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(h)
  }
  return Array.from(map.entries()).map(([name, list]) => ({ name, list }))
})

const loadPanel = async () => {
  loading.value = true
  try {
    const res = await checkinPanelApi.panel()
    habits.value = res?.habits || []
    stats.value = res?.stats || { total: 0, done: 0, pending: 0, rate: 0, maxStreak: 0 }
  } catch (e: any) {
    message.error(`加载失败：${e?.message || e}`)
  } finally {
    loading.value = false
  }
}
onMounted(loadPanel)

// ========== 打卡 ==========
const punchingIds = ref<Set<number>>(new Set())
const punch = async (h: HabitPanelItem) => {
  if (punchingIds.value.has(h.id as number)) return
  punchingIds.value.add(h.id as number)
  try {
    const done = await checkinPanelApi.punch(h.id as number)
    h.todayDone = done
    if (done) {
      h.streak = (h.streak || 0) + 1
      h.totalCount = (h.totalCount || 0) + 1
      message.success(`「${h.title}」打卡成功！连续 ${h.streak} 天`)
    } else {
      h.streak = Math.max(0, (h.streak || 0) - 1)
      h.totalCount = Math.max(0, (h.totalCount || 0) - 1)
      message.info(`已取消今日「${h.title}」打卡`)
    }
    // 重算顶部统计
    const doneCount = habits.value.filter(x => x.todayDone).length
    stats.value.done = doneCount
    stats.value.pending = habits.value.length - doneCount
    stats.value.rate = habits.value.length === 0 ? 0 : Math.round(doneCount * 100 / habits.value.length)
    // 最长连续
    stats.value.maxStreak = habits.value.reduce((m, x) => Math.max(m, x.streak || 0), 0)
  } catch (e: any) {
    message.error(`打卡失败：${e?.message || e}`)
  } finally {
    punchingIds.value.delete(h.id as number)
  }
}

// ========== 新增/编辑习惯 ==========
const formVisible = ref(false)
const formLoading = ref(false)
const isEdit = ref(false)
const formModel = ref<any>({ title: '', groupName: '健康运动', cycle: '每日', log: '' })

const groupOptions = [
  { label: '健康运动', value: '健康运动' },
  { label: '学习成长', value: '学习成长' },
  { label: '工作效率', value: '工作效率' },
  { label: '生活作息', value: '生活作息' },
  { label: '个人成长', value: '个人成长' }
]
const cycleOptions = [
  { label: '每日打卡', value: '每日' },
  { label: '每周打卡', value: '每周' },
  { label: '每月打卡', value: '每月' },
  { label: '自定义周期', value: '自定义' }
]

const openAdd = () => {
  isEdit.value = false
  formModel.value = { title: '', groupName: '健康运动', cycle: '每日', log: '' }
  formVisible.value = true
}
const openEdit = (h: HabitPanelItem) => {
  isEdit.value = true
  formModel.value = { id: h.id, title: h.title, groupName: h.groupName, cycle: h.cycle, log: h.log }
  formVisible.value = true
}
const saveForm = async () => {
  if (!formModel.value.title?.trim()) { message.warning('请输入习惯名称'); return }
  formLoading.value = true
  try {
    if (isEdit.value && formModel.value.id) {
      await checkinApi.update(formModel.value)
      message.success('更新成功')
    } else {
      await checkinApi.add(formModel.value)
      message.success('新建成功')
    }
    formVisible.value = false
    await loadPanel()
  } catch (e: any) {
    message.error(`保存失败：${e?.message || e}`)
  } finally {
    formLoading.value = false
  }
}

const handleDelete = (h: HabitPanelItem) => {
  Modal.confirm({
    title: `确认删除习惯「${h.title}」？`,
    content: `已打卡 ${h.totalCount || 0} 次，删除后打卡记录将一并清除`,
    okType: 'danger',
    onOk: async () => {
      await checkinApi.remove(h.id as number)
      message.success('已删除')
      await loadPanel()
    }
  })
}

// ========== 月历查看 ==========
const calVisible = ref(false)
const calHabit = ref<HabitPanelItem | null>(null)
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)
const calDates = ref<Set<string>>(new Set())
const calLoading = ref(false)

const openCalendar = async (h: HabitPanelItem) => {
  calHabit.value = h
  calYear.value = today.getFullYear()
  calMonth.value = today.getMonth() + 1
  calVisible.value = true
  await loadCalDates()
}
const loadCalDates = async () => {
  if (!calHabit.value?.id) return
  calLoading.value = true
  try {
    const dates = await checkinPanelApi.monthDates(calHabit.value.id as number, calYear.value, calMonth.value)
    calDates.value = new Set(dates || [])
  } finally {
    calLoading.value = false
  }
}
const calGrid = computed(() => {
  const y = calYear.value, m = calMonth.value
  const first = new Date(y, m - 1, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells: { day: number; date: string; done: boolean; isToday: boolean }[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: 0, date: '', done: false, isToday: false } as any)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, date: dateStr, done: calDates.value.has(dateStr), isToday: dateStr === todayStr })
  }
  return cells
})
const calMonthDone = computed(() => Array.from(calDates.value).length)
const prevMonth = () => {
  if (calMonth.value === 1) { calMonth.value = 12; calYear.value-- } else calMonth.value--
  loadCalDates()
}
const nextMonth = () => {
  if (calMonth.value === 12) { calMonth.value = 1; calYear.value++ } else calMonth.value++
  loadCalDates()
}
</script>

<template>
  <div class="checkin-page">
    <!-- 顶部统计 -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e6f4ff;color:#1677ff"><AimOutlined /></div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.total }}</div>
          <div class="stat-label">习惯总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#f6ffed;color:#52c41a"><CheckCircleFilled /></div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.done }}<span class="stat-sub">/{{ stats.total }}</span></div>
          <div class="stat-label">今日完成</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fff7e6;color:#fa8c16"><ClockCircleOutlined /></div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.pending }}</div>
          <div class="stat-label">待打卡</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fff1f0;color:#ff4d4f"><FireFilled /></div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.maxStreak }}</div>
          <div class="stat-label">最长连续(天)</div>
        </div>
      </div>
      <div class="stat-card rate-card">
        <div class="rate-ring" :style="{ background: `conic-gradient(#52c41a ${stats.rate * 3.6}deg, #f0f0f0 0deg)` }">
          <div class="rate-inner">{{ stats.rate }}%</div>
        </div>
        <div class="stat-info">
          <div class="stat-label">今日完成率</div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="today-text">📅 {{ todayStr }} 星期{{ weekday }}</span>
      </div>
      <div class="toolbar-right">
        <a-button size="small" @click="loadPanel" :loading="loading"><ReloadOutlined /> 刷新</a-button>
        <a-button type="primary" size="small" @click="openAdd"><PlusOutlined /> 新建习惯</a-button>
      </div>
    </div>

    <!-- 习惯分组卡片 -->
    <div v-if="groups.length" class="groups">
      <div v-for="g in groups" :key="g.name" class="group-block">
        <div class="group-header">
          <span class="group-dot" :style="{ background: groupColorMap[g.name] || '#999' }"></span>
          <span class="group-name">{{ g.name }}</span>
          <span class="group-count">{{ g.list.length }} 个习惯</span>
        </div>
        <div class="habit-cards">
          <div
            v-for="h in g.list"
            :key="h.id"
            class="habit-card"
            :class="{ done: h.todayDone }"
          >
            <div class="habit-top">
              <div class="habit-title" :title="h.title">{{ h.title }}</div>
              <a-tag v-if="h.cycle" :color="h.cycle === '每日' ? 'green' : h.cycle === '每周' ? 'blue' : 'orange'" style="font-size:11px;margin:0">{{ h.cycle }}</a-tag>
            </div>
            <div class="habit-meta">
              <span class="meta-item" :class="{ hot: h.streak >= 3 }">
                <FireFilled /> 连续 {{ h.streak || 0 }} 天
              </span>
              <span class="meta-item"><TrophyOutlined /> 累计 {{ h.totalCount || 0 }} 次</span>
            </div>
            <div class="habit-actions">
              <a-button
                :type="h.todayDone ? 'default' : 'primary'"
                size="small"
                :loading="punchingIds.has(h.id!)"
                @click="punch(h)"
                class="punch-btn"
              >
                <CheckCircleFilled v-if="h.todayDone" />
                {{ h.todayDone ? '今日已打卡' : '一键打卡' }}
              </a-button>
              <a-tooltip title="月历"><a-button type="text" size="small" @click="openCalendar(h)"><CalendarOutlined /></a-button></a-tooltip>
              <a-tooltip title="编辑"><a-button type="text" size="small" @click="openEdit(h)"><EditOutlined /></a-button></a-tooltip>
              <a-tooltip title="删除"><a-button type="text" size="small" danger @click="handleDelete(h)"><DeleteOutlined /></a-button></a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <a-empty description="还没有习惯，点击右上角新建一个开始打卡吧">
        <a-button type="primary" @click="openAdd"><PlusOutlined /> 新建习惯</a-button>
      </a-empty>
    </div>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:open="formVisible"
      :title="isEdit ? '编辑习惯' : '新建习惯'"
      :confirm-loading="formLoading"
      @ok="saveForm"
      width="560px"
    >
      <a-form layout="vertical" style="margin-top:16px">
        <a-form-item label="习惯名称" required>
          <a-input v-model:value="formModel.title" placeholder="例如：每日阅读30分钟" allow-clear />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="所属分组">
              <a-select v-model:value="formModel.groupName" :options="groupOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="循环周期">
              <a-select v-model:value="formModel.cycle" :options="cycleOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="formModel.log" :rows="3" placeholder="可填写目标、提醒等" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 月历弹窗 -->
    <a-modal
      v-model:open="calVisible"
      :title="`「${calHabit?.title}」打卡日历`"
      :footer="null"
      width="520px"
    >
      <div class="cal-header">
        <a-button size="small" @click="prevMonth">‹ 上月</a-button>
        <span class="cal-title">{{ calYear }}年{{ calMonth }}月 · 已打 {{ calMonthDone }} 天</span>
        <a-button size="small" @click="nextMonth">下月 ›</a-button>
      </div>
      <div class="cal-week">
        <span v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</span>
      </div>
      <a-spin :spinning="calLoading">
      <div class="cal-grid">
        <div
          v-for="(c, i) in calGrid"
          :key="i"
          class="cal-cell"
          :class="{ empty: !c.day, done: c.done, today: c.isToday }"
        >
          <span v-if="c.day" class="cell-day">{{ c.day }}</span>
          <CheckCircleFilled v-if="c.done" class="cell-check" />
        </div>
      </div>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped>
.checkin-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 顶部统计 */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.stat-num {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
}
.stat-sub {
  font-size: 13px;
  color: var(--color-text-secondary, #999);
  font-weight: normal;
}
.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary, #999);
  margin-top: 2px;
}
.rate-card {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.rate-ring {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rate-inner {
  width: 42px;
  height: 42px;
  background: var(--color-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #52c41a;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.today-text {
  font-size: 15px;
  font-weight: 500;
}
.toolbar-right {
  display: flex;
  gap: 8px;
}

/* 分组 */
.group-block {
  margin-bottom: 16px;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 0 2px;
}
.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.group-name {
  font-size: 14px;
  font-weight: 600;
}
.group-count {
  font-size: 12px;
  color: var(--color-text-secondary, #999);
}
.habit-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.habit-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px;
  transition: all 0.2s;
}
.habit-card.done {
  border-color: #b7eb8f;
  background: #f6ffed;
}
.habit-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.habit-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.habit-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.habit-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--color-text-secondary, #999);
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta-item.hot {
  color: #fa541c;
}
.habit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.punch-btn {
  margin-right: auto;
}

.empty-state {
  padding: 60px 0;
}

/* 月历 */
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.cal-title {
  font-size: 14px;
  font-weight: 500;
}
.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary, #999);
  margin-bottom: 6px;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cal-cell {
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 13px;
}
.cal-cell.empty {
  border: none;
}
.cal-cell.done {
  background: #f6ffed;
  border-color: #b7eb8f;
}
.cal-cell.today {
  border-color: #1677ff;
  border-width: 2px;
}
.cell-day {
  line-height: 1;
}
.cell-check {
  color: #52c41a;
  font-size: 14px;
  margin-top: 2px;
}

@media (max-width: 1200px) {
  .stats-bar { grid-template-columns: repeat(3, 1fr); }
  .rate-card { grid-column: span 1; }
}
</style>
