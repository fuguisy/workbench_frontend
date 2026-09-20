<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  HomeOutlined,
  CalendarOutlined,
  BellOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  AimOutlined,
  CodeOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  FileTextOutlined,
  ReadOutlined,
  WalletOutlined,
  SwapOutlined,
  KeyOutlined,
  CloudOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  FunnelPlotOutlined,
  BulbOutlined,
  SendOutlined,
  BugOutlined,
  ProjectOutlined,
  CloudServerOutlined,
  BookOutlined,
  HighlightOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

// —— 7 大区分组（严格按设计稿顺序）——
type MenuItem = {
  key: string
  label: string
  icon: any
  badge?: number | string
  group: string
  order: number
  cmdOnly?: boolean // 命令面板不需要路由
}

const GROUPS = [
  { key: 'workbench', label: '工作台' },
  { key: 'efficiency', label: '效率' },
  { key: 'dev', label: '程序员' },
  { key: 'media', label: '自媒体' },
  { key: 'personal', label: '知识与个人' },
  { key: 'system', label: '系统' }
] as const

const MENU: MenuItem[] = [
  // 【工作台】
  { key: '/',         label: '首页',       icon: HomeOutlined,         group: 'workbench',  order: 1 },
  { key: '/calendar', label: '日历 / 日程', icon: CalendarOutlined,   group: 'workbench',  order: 2 },
  // 通知中心的 badge 改为动态：模板中读取 appStore.unreadCount
  { key: '/notification', label: '通知中心', icon: BellOutlined,      group: 'workbench',  order: 3 },

  // 【效率】
  { key: '/todo',     label: '任务看板',   icon: CheckSquareOutlined,  group: 'efficiency', order: 1 },
  { key: '/focus',    label: '专注 / 番茄钟', icon: ClockCircleOutlined, group: 'efficiency', order: 2 },
  { key: '/okr',      label: '目标 / OKR', icon: AimOutlined,          group: 'efficiency', order: 3 },

  // 【程序员】（与路由 dev 分组的 7 个页面保持一致，避免出现"有路由无入口"的死页面）
  { key: '/repo',     label: '代码仓库',   icon: CodeOutlined,         group: 'dev',        order: 1 },
  { key: '/ai',       label: 'AI 实验室',  icon: ExperimentOutlined,   group: 'dev',        order: 2 },
  { key: '/bugs',     label: 'Bug 台账',   icon: BugOutlined,          group: 'dev',        order: 3 },
  { key: '/project',  label: '项目进度',   icon: ProjectOutlined,      group: 'dev',        order: 4 },
  { key: '/svc',      label: '服务器 & 自部署', icon: CloudServerOutlined, group: 'dev',    order: 5 },
  { key: '/read',     label: '学习阅读',   icon: BookOutlined,         group: 'dev',        order: 6 },
  { key: '/tech',     label: '技术笔记',   icon: FileTextOutlined,     group: 'dev',        order: 7 },
  { key: '__cmd__',   label: '命令面板 ⌘K', icon: ThunderboltOutlined, group: 'dev',        order: 8, cmdOnly: true },

  // 【自媒体】
  { key: '/media-board', label: '自媒体看板', icon: PlayCircleOutlined, group: 'media',      order: 1 },
  { key: '/topic',    label: '选题池',     icon: BulbOutlined,         group: 'media',      order: 2 },
  { key: '/docs',     label: '创作稿件库', icon: FileTextOutlined,     group: 'media',      order: 3 },
  { key: '/media',    label: '素材库',     icon: PictureOutlined,      group: 'media',      order: 4 },
  { key: '/publish',  label: '发布管理',   icon: SendOutlined,         group: 'media',      order: 5 },
  { key: '/lead',     label: '线索 / 商机', icon: FunnelPlotOutlined,  group: 'media',      order: 6 },

  // 【知识与个人】
  { key: '/markdown', label: '知识库',     icon: ReadOutlined,         group: 'personal',   order: 1 },
  { key: '/idea',     label: '灵感记录',   icon: HighlightOutlined,    group: 'personal',   order: 2 },
  { key: '/checkin',  label: '习惯打卡',   icon: ClockCircleOutlined,  group: 'personal',   order: 3 },
  { key: '/money',    label: '收支记账',   icon: WalletOutlined,       group: 'personal',   order: 4 },
  { key: '/subscription', label: '订阅账单', icon: SwapOutlined,       group: 'personal',   order: 5 },

  // 【系统】
  { key: '/secrets',  label: '密码管理',   icon: KeyOutlined,          group: 'system',     order: 1 },
  { key: '/backup',   label: '文件备份',   icon: CloudOutlined,        group: 'system',     order: 2 },
  { key: '/insight',  label: '洞察复盘',   icon: BarChartOutlined,     group: 'system',     order: 3 },
  { key: '/settings', label: '工作台设置', icon: SettingOutlined,      group: 'system',     order: 4 }
]

