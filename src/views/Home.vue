<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  RiseOutlined,
  FireOutlined,
  UserAddOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BulbOutlined,
  PlusOutlined,
  EditOutlined,
  PlayCircleOutlined,
  EnvironmentOutlined,
  DashboardOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { statsApi, todoApi, checkinPanelApi, moneyApi, mediaBoardApi, type DashboardStatsVO, type PanelData, type MediaBoard } from '@/api/modules'
import type { Todo } from '@/api/todo'

const router = useRouter()
const authStore = useAuthStore()

const weekdayMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayText = computed(() => {
  const d = dayjs()
  return `${d.format('YYYY年MM月DD日')} ${weekdayMap[d.day()]}`
})

const dailyQuote = ref('将注意力集中在当下，一步一个脚印地向前走。')
const nickname = computed(() => authStore.userInfo?.nickname || '晓贵')

const loading = ref(false)
const dashboard = ref<DashboardStatsVO | null>(null)
const todoList = ref<Todo[]>([])
// 打卡 / 记账 / 自媒体看板的真实数据源，用于首页图表与完成率
const checkinPanel = ref<PanelData | null>(null)
const moneyList = ref<any[]>([])
const mediaList = ref<MediaBoard[]>([])
const nowTick = ref(Date.now())
let timer: number | undefined

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

