<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'
import {
  BellOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  HomeOutlined,
  CheckSquareOutlined,
  ReadOutlined,
  BulbOutlined,
  SendOutlined,
  FireOutlined,
  WalletOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { notificationApi } from '@/api/modules'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const nickname = computed(() => authStore.userInfo?.nickname || '晓贵')
const avatar = computed(() => authStore.userInfo?.avatar || '')
const unreadCount = computed(() => appStore.unreadCount)

// 登录后加载真实未读数（走后端计数接口，避免为了一个数字拉取全量通知列表）
const loadUnread = async () => {
  try {
    const count = await notificationApi.unreadCount()
    appStore.unreadCount = Number(count) || 0
  } catch { /* 静默失败 */ }
}

const searchFocused = ref(false)
const cmdOpen = ref(false)
// 命令面板的输入关键词（此前误绑到 cmdOpen 布尔值上，导致无法输入）
const cmdQuery = ref('')

// 可跳转的目标，keys 用于搜索匹配（中英文别名）
const cmdItems = [
  { path: '/', label: '工作台首页', icon: HomeOutlined, keys: 'home dashboard 首页 工作台 概览' },
  { path: '/todo', label: '任务看板', icon: CheckSquareOutlined, keys: 'todo task 任务 待办 看板' },
  { path: '/markdown', label: '知识库', icon: ReadOutlined, keys: 'markdown doc 知识库 笔记 文档' },
  { path: '/topic', label: '选题池', icon: BulbOutlined, keys: 'topic 选题 灵感 创意' },
  { path: '/publish', label: '发布管理', icon: SendOutlined, keys: 'publish 发布 分发 推送' },
  { path: '/hot', label: '热点监控', icon: FireOutlined, keys: 'hot 热点 热搜 趋势' },
  { path: '/money', label: '收支记账', icon: WalletOutlined, keys: 'money 记账 收支 账本 预算' },
  { path: '/settings', label: '工作台设置', icon: SettingOutlined, keys: 'setting 设置 配置 偏好' }
]

const filteredCmdItems = computed(() => {
  const q = cmdQuery.value.trim().toLowerCase()
  if (!q) return cmdItems
  return cmdItems.filter(i => `${i.label} ${i.keys}`.toLowerCase().includes(q))
})

// 每次打开面板重置关键词
watch(cmdOpen, open => { if (open) cmdQuery.value = '' })

// ⌘K 全局快捷键 + 命令面板事件
const onKeydown = (e: KeyboardEvent) => {
  const isCmd = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
  if (isCmd) {
    e.preventDefault()
    cmdOpen.value = true
  }
  if (e.key === 'Escape') cmdOpen.value = false
}
const onCmdOpen = () => { cmdOpen.value = true }

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('cmdpalette:open', onCmdOpen)
  // 加载真实未读数
  loadUnread()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('cmdpalette:open', onCmdOpen)
})

const onUserMenu = (info: any) => {
  const key = typeof info === 'string' ? info : info?.key
  if (key === 'logout') {
    Modal.confirm({
      title: '确认退出登录?',
      content: '退出后需要重新登录才能使用工作台',
      okText: '确认退出',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try { await authStore.logout() } catch {}
        // 彻底清除所有可能残留的登录态（覆盖 localStorage/sessionStorage 常见键）
        try {
          const keys = ['token', 'satoken', 'sa-token', 'Authorization', 'userInfo', 'userId', 'role']
          keys.forEach(k => {
            localStorage.removeItem(k)
            sessionStorage.removeItem(k)
          })
          // 也清 cookie（Sa-Token 可能写 cookie）
          document.cookie.split(';').forEach(c => {
            const eq = c.indexOf('=')
            const name = (eq > -1 ? c.slice(0, eq) : c).trim()
            if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          })
        } catch {}
        // 强制跳登录页并整页刷新，避免 pinia / axios 缓存残留
        const redirect = '/login'
        try { router.replace(redirect) } catch {}
        setTimeout(() => { window.location.href = redirect }, 30)
      }
    })
  } else if (key === 'profile') {
    // 个人信息：预留，暂时无单独页
    Modal.info({ title: '个人信息', content: '个人资料页后续开放，当前可在工作台设置中修改。' })
  }
}

const onQuickCreate = () => {
  // 快速记录：后续对接任务/灵感弹窗，先跳到任务看板
  router.push('/todo')
}
const onQuickNote = () => {
  router.push('/markdown')
}
// 命令面板快速跳转
const goCmd = (path: string) => {
  cmdOpen.value = false
  router.push(path)
}
</script>

