<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { bugsApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: 'Bug台账',
  api: bugsApi,
  searchFields: [
    { key: 'title', label: '标题', type: 'input' },
    {
      key: 'level', label: '级别', type: 'select', options: [
        { label: 'P0', value: 'P0' }, { label: 'P1', value: 'P1' }, { label: 'P2', value: 'P2' }, { label: 'P3', value: 'P3' }
      ]
    },
    {
      key: 'stage', label: '阶段', type: 'select', options: [
        { label: '新发现', value: '新发现' }, { label: '修复中', value: '修复中' }, { label: '已修复', value: '已修复' }, { label: '已关闭', value: '已关闭' }
      ]
    }
  ],
  columns: [
    { title: '标题', dataIndex: 'title', width: 260, ellipsis: true },
    {
      title: '级别',
      dataIndex: 'level',
      width: 80,
      align: 'center',
      tagColorMap: {
        'P0': 'red',
        'P1': 'orange',
        'P2': 'blue',
        'P3': 'default'
      }
    },
    { title: '服务', dataIndex: 'service', width: 160, align: 'center' },
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 110,
      align: 'center',
      tagColorMap: {
        '新发现': 'red',
        '修复中': 'orange',
        '已修复': 'cyan',
        '已关闭': 'green'
      }
    },
    { title: '修复版本', dataIndex: 'fixVer', width: 120, align: 'center' },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '标题', type: 'input', required: true, span: 24 },
    {
      key: 'level', label: '级别', type: 'select', span: 12, options: [
        { label: 'P0 阻断', value: 'P0' }, { label: 'P1 严重', value: 'P1' }, { label: 'P2 一般', value: 'P2' }, { label: 'P3 轻微', value: 'P3' }
      ]
    },
    {
      key: 'stage', label: '阶段', type: 'select', span: 12, options: [
        { label: '新发现', value: '新发现' }, { label: '修复中', value: '修复中' }, { label: '已修复', value: '已修复' }, { label: '已关闭', value: '已关闭' }
      ]
    },
    { key: 'service', label: '所属服务', type: 'input', placeholder: 'order-service/user-service', span: 12 },
    { key: 'fixVer', label: '修复版本', type: 'input', placeholder: 'v1.2.3', span: 12 },
    { key: 'date', label: '发现日期', type: 'date', span: 12 },
    { key: 'content', label: '详细描述/复现步骤', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
