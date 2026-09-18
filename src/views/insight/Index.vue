<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  BulbOutlined,
  FileTextOutlined,
  HistoryOutlined
} from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { statsApi, type InsightStatsVO, type InsightItem, type CompareItem, type NextActionItem } from '@/api/modules'

// ============ 设计稿固定数据（也可用后端数据覆盖） ============
type Period = 'week' | 'month' | 'quarter'
const period = ref<Period>('week')
const periodTabs: { key: Period; label: string }[] = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季' }
]

// 顶部 3 张统计卡
type TopCard = {
  label: string
  value: string
  unit?: string
  extra: { text: string; color: string }
  bars: number[]       // 5 根小柱子 0-100
  barColor: string     // 柱颜色
  barHighlight?: number// 高亮第X根
}
const DEFAULT_TOP_CARDS: TopCard[] = [
  {
    label: '本周专注',
    value: '12.4',
    unit: 'h',
    extra: { text: '较上周 +18%', color: '#34C759' },
    bars: [30, 38, 48, 62, 80],
    barColor: '#5E6AD2',
    barHighlight: 4
  },
  {
    label: '任务完成率',
    value: '82',
    unit: '%',
    extra: { text: '3 项延期', color: '#FF9F0A' },
    bars: [35, 45, 55, 70, 82],
    barColor: '#34C759',
    barHighlight: 4
  },
  {
    label: '内容产出',
    value: '14',
    unit: '篇',
    extra: { text: '公众号6 · 视频5 · 小红书3', color: '#A1A1AA' },
    bars: [22, 40, 58, 70, 78],
    barColor: '#FF9F0A',
    barHighlight: 4
  }
]
const topCards = ref<TopCard[]>(DEFAULT_TOP_CARDS.map(c => ({ ...c, bars: [...c.bars] })))

// 本周洞察 5 条
const DEFAULT_INSIGHTS: InsightItem[] = [
  { title: '专注时段', desc: '深夜 22-24 点效率最高，平均产出 +32%', tag: '22-24 点' },
  { title: '任务节奏', desc: '周三、周四交付最密集，建议错峰安排', tag: '周三-周四' },
  { title: '内容表现', desc: '小红书互动率最高，短视频涨粉最快', tag: '互动 8.2%' },
  { title: '习惯坚持', desc: '阅读连续 21 天，运动中断 2 次需补回', tag: '21 天' },
  { title: 'AI 协作', desc: '本月消耗 1.2M tokens，多用于写作与代码', tag: '1.2M' }
]
const insights = ref<InsightItem[]>([...DEFAULT_INSIGHTS])

// 周期对比
type CompareRow = {
  label: string
  last: number     // 上周 0-100
  cur: number      // 本周 0-100
  delta: string
  deltaColor: string
}
const DEFAULT_COMPARES: CompareRow[] = [
  { label: '专注时长',   last: 52, cur: 70, delta: '+18%',  deltaColor: '#34C759' },
  { label: '任务完成率', last: 60, cur: 67, delta: '+7pp',  deltaColor: '#34C759' },
  { label: '内容产出',   last: 48, cur: 75, delta: '+27%',  deltaColor: '#34C759' }
]
const compares = ref<CompareRow[]>(DEFAULT_COMPARES.map(c => ({ ...c })))

// 下周行动项
type Action = {
  id: number
  title: string
  role: '开发' | '个人' | '创作'
  done: boolean
}
const DEFAULT_ACTIONS: Action[] = [
  { id: 1, title: '周四前完成产品评审会纪要整理', role: '开发', done: true },
  { id: 2, title: '把深夜专注时段前移到 20-22 点，保持作息', role: '个人', done: false },
  { id: 3, title: 'B站《独立开发工具》脚本定稿并预约拍摄', role: '创作', done: false }
]
const actions = ref<Action[]>(DEFAULT_ACTIONS.map(a => ({ ...a })))
const roleColor = (r: Action['role']) =>
  r === '开发' ? '#5E6AD2' : r === '创作' ? '#FF9F0A' : '#34C759'

// ============ 后端数据加载（叠加到默认展示上，有新字段覆盖，否则 fallback） ============
const loading = ref(false)
const data = ref<InsightStatsVO | null>(null)

