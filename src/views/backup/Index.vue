<script setup lang="ts">
import { h } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { backupApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '文件备份台账',
  api: backupApi,
  searchFields: [
    { key: 'title', label: '备份名称', type: 'input' },
    {
      key: 'category', label: '备份类型', type: 'select', options: [
        { label: '代码快照', value: '代码快照' },
        { label: '素材备份', value: '素材备份' },
        { label: '模型文件', value: '模型文件' },
        { label: '数据库备份', value: '数据库' },
        { label: '全量快照', value: '全量快照' }
      ]
    },
    {
      key: 'destination', label: '存储目的地', type: 'select', options: [
        { label: '本地硬盘', value: '本地硬盘' },
        { label: 'NAS', value: 'NAS' },
        { label: '阿里云OSS', value: '阿里云' },
        { label: '腾讯云COS', value: '腾讯云' },
        { label: 'OneDrive', value: 'OneDrive' },
        { label: '百度网盘', value: '百度网盘' }
      ]
    }
  ],
  columns: [
    { title: '备份名称', dataIndex: 'title', width: 240 },
    {
      title: '备份类型',
      dataIndex: 'category',
      width: 110,
      align: 'center',
      tagColorMap: {
        '代码快照': 'blue',
        '素材备份': 'magenta',
        '模型文件': 'purple',
        '数据库': 'orange',
        '全量快照': 'cyan'
      }
    },
    {
      title: '大小',
      dataIndex: 'sizeGb',
      width: 110,
      align: 'center',
      customRender: ({ text }: any) => {
        const size = Number(text ?? 0)
        const color = size >= 100 ? 'red' : size >= 30 ? 'orange' : size >= 5 ? 'blue' : 'green'
        return h('a-tag', { color }, () => `💾 ${size.toFixed(2)} GB`)
      }
    },
    {
      title: '存储目的地',
      dataIndex: 'destination',
      width: 130,
      align: 'center',
      tagColorMap: {
        '本地硬盘': 'green',
        'NAS': 'cyan',
        '阿里云': 'orange',
        '腾讯云': 'blue',
        'OneDrive': 'purple',
        '百度网盘': 'magenta'
      }
    },
    { title: '备份日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '备注/校验', dataIndex: 'content', width: 260, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '备份名称/说明', type: 'input', required: true, span: 24, placeholder: '例如：2026-08-01 工作项目代码全量快照' },
    {
      key: 'category', label: '备份类型', type: 'select', required: true, span: 12, options: [
        { label: '代码仓库快照', value: '代码快照' },
        { label: '自媒体素材', value: '素材备份' },
        { label: 'AI模型文件', value: '模型文件' },
        { label: 'MySQL数据库dump', value: '数据库' },
        { label: '全量系统/硬盘快照', value: '全量快照' }
      ]
    },
    { key: 'sizeGb', label: '备份大小(GB)', type: 'number', span: 12 },
    {
      key: 'destination', label: '存储目的地', type: 'select', required: true, span: 12, options: [
        { label: '本地硬盘', value: '本地硬盘' },
        { label: 'NAS 局域网存储', value: 'NAS' },
        { label: '阿里云 OSS', value: '阿里云' },
        { label: '腾讯云 COS', value: '腾讯云' },
        { label: 'OneDrive / 谷歌云盘', value: 'OneDrive' },
        { label: '百度网盘', value: '百度网盘' }
      ]
    },
    { key: 'date', label: '备份日期', type: 'date', span: 12 },
    { key: 'mood', label: '校验状态/标签', type: 'input', placeholder: '✅MD5校验通过 / ❌损坏 / ⚠待异地备份', span: 24 },
    { key: 'content', label: '备份路径 / 解压密码 / MD5校验值', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
