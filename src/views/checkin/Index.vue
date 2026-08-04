<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { checkinApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '习惯打卡',
  api: checkinApi,
  searchFields: [
    { key: 'title', label: '习惯名称', type: 'input' },
    {
      key: 'cycle', label: '循环周期', type: 'select', options: [
        { label: '每日', value: '每日' },
        { label: '每周', value: '每周' },
        { label: '每月', value: '每月' },
        { label: '自定义', value: '自定义' }
      ]
    }
  ],
  columns: [
    { title: '习惯名称', dataIndex: 'title', width: 200 },
    {
      title: '所属分组',
      dataIndex: 'groupName',
      width: 120,
      align: 'center',
      tagColorMap: {
        '健康运动': 'green',
        '学习成长': 'blue',
        '工作效率': 'orange',
        '生活作息': 'cyan',
        '个人成长': 'purple'
      }
    },
    {
      title: '循环周期',
      dataIndex: 'cycle',
      width: 100,
      align: 'center',
      tagColorMap: {
        '每日': 'green',
        '每周': 'blue',
        '每月': 'orange',
        '自定义': 'purple'
      }
    },
    { title: '打卡记录', dataIndex: 'log', width: 260, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '习惯名称', type: 'input', required: true, span: 24, placeholder: '例如：每日阅读30分钟' },
    {
      key: 'groupName', label: '所属分组', type: 'select', span: 12, options: [
        { label: '健康运动', value: '健康运动' },
        { label: '学习成长', value: '学习成长' },
        { label: '工作效率', value: '工作效率' },
        { label: '生活作息', value: '生活作息' },
        { label: '个人成长', value: '个人成长' }
      ]
    },
    {
      key: 'cycle', label: '循环周期', type: 'select', span: 12, options: [
        { label: '每日打卡', value: '每日' },
        { label: '每周打卡', value: '每周' },
        { label: '每月打卡', value: '每月' },
        { label: '自定义周期', value: '自定义' }
      ]
    },
    { key: 'log', label: '打卡记录/进度摘要', type: 'textarea', span: 24, placeholder: '可粘贴最近30天打卡数据，如：2026-08-01✅ 2026-08-02✅ ...' }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
