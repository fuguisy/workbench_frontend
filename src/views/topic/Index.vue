<script setup lang="ts">
import { h } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { topicApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const sourceOptions = [
  { label: '微博热搜', value: '微博热搜' }, { label: '知乎热榜', value: '知乎热榜' },
  { label: '灵感', value: '灵感' }, { label: '手动', value: '手动' },
  { label: '客户咨询', value: '客户咨询' }
]
const stageOptions = [
  { label: '待评估', value: '待评估' }, { label: '已采用', value: '已采用' },
  { label: '创作中', value: '创作中' }, { label: '已发布', value: '已发布' },
  { label: '已归档', value: '已归档' }, { label: '已放弃', value: '已放弃' }
]
const platformOptions = [
  { label: '公众号', value: '公众号' }, { label: '知乎', value: '知乎' },
  { label: 'B站', value: 'B站' }, { label: '掘金', value: '掘金' },
  { label: '小红书', value: '小红书' }, { label: 'CSDN', value: 'CSDN' }
]
const priorityOptions = [
  { label: '高', value: '高' }, { label: '中', value: '中' }, { label: '低', value: '低' }
]

const config: CrudConfig = {
  title: '选题池',
  api: topicApi,
  searchFields: [
    { key: 'title', label: '选题标题', type: 'input' },
    { key: 'stage', label: '阶段', type: 'select', options: stageOptions },
    { key: 'source', label: '来源', type: 'select', options: sourceOptions },
    { key: 'priority', label: '优先级', type: 'select', options: priorityOptions }
  ],
  columns: [
    { title: '选题', dataIndex: 'title', width: 240, ellipsis: true },
    {
      title: '来源', dataIndex: 'source', width: 100, align: 'center',
      tagColorMap: {
        '微博热搜': 'orange', '知乎热榜': 'blue', '灵感': 'purple',
        '手动': 'default', '客户咨询': 'green'
      }
    },
    {
      title: '阶段', dataIndex: 'stage', width: 90, align: 'center',
      tagColorMap: {
        '待评估': 'default', '已采用': 'blue', '创作中': 'cyan',
        '已发布': 'green', '已归档': 'purple', '已放弃': 'red'
      }
    },
    {
      title: '优先级', dataIndex: 'priority', width: 80, align: 'center',
      tagColorMap: { '高': 'red', '中': 'orange', '低': 'default' }
    },
    {
      title: '目标平台', dataIndex: 'platform', width: 100, align: 'center',
      tagColorMap: {
        '公众号': 'green', '知乎': 'blue', 'B站': 'cyan',
        '掘金': 'purple', '小红书': 'magenta', 'CSDN': 'orange'
      }
    },
    { title: '命中关键词', dataIndex: 'keywords', width: 160, ellipsis: true },
    { title: '计划创作', dataIndex: 'planDate', width: 110, align: 'center' },
    {
      title: '来源链接', dataIndex: 'sourceUrl', width: 110, align: 'center',
      customRender: ({ text }) =>
        text ? h('a', { href: text, target: '_blank', rel: 'noopener' }, '打开原文') : '-'
    },
    { title: '切入角度', dataIndex: 'angle', width: 200, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 170, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '选题标题', type: 'input', required: true, span: 24, placeholder: '如：Spring AI 接入企业知识库的 3 个坑' },
    { key: 'source', label: '来源', type: 'select', span: 12, options: sourceOptions },
    { key: 'stage', label: '阶段', type: 'select', span: 12, options: stageOptions },
    { key: 'platform', label: '目标平台', type: 'select', span: 12, options: platformOptions },
    { key: 'priority', label: '优先级', type: 'select', span: 12, options: priorityOptions },
    { key: 'planDate', label: '计划创作日期', type: 'date', span: 12 },
    { key: 'keywords', label: '命中关键词', type: 'input', span: 12, placeholder: '逗号分隔，如：AI,Spring AI' },
    { key: 'sourceUrl', label: '来源链接', type: 'input', span: 24, placeholder: '热点原文地址，便于回溯' },
    { key: 'angle', label: '切入角度 / 大纲', type: 'textarea', span: 24, placeholder: '打算从哪个角度写、给谁看、能带来什么转化' },
    { key: 'note', label: '备注', type: 'textarea', span: 24, placeholder: '补充说明' }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