<template>
  <header class="app-header">
    <!-- 搜索栏 -->
    <div
      class="search-wrap"
      :class="{ focused: searchFocused }"
      @click="cmdOpen = true"
    >
      <SearchOutlined class="search-icon" />
      <input
        class="search-input"
        type="text"
        placeholder="搜索任务、笔记、素材..."
        readonly
        @focus="searchFocused = true"
        @blur="searchFocused = false"
      />
      <kbd class="search-kbd">
        <span class="kbd-key">⌘</span><span class="kbd-key">K</span>
      </kbd>
    </div>

    <!-- 右侧操作区 -->
    <div class="header-actions">
      <!-- 通知铃铛 -->
      <button class="icon-btn notif-btn" @click="$router.push('/notification')">
        <BellOutlined />
        <span v-if="unreadCount > 0" class="notif-dot">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>

      <!-- 设置入口（侧边栏隐藏系统分组时仍可进入） -->
      <button class="icon-btn" title="工作台设置" @click="$router.push('/settings')">
        <SettingOutlined />
      </button>

      <!-- 新建任务（主按钮） -->
      <button class="btn-primary" @click="onQuickCreate">
        <PlusOutlined />
        <span>新建任务</span>
      </button>

      <!-- 快速记录 -->
      <button class="btn-ghost" @click="onQuickNote">
        <EditOutlined />
        <span>快速记录</span>
      </button>

      <!-- 用户 -->
      <a-dropdown :trigger="['click']">
        <div class="user-area">
          <a-avatar :size="32" :src="avatar || undefined" class="user-avatar">
            <template v-if="!avatar"><UserOutlined /></template>
          </a-avatar>
          <span class="user-name">{{ nickname }}</span>
        </div>
        <template #overlay>
          <a-menu @click="onUserMenu" class="user-menu">
            <a-menu-item key="profile">
              <UserOutlined /><span style="margin-left:8px">个人信息</span>
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout">
              <LogoutOutlined /><span style="margin-left:8px">退出登录</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </header>

  <!-- ⌘K 命令面板弹层（先占位，后续完整实现） -->
  <Teleport to="body">
    <div v-if="cmdOpen" class="cmd-overlay" @click.self="cmdOpen = false">
      <div class="cmd-panel" @click.stop>
        <div class="cmd-search-row">
          <SearchOutlined class="cmd-icon" />
          <input
            v-model="cmdQuery"
            class="cmd-input"
            placeholder="输入命令或搜索..."
            autofocus
            @keydown.esc="cmdOpen = false"
            @keydown.enter="filteredCmdItems.length && goCmd(filteredCmdItems[0].path)"
          />
          <kbd class="cmd-kbd">ESC</kbd>
        </div>
        <div class="cmd-results">
          <div class="cmd-group-title">快速跳转</div>
          <div v-if="!filteredCmdItems.length" class="cmd-empty">没有匹配的页面</div>
          <div
            v-for="item in filteredCmdItems"
            :key="item.path"
            class="cmd-item"
            @click="goCmd(item.path)"
          >
            <component :is="item.icon" class="cmd-item-icon" /><span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.app-header {
  height: 60px;
  flex-shrink: 0;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 24px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
}

/* —— 搜索栏 —— */
.search-wrap {
  flex: 1;
  max-width: 560px;
  height: 40px;
  border-radius: 10px;
  background: var(--header-search-bg);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.18s ease;
}
.search-wrap:hover {
  background: var(--color-bg-elevated);
}
.search-wrap.focused {
  border-color: var(--color-primary);
  background: var(--color-bg-card);
}
.search-icon {
  color: var(--header-search-placeholder);
  font-size: 15px;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  cursor: pointer;
}
.search-input::placeholder { color: var(--header-search-placeholder); }
.search-kbd {
  display: flex;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--color-bg-elevated);
  flex-shrink: 0;
}
.kbd-key {
  min-width: 16px;
  height: 18px;
  padding: 0 4px;
  border-radius: 3px;
  background: var(--color-bg-card-2);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* —— 右侧操作区 —— */
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--header-btn-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-size: 16px;
}
.icon-btn:hover {
  background: var(--header-btn-bg-hover);
  color: var(--color-text);
}
.notif-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 16px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--color-error);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-primary,
.btn-ghost {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-0.5px);
}
.btn-ghost {
  background: var(--header-btn-bg);
  color: var(--color-text);
  border-color: var(--color-border);
}
.btn-ghost:hover {
  background: var(--header-btn-bg-hover);
  border-color: var(--color-border-strong);
}

.user-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.15s;
}
.user-area:hover { background: var(--color-bg-hover); }
.user-avatar {
  background: var(--color-primary);
  flex-shrink: 0;
}
.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  max-width: 80px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
:deep(.user-menu) { background: var(--color-bg-card); }

/* —— 命令面板 —— */
.cmd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 18vh;
  animation: fadeIn 0.12s ease-out;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.cmd-panel {
  width: min(640px, 90vw);
  max-height: 60vh;
  border-radius: 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-strong);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: panelIn 0.15s ease-out;
}
@keyframes panelIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cmd-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}
.cmd-icon { color: var(--color-text-secondary); font-size: 16px; }
.cmd-input {
  flex: 1;
  height: 28px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 15px;
}
.cmd-kbd {
  padding: 3px 8px;
  border-radius: 5px;
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-family: ui-monospace, Menlo, monospace;
}
.cmd-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.cmd-group-title {
  padding: 10px 12px 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
}
.cmd-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text);
  transition: background 0.1s;
}
.cmd-item:hover { background: var(--color-bg-hover); }
.cmd-item-icon { width: 18px; color: var(--color-text-secondary); font-size: 15px; }
.cmd-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-tertiary);
}
</style>
