<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useMenuStore, type MenuItem } from '@/stores/menu'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const menuStore = useMenuStore()

// 侧边栏分组与条目全部来自数据库（/sys/menu/my）；
// 接口不可用时 store 内部已用内置菜单兜底，这里无需再判断空态。
const groupedMenu = computed(() => menuStore.visibleGroups)

// 精确匹配优先，其次按最长前缀匹配，兼容子路由（如 /markdown/:id）
const selectedKeys = computed<string[]>(() => {
  const path = route.path
  const all = menuStore.groups.flatMap((g) => g.items).filter((m) => !m.cmdOnly)
  const exact = all.find((m) => m.key === path)
  if (exact) return [exact.key]
  const prefix = all
    .filter((m) => m.key !== '/' && path.startsWith(m.key + '/'))
    .sort((a, b) => b.key.length - a.key.length)[0]
  return [prefix ? prefix.key : path]
})

const getMenuBadge = (m: MenuItem): number | string | undefined => {
  if (m.key === '/notification') {
    const n = appStore.unreadCount
    return n > 0 ? n : undefined
  }
  return undefined
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

onMounted(() => {
  menuStore.load()
})
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
      <template v-for="g in groupedMenu" :key="g.id">
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

/* 底部用户区（已移除，保留 padding 让菜单滚动到底部时留白更自然） */
</style>
