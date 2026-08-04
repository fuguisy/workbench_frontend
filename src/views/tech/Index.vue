<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { techApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '技术笔记',
  api: techApi,
  searchFields: [
    { key: 'title', label: '笔记标题', type: 'input' },
    {
      key: 'lang', label: '编程语言', type: 'select', options: [
        { label: 'Java', value: 'Java' },
        { label: 'SQL', value: 'SQL' },
        { label: '达梦SQL', value: '达梦' },
        { label: 'JavaScript', value: 'JS' },
        { label: 'TypeScript', value: 'TS' },
        { label: 'Vue', value: 'Vue' },
        { label: 'Shell', value: 'Shell' },
        { label: 'Docker', value: 'Docker' },
        { label: '其他', value: '其他' }
      ]
    }
  ],
  columns: [
    { title: '笔记标题', dataIndex: 'title', width: 260, ellipsis: true },
    {
      title: '语言/技术',
      dataIndex: 'lang',
      width: 110,
      align: 'center',
      tagColorMap: {
        'Java': 'red',
        'SQL': 'blue',
        '达梦': 'purple',
        'JS': 'yellow',
        'TS': 'blue',
        'Vue': 'green',
        'Shell': 'cyan',
        'Docker': 'cyan',
        '其他': 'default'
      }
    },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '内容摘要', dataIndex: 'content', width: 320, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '笔记标题', type: 'input', required: true, span: 24 },
    {
      key: 'lang', label: '编程语言/技术栈', type: 'select', required: true, span: 12, options: [
        { label: 'Java / Spring', value: 'Java' },
        { label: 'MySQL / Oracle SQL', value: 'SQL' },
        { label: '达梦数据库', value: '达梦' },
        { label: 'JavaScript', value: 'JS' },
        { label: 'TypeScript', value: 'TS' },
        { label: 'Vue / React', value: 'Vue' },
        { label: 'Shell 脚本', value: 'Shell' },
        { label: 'Docker / K8s', value: 'Docker' },
        { label: '其他', value: '其他' }
      ]
    },
    { key: 'date', label: '记录日期', type: 'date', span: 12 },
    { key: 'mood', label: '重要程度/标签', type: 'input', placeholder: '⭐⭐⭐ / 核心/常见坑/备忘', span: 12 },
    { key: 'content', label: '笔记内容（支持代码块）', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
