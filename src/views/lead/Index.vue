<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { leadApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const sourceOptions = [
  { label: '公众号', value: '公众号' }, { label: '知乎', value: '知乎' },
  { label: 'B站', value: 'B站' }, { label: '朋友介绍', value: '朋友介绍' },
  { label: '社群', value: '社群' }, { label: '其他', value: '其他' }
]
const stageOptions = [
  { label: '新线索', value: '新线索' }, { label: '沟通中', value: '沟通中' },
  { label: '已报价', value: '已报价' }, { label: '已成交', value: '已成交' },
  { label: '交付中', value: '交付中' }, { label: '已复盘', value: '已复盘' },
  { label: '已流失', value: '已流失' }
]

const config: CrudConfig = {
  title: '线索 / 商机',
  api: leadApi,
  searchFields: [
    { key: 'title', label: '客户名称', type: 'input' },
    { key: 'stage', label: '阶段', type: 'select', options: stageOptions },
    { key: 'source', label: '来源', type: 'select', options: sourceOptions }
  ],
  columns: [
    { title: '客户 / 线索', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: '来源', dataIndex: 'source', width: 90, align: 'center',
      tagColorMap: {
        '公众号': 'green', '知乎': 'blue', 'B站': 'cyan',
        '朋友介绍': 'purple', '社群': 'orange', '其他': 'default'
      }
    },
    {
      title: '阶段', dataIndex: 'stage', width: 90, align: 'center',
      tagColorMap: {
        '新线索': 'default', '沟通中': 'blue', '已报价': 'orange', '已成交': 'green',
        '交付中': 'cyan', '已复盘': 'purple', '已流失': 'red'
      }
    },
    {
      title: '报价', dataIndex: 'quote', width: 110, align: 'right',
      customRender: ({ text }) => (text && Number(text) > 0) ? `¥${Number(text).toLocaleString()}` : '-'
    },
    {
      title: '客户预算', dataIndex: 'budget', width: 110, align: 'right',
      customRender: ({ text }) => (text && Number(text) > 0) ? `¥${Number(text).toLocaleString()}` : '-'
    },
    { title: '联系方式', dataIndex: 'contact', width: 140, ellipsis: true },
    { title: '下次跟进', dataIndex: 'nextFollow', width: 110, align: 'center' },
    { title: '需求描述', dataIndex: 'demand', width: 220, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 170, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '客户 / 线索名称', type: 'input', required: true, span: 24, placeholder: '如：某电商公司-知识库问答' },
    { key: 'source', label: '来源', type: 'select', span: 12, options: sourceOptions },
    { key: 'stage', label: '阶段', type: 'select', span: 12, options: stageOptions },
    { key: 'contact', label: '联系方式', type: 'input', span: 12, placeholder: '微信 / 电话' },
    { key: 'nextFollow', label: '下次跟进日期', type: 'date', span: 12 },
    { key: 'budget', label: '客户预算（元）', type: 'number', span: 12 },
    { key: 'quote', label: '我的报价（元）', type: 'number', span: 12 },
    { key: 'demand', label: '需求描述', type: 'textarea', span: 24, placeholder: '客户要解决的问题、期望交付物、时间节点' },
    { key: 'note', label: '跟进记录 / 备注', type: 'textarea', span: 24, placeholder: '每次沟通要点，按日期追加' }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
