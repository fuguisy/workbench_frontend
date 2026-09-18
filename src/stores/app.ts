import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

export const useAppStore = defineStore('app', () => {
  // 侧边栏折叠状态
  const siderCollapsed = ref<boolean>(
    localStorage.getItem('app:siderCollapsed') === '1'
  )

  // 主题：默认深色（设计稿默认）
  const theme = ref<Theme>(
    (localStorage.getItem('app:theme') as Theme) || 'dark'
  )

  // 通知未读数（由通知页面加载后同步）
  const unreadCount = ref<number>(
    Number(localStorage.getItem('app:unread') || '0') || 0
  )

  watch(siderCollapsed, v => localStorage.setItem('app:siderCollapsed', v ? '1' : '0'))
  watch(theme, v => {
    localStorage.setItem('app:theme', v)
    document.documentElement.setAttribute('data-theme', v)
  })
  watch(unreadCount, v => localStorage.setItem('app:unread', String(v)))

  // 应用主题
  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', theme.value)
  }
  applyTheme()

  return {
    siderCollapsed,
    theme,
    unreadCount,
    applyTheme,
    toggleTheme: () => { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
  }
})
