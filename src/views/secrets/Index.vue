<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { secretsApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '密码 & 资源管理',
  api: secretsApi,
  searchFields: [
    { key: 'title', label: '账号/资源名', type: 'input' },
    {
      key: 'category', label: '分类', type: 'select', options: [
        { label: '工作账号', value: '工作账号' },
        { label: '自媒体账号', value: '自媒体账号' },
        { label: '服务器密码', value: '服务器' },
        { label: '数据库', value: '数据库' },
        { label: '素材路径', value: '素材路径' },
        { label: '数据集索引', value: '数据集' },
        { label: '其他敏感信息', value: '其他' }
      ]
    }
  ],
  columns: [
    { title: '名称', dataIndex: 'title', width: 220 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      align: 'center',
      tagColorMap: {
        '工作账号': 'blue',
        '自媒体账号': 'orange',
        '服务器': 'cyan',
        '数据库': 'purple',
        '素材路径': 'magenta',
        '数据集': 'green',
        '其他': 'default'
      }
    },
    { title: '存储位置', dataIndex: 'location', width: 200, align: 'center' },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '账号/路径/备注', dataIndex: 'content', width: 320, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '账号/资源名称', type: 'input', required: true, span: 24, placeholder: '例如：抖音登录 / GitLab账号 / 阿里云服务器root' },
    {
      key: 'category', label: '分类', type: 'select', required: true, span: 12, options: [
        { label: '工作/公司账号', value: '工作账号' },
        { label: '自媒体平台账号', value: '自媒体账号' },
        { label: '服务器/SSH', value: '服务器' },
        { label: '数据库/Redis', value: '数据库' },
        { label: '硬盘/云盘素材路径映射', value: '素材路径' },
        { label: 'AI数据集/模型文件索引', value: '数据集' },
        { label: '其他敏感信息', value: '其他' }
      ]
    },
    { key: 'location', label: '存储位置/托管方', type: 'input', placeholder: '本地Vaultwarden / 浏览器 / 硬盘D盘 / 阿里云', span: 12 },
    { key: 'date', label: '最近更新', type: 'date', span: 12 },
    { key: 'mood', label: '安全等级', type: 'input', placeholder: '🔴高/🟡中/🟢低 / 是否开启2FA', span: 12 },
    { key: 'content', label: '用户名/密码/提示词/路径详情（建议加密存储）', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