const groupedMenu = computed(() => {
  return GROUPS.map(g => ({
    ...g,
    items: MENU.filter(m => m.group === g.key).sort((a, b) => a.order - b.order)
  })).filter(g => {
    // 读取菜单显示配置，默认全部显示；工作台和效率分组始终显示
    if (g.key === 'dev')      return localStorage.getItem('wb-menu-dev') !== 'false'
    if (g.key === 'media')    return localStorage.getItem('wb-menu-media') !== 'false'
    if (g.key === 'personal') return localStorage.getItem('wb-menu-personal') !== 'false'
    if (g.key === 'system')   return localStorage.getItem('wb-menu-system') !== 'false'
    return true
  })
})

// 精确匹配优先，其次按最长前缀匹配，兼容未来出现的子路由（如 /markdown/:id）
const selectedKeys = computed<string[]>(() => {
  const path = route.path
  const exact = MENU.find(m => !m.cmdOnly && m.key === path)
  if (exact) return [exact.key]
  const prefix = MENU
    .filter(m => !m.cmdOnly && m.key !== '/' && path.startsWith(m.key + '/'))
    .sort((a, b) => b.key.length - a.key.length)[0]
  return [prefix ? prefix.key : path]
})

const nickname = computed(() => authStore.userInfo?.nickname || '晓贵')
const avatar = computed(() => authStore.userInfo?.avatar || '')

const getMenuBadge = (m: MenuItem): number | string | undefined => {
  if (m.key === '/notification') {
    const n = appStore.unreadCount
    return n > 0 ? n : undefined
  }
  return m.badge
}

const handleClick = (item: MenuItem) => {
  if (item.cmdOnly) {
    // 命令面板：派发全局事件，由 AppHeader 中的弹层监听
    window.dispatchEvent(new CustomEvent('cmdpalette:open'))
    return
  }
  // 已在当前页面则不重复导航（避免 vue-router 抛出重复导航告警）
  if (item.key === route.path) return
  router.push(item.key)
}
</script>

<template>
  <aside class="app-sider">
    <!-- Logo 区 -->
    <div class="logo-area">
      <div class="logo-icon">
        <span style="font-size:18px">✦</span>
      </div>
      <div class="logo-text">
        <div class="logo-name">晓贵的工作台</div>
      </div>
    </div>

    <!-- 菜单分组 -->
    <nav class="menu-wrap">
      <template v-for="g in groupedMenu" :key="g.key">
        <div class="menu-group">
          <div class="menu-group-label">{{ g.label }}</div>
          <ul class="menu-list">
            <li
              v-for="m in g.items"
              :key="m.key"
              class="menu-item"
              :class="{ active: selectedKeys[0] === m.key }"
              @click="handleClick(m)"
            >
              <span class="menu-icon">
                <component :is="m.icon" />
              </span>
              <span class="menu-label">{{ m.label }}</span>
              <span v-if="getMenuBadge(m)" class="menu-badge">{{ getMenuBadge(m) }}</span>
            </li>
          </ul>
        </div>
      </template>
    </nav>

    <!-- 底部用户区 -->
    <div class="sider-footer">
      <a-avatar :size="34" :src="avatar || undefined" class="footer-avatar">
        <template v-if="!avatar"><UserOutlined /></template>
      </a-avatar>
      <div class="footer-info">
        <div class="footer-name">{{ nickname }}</div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.app-sider {
  width: 240px;
  flex-shrink: 0;
  height: 100vh;
  background: var(--sider-bg);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  color: var(--sider-text);
  overflow: hidden;
  user-select: none;
}

/* Logo 区 */
.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px 18px;
  border-bottom: 1px solid var(--color-border);
}
.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.logo-text { flex: 1; overflow: hidden; }
.logo-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--sider-text);
  line-height: 1.2;
}

/* 菜单区 */
.menu-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 10px 16px;
}
.menu-wrap::-webkit-scrollbar { width: 6px; }
.menu-wrap::-webkit-scrollbar-thumb { background: transparent; border-radius: 3px; }
.menu-wrap:hover::-webkit-scrollbar-thumb { background: var(--color-bg-elevated); }

.menu-group { margin-bottom: 18px; }
.menu-group-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--sider-group-label);
  letter-spacing: 0.04em;
  padding: 4px 10px 8px;
  text-transform: none;
}
.menu-list { display: flex; flex-direction: column; gap: 2px; }

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--sider-text-secondary);
  font-size: 14px;
  transition: all 0.15s ease;
  position: relative;
}
.menu-item:hover {
  background: var(--sider-item-bg-hover);
  color: var(--sider-text);
}
.menu-item.active {
  background: var(--sider-item-bg-active);
  color: var(--sider-item-text-active);
  font-weight: 500;
}
.menu-item.active::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

.menu-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.menu-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.menu-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: var(--color-error);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 底部用户区 */
.sider-footer {
  border-top: 1px solid var(--color-border);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.footer-avatar {
  background: var(--color-primary);
  flex-shrink: 0;
}
.footer-info { flex: 1; overflow: hidden; }
.footer-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--sider-text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
