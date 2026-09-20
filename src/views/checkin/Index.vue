<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, CalendarOutlined,
  CheckCircleFilled
} from '@ant-design/icons-vue'
import { checkinApi, checkinPanelApi } from '@/api/modules'
import type { HabitPanelItem, PanelStats } from '@/api/modules'
import dayjs from 'dayjs'

// ========== 颜色与分组配置 ==========
const HABIT_COLORS = ['#FF9F0A', '#0A84FF', '#FF453A', '#34C759', '#5E6AD2', '#BF5AF2', '#FF375F', '#64D2FF']
const groupColorMap: Record<string, string> = {
  '健康运动': '#34C759', '学习成长': '#0A84FF', '工作效率': '#FF9F0A',
  '生活作息': '#FF9F0A', '个人成长': '#5E6AD2', '写作': '#BF5AF2', '健身': '#FF453A',
  '每日复盘': '#5E6AD2', '代码提交': '#0A84FF', '早起': '#FF9F0A', '阅读': '#0A84FF'
}
const getHabitColor = (h: HabitPanelItem, idx: number): string => {
  const fromGroup = h.title ? Object.keys(groupColorMap).find(k => h.title.includes(k)) : null
  if (fromGroup) return groupColorMap[fromGroup]
  if (h.groupName && groupColorMap[h.groupName]) return groupColorMap[h.groupName]
  return HABIT_COLORS[idx % HABIT_COLORS.length]
}

// ========== 顶部统计 ==========
const loading = ref(false)
const habits = ref<HabitPanelItem[]>([])
// 仅保留后端 PanelStats 真实返回的字段（total/done/pending/rate/maxStreak）
const stats = ref<PanelStats>({ total: 0, done: 0, pending: 0, rate: 0, maxStreak: 0 })
const today = dayjs()
const todayStr = today.format('YYYY-MM-DD')
const weekdayCn = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][today.day()]

// 近 7 天打卡矩阵（habit_id -> Set<yyyy-MM-dd>），数据全部来自后端 monthDates 真实接口
const weekMap = ref<Map<number, Set<string>>>(new Map())

// 近 7 天日期（从今天往前 6 天 + 今天）
const weekDates = computed(() => {
  const list = []
  for (let i = 6; i >= 0; i--) {
    list.push(today.subtract(i, 'day'))
  }
  return list
})
const weekShortLabels = computed(() => weekDates.value.map(d => ['S','M','T','W','T','F','S'][d.day()]))
const weekShortDates = computed(() => weekDates.value.map(d => `${d.month()}/${d.date()}`))
const todayLabel = computed(() => `${weekdayCn} · ${today.month() + 1}/${today.date()}`)

// 近 7 天窗口跨越的月份（通常 1 个，月初时会跨到上个月）
const windowMonths = computed(() => {
  const months: { year: number; month: number }[] = []
  weekDates.value.forEach(d => {
    const year = d.year()
    const month = d.month() + 1
    if (!months.some(m => m.year === year && m.month === month)) months.push({ year, month })
  })
  return months
})

// 逐习惯拉取近 7 天窗口内的真实打卡日期（后端 monthDates 返回 yyyy-MM-dd）
const loadWeekMap = async () => {
  if (!habits.value.length) {
    weekMap.value = new Map()
    return
  }
  try {
    const map = new Map<number, Set<string>>()
    for (const h of habits.value) {
      const set = new Set<string>()
      for (const m of windowMonths.value) {
        const dates = await checkinPanelApi.monthDates(h.id as number, m.year, m.month)
        const list = dates || []
        list.forEach(d => set.add(d))
      }
      map.set(h.id as number, set)
    }
    weekMap.value = map
  } catch (e: any) {
    // 拿不到真实数据就留空，绝不编造打卡日期
    weekMap.value = new Map()
    message.error(`近 7 天打卡数据加载失败：${e?.message || e}`)
  }
}

