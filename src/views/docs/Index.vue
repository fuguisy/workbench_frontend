<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { docsApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '创作稿件库',
  api: docsApi,
  searchFields: [
    { key: 'title', label: '稿件名', type: 'input' },
    {
      key: 'category', label: '分类', type: 'select', options: [
        { label: '小说大纲', value: '小说大纲' },
        { label: '小说章节', value: '小说章节' },
        { label: '短视频口播稿', value: '口播稿' },
        { label: '技术干货原稿', value: '技术稿' },
        { label: '公众号文章', value: '公众号' },
        { label: '其他', value: '其他' }
      ]
    }
  ],
  columns: [
    { title: '稿件标题', dataIndex: 'title', width: 260 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 130,
      align: 'center',
      tagColorMap: {
        '小说大纲': 'purple',
        '小说章节': 'magenta',
        '口播稿': 'orange',
        '技术稿': 'blue',
        '公众号': 'green',
        '其他': 'default'
      }
    },
    { title: '字数', dataIndex: 'wordCount', width: 100, align: 'center', customRender: ({ text }: any) => text ? `📝 ${text}` : '-' },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '内容摘要', dataIndex: 'content', width: 300, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '稿件标题', type: 'input', required: true, span: 24 },
    {
      key: 'category', label: '稿件分类', type: 'select', required: true, span: 12, options: [
        { label: '小说大纲 / 世界观设定', value: '小说大纲' },
        { label: '小说章节正文', value: '小说章节' },
        { label: '短视频口播稿', value: '口播稿' },
        { label: '技术干货原创稿', value: '技术稿' },
        { label: '公众号深度文章', value: '公众号' },
        { label: '其他文案', value: '其他' }
      ]
    },
    { key: 'wordCount', label: '字数统计', type: 'number', span: 12 },
    { key: 'date', label: '写稿/完成日期', type: 'date', span: 12 },
    { key: 'mood', label: '质量评分/状态', type: 'input', placeholder: '⭐⭐⭐⭐⭐ / 已发布/待修改/草稿', span: 12 },
    { key: 'content', label: '稿件正文内容', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
