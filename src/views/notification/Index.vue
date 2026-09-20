<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BellOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  CalendarOutlined,
  BugOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  FireOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { notificationApi, type Notification as NotifEntity } from '@/api/modules'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'

const router = useRouter()
const appStore = useAppStore()

type NotifType = 'TASK' | 'BUG' | 'DOC' | 'CHECKIN' | 'MONEY' | 'SYSTEM' | 'HOT'

interface Notification {
  id: number
  type: NotifType
  title: string
  content: string
  time: string
  read: boolean
  extra?: string
  link?: string
}

const TYPE_META: Record<NotifType, { label: string; color: string; bg: string; icon: any }> = {
  TASK:    { label: '任务',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.10)',  icon: CalendarOutlined },
  BUG:     { label: 'Bug',    color: '#FF453A', bg: 'rgba(255,69,58,0.10)',   icon: BugOutlined },
  DOC:     { label: '文档',   color: '#5E6AD2', bg: 'rgba(94,106,210,0.10)',  icon: FileTextOutlined },
  CHECKIN: { label: '打卡',   color: '#34C759', bg: 'rgba(52,199,89,0.10)',   icon: CheckSquareOutlined },
  MONEY:   { label: '收支',   color: '#0A84FF', bg: 'rgba(10,132,255,0.10)',  icon: DollarOutlined },
  SYSTEM:  { label: '系统',   color: '#A1A1AA', bg: 'rgba(161,161,170,0.10)', icon: SettingOutlined },
  HOT:     { label: '热点',   color: '#FF6B00', bg: 'rgba(255,107,0,0.10)',  icon: FireOutlined }
}

const loading = ref(false)
const searchKeyword = ref('')
const typeFilter = ref<NotifType | ''>('')
const readFilter = ref<string>('')

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '任务提醒', value: 'TASK' },
  { label: 'Bug告警', value: 'BUG' },
  { label: '文档更新', value: 'DOC' },
  { label: '习惯打卡', value: 'CHECKIN' },
  { label: '收支记账', value: 'MONEY' },
  { label: '系统通知', value: 'SYSTEM' },
  { label: '热点推送', value: 'HOT' }
]

const readOptions = [
  { label: '全部状态', value: '' },
  { label: '未读', value: 'unread' },
  { label: '已读', value: 'read' }
]

const mapEntity = (e: NotifEntity): Notification => ({
  id: e.id ?? 0,
  type: e.type,
  title: e.title,
  content: e.content,
  time: e.createTime || e.date || dayjs().format('YYYY-MM-DD HH:mm'),
  // 稳健解析 read：后端可能返回 true/false/1/0/"true"/"false"/null
  read: ((): boolean => {
    const r = e.read as any
    return r === true || r === 1 || r === '1' || r === 'true'
  })(),
  extra: e.extra
})

const notifications = ref<Notification[]>([])

const fetchData = async () => {
  loading.value = true
  try {
    const list = await notificationApi.list()
    notifications.value = (list || []).map(mapEntity).sort((a, b) => b.time.localeCompare(a.time))
  } catch (e) {
    notifications.value = []
  } finally {
    loading.value = false
  }
  // 同步全局未读数（顶栏铃铛用）
  appStore.unreadCount = stats.value.unread
}

const stats = computed(() => {
  const list = notifications.value
  const total = list.length
  const unread = list.filter(n => !n.read).length
  const todayNew = list.filter(n => dayjs(n.time).isSame(dayjs(), 'day')).length
  return { total, unread, todayNew }
})

// stats 变化时同步到全局 store（顶栏铃铛实时更新）
watch(() => stats.value.unread, (v) => { appStore.unreadCount = v })

const filteredList = computed(() => {
  return notifications.value.filter(n => {
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      if (!n.title.toLowerCase().includes(kw) && !n.content.toLowerCase().includes(kw)) return false
    }
    if (typeFilter.value && n.type !== typeFilter.value) return false
    if (readFilter.value === 'unread' && n.read) return false
    if (readFilter.value === 'read' && !n.read) return false
    return true
  })
})