const formatSignPct = (val?: number) => {
  if (val === undefined || val === null) return ''
  const s = val >= 0 ? '+' : ''
  return `${s}${Math.round(val * 10) / 10}%`
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await statsApi.insight()
    data.value = res || null
    const vo = res as InsightStatsVO | null

    // ===== 覆盖 topCards =====
    const tc: TopCard[] = DEFAULT_TOP_CARDS.map(c => ({ ...c, bars: [...c.bars] }))
    // Card 0: 本周专注
    if (vo?.focusHoursThisWeek !== undefined && vo.focusHoursThisWeek !== null) {
      tc[0].value = String(Math.round(vo.focusHoursThisWeek * 10) / 10)
    }
    if (vo?.focusHoursMomPct !== undefined && vo.focusHoursMomPct !== null) {
      const pct = vo.focusHoursMomPct
      tc[0].extra = {
        text: `较上周 ${formatSignPct(pct)}`,
        color: pct >= 0 ? '#34C759' : '#FF375F'
      }
    }
    if (vo?.barsFocus?.length) tc[0].bars = [...vo.barsFocus]
    // Card 1: 任务完成率
    if (vo?.todoDoneRate !== undefined && vo.todoDoneRate !== null) {
      tc[1].value = String(Math.round(vo.todoDoneRate))
    }
    const overdue = vo?.todoOverdueCount
    if (overdue !== undefined && overdue !== null) {
      tc[1].extra = {
        text: overdue > 0 ? `${overdue} 项延期` : '无延期',
        color: overdue > 0 ? '#FF9F0A' : '#34C759'
      }
    }
    if (vo?.todoStats) {
      const t = vo.todoStats
      const rate = t.total ? Math.round((t.done / t.total) * 100) : 0
      if (vo.todoDoneRate === undefined || vo.todoDoneRate === null) tc[1].value = String(rate)
    }
    if (vo?.barsTodo?.length) tc[1].bars = [...vo.barsTodo]
    // Card 2: 内容产出
    if (vo?.contentOutputThisWeek !== undefined && vo.contentOutputThisWeek !== null) {
      tc[2].value = String(vo.contentOutputThisWeek)
    }
    if (vo?.contentBreakdown) {
      const bd = vo.contentBreakdown
      const parts: string[] = []
      if (bd.gzh) parts.push(`公众号${bd.gzh}`)
      if (bd.video) parts.push(`视频${bd.video}`)
      if (bd.xhs) parts.push(`小红书${bd.xhs}`)
      if (bd.other) parts.push(`其他${bd.other}`)
      if (parts.length) tc[2].extra = { text: parts.join(' · '), color: tc[2].extra.color }
    }
    if (vo?.barsContent?.length) tc[2].bars = [...vo.barsContent]
    topCards.value = tc

    // ===== 覆盖 insights =====
    if (vo?.insights && vo.insights.length > 0) {
      insights.value = vo.insights.map(it => ({ title: it.title, desc: it.desc, tag: it.tag }))
    }

    // ===== 覆盖 compares =====
    if (vo?.compares && vo.compares.length > 0) {
      compares.value = vo.compares.map(c => ({
        label: c.label,
        last: c.last,
        cur: c.cur,
        delta: c.delta,
        deltaColor: c.deltaColor
      }))
    }

    // ===== 覆盖 nextActions =====
    if (vo?.nextActions && vo.nextActions.length > 0) {
      const mapped: Action[] = vo.nextActions.map(a => {
        const roleMap: Record<string, Action['role']> = {
          '开发': '开发', 'DEV': '开发',
          '创作': '创作', 'CONTENT': '创作', '个人': '个人', 'LIFE': '个人'
        }
        const r = (roleMap[a.role] as Action['role']) || '个人'
        return { id: Number(a.id) || Date.now() + Math.random(), title: a.title, role: r, done: !!a.done }
      })
      actions.value = mapped
    }
  } catch (e) {
    // 静默失败，使用本地 mock 数据
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

// ============ 操作 ============
const generateReport = () => {
  Modal.info({
    title: '生成本周报告',
    content: '周报将汇总本周任务、习惯、自媒体产出、收支等数据生成 Markdown 报告并保存到文档管理中。（功能接入报告生成接口即可）',
    okText: '好的'
  })
  message.success('报告生成任务已提交')
}
const viewHistory = () => {
  message.info('历史报告：后续在文档管理的「复盘报告」分类中查看')
}
const toggleAction = (a: Action) => { a.done = !a.done }
</script>

<template>
  <div class="insight-page">
    <!-- 顶部标题+操作区 -->
    <div class="page-head">
      <div>
        <h1 class="title">洞察复盘</h1>
        <p class="desc">用数据回顾你的时间、产出与习惯，找到可优化的方向</p>
      </div>
      <div class="head-right">
        <div class="btn-group">
          <button class="btn btn-primary" @click="generateReport">
            <FileTextOutlined /> 生成本周报告
          </button>
          <button class="btn btn-ghost" @click="viewHistory">
            <HistoryOutlined /> 查看历史
          </button>
        </div>
        <div class="period-tabs">
          <div
            v-for="t in periodTabs"
            :key="t.key"
            class="tab"
            :class="{ active: period === t.key }"
            @click="period = t.key"
          >{{ t.label }}</div>
        </div>
      </div>
    </div>

    <!-- 3 张顶部统计卡 -->
    <div class="top-cards">
      <div v-for="(c, i) in topCards" :key="i" class="top-card">
        <div class="card-left">
          <div class="card-label">{{ c.label }}</div>
          <div class="card-value">
            {{ c.value }}<span v-if="c.unit" class="unit">{{ c.unit }}</span>
          </div>
          <div class="card-extra" :style="{ color: c.extra.color }">{{ c.extra.text }}</div>
        </div>
        <!-- 右侧迷你 5 柱 SVG 条形图 -->
        <svg class="mini-bars" viewBox="0 0 120 60" preserveAspectRatio="none" aria-hidden="true">
          <g transform="translate(8, 54)">
            <rect
              v-for="(b, bi) in c.bars"
              :key="bi"
              :x="bi * 22"
              :y="-b"
              width="14"
              :height="b"
              rx="3"
              :fill="bi === c.barHighlight ? c.barColor : c.barColor"
              :opacity="bi === c.barHighlight ? 1 : 0.55 + bi * 0.08"
            />
          </g>
        </svg>
      </div>
    </div>

    <!-- 本周洞察 -->
    <section class="panel">
      <div class="panel-title">本周洞察</div>
      <ul class="insight-list">
        <li v-for="(it, i) in insights" :key="i" class="insight-row">
          <span class="bulb"><BulbOutlined /></span>
          <div class="row-body">
            <div class="row-title">{{ it.title }}</div>
            <div class="row-desc">{{ it.desc }}</div>
          </div>
          <div class="row-tag">{{ it.tag }}</div>
        </li>
      </ul>
    </section>

    <!-- 周期对比·本周 vs 上周 -->
    <section class="panel">
      <div class="panel-title">周期对比 · 本周 vs 上周</div>
      <div class="compare-list">
        <div v-for="(c, i) in compares" :key="i" class="compare-row">
          <div class="cmp-label">{{ c.label }}</div>
          <div class="cmp-bars">
            <div class="cmp-bar-row">
              <span class="bar-mini-label">上周</span>
              <div class="cmp-bar cmp-bar-last">
                <div class="cmp-bar-inner" :style="{ width: c.last + '%' }"></div>
              </div>
            </div>
            <div class="cmp-bar-row">
              <span class="bar-mini-label">本周</span>
              <div class="cmp-bar cmp-bar-cur">
                <div class="cmp-bar-inner" :style="{ width: c.cur + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="cmp-delta" :style="{ color: c.deltaColor }">{{ c.delta }}</div>
        </div>
      </div>
    </section>

    <!-- 下周行动项 -->
    <section class="panel">
      <div class="panel-title">下周行动项</div>
      <div class="action-list">
        <label
          v-for="a in actions"
          :key="a.id"
          class="action-row"
          :class="{ done: a.done }"
          @click="toggleAction(a)"
        >
          <span class="check" :class="{ checked: a.done }">
            <svg v-if="a.done" viewBox="0 0 16 16" width="14" height="14"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="action-title">{{ a.title }}</span>
          <span class="action-role" :style="{ background: roleColor(a.role) + '22', color: roleColor(a.role), borderColor: roleColor(a.role) + '55' }">{{ a.role }}</span>
        </label>
      </div>
    </section>

    <a-spin :spinning="loading" style="display:none"></a-spin>
  </div>
</template>

<style scoped>
.insight-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 2px 24px;
  color: var(--color-text);
}

