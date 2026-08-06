<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import {
  HomeOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  ProjectOutlined,
  BugOutlined,
  ReadOutlined,
  ExperimentOutlined,
  BulbOutlined,
  PictureOutlined,
  ClockCircleOutlined,
  WalletOutlined,
  CodeOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  FileTextOutlined,
  KeyOutlined,
  CloudOutlined,
  FileMarkdownOutlined,
  PieChartOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  BulbFilled
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'

// 暗色主题 SVG 图标（替代不存在的 MoonOutlined）
const MoonIcon = {
  name: 'MoonIcon',
  render() {
    return '🌙'
  }
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)
const isDark = ref(false)
const openKeys = ref<string[]>(['dev', 'ai', 'media', 'stat', 'system'])

const selectedKeys = computed<string[]>(() => {
  if (route.path === '/') return ['/']
  const seg = route.path.split('/')[1] || ''
  return ['/' + seg]
})

const nickname = computed(() => authStore.userInfo?.nickname || '晓贵')
const avatar = computed(() => authStore.userInfo?.avatar || '')

// 所有菜单项都有真实路由，直接跳转
const handleMenuClick = (key: string) => {
  router.push(key).catch(() => router.push('/'))
}

// 程序员模块
const devMenus = [
  { key: '/todo', icon: CheckSquareOutlined, label: '任务待办' },
  { key: '/project', icon: ProjectOutlined, label: '项目进度' },
  { key: '/bugs', icon: BugOutlined, label: 'Bug台账' },
  { key: '/repo', icon: CodeOutlined, label: '代码仓库' },
  { key: '/svc', icon: CloudServerOutlined, label: '服务器' },
  { key: '/read', icon: ReadOutlined, label: '学习阅读' },
  { key: '/tech', icon: FileTextOutlined, label: '技术笔记' },
  { key: '/markdown', icon: FileMarkdownOutlined, label: '文档管理' },
]

// AI 模块
const aiMenus = [
  { key: '/ai', icon: ExperimentOutlined, label: 'AI实验室' },
  { key: '/idea', icon: BulbOutlined, label: '内容灵感' },
]

// 自媒体模块
const mediaMenus = [
  { key: '/media', icon: PictureOutlined, label: '素材库' },
  { key: '/media-board', icon: DashboardOutlined, label: '自媒体看板' },
  { key: '/docs', icon: FileTextOutlined, label: '创作稿件库' },
  { key: '/checkin', icon: ClockCircleOutlined, label: '习惯打卡' },
  { key: '/money', icon: WalletOutlined, label: '收支记账' },
  { key: '/secrets', icon: KeyOutlined, label: '密码管理' },
  { key: '/backup', icon: CloudOutlined, label: '文件备份' },
]

const breadcrumbItems = computed(() => {
  const items: { title: string }[] = [{ title: '首页' }]
  const meta = route.meta as { title?: string }
  if (meta?.title && route.path !== '/') {
    items.push({ title: meta.title })
  }
  return items
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

const onUserMenuClick = ({ key }: { key: string }) => {
  if (key === 'logout') {
    Modal.confirm({
      title: '确认退出登录?',
      content: '退出后需要重新登录才能使用工作台',
      okText: '确认退出',
      cancelText: '取消',
      onOk: async () => {
        await authStore.logout()
        router.push('/login')
      }
    })
  }
}

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', 'light')
  if (authStore.token && !authStore.userInfo) {
    try {
      await authStore.fetchUserInfo()
    } catch {
      // 忽略
    }
  }
})
</script>

<template>
  <a-layout class="main-layout">
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      :width="260"
      :collapsed-width="80"
      class="layout-sider"
    >
      <div class="logo-area">
        <a-avatar :size="40" :src="avatar || undefined" class="avatar">
          <template v-if="!avatar"><UserOutlined /></template>
        </a-avatar>
        <transition name="fade">
          <div v-show="!collapsed" class="logo-text">
            <div class="logo-name">晓贵的工作台</div>
            <div class="logo-sub">Self-Media · Java Dev</div>
          </div>
        </transition>
      </div>

      <a-menu
        :selectedKeys="selectedKeys"
        :openKeys="openKeys"
        @update:openKeys="openKeys = $event"
        mode="inline"
        theme="dark"
      >
        <a-menu-item key="/" @click="handleMenuClick('/')">
          <HomeOutlined />
          <span>首页</span>
        </a-menu-item>

        <a-sub-menu key="dev">
          <template #title>
            <CodeOutlined />
            <span>程序员</span>
          </template>
          <a-menu-item
            v-for="m in devMenus"
            :key="m.key"
            @click="handleMenuClick(m.key)"
          >
            <component :is="m.icon" />
            <span>{{ m.label }}</span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="ai">
          <template #title>
            <ExperimentOutlined />
            <span>AI 探索</span>
          </template>
          <a-menu-item
            v-for="m in aiMenus"
            :key="m.key"
            @click="handleMenuClick(m.key)"
          >
            <component :is="m.icon" />
            <span>{{ m.label }}</span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="media">
          <template #title>
            <PictureOutlined />
            <span>自媒体</span>
          </template>
          <a-menu-item
            v-for="m in mediaMenus"
            :key="m.key"
            @click="handleMenuClick(m.key)"
          >
            <component :is="m.icon" />
            <span>{{ m.label }}</span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="stat">
          <template #title>
            <PieChartOutlined />
            <span>统计</span>
          </template>
          <a-menu-item key="/insight" @click="handleMenuClick('/insight')">
            <PieChartOutlined />
            <span>洞察复盘</span>
          </a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="system">
          <template #title>
            <SettingOutlined />
            <span>系统</span>
          </template>
          <a-menu-item key="/settings" @click="handleMenuClick('/settings')">
            <SettingOutlined />
            <span>工作台设置</span>
          </a-menu-item>
        </a-sub-menu>
      </a-menu>

      <div class="sider-footer">
        <a-button type="text" block class="theme-btn" @click="toggleTheme">
          <span v-if="!isDark" style="font-size:16px">💡</span>
          <span v-else style="font-size:16px">🌙</span>
          <span v-show="!collapsed" class="theme-label">
            {{ isDark ? '切换亮色' : '切换暗色' }}
          </span>
        </a-button>
      </div>
    </a-layout-sider>

    <a-layout class="layout-content-wrap">
      <a-layout-header class="layout-header">
        <div class="header-left">
          <a-button type="text" class="trigger" @click="collapsed = !collapsed">
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </a-button>
          <a-breadcrumb class="breadcrumb">
            <a-breadcrumb-item v-for="(item, idx) in breadcrumbItems" :key="idx">
              {{ item.title }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <div class="header-right">
          <a-dropdown>
            <div class="user-area">
              <a-avatar :size="32" :src="avatar || undefined" class="user-avatar">
                <template v-if="!avatar"><UserOutlined /></template>
              </a-avatar>
              <span class="user-name">{{ nickname }}</span>
            </div>
            <template #overlay>
              <a-menu @click="onUserMenuClick">
                <a-menu-item key="profile">
                  <UserOutlined />
                  <span style="margin-left: 8px">个人信息</span>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout">
                  <LogoutOutlined />
                  <span style="margin-left: 8px">退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>

      <a-layout-content class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.main-layout {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  display: flex;
}

.layout-sider {
  flex-shrink: 0;
  background: var(--sider-bg) !important;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.layout-sider :deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sider-bg);
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  white-space: nowrap;
}

.logo-area .avatar {
  flex-shrink: 0;
  background: #1677ff;
}

.logo-text {
  overflow: hidden;
}

.logo-name {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.logo-sub {
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  line-height: 1.4;
}

.layout-sider :deep(.ant-menu) {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: none !important;
  background: var(--sider-bg) !important;
}

.layout-sider :deep(.ant-menu-dark) {
  background: var(--sider-bg) !important;
}

.sider-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 12px;
}

.theme-btn {
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
}

.theme-btn:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.theme-label {
  font-size: 13px;
}

.layout-content-wrap {
  flex: 1;
  background: var(--color-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--header-bg) !important;
  padding: 0 20px 0 12px;
  height: 56px;
  line-height: 56px;
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.06);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.trigger {
  font-size: 18px;
  padding: 0 8px;
}

.breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 0 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-area:hover {
  background: var(--color-border);
}

.user-avatar {
  background: #1677ff;
}

.user-name {
  color: var(--color-text);
  font-size: 14px;
}

.layout-content {
  flex: 1;
  margin: 16px;
  padding: 20px;
  background: var(--color-bg);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
