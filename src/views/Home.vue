<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  CheckCircleOutlined,
  BugOutlined,
  ProjectOutlined,
  PlusOutlined,
  RiseOutlined,
  WarningOutlined,
  BulbOutlined,
  ExperimentOutlined,
  PictureOutlined,
  WalletOutlined,
  CodeOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  ReadOutlined,
  DashboardOutlined,
  KeyOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { statsApi, type DashboardStatsVO } from '@/api/modules'

const router = useRouter()
const authStore = useAuthStore()

const weekdayMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const todayText = computed(() => {
  const d = dayjs()
  return `${d.format('YYYY年MM月DD日')} ${weekdayMap[d.day()]}`
})

const dailyQuote = ref('将注意力集中在当下，一步一个脚印地向前走。')
const nickname = computed(() => authStore.userInfo?.nickname || '晓贵')
const statsLoading = ref(false)
const dashboard = ref<DashboardStatsVO | null>(null)

// 角色切换
const currentRole = ref<'dev' | 'ai' | 'media'>('dev')

const loadDashboard = async () => {
  statsLoading.value = true
  try {
    const res: any = await statsApi.dashboard()
    dashboard.value = res as any
  } catch (e) {
    // 失败保持 null，使用 fallback
  } finally {
    statsLoading.value = false
  }
}

// 每个角色 4 个卡片：从 dashboard 取值
const roleConfig = computed(() => {
  const d = dashboard.value
  const getVal = (fn: (x: DashboardStatsVO) => number, fallback: number) =>
    d ? Math.max(0, fn(d)) : fallback
  return {
    dev: {
      label: '程序员',
      icon: CodeOutlined,
      color: '#1677ff',
      bg: '#e6f4ff',
      stats: [
        { title: '今日任务', value: getVal(x => x.todoTodayCount, 0), suffix: '项', icon: CheckCircleOutlined, color: '#1677ff', bg: '#e6f4ff', path: '/todo' },
        { title: 'Bug待修', value: getVal(x => x.bugsOpenCount, 0), suffix: '个', icon: BugOutlined, color: '#ff4d4f', bg: '#fff2f0', path: '/bugs' },
        { title: '项目进度', value: getVal(x => x.projectProgress, 0), suffix: '%', icon: ProjectOutlined, color: '#52c41a', bg: '#f6ffed', path: '/project' },
        { title: '技术笔记', value: getVal(x => x.techNoteCount, 0), suffix: '篇', icon: FileTextOutlined, color: '#722ed1', bg: '#f9f0ff', path: '/tech' }
      ],
      actions: [
        { label: '记任务', icon: PlusOutlined, path: '/todo', color: '#1677ff' },
        { label: '更进度', icon: RiseOutlined, path: '/project', color: '#52c41a' },
        { label: '记Bug', icon: WarningOutlined, path: '/bugs', color: '#ff4d4f' },
        { label: '技术笔记', icon: FileTextOutlined, path: '/tech', color: '#722ed1' },
        { label: '代码仓库', icon: CodeOutlined, path: '/repo', color: '#13c2c2' },
        { label: '服务器', icon: CloudServerOutlined, path: '/svc', color: '#fa8c16' }
      ]
    },
    ai: {
      label: 'AI 探索',
      icon: ExperimentOutlined,
      color: '#722ed1',
      bg: '#f9f0ff',
      stats: [
        { title: '今日任务', value: getVal(x => x.todoTodayCount, 0), suffix: '项', icon: CheckCircleOutlined, color: '#1677ff', bg: '#e6f4ff', path: '/todo' },
        { title: 'AI 实验', value: getVal(x => x.aiLabCount, 0), suffix: '条', icon: ExperimentOutlined, color: '#722ed1', bg: '#f9f0ff', path: '/ai' },
        { title: '内容灵感', value: getVal(x => x.ideaCount, 0), suffix: '条', icon: BulbOutlined, color: '#faad14', bg: '#fffbe6', path: '/idea' },
        { title: '学习阅读', value: getVal(x => x.readCount, 0), suffix: '本', icon: ReadOutlined, color: '#13c2c2', bg: '#e6fffb', path: '/read' }
      ],
      actions: [
        { label: 'AI 实验室', icon: ExperimentOutlined, path: '/ai', color: '#722ed1' },
        { label: '记灵感', icon: BulbOutlined, path: '/idea', color: '#faad14' },
        { label: '记任务', icon: PlusOutlined, path: '/todo', color: '#1677ff' },
        { label: '学习阅读', icon: ReadOutlined, path: '/read', color: '#52c41a' }
      ]
    },
    media: {
      label: '自媒体',
      icon: PictureOutlined,
      color: '#fa8c16',
      bg: '#fff7e6',
      stats: [
        { title: '素材库', value: getVal(x => x.mediaCount, 0), suffix: '个', icon: PictureOutlined, color: '#fa8c16', bg: '#fff7e6', path: '/media' },
        { title: '创作稿件', value: getVal(x => x.docsCount, 0), suffix: '篇', icon: FileTextOutlined, color: '#1677ff', bg: '#e6f4ff', path: '/docs' },
        { title: '运营看板', value: getVal(x => x.mediaBoardCount, 0), suffix: '条', icon: DashboardOutlined, color: '#52c41a', bg: '#f6ffed', path: '/media-board' },
        { title: '本月结余', value: getVal(x => Number(x.moneyMonthTotal || 0), 0), suffix: '元', icon: WalletOutlined, color: '#eb2f96', bg: '#fff0f6', path: '/money' }
      ],
      actions: [
        { label: '素材库', icon: PictureOutlined, path: '/media', color: '#fa8c16' },
        { label: '运营看板', icon: DashboardOutlined, path: '/media-board', color: '#52c41a' },
        { label: '创作稿件', icon: FileTextOutlined, path: '/docs', color: '#1677ff' },
        { label: '收支记账', icon: WalletOutlined, path: '/money', color: '#eb2f96' },
        { label: '习惯打卡', icon: ClockCircleOutlined, path: '/checkin', color: '#13c2c2' },
        { label: '密码管理', icon: KeyOutlined, path: '/secrets', color: '#722ed1' }
      ]
    }
  }
})

