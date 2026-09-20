<script setup lang="ts">
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// Ant Design Vue 算法主题：跟随全局 theme
const algorithm = computed(() =>
  appStore.theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm
)

// 主色调：优先取「工作台设置」里选定的颜色，未设置时跟随主题默认色
const primary = computed(
  () => appStore.primaryColor || (appStore.theme === 'dark' ? '#5E6AD2' : '#1677ff')
)

// 设计稿深色 token（与 CSS 变量对齐）
const token = computed(() => ({
  colorPrimary: primary.value,
  colorInfo: primary.value,
  colorSuccess: '#34C759',
  colorWarning: '#FF9F0A',
  colorError: '#FF453A',
  borderRadius: 10,
  wireframe: false,
  colorBgBase: appStore.theme === 'dark' ? '#08090A' : '#ffffff',
  colorTextBase: appStore.theme === 'dark' ? '#FAFAFA' : '#1f2937'
}))
</script>

<template>
  <ConfigProvider :locale="zhCN" :theme="{ algorithm, token }">
    <AntdApp>
      <RouterView />
    </AntdApp>
  </ConfigProvider>
</template>