/* ===== 顶部标题+操作区 ===== */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--color-text);
  letter-spacing: -0.2px;
}
.desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.head-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.btn-group { display: flex; gap: 8px; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-md, 10px);
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .15s ease;
  font-weight: 500;
}
.btn-primary {
  background: var(--color-primary, #5E6AD2);
  color: #fff;
  border-color: var(--color-primary, #5E6AD2);
}
.btn-primary:hover { filter: brightness(1.08); }
.btn-ghost {
  background: var(--color-bg-elevated, #1C1D22);
  color: var(--color-text);
  border-color: var(--color-border, #1C1D22);
}
.btn-ghost:hover { background: var(--color-bg-hover, #15161A); }

/* 周期切换 Tab */
.period-tabs {
  display: inline-flex;
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}
.tab {
  padding: 5px 15px;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-radius: 999px;
  cursor: pointer;
  transition: all .15s ease;
  font-weight: 500;
}
.tab.active {
  background: var(--color-primary, #5E6AD2);
  color: #fff;
}
.tab:not(.active):hover { color: var(--color-text); background: var(--color-bg-hover); }

/* ===== 3 统计卡 ===== */
.top-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
@media (max-width: 1000px) { .top-cards { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .top-cards { grid-template-columns: 1fr; } }

.top-card {
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-lg, 14px);
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  transition: all .2s ease;
}
.top-card:hover {
  border-color: var(--color-border-strong, #27282F);
  transform: translateY(-1px);
}
.card-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.card-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.card-value {
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--color-text);
  letter-spacing: -0.5px;
}
.card-value .unit {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-left: 4px;
}
.card-extra { font-size: 12px; margin-top: 2px; }
.mini-bars { width: 130px; height: 60px; flex-shrink: 0; }

/* ===== 通用 panel ===== */
.panel {
  background: var(--color-bg-card, #0D0E10);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-lg, 14px);
  padding: 18px 20px;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
  letter-spacing: -0.1px;
}

/* ===== 本周洞察 list ===== */
.insight-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.insight-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: var(--radius-md, 10px);
  background: var(--color-bg, #08090A);
  border: 1px solid transparent;
  transition: all .15s ease;
}
.insight-row:hover { border-color: var(--color-border, #1C1D22); }
.bulb {
  width: 28px; height: 28px; flex-shrink: 0;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-primary-soft, rgba(94,106,210,.15));
  color: var(--color-primary, #5E6AD2);
  font-size: 14px;
}
.row-body { flex: 1; min-width: 0; }
.row-title { font-size: 14px; font-weight: 600; color: var(--color-text); margin-bottom: 2px; }
.row-desc  { font-size: 12px; color: var(--color-text-secondary); }
.row-tag {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: var(--color-primary-soft, rgba(94,106,210,.12));
  color: var(--color-primary, #A5AFFF);
  border: 1px solid rgba(94,106,210,.25);
}

/* ===== 周期对比 ===== */
.compare-list { display: flex; flex-direction: column; gap: 14px; }
.compare-row {
  display: grid;
  grid-template-columns: 110px 1fr 70px;
  align-items: center;
  gap: 16px;
}
@media (max-width: 640px) {
  .compare-row { grid-template-columns: 80px 1fr 56px; gap: 10px; }
}
.cmp-label { font-size: 13px; color: var(--color-text); font-weight: 500; }
.cmp-bars { display: flex; flex-direction: column; gap: 6px; }
.cmp-bar-row {
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: center;
  gap: 8px;
}
.bar-mini-label {
  font-size: 11px;
  color: var(--color-text-tertiary, #71717A);
  text-align: right;
}
.cmp-bar {
  height: 10px;
  border-radius: 999px;
  background: var(--color-bg, #08090A);
  overflow: hidden;
  border: 1px solid var(--color-border, #1C1D22);
}
.cmp-bar-inner {
  height: 100%;
  border-radius: 999px;
  transition: width .4s ease;
}
.cmp-bar-last .cmp-bar-inner  { background: var(--color-text-tertiary, #52525B); opacity: .75; }
.cmp-bar-cur  .cmp-bar-inner  { background: var(--color-primary, #5E6AD2); }
.cmp-delta {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

/* ===== 下周行动项 ===== */
.action-list { display: flex; flex-direction: column; gap: 8px; }
.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-bg, #08090A);
  border: 1px solid var(--color-border, #1C1D22);
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  user-select: none;
  transition: all .15s ease;
}
.action-row:hover { border-color: var(--color-border-strong, #27282F); }
.action-row.done { opacity: .55; }
.action-row.done .action-title { text-decoration: line-through; color: var(--color-text-tertiary); }
.check {
  width: 18px; height: 18px; flex-shrink: 0;
  border-radius: 5px;
  border: 1.5px solid var(--color-border-strong, #27282F);
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg-card, #0D0E10);
  transition: all .15s ease;
  color: #fff;
}
.check.checked {
  background: var(--color-primary, #5E6AD2);
  border-color: var(--color-primary, #5E6AD2);
}
.action-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--color-text);
}
.action-role {
  flex-shrink: 0;
  padding: 3px 10px;
  font-size: 11px;
  border-radius: 6px;
  font-weight: 500;
  border: 1px solid transparent;
}
</style>
