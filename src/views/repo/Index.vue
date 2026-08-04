<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { repoApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '代码 & 项目仓库',
  api: repoApi,
  searchFields: [
    { key: 'title', label: '项目名', type: 'input' },
    {
      key: 'category', label: '分类', type: 'select', options: [
        { label: 'Java后端', value: 'Java后端' },
        { label: '前端项目', value: '前端项目' },
        { label: '全栈项目', value: '全栈项目' },
        { label: 'AI工程', value: 'AI工程' },
        { label: '数据库脚本', value: '数据库脚本' },
        { label: '其他', value: '其他' }
      ]
    }
  ],
  columns: [
    { title: '项目名', dataIndex: 'title', width: 220 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      align: 'center',
      tagColorMap: {
        'Java后端': 'red',
        '前端项目': 'green',
        '全栈项目': 'blue',
        'AI工程': 'purple',
        '数据库脚本': 'orange',
        '其他': 'default'
      }
    },
    { title: '仓库地址', dataIndex: 'repo', width: 220, ellipsis: true },
    { title: '主分支', dataIndex: 'branch', width: 100, align: 'center' },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '说明摘要', dataIndex: 'content', width: 240, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '项目/仓库名称', type: 'input', required: true, span: 24 },
    {
      key: 'category', label: '项目分类', type: 'select', required: true, span: 12, options: [
        { label: 'Java后端项目', value: 'Java后端' },
        { label: '前端项目', value: '前端项目' },
        { label: '全栈项目', value: '全栈项目' },
        { label: 'AI工程/Agent', value: 'AI工程' },
        { label: 'SQL脚本库', value: '数据库脚本' },
        { label: '其他工程', value: '其他' }
      ]
    },
    { key: 'branch', label: '默认分支', type: 'input', placeholder: 'main/master/dev', span: 12 },
    { key: 'repo', label: 'Git仓库地址', type: 'input', placeholder: 'https://github.com/xxx/xxx.git', span: 24 },
    { key: 'date', label: '创建/最近更新', type: 'date', span: 12 },
    { key: 'mood', label: '项目状态/标签', type: 'input', placeholder: '⭐⭐⭐ / 维护中/暂停/已上线', span: 12 },
    { key: 'content', label: '项目说明/接口文档/依赖环境', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
