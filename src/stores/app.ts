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

  // ===== 外观：由「工作台设置 - 基础外观」写入，App.vue / MainLayout 消费 =====
  // 主色调：空字符串表示跟随主题默认色（深色 #5E6AD2 / 亮色 #1677ff）
  const primaryColor = ref<string>(localStorage.getItem('wb-primary') || '')
  const pageMaxWidth = ref<string>(localStorage.getItem('wb-width') || '1680')
  const modalWide = ref<boolean>(localStorage.getItem('wb-modal-wide') === 'true')

  watch(siderCollapsed, v => localStorage.setItem('app:siderCollapsed', v ? '1' : '0'))
  watch(theme, v => {
    localStorage.setItem('app:theme', v)
    document.documentElement.setAttribute('data-theme', v)
  })
  watch(unreadCount, v => localStorage.setItem('app:unread', String(v)))

  watch(primaryColor, v => {
    if (v) localStorage.setItem('wb-primary', v)
    else localStorage.removeItem('wb-primary')
    applyAppearance()
  })
  watch(pageMaxWidth, v => {
    localStorage.setItem('wb-width', v)
    applyAppearance()
  })
  watch(modalWide, v => {
    localStorage.setItem('wb-modal-wide', String(v))
    applyAppearance()
  })

  // 应用主题
  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  // 应用外观变量（主色调 / 页面最大宽度 / 弹窗宽度），刷新后仍生效
  const applyAppearance = () => {
    const root = document.documentElement
    if (primaryColor.value) root.style.setProperty('--color-primary', primaryColor.value)
    else root.style.removeProperty('--color-primary')
    root.style.setProperty('--wb-page-max', `${pageMaxWidth.value}px`)
    root.style.setProperty('--wb-modal-width', modalWide.value ? '960px' : '520px')
    root.setAttribute('data-modal-wide', modalWide.value ? 'true' : 'false')
  }

  applyTheme()
  applyAppearance()

  return {
    siderCollapsed,
    theme,
    unreadCount,
    primaryColor,
    pageMaxWidth,
    modalWide,
    applyTheme,
    applyAppearance,
    toggleTheme: () => { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
  }
})