// ========== 派生 4 张卡片数据 ==========
const todayDonePending = computed(() => {
  const done = habits.value.filter(h => h.todayDone).length
  const pending = habits.value.length - done
  return { done, pending }
})
// 累计打卡次数 = 各习惯真实 totalCount 之和（后端未提供全局累计字段）
const totalCheckinCount = computed(() =>
  habits.value.reduce((sum, h) => sum + (h.totalCount || 0), 0)
)
const topCards = computed(() => [
  {
    label: '今日完成',
    value: `${todayDonePending.value.done} / ${habits.value.length || 0}`,
    extra: todayDonePending.value.pending > 0
      ? { text: `还差 ${todayDonePending.value.pending} 个`, color: 'var(--color-warning)' }
      : { text: '今日已全部完成 ✨', color: 'var(--color-success)' },
    accent: 'var(--color-warning)'
  },
  {
    label: '最长连击',
    value: `${stats.value.maxStreak || 0} 天`,
    extra: {
      text: stats.value.longestStreakName || '继续坚持',
      color: 'var(--color-success)'
    },
    accent: 'var(--color-success)'
  },
  {
    // 后端 PanelStats 未提供「本周完成率」字段，这里不做任何估算，直接展示占位
    label: '本周完成率',
    value: '—',
    extra: {
      text: '后端暂未提供该指标',
      color: 'var(--color-text-secondary)'
    },
    accent: 'var(--color-primary)'
  },
  {
    // 累计打卡 = 各习惯真实 totalCount 之和
    label: '累计打卡',
    value: totalCheckinCount.value.toLocaleString(),
    extra: {
      text: '全部记录',
      color: 'var(--color-text-secondary)'
    },
    accent: 'var(--color-info)'
  }
])

// ========== 加载 ==========
const loadPanel = async () => {
  loading.value = true
  try {
    const res = await checkinPanelApi.panel()
    habits.value = res?.habits || []
    stats.value = res?.stats || { total: 0, done: 0, pending: 0, rate: 0, maxStreak: 0 }

    // 找到最长连击的习惯名
    const s = stats.value as PanelStats
    let longest: HabitPanelItem | null = null
    const hlist: HabitPanelItem[] = habits.value
    for (let i = 0; i < hlist.length; i++) {
      const h = hlist[i]
      if (!longest || (h.streak || 0) > (longest.streak || 0)) longest = h
    }
    if (longest) s.longestStreakName = (longest as HabitPanelItem).title

    // 近 7 天打卡格：改用后端 monthDates 真实数据（不再本地编造）
    await loadWeekMap()
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
    const s = weekMap.value.get(h.id as number) || new Set()
    if (done) {
      s.add(todayStr)
      h.streak = (h.streak || 0) + 1
      h.totalCount = (h.totalCount || 0) + 1
      message.success(`「${h.title}」打卡成功！连续 ${h.streak} 天`)
    } else {
      s.delete(todayStr)
      h.streak = Math.max(0, (h.streak || 0) - 1)
      h.totalCount = Math.max(0, (h.totalCount || 0) - 1)
      message.info(`已取消今日「${h.title}」打卡`)
    }
    weekMap.value.set(h.id as number, s)
    stats.value.maxStreak = habits.value.reduce((m, x) => Math.max(m, x.streak || 0), 0)
    const longest = habits.value.reduce((a: HabitPanelItem | null, b) => (!a || (b.streak || 0) > (a.streak || 0) ? b : a), null as HabitPanelItem | null)
    if (longest) stats.value.longestStreakName = longest.title
  } catch (e: any) {
    message.error(`打卡失败：${e?.message || e}`)
  } finally {
    punchingIds.value.delete(h.id as number)
  }
}

// ========== 近 7 天小方块渲染 ==========
const isDateDone = (h: HabitPanelItem, dateStr: string) => {
  if (dateStr === todayStr) return !!h.todayDone
  return weekMap.value.get(h.id as number)?.has(dateStr) ?? false
}

// ========== 新增/编辑 弹窗 ==========
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

