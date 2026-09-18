<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSider from '@/components/AppSider.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// 顶部小面包屑（设计稿的标题区：页面名 + 描述）
const pageTitle = computed(() => {
  const meta = route.meta as { title?: string; desc?: string }
  return {
    title: meta.title || '首页',
    desc: meta.desc || ''
  }
})

onMounted(async () => {
  // 全站默认强制启用深色主题
  document.documentElement.setAttribute('data-theme', 'dark')
  if (authStore.token && !authStore.userInfo) {
    try { await authStore.fetchUserInfo() } catch { /* ignore */ }
  }
})
</script>

<template>
  <div class="main-layout">
    <AppSider />

    <div class="main-right">
      <AppHeader />

      <!-- 页面标题栏（各页面也可在内部自定义） -->
      <div v-if="route.path !== '/'" class="page-title-bar">
        <div>
          <h1 class="page-title">{{ pageTitle.title }}</h1>
          <p v-if="pageTitle.desc" class="page-desc">{{ pageTitle.desc }}</p>
        </div>
        <div class="page-title-actions">
          <slot name="page-actions" />
        </div>
      </div>

      <main class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
}

.main-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.page-title-bar {
  flex-shrink: 0;
  padding: 24px 32px 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.page-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.2;
  letter-spacing: -0.01em;
}
.page-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.page-title-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.page-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 32px 32px;
}
.page-content::-webkit-scrollbar { width: 10px; }
.page-content::-webkit-scrollbar-thumb {
  background: var(--color-bg-elevated);
  border-radius: 5px;
  border: 2px solid var(--color-bg);
}
.page-content::-webkit-scrollbar-thumb:hover { background: var(--color-border-strong); }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