const currentConfig = computed(() => roleConfig.value[currentRole.value])

const goAction = (path: string) => {
  router.push(path)
}

const switchRole = (role: 'dev' | 'ai' | 'media') => {
  currentRole.value = role
  localStorage.setItem('homeRole', role)
}

onMounted(async () => {
  const savedRole = localStorage.getItem('homeRole') as 'dev' | 'ai' | 'media' | null
  if (savedRole) currentRole.value = savedRole
  if (authStore.token && !authStore.userInfo) {
    try { await authStore.fetchUserInfo() } catch { /* 忽略 */ }
  }
  if (authStore.token) {
    try { await loadDashboard() } catch { /* 忽略 */ }
  }
})
</script>

<template>
  <div class="home-page">
    <!-- 欢迎卡片 -->
    <a-card class="welcome-card" :bordered="false">
      <div class="welcome-content">
        <div class="welcome-left">
          <h2 class="welcome-title">你好，{{ nickname }} 👋</h2>
          <p class="welcome-date">{{ todayText }}</p>
          <p class="welcome-quote">
            <BulbOutlined class="quote-icon" />
            每日一句：{{ dailyQuote }}
          </p>
        </div>
        <div class="welcome-emoji">🌟</div>
      </div>
    </a-card>

    <!-- 角色切换栏 -->
    <div class="role-switcher">
      <div
        v-for="(config, key) in roleConfig"
        :key="key"
        class="role-tab"
        :class="{ active: currentRole === key }"
        :style="currentRole === key ? { background: config.color, borderColor: config.color } : {}"
        @click="switchRole(key as 'dev' | 'ai' | 'media')"
      >
        <component :is="config.icon" />
        <span>{{ config.label }}</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stat-row">
      <a-col :xs="24" :sm="12" :lg="6" v-for="item in currentConfig.stats" :key="item.title">
        <a-card class="stat-card" :bordered="false" hoverable @click="goAction(item.path)">
          <div class="stat-card-inner">
            <div class="stat-icon-wrap" :style="{ background: item.bg, color: item.color }">
              <component :is="item.icon" />
            </div>
            <div class="stat-info">
              <div class="stat-value">
                {{ item.value }}<span class="stat-suffix">{{ item.suffix }}</span>
              </div>
              <div class="stat-title">{{ item.title }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 快捷操作 -->
    <a-card class="action-card" :bordered="false">
      <template #title>
        <span class="action-card-title">{{ currentConfig.label }} 快捷操作</span>
      </template>
      <div class="action-grid">
        <div
          v-for="action in currentConfig.actions"
          :key="action.label"
          class="action-item"
          @click="goAction(action.path)"
        >
          <div class="action-icon" :style="{ background: action.color }">
            <component :is="action.icon" />
          </div>
          <div class="action-label">{{ action.label }}</div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.welcome-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 10px;
  overflow: hidden;
}

.welcome-card :deep(.ant-card-body) {
  padding: 24px 28px;
}

.welcome-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-title {
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.welcome-date {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  margin-bottom: 6px;
}

.welcome-quote {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.quote-icon {
  color: #ffd666;
}

.welcome-emoji {
  font-size: 56px;
  line-height: 1;
}

/* 角色切换栏 */
.role-switcher {
  display: flex;
  gap: 12px;
}

.role-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  border: 2px solid #f0f0f0;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #666;
  transition: all 0.25s;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
}

.role-tab:hover {
  border-color: #1677ff;
  color: #1677ff;
  transform: translateY(-2px);
}

.role-tab.active {
  color: #fff;
  border-color: #1677ff;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.25);
}

.stat-row {
  margin-top: 0;
}

.stat-card {
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  transition: transform 0.2s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 26px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.2;
}

.stat-suffix {
  font-size: 13px;
  font-weight: 400;
  margin-left: 2px;
  color: rgba(0, 0, 0, 0.45);
}

.stat-title {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  margin-top: 4px;
}

.action-card {
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.action-card-title {
  font-size: 16px;
  font-weight: 600;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
}

.action-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #1677ff;
}

.action-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  margin-bottom: 10px;
}

.action-label {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 500;
}
</style>