// ========== 月历弹窗 ==========
const calVisible = ref(false)
const calHabit = ref<HabitPanelItem | null>(null)
const calYear = ref(today.year())
const calMonth = ref(today.month() + 1)
const calDates = ref<Set<string>>(new Set())
const calLoading = ref(false)
const openCalendar = async (h: HabitPanelItem) => {
  calHabit.value = h
  calYear.value = today.year()
  calMonth.value = today.month() + 1
  calVisible.value = true
  await loadCalDates()
}
const loadCalDates = async () => {
  if (!calHabit.value?.id) return
  calLoading.value = true
  try {
    const dates = await checkinPanelApi.monthDates(calHabit.value.id as number, calYear.value, calMonth.value)
    calDates.value = new Set(dates || [])
  } catch (e: any) {
    // 失败时把日历回退为空，并提示用户
    calDates.value = new Set()
    message.error(`日历数据加载失败：${e?.message || e}`)
  } finally {
    calLoading.value = false
  }
}
const calGrid = computed(() => {
  const y = calYear.value, m = calMonth.value
  const first = new Date(y, m - 1, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const cells: any[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: 0 })
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
    <!-- 4 张顶部统计卡 -->
    <div class="top-cards">
      <div
        v-for="(c, i) in topCards"
        :key="i"
        class="top-card"
        :style="{ borderLeftColor: c.accent }"
      >
        <div class="card-label">{{ c.label }}</div>
        <div class="card-value">{{ c.value }}</div>
        <div class="card-extra" :style="{ color: c.extra.color }">{{ c.extra.text }}</div>
      </div>
    </div>

    <!-- 今日习惯大卡片 -->
    <div class="habit-panel">
      <div class="panel-header">
        <div class="panel-title">今日习惯</div>
        <div class="panel-date">{{ todayLabel }}</div>
      </div>

      <div v-if="habits.length" class="habit-list">
        <div
          v-for="(h, i) in habits"
          :key="h.id"
          class="habit-row"
          :class="{ done: h.todayDone }"
          @click="punch(h)"
        >
          <!-- 左：颜色圆点 + 名字 -->
          <div class="habit-left">
            <span
              class="habit-dot"
              :style="{ background: getHabitColor(h, i) }"
            />
            <span class="habit-name">{{ h.title }}</span>
          </div>

          <!-- 中：连击数 -->
          <div class="habit-streak">
            <span class="streak-num">{{ h.streak || 0 }}</span>
            <span class="streak-label">天连击</span>
          </div>

          <!-- 右：近 7 天小方块阵列 -->
          <div class="week-dots" :title="weekShortDates.join(' · ')">
            <div
              v-for="(d, di) in weekDates"
              :key="di"
              class="week-dot"
              :class="{
                done: isDateDone(h, d.format('YYYY-MM-DD')),
                today: d.format('YYYY-MM-DD') === todayStr
              }"
            />
          </div>

          <!-- 最右操作按钮（不参与整行点击打卡） -->
          <div class="habit-actions" @click.stop>
            <a-tooltip title="月历查看">
              <button class="action-btn" @click="openCalendar(h)"><CalendarOutlined /></button>
            </a-tooltip>
            <a-tooltip title="编辑">
              <button class="action-btn" @click="openEdit(h)"><EditOutlined /></button>
            </a-tooltip>
            <a-tooltip title="删除">
              <button class="action-btn danger" @click="handleDelete(h)"><DeleteOutlined /></button>
            </a-tooltip>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="habit-empty">
        <div class="empty-icon">🌱</div>
        <div class="empty-text">还没有习惯，点击右上角「添加习惯」开始记录</div>
      </div>
      <a-spin v-else :spinning="loading" class="habit-loading" />
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
  gap: 20px;
  min-height: 100%;
}