const formatTime = (t: string) => {
  const d = dayjs(t)
  const now = dayjs()
  const diffMin = now.diff(d, 'minute')
  const diffHr = now.diff(d, 'hour')
  const diffDay = now.diff(d, 'day')
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHr < 24) return `${diffHr}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  return d.format('MM-DD')
}

const markRead = async (n: Notification) => {
  if (n.read) return
  try {
    await notificationApi.readOne(n.id)
    n.read = true
    message.success('已标记为已读')
  } catch {
    // 失败时不改动本地状态，避免界面与数据库不一致
    message.error('标记已读失败，请稍后重试')
  }
}

const markAllRead = async () => {
  if (stats.value.unread === 0) {
    message.info('没有未读通知')
    return
  }
  const count = stats.value.unread
  try {
    await notificationApi.readAll()
    notifications.value.forEach(n => (n.read = true))
    message.success(`已标记 ${count} 条通知为已读`)
  } catch {
    message.error('标记失败，请稍后重试')
  }
}

// 类型元信息兜底：后端若返回未知类型，退回 SYSTEM，避免模板取值抛错
const metaOf = (type: string) => TYPE_META[type as NotifType] || TYPE_META.SYSTEM

// 各类型通知的跳转目标
const TYPE_ROUTE: Record<string, string> = {
  TASK: '/todo', BUG: '/bugs', DOC: '/markdown', CHECKIN: '/checkin',
  MONEY: '/money', HOT: '/topic', SYSTEM: '/settings'
}
const gotoDetail = (n: Notification) => {
  markRead(n)
  const path = n.link || TYPE_ROUTE[n.type]
  if (path) {
    router.push(path)
  } else {
    message.info('该通知暂无对应详情页')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="notif-page">
    <!-- 顶部 3 统计卡 -->
    <div class="stats-row">
      <div class="stat-card" :class="{ highlight: stats.unread > 0 }">
        <div class="stat-row-top">
          <div class="stat-icon" style="background: rgba(255,159,10,0.12); color:#FF9F0A">
            <BellOutlined />
            <span v-if="stats.unread > 0" class="badge-dot"></span>
          </div>
          <span class="trend-tag warn">
            <ExclamationCircleOutlined /> {{ stats.unread }} 条待处理
          </span>
        </div>
        <div class="stat-num" style="color:#FF9F0A">{{ stats.unread }}</div>
        <div class="stat-label">未读通知</div>
      </div>

      <div class="stat-card">
        <div class="stat-row-top">
          <div class="stat-icon" style="background: rgba(10,132,255,0.12); color:#0A84FF">
            <CalendarOutlined />
          </div>
          <span class="trend-tag info">
            <ClockCircleOutlined /> 今日
          </span>
        </div>
        <div class="stat-num" style="color:#0A84FF">{{ stats.todayNew }}<span class="unit">条</span></div>
        <div class="stat-label">今日新增通知</div>
      </div>

      <div class="stat-card">
        <div class="stat-row-top">
          <div class="stat-icon" style="background: rgba(94,106,210,0.12); color:#5E6AD2">
            <InboxOutlined />
          </div>
          <span class="trend-tag success">
            <CheckCircleOutlined /> 已读 {{ stats.total - stats.unread }}
          </span>
        </div>
        <div class="stat-num">{{ stats.total }}<span class="unit">条</span></div>
        <div class="stat-label">全部通知</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="title-area">
        <h2 class="page-title">通知中心</h2>
        <span class="page-subtitle">按时间倒序 · 共 {{ filteredList.length }} 条匹配结果</span>
      </div>
      <div class="tools">
        <a-input
          v-model:value="searchKeyword"
          placeholder="搜索标题 / 内容"
          allow-clear
          class="search"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select v-model:value="typeFilter" :options="typeOptions" style="width:140px" />
        <a-select v-model:value="readFilter" :options="readOptions" style="width:120px" />
        <a-button class="tool-btn" @click="fetchData"><ReloadOutlined /></a-button>
        <a-button class="mark-read-btn" @click="markAllRead" :disabled="stats.unread === 0">
          <CheckOutlined /> 全部已读
        </a-button>
      </div>
    </div>

    <!-- 通知列表 -->
    <div class="list-wrap">
      <a-spin :spinning="loading" size="large">
        <div v-if="filteredList.length === 0 && !loading" class="empty">
          <div class="empty-icon"><InboxOutlined /></div>
          <div class="empty-title">没有匹配的通知</div>
          <div class="empty-desc">尝试更换筛选条件，或点击刷新重新加载</div>
        </div>
        <div v-else class="notif-list">
          <div
            v-for="n in filteredList"
            :key="n.id"
            class="notif-item"
            :class="{ unread: !n.read, read: n.read }"
            @click="markRead(n)"
          >
            <!-- 左侧：彩色圆点 + 类型图标 -->
            <div class="item-left">
              <span
                class="color-dot"
                :style="{ background: metaOf(n.type).color, boxShadow: `0 0 0 4px ${metaOf(n.type).bg}` }"
              ></span>
              <div
                class="type-icon"
                :style="{ background: metaOf(n.type).bg, color: metaOf(n.type).color }"
              >
                <component :is="metaOf(n.type).icon" />
              </div>
            </div>

            <!-- 中间：内容区 -->
            <div class="item-main">
              <div class="item-head">
                <span class="item-title">
                  {{ n.title }}
                  <span
                    v-if="!n.read"
                    class="unread-dot"
                    :style="{ background: metaOf(n.type).color }"
                  ></span>
                </span>
                <span
                  class="type-tag"
                  :style="{ background: metaOf(n.type).bg, color: metaOf(n.type).color }"
                >
                  {{ metaOf(n.type).label }}
                </span>
              </div>
              <div class="item-content">{{ n.content }}</div>
              <div class="item-bottom">
                <span v-if="n.extra" class="extra-tag">
                  <InfoCircleOutlined /> {{ n.extra }}
                </span>
                <span class="time-tag">
                  <ClockCircleOutlined /> {{ formatTime(n.time) }}
                </span>
              </div>
            </div>

            <!-- 右侧：操作 -->
            <div class="item-right">
              <a-button size="small" type="text" class="goto-btn" @click.stop="gotoDetail(n)">
                查看详情 <ArrowRightOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </a-spin>
    </div>
  </div>
</template>

<style scoped>
.notif-page {
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
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
}

.stat-card.highlight {
  background: linear-gradient(135deg, rgba(255,159,10,0.06) 0%, rgba(255,69,58,0.04) 100%);
  border-color: rgba(255,159,10,0.25);
}

.stat-row-top {
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
  position: relative;
}

.badge-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: #FF453A;
  border-radius: 50%;
  border: 2px solid var(--color-bg-card);
}

.trend-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

.trend-tag.warn {
  background: rgba(255,159,10,0.10);
  color: #FF9F0A;
}
.trend-tag.info {
  background: rgba(10,132,255,0.10);
  color: #0A84FF;
}
.trend-tag.success {
  background: rgba(52,199,89,0.10);
  color: #34C759;
}

.stat-num {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1;
  letter-spacing: -1px;
}

.unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-left: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
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

.search { width: 240px; }

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

.mark-read-btn {
  background: rgba(52,199,89,0.10);
  border: 1px solid rgba(52,199,89,0.25);
  color: #34C759;
  font-weight: 500;
}
.mark-read-btn:hover {
  background: rgba(52,199,89,0.18) !important;
  border-color: rgba(52,199,89,0.40) !important;
  color: #30D158 !important;
}

.list-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.notif-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card-2);
  transition: all 0.2s;
  cursor: pointer;
}

.notif-item:hover {
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-card-hover);
}

.notif-item.unread {
  background: linear-gradient(90deg, var(--color-bg-card-2) 0%, rgba(94,106,210,0.03) 100%);
  border-color: rgba(94,106,210,0.18);
}

.notif-item.read {
  opacity: 0.85;
}

.item-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: 4px;
  position: relative;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.type-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.item-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.type-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.item-content {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-bottom {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
  margin-top: 2px;
}

.extra-tag {
  font-size: 11px;
  color: var(--color-text-tertiary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(161,161,170,0.08);
  border-radius: var(--radius-sm);
}

.time-tag {
  font-size: 11px;
  color: var(--color-text-tertiary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.item-right {
  flex-shrink: 0;
  padding-top: 4px;
}

.goto-btn {
  color: var(--color-primary);
  font-size: 12px;
  padding: 4px 8px !important;
  height: auto;
}
.goto-btn:hover {
  background: var(--color-primary-soft) !important;
  border-radius: var(--radius-sm);
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

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  .notif-item {
    grid-template-columns: auto 1fr;
  }
  .item-right {
    grid-column: span 2;
    justify-self: end;
  }
}
</style>
