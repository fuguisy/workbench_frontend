<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { ideaApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '内容灵感',
  api: ideaApi,
  searchFields: [
    { key: 'title', label: '灵感/选题', type: 'input' },
    {
      key: 'platform', label: '适配平台', type: 'select', options: [
        { label: '抖音/短视频', value: '抖音' },
        { label: 'B站/中长视频', value: 'B站' },
        { label: '小红书/图文', value: '小红书' },
        { label: '公众号/文章', value: '公众号' },
        { label: '视频号', value: '视频号' },
        { label: '通用选题', value: '通用' }
      ]
    }
  ],
  columns: [
    { title: '灵感/选题标题', dataIndex: 'title', width: 260 },
    {
      title: '适配平台',
      dataIndex: 'platform',
      width: 120,
      align: 'center',
      tagColorMap: {
        '抖音': 'red',
        'B站': 'pink',
        '小红书': 'magenta',
        '公众号': 'green',
        '视频号': 'cyan',
        '通用': 'blue'
      }
    },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '内容摘要', dataIndex: 'content', width: 340, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '灵感/选题标题', type: 'input', required: true, span: 24 },
    {
      key: 'platform', label: '适配平台', type: 'select', required: true, span: 12, options: [
        { label: '抖音 / 短视频', value: '抖音' },
        { label: 'B站 / 中长视频', value: 'B站' },
        { label: '小红书 / 图文种草', value: '小红书' },
        { label: '公众号 / 深度文章', value: '公众号' },
        { label: '视频号', value: '视频号' },
        { label: '知乎 / 问答', value: '知乎' },
        { label: '通用多平台', value: '通用' }
      ]
    },
    { key: 'date', label: '灵感产生日期', type: 'date', span: 12 },
    { key: 'mood', label: '优先级/热度', type: 'input', placeholder: '⭐⭐⭐⭐⭐ / 爆款潜质/一般/待验证', span: 12 },
    { key: 'content', label: '灵感详细内容/脚本草稿/参考链接', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