/* —— 4 张顶部卡 —— */
.top-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.top-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  border-left: 3px solid var(--color-primary);
  transition: all 0.18s ease;
}
.top-card:hover {
  transform: translateY(-1px);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
}
.card-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.card-value {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.card-extra {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 500;
}

/* —— 今日习惯大卡片 —— */
.habit-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border);
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}
.panel-date {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.habit-list {
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.habit-row {
  display: grid;
  grid-template-columns: 1.4fr 120px 1fr auto;
  align-items: center;
  padding: 12px 12px 12px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.12s ease;
  gap: 16px;
}
.habit-row:hover {
  background: var(--color-bg-hover);
}
.habit-row.done {
  background: var(--color-success-soft);
}
.habit-row.done:hover {
  background: rgba(52, 199, 89, 0.18);
}

.habit-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.habit-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px var(--color-bg-card);
  outline: 1px solid var(--color-border);
}
.habit-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.habit-streak {
  text-align: right;
  padding-right: 12px;
}
.streak-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}
.streak-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-left: 4px;
}

/* —— 近 7 天圆点阵列 —— */
.week-dots {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
}
.week-dot {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  transition: all 0.12s;
}
.week-dot.done {
  background: var(--color-success);
  border-color: var(--color-success);
  box-shadow: 0 2px 4px rgba(52, 199, 89, 0.25);
}
.week-dot.today {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-soft);
}
.week-dot.today.done {
  box-shadow: 0 0 0 2px var(--color-primary-soft), 0 2px 4px rgba(52, 199, 89, 0.3);
}

/* —— 操作按钮 —— */
.habit-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s;
}
.habit-row:hover .habit-actions {
  opacity: 1;
}
.action-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.12s;
}
.action-btn:hover {
  background: var(--color-bg-elevated);
  color: var(--color-text);
}
.action-btn.danger:hover {
  background: var(--color-error-soft);
  color: var(--color-error);
}

/* 页面 slot 里的按钮（覆盖默认 a-button 样式，贴合设计稿） */
:deep(.primary-btn),
:deep(.ghost-btn) {
  height: 40px !important;
  border-radius: 10px !important;
  padding: 0 16px !important;
  font-weight: 500 !important;
}
:deep(.primary-btn) {
  background: var(--color-primary) !important;
  border: none !important;
}
:deep(.primary-btn:hover) { background: var(--color-primary-hover) !important; }
:deep(.ghost-btn) {
  background: var(--header-btn-bg) !important;
  border: 1px solid var(--color-border) !important;
  color: var(--color-text) !important;
}
:deep(.ghost-btn:hover) {
  background: var(--header-btn-bg-hover) !important;
  border-color: var(--color-border-strong) !important;
}

/* 空状态 */
.habit-empty {
  padding: 56px 24px 48px;
  text-align: center;
}
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-text { font-size: 13px; color: var(--color-text-secondary); }
.habit-loading { padding: 48px 0; }

/* —— 月历弹窗样式（贴合深色主题） —— */
:deep(.ant-modal-content) {
  background: var(--color-bg-card) !important;
  border: 1px solid var(--color-border-strong) !important;
}
:deep(.ant-modal-header) {
  background: var(--color-bg-card) !important;
  border-bottom: 1px solid var(--color-border) !important;
}
:deep(.ant-modal-title) { color: var(--color-text) !important; }
:deep(.ant-modal-close-x) { color: var(--color-text-secondary) !important; }
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.cal-title { font-size: 14px; font-weight: 500; color: var(--color-text); }
.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
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
  background: var(--color-bg-card-2);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.cal-cell.empty { border: none; background: transparent; }
.cal-cell.done {
  background: var(--color-success-soft);
  border-color: rgba(52, 199, 89, 0.3);
  color: var(--color-text);
}
.cal-cell.today {
  border-color: var(--color-primary);
  border-width: 2px;
}
.cell-day { line-height: 1; color: var(--color-text); }
.cal-cell.done .cell-day { color: var(--color-success); font-weight: 600; }
.cell-check { color: var(--color-success); font-size: 14px; margin-top: 2px; }

@media (max-width: 1200px) {
  .top-cards { grid-template-columns: repeat(2, 1fr); }
  .habit-row { grid-template-columns: 1fr 100px 1fr auto; }
}
@media (max-width: 720px) {
  .top-cards { grid-template-columns: 1fr; }
  .habit-streak { display: none; }
  .habit-row { grid-template-columns: 1fr 1fr auto; }
}
</style>