onMounted(() => {
  timer = window.setInterval(() => { nowTick.value = Date.now() }, 60 * 1000)
  if (authStore.token && !authStore.userInfo) {
    try { authStore.fetchUserInfo() } catch { /* ignore */ }
  }
  if (authStore.token) {
    loadAllData()
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const loadAllData = async () => {
  loading.value = true
  try {
    const [dashRes, todoRes, panelRes, moneyRes, mediaRes] = await Promise.all([
      statsApi.dashboard().catch(() => null),
      todoApi.list().catch(() => []),
      checkinPanelApi.panel().catch(() => null),
      moneyApi.list().catch(() => []),
      mediaBoardApi.list().catch(() => [])
    ])
    if (dashRes) dashboard.value = dashRes as any
    todoList.value = Array.isArray(todoRes) ? todoRes : (todoRes as any)?.records ?? []
    checkinPanel.value = panelRes as any
    moneyList.value = Array.isArray(moneyRes) ? moneyRes : []
    mediaList.value = Array.isArray(mediaRes) ? mediaRes : []
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const priorityMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
  P0: { label: 'P0', color: '#FF453A', bg: 'rgba(255,69,58,0.12)', border: 'rgba(255,69,58,0.30)' },
  P1: { label: 'P1', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)', border: 'rgba(255,159,10,0.30)' },
  P2: { label: 'P2', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)', border: 'rgba(10,132,255,0.30)' },
  P3: { label: 'P3', color: 'var(--color-text-secondary)', bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.30)' },
  high: { label: '高', color: '#FF453A', bg: 'rgba(255,69,58,0.12)', border: 'rgba(255,69,58,0.30)' },
  medium: { label: '中', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)', border: 'rgba(255,159,10,0.30)' },
  low: { label: '低', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)', border: 'rgba(10,132,255,0.30)' }
}

const getPriorityMeta = (p?: string) => {
  const key = (p || 'P2').toUpperCase()
  return priorityMeta[key] || priorityMeta.P2
}

const countdownText = (deadline?: string): { text: string; urgent: boolean; warn: boolean } => {
  if (!deadline) return { text: '无截止', urgent: false, warn: false }
  const d = dayjs(deadline)
  const diff = d.valueOf() - nowTick.value
  if (diff <= 0) return { text: '已逾期', urgent: true, warn: false }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  let text = ''
  if (days > 0) text = `${days}天${hours}小时`
  else if (hours > 0) text = `${hours}小时${mins}分`
  else text = `${mins}分钟`
  return { text, urgent: days === 0 && hours < 2, warn: days <= 1 && days >= 0 }
}

const todayTodos = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return todoList.value
    .filter(t => {
      if (t.done === 1) return false
      if (t.deadline && dayjs(t.deadline).format('YYYY-MM-DD') <= today) return true
      if (t.createTime && dayjs(t.createTime).format('YYYY-MM-DD') === today) return true
      return false
    })
    .sort((a, b) => {
      const order = ['P0', 'P1', 'P2', 'P3', 'high', 'medium', 'low']
      const ai = order.indexOf((a.priority || 'P2').toUpperCase())
      const bi = order.indexOf((b.priority || 'P2').toUpperCase())
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      const ad = a.deadline ? dayjs(a.deadline).valueOf() : 9e15
      const bd = b.deadline ? dayjs(b.deadline).valueOf() : 9e15
      return ad - bd
    })
    .slice(0, 8)
})

const overviewStats = computed(() => {
  const d = dashboard.value
  const todayCount = todayTodos.value.length
  const doingCount = todoList.value.filter(t => t.done !== 1 && (t.pomoCount ?? 0) > 0).length
  // 仅统计真实标记为完成、且本周内更新过的任务，不再用随机数兜底
  const weekDone = todoList.value.filter(t =>
    t.done === 1 && t.updateTime && dayjs(t.updateTime).isAfter(dayjs().startOf('week'))
  ).length
  const weekTotal = weekDone + todayCount + doingCount
  const weekRate = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0
  const monthOutput = (d?.mediaBoardCount ?? 0) + (d?.docsCount ?? 0) * 2 + (d?.techNoteCount ?? 0) * 3
  return {
    today: { label: '今日任务', value: todayCount, suffix: '项', icon: CalendarOutlined, color: 'var(--color-primary)', soft: 'rgba(94,106,210,0.12)' },
    doing: { label: '进行中', value: doingCount, suffix: '个', icon: PlayCircleOutlined, color: '#FF9F0A', soft: 'rgba(255,159,10,0.12)' },
    weekRate: { label: '本周完成率', value: weekRate, suffix: '%', icon: CheckCircleOutlined, color: '#34C759', soft: 'rgba(52,199,89,0.12)' },
    monthOutput: { label: '本月产出', value: monthOutput, suffix: '件', icon: DashboardOutlined, color: '#0A84FF', soft: 'rgba(10,132,255,0.12)' }
  }
})

// 打卡完成情况：直接取打卡面板的真实统计
const checkinRingData = computed(() => {
  const s = checkinPanel.value?.stats
  const total = Number(s?.total ?? 0)
  const done = Number(s?.done ?? 0)
  return {
    total,
    done,
    pending: Math.max(total - done, 0),
    rate: total > 0 ? Math.round((done / total) * 100) : 0
  }
})

const checkinRingPath = (r: number, c: number, rate: number) => {
  const circ = 2 * Math.PI * r
  const dash = (rate / 100) * circ
  return { strokeDasharray: `${dash} ${circ - dash}` }
}

// 近 7 天涨粉：按自媒体看板记录（date + platform + follows）真实汇总，不再用随机数
const fansTrendData = computed(() => {
  const map = new Map<string, { dy: number; bili: number; xhs: number; other: number }>()
  for (const r of mediaList.value) {
    const day = String(r.date || r.createTime || '').substring(0, 10)
    if (!day) continue
    const cur = map.get(day) || { dy: 0, bili: 0, xhs: 0, other: 0 }
    const follows = Number(r.follows || 0)
    const p = String(r.platform || '').toLowerCase()
    if (p.includes('抖音') || p.includes('douyin')) cur.dy += follows
    else if (p.includes('b站') || p.includes('bili') || p.includes('哔哩')) cur.bili += follows
    else if (p.includes('小红书') || p.includes('xhs') || p.includes('red')) cur.xhs += follows
    else cur.other += follows
    map.set(day, cur)
  }

  const days: { date: string; label: string; value: number; dy: number; bili: number; xhs: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day')
    const v = map.get(d.format('YYYY-MM-DD')) || { dy: 0, bili: 0, xhs: 0, other: 0 }
    days.push({
      date: d.format('MM-DD'),
      label: WEEK_LABELS[d.day()],
      value: v.dy + v.bili + v.xhs + v.other,
      dy: v.dy,
      bili: v.bili,
      xhs: v.xhs
    })
  }
  const max = Math.max(...days.map(d => d.value), 1)
  const total = days.reduce((s, d) => s + d.value, 0)
  return { days, max, total, avg: Math.round(total / 7), hasData: total > 0 }
})

// 近 7 天收支：按真实记账记录（date + type + amount）汇总，不再用硬编码数组
const money7DaysData = computed(() => {
  const map = new Map<string, { income: number; expense: number }>()
  for (const r of moneyList.value) {
    const day = String(r.date || '').substring(0, 10)
    if (!day) continue
    const cur = map.get(day) || { income: 0, expense: 0 }
    const amt = Number(r.amount || 0)
    if (r.type === 'income') cur.income += amt
    else if (r.type === 'expense') cur.expense += amt
    map.set(day, cur)
  }

  let income = 0
  let expense = 0
  const days: { date: string; label: string; income: number; expense: number; balance: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day')
    const v = map.get(d.format('YYYY-MM-DD')) || { income: 0, expense: 0 }
    income += v.income
    expense += v.expense
    days.push({
      date: d.format('MM-DD'),
      label: WEEK_LABELS[d.day()],
      income: v.income,
      expense: v.expense,
      balance: v.income - v.expense
    })
  }
  return { days, income, expense, balance: income - expense, hasData: income > 0 || expense > 0 }
})

const goPath = (path: string) => router.push(path)
</script>

<template>
  <div class="home-page">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-left">
        <div class="greet-row">
          <h2 class="welcome-title">你好，{{ nickname }} <span class="wave">👋</span></h2>
          <span class="welcome-date">{{ todayText }}</span>
        </div>
        <p class="welcome-quote">
          <BulbOutlined class="quote-icon" />
          {{ dailyQuote }}
        </p>
      </div>
      <div class="welcome-stats-mini">
        <div class="ws-item">
          <div class="ws-val" style="color:var(--color-primary)">{{ overviewStats.today.value }}</div>
          <div class="ws-lbl">今日待办</div>
        </div>
        <div class="ws-divider" />
        <div class="ws-item">
          <div class="ws-val" style="color:#34C759">{{ checkinRingData.done }}/{{ checkinRingData.total }}</div>
          <div class="ws-lbl">打卡完成</div>
        </div>
      </div>
    </div>

    <!-- 上方4张总览卡 -->
    <div class="overview-grid">
      <div
        v-for="(item, key) in overviewStats"
        :key="key"
        class="overview-card"
        @click="goPath(key === 'today' || key === 'doing' ? '/todo' : key === 'weekRate' ? '/insight' : '/media-board')"
      >
        <div class="ov-icon" :style="{ background: item.soft, color: item.color }">
          <component :is="item.icon" />
        </div>
        <div class="ov-info">
          <div class="ov-val-wrap">
            <span class="ov-value" :style="{ color: item.color }">{{ item.value }}</span>
            <span class="ov-suffix">{{ item.suffix }}</span>
          </div>
          <div class="ov-label">{{ item.label }}</div>
        </div>
        <div class="ov-trend" :class="key === 'weekRate' || key === 'monthOutput' ? 'up' : 'flat'">
          <component :is="key === 'weekRate' || key === 'monthOutput' ? ArrowUpOutlined : CheckCircleOutlined" />
          <span>{{ key === 'today' ? '待处理' : key === 'doing' ? '进行中' : key === 'weekRate' ? '本周' : '本月' }}</span>
        </div>
      </div>
    </div>

    <!-- 主体三列：左-今日智能待办 | 中右-3列卡 -->
    <div class="main-layout">
      <!-- 左侧：今日智能待办 -->
      <div class="todo-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">
              <FireOutlined style="color:#FF9F0A" /> 今日智能待办
            </div>
            <div class="panel-sub">优先级排序 · 共 {{ todayTodos.length }} 项紧急任务</div>
          </div>
          <a-button type="primary" size="small" class="add-todo-btn" @click="goPath('/todo')">
            <PlusOutlined /> 新建
          </a-button>
        </div>

        <div class="todo-list">
          <div v-if="todayTodos.length === 0" class="todo-empty">
            <div class="te-icon">🎉</div>
            <div class="te-txt">今日暂无紧急任务</div>
            <div class="te-sub">享受高效的一天吧</div>
          </div>
          <div
            v-for="t in todayTodos"
            :key="t.id"
            class="todo-item"
            @click="goPath('/todo')"
          >
            <div
              class="todo-priority-bar"
              :style="{ background: getPriorityMeta(t.priority).color }"
            />
            <div class="todo-body">
              <div class="todo-title-row">
                <span
                  class="priority-chip"
                  :style="{
                    background: getPriorityMeta(t.priority).bg,
                    color: getPriorityMeta(t.priority).color,
                    borderColor: getPriorityMeta(t.priority).border
                  }"
                >
                  {{ getPriorityMeta(t.priority).label }}
                </span>
                <span class="todo-title">{{ t.title }}</span>
              </div>
              <div class="todo-meta">
                <span class="meta-item" :class="{ urgent: countdownText(t.deadline).urgent, warn: countdownText(t.deadline).warn }">
                  <ClockCircleOutlined /> {{ countdownText(t.deadline).text }}
                </span>
                <span v-if="t.category" class="meta-item cat">
                  {{ t.category }}
                </span>
                <span v-if="t.pomoCount" class="meta-item pomo">
                  🍅 {{ t.pomoCount }}个番茄
                </span>
              </div>
            </div>
            <EditOutlined class="todo-edit" />
          </div>
        </div>
      </div>

      <!-- 右侧：3列卡 -->
      <div class="right-panels">
        <!-- 打卡进度环 -->
        <div class="ring-card">
          <div class="panel-header no-pad">
            <div>
              <div class="panel-title small">
                <CheckCircleOutlined style="color:#34C759" /> 打卡进度
              </div>
              <div class="panel-sub small">今日习惯</div>
            </div>
            <span class="view-link" @click="goPath('/checkin')">详情</span>
          </div>
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 140 140">
              <defs>
                <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#34C759" />
                  <stop offset="100%" stop-color="#30D158" />
                </linearGradient>
              </defs>
              <circle cx="70" cy="70" r="52" fill="none" stroke="rgba(161,161,170,0.10)" stroke-width="12" />
              <circle
                cx="70"
                cy="70"
                r="52"
                fill="none"
                stroke="url(#ring-grad)"
                stroke-width="12"
                stroke-linecap="round"
                transform="rotate(-90 70 70)"
                :style="checkinRingPath(52, 70, checkinRingData.rate)"
              />
              <text x="70" y="62" text-anchor="middle" fill="var(--color-text)" font-size="28" font-weight="700">{{ checkinRingData.rate }}%</text>
              <text x="70" y="84" text-anchor="middle" fill="var(--color-text-secondary)" font-size="11">完成率</text>
            </svg>
            <div class="ring-legend">
              <div class="rl-item done">
                <span class="rl-dot" />
                <span class="rl-val">{{ checkinRingData.done }}</span>
                <span class="rl-lbl">已打卡</span>
              </div>
              <div class="rl-item pending">
                <span class="rl-dot" />
                <span class="rl-val">{{ checkinRingData.pending }}</span>
                <span class="rl-lbl">待完成</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 自媒体涨粉周趋势 -->
        <div class="fans-card">
          <div class="panel-header no-pad">
            <div>
              <div class="panel-title small">
                <UserAddOutlined style="color:var(--color-primary)" /> 涨粉周趋势
              </div>
              <div class="panel-sub small">近7天 · 累计 +{{ fansTrendData.total }}</div>
            </div>
            <span class="view-link" @click="goPath('/media-board')">详情</span>
          </div>
          <div class="fans-chart">
            <div v-if="!fansTrendData.hasData" class="chart-empty">
              暂无近 7 天涨粉记录，去<em @click="goPath('/media-board')">自媒体看板</em>填写
            </div>
            <svg v-else viewBox="0 0 320 140" class="fans-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fans-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.30" />
                  <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <g opacity="0.3">
                <line x1="30" y1="20" x2="310" y2="20" stroke="var(--color-border-strong)" stroke-width="1" stroke-dasharray="3 3" />
                <line x1="30" y1="55" x2="310" y2="55" stroke="var(--color-border-strong)" stroke-width="1" stroke-dasharray="3 3" />
                <line x1="30" y1="90" x2="310" y2="90" stroke="var(--color-border-strong)" stroke-width="1" stroke-dasharray="3 3" />
              </g>
              <path
                :d="'M ' + fansTrendData.days.map((d,i) => `${35 + i * 41.5},${115 - (d.value / fansTrendData.max) * 85}`).join(' L ') + ' L 35 + 6*41.5,115 L 35,115 Z'"
                fill="url(#fans-area)"
              />
              <polyline
                :points="fansTrendData.days.map((d,i) => `${35 + i * 41.5},${115 - (d.value / fansTrendData.max) * 85}`).join(' ')"
                fill="none"
                stroke="var(--color-primary)"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              <g>
                <circle
                  v-for="(d,i) in fansTrendData.days"
                  :key="d.date"
                  :cx="35 + i * 41.5"
                  :cy="115 - (d.value / fansTrendData.max) * 85"
                  r="3.5"
                  fill="var(--color-bg-card)"
                  stroke="var(--color-primary)"
                  stroke-width="2"
                />
              </g>
              <g fill="var(--color-text-tertiary)" font-size="9" text-anchor="middle">
                <text v-for="(d,i) in fansTrendData.days" :key="'l'+d.date" :x="35 + i * 41.5" y="132">{{ d.label }}</text>
              </g>
            </svg>
          </div>
          <div class="fans-stats">
            <div class="fs-item dy"><span class="fs-dot" /><span>抖音 +{{ fansTrendData.days.reduce((s,d) => s+d.dy, 0) }}</span></div>
            <div class="fs-item bili"><span class="fs-dot" /><span>B站 +{{ fansTrendData.days.reduce((s,d) => s+d.bili, 0) }}</span></div>
            <div class="fs-item xhs"><span class="fs-dot" /><span>小红书 +{{ fansTrendData.days.reduce((s,d) => s+d.xhs, 0) }}</span></div>
          </div>
        </div>

        <!-- 近7天收支 -->
        <div class="money-card">
          <div class="panel-header no-pad">
            <div>
              <div class="panel-title small">
                <WalletOutlined style="color:#0A84FF" /> 近7天收支
              </div>
              <div class="panel-sub small">
                结余 <span :class="money7DaysData.balance >= 0 ? 'pos' : 'neg'">¥{{ money7DaysData.balance.toLocaleString() }}</span>
              </div>
            </div>
            <span class="view-link" @click="goPath('/money')">详情</span>
          </div>
          <div class="money-sum">
            <div class="sum-item income">
              <div class="sum-label"><ArrowUpOutlined /> 收入</div>
              <div class="sum-val">¥{{ money7DaysData.income.toLocaleString() }}</div>
            </div>
            <div class="sum-item expense">
              <div class="sum-label"><ArrowDownOutlined /> 支出</div>
              <div class="sum-val">¥{{ money7DaysData.expense.toLocaleString() }}</div>
            </div>
          </div>
          <div class="money-bars" v-if="money7DaysData.hasData">
            <div v-for="d in money7DaysData.days" :key="d.date" class="bar-col">
              <div class="bars-wrap">
                <div v-if="d.income > 0" class="bar income-bar" :style="{ height: `${Math.max(4, (d.income / Math.max(money7DaysData.income / 7 * 2, 1)) * 50)}px` }">
                  <span class="bar-val" v-if="d.income > 100">{{ d.income }}</span>
                </div>
                <div v-if="d.expense > 0" class="bar expense-bar" :style="{ height: `${Math.max(4, (d.expense / Math.max(money7DaysData.expense / 7 * 2, 1)) * 50)}px` }">
                  <span class="bar-val" v-if="d.expense > 80">{{ d.expense }}</span>
                </div>
              </div>
              <div class="bar-label">{{ d.label }}</div>
            </div>
          </div>
          <div v-else class="chart-empty">
            暂无近 7 天记账记录，去<em @click="goPath('/money')">收支记账</em>添加
          </div>
          <div class="money-legend">
            <span class="ml-item in"><span class="ml-dot" />收入</span>
            <span class="ml-item ex"><span class="ml-dot" />支出</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 图表无数据时的占位提示 */
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 16px;
  font-size: 12px;
  color: var(--color-text-tertiary, #71717A);
  text-align: center;
}
.chart-empty em {
  font-style: normal;
  color: var(--color-primary, #5E6AD2);
  cursor: pointer;
  margin: 0 2px;
}

.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 20px);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 20px 2px;
}

/* 欢迎横幅 */
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-radius: var(--radius-lg, 16px);
  background:
    linear-gradient(135deg, rgba(94,106,210,0.20) 0%, rgba(94,106,210,0.06) 50%, rgba(10,132,255,0.10) 100%),
    var(--color-bg-card, #0D0E10);
  border: 1px solid rgba(94,106,210,0.25);
  gap: 24px;
}

.welcome-left { flex: 1; min-width: 0; }

.greet-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
}

.welcome-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #FAFAFA);
  margin: 0;
  letter-spacing: 0.5px;
}

.wave {
  display: inline-block;
  animation: wave 2.5s ease-in-out infinite;
  transform-origin: 70% 70%;
}

@keyframes wave {
  0%, 60%, 100% { transform: rotate(0deg); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  30% { transform: rotate(14deg); }
  40% { transform: rotate(-4deg); }
  50% { transform: rotate(10deg); }
}

.welcome-date {
  font-size: 13px;
  color: var(--color-text-tertiary, #71717A);
  padding: 4px 10px;
  background: var(--color-bg-card-2, #171A2E);
  border-radius: var(--radius-full, 999px);
  border: 1px solid var(--color-border, #1C1D22);
}

.welcome-quote {
  font-size: 13px;
  color: var(--color-text-secondary, #A1A1AA);
  margin: 10px 0 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quote-icon { color: #FFD60A; }

.welcome-stats-mini {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: var(--color-bg-card-2, #171A2E);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-md, 12px);
}

.ws-item { text-align: center; }
.ws-val { font-size: 20px; font-weight: 700; line-height: 1.1; }
.ws-lbl { font-size: 11px; color: var(--color-text-tertiary, #71717A); margin-top: 2px; }
.ws-divider { width: 1px; height: 32px; background: var(--color-border, #1C1D22); }

/* 4张总览卡 */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md, 16px);
}

.overview-card {
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
}

.overview-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-border-strong, #27282F);
  box-shadow: 0 8px 24px rgba(0,0,0,0.30);
}

.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  opacity: 0;
  transition: opacity 0.25s;
}

.overview-card:nth-child(1)::before { background: var(--color-primary); }
.overview-card:nth-child(2)::before { background: #FF9F0A; }
.overview-card:nth-child(3)::before { background: #34C759; }
.overview-card:nth-child(4)::before { background: #0A84FF; }
.overview-card:hover::before { opacity: 1; }

.ov-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.ov-info { flex: 1; min-width: 0; }
.ov-val-wrap { display: flex; align-items: baseline; gap: 4px; }
.ov-value { font-size: 28px; font-weight: 700; line-height: 1.1; }
.ov-suffix { font-size: 12px; color: var(--color-text-tertiary, #71717A); }
.ov-label { font-size: 12px; color: var(--color-text-secondary, #A1A1AA); margin-top: 4px; }

.ov-trend {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-full, 999px);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.ov-trend.up { background: rgba(52,199,89,0.10); color: #34C759; }
.ov-trend.flat { background: rgba(94,106,210,0.10); color: var(--color-primary); }

/* 主体布局 */
.main-layout {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: var(--spacing-lg, 20px);
  min-height: 0;
}

.todo-panel {
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-lg, 16px);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.panel-header.no-pad { padding: 0; }

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #FAFAFA);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.panel-title.small { font-size: 14px; }
.panel-sub {
  font-size: 11px;
  color: var(--color-text-tertiary, #71717A);
  margin-top: 3px;
}
.panel-sub.small { font-size: 10px; }
.panel-sub .pos { color: #34C759; font-weight: 600; }
.panel-sub .neg { color: #FF453A; font-weight: 600; }

.view-link {
  font-size: 11px;
  color: var(--color-primary, #5E6AD2);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.view-link:hover { background: var(--color-primary-soft, rgba(94,106,210,0.15)); }

.add-todo-btn {
  background: var(--color-primary, #5E6AD2);
  border-color: var(--color-primary, #5E6AD2);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.todo-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}
.te-icon { font-size: 44px; margin-bottom: 10px; }
.te-txt { font-size: 14px; font-weight: 600; color: var(--color-text, #FAFAFA); }
.te-sub { font-size: 11px; color: var(--color-text-tertiary, #71717A); margin-top: 2px; }

.todo-item {
  display: grid;
  grid-template-columns: 4px 1fr auto;
  align-items: stretch;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-bg-card-2, #171A2E);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-md, 12px);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.todo-item:hover {
  border-color: var(--color-border-strong, #27282F);
  transform: translateX(2px);
}

.todo-priority-bar {
  width: 4px;
  border-radius: 2px;
  min-height: 100%;
}

.todo-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.todo-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.priority-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.todo-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #FAFAFA);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 11px;
  color: var(--color-text-tertiary, #71717A);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta-item.urgent { color: #FF453A; font-weight: 600; }
.meta-item.warn { color: #FF9F0A; font-weight: 600; }
.meta-item.cat {
  padding: 1px 7px;
  background: rgba(94,106,210,0.10);
  color: var(--color-primary);
  border-radius: 4px;
}
.meta-item.pomo { color: #FF9F0A; }

.todo-edit {
  align-self: center;
  color: var(--color-text-disabled, #52525B);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.15s;
  flex-shrink: 0;
}
.todo-edit:hover {
  color: var(--color-text, #FAFAFA);
  background: var(--color-bg-hover, #15161A);
}

/* 右侧3列卡 */
.right-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--spacing-md, 16px);
}

.ring-card {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
}

.fans-card {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
}

.money-card {
  grid-column: 1 / 3;
  grid-row: 2 / 3;
}

.ring-card,
.fans-card,
.money-card {
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-lg, 16px);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.2s;
}
.ring-card:hover,
.fans-card:hover,
.money-card:hover {
  border-color: var(--color-border-strong, #27282F);
}

.ring-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.ring-svg {
  width: 130px;
  height: 130px;
  flex-shrink: 0;
}

.ring-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.rl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-md, 10px);
  background: var(--color-bg-card-2, #171A2E);
}
.rl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.rl-item.done .rl-dot { background: #34C759; }
.rl-item.pending .rl-dot { background: var(--color-text-secondary); }
.rl-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text, #FAFAFA);
  min-width: 24px;
}
.rl-lbl {
  font-size: 11px;
  color: var(--color-text-secondary, #A1A1AA);
  margin-left: auto;
}

/* 涨粉趋势 */
.fans-chart {
  background: var(--color-bg-card-2, #171A2E);
  border-radius: var(--radius-md, 10px);
  padding: 8px 6px 4px 6px;
}
.fans-svg { width: 100%; height: 140px; display: block; }

.fans-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.fs-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--color-text-secondary, #A1A1AA);
  padding: 6px 8px;
  background: var(--color-bg-card-2, #171A2E);
  border-radius: 8px;
}
.fs-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.fs-item.dy .fs-dot { background: #FF453A; }
.fs-item.bili .fs-dot { background: var(--color-primary); }
.fs-item.xhs .fs-dot { background: #FF69B4; }

/* 收支卡片 */
.money-sum {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.sum-item {
  padding: 12px 14px;
  border-radius: var(--radius-md, 10px);
  background: var(--color-bg-card-2, #171A2E);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sum-label {
  font-size: 11px;
  color: var(--color-text-secondary, #A1A1AA);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.sum-item.income .sum-label { color: rgba(52,199,89,0.90); }
.sum-item.expense .sum-label { color: rgba(255,69,58,0.90); }
.sum-val {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text, #FAFAFA);
}
.sum-item.income .sum-val { color: #34C759; }
.sum-item.expense .sum-val { color: #FF453A; }

.money-bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  align-items: end;
  padding: 10px 4px 0 4px;
  min-height: 110px;
}
.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.bars-wrap {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
}
.bar {
  width: 10px;
  border-radius: 3px 3px 0 0;
  position: relative;
  transition: height 0.4s ease;
  min-height: 4px;
}
.income-bar { background: linear-gradient(180deg, #34C759 0%, #30D158AA 100%); }
.expense-bar { background: linear-gradient(180deg, #FF453A 0%, #FF6B6BAA 100%); }
.bar-val {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  font-weight: 600;
  color: var(--color-text-secondary, #A1A1AA);
  white-space: nowrap;
}
.bar-label {
  font-size: 10px;
  color: var(--color-text-tertiary, #71717A);
}

.money-legend {
  display: flex;
  justify-content: center;
  gap: 18px;
  padding-top: 2px;
  border-top: 1px solid var(--color-border, #1C1D22);
  padding-top: 10px;
}
.ml-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--color-text-secondary, #A1A1AA);
}
.ml-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.ml-item.in .ml-dot { background: #34C759; }
.ml-item.ex .ml-dot { background: #FF453A; }

@media (max-width: 1400px) {
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
  .main-layout { grid-template-columns: 1fr; }
  .right-panels { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  .overview-grid { grid-template-columns: 1fr; }
  .right-panels { grid-template-columns: 1fr; }
  .ring-card, .fans-card, .money-card { grid-column: auto; grid-row: auto; }
  .welcome-banner { flex-direction: column; align-items: flex-start; }
  .welcome-stats-mini { width: 100%; justify-content: space-around; }
}
</style>
