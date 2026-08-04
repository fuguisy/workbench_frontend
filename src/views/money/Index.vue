<script setup lang="ts">
import { h } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { moneyApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '收支记账',
  api: moneyApi,
  searchFields: [
    { key: 'title', label: '标题/备注', type: 'input' },
    {
      key: 'type', label: '类型', type: 'select', options: [
        { label: '收入', value: 'income' }, { label: '支出', value: 'expense' }
      ]
    },
    {
      key: 'category', label: '分类', type: 'select', options: [
        { label: '主业工资', value: '主业工资' },
        { label: '自媒体收入', value: '自媒体收入' },
        { label: 'AI收入', value: 'AI收入' },
        { label: '日常餐饮', value: '日常餐饮' },
        { label: '交通出行', value: '交通出行' },
        { label: '房租水电', value: '房租水电' },
        { label: '数码设备', value: '数码设备' },
        { label: '其他', value: '其他' }
      ]
    }
  ],
  columns: [
    { title: '事项', dataIndex: 'title', width: 200 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      align: 'center',
      customRender: ({ text, record }: any) => {
        const isIncome = text === 'income'
        return h('a-tag', { color: isIncome ? 'green' : 'red' }, () => [
          isIncome ? '💰 收入' : '💸 支出',
          h('span', { style: { marginLeft: '4px', fontWeight: 600, color: isIncome ? '#52c41a' : '#ff4d4f' } },
            `${isIncome ? '+' : '-'}¥${Number(record.amount || 0).toFixed(2)}`
          )
        ])
      }
    },
    { title: '分类', dataIndex: 'category', width: 120, align: 'center' },
    { title: '来源/去向', dataIndex: 'source', width: 120, align: 'center' },
    { title: '预算', dataIndex: 'budget', width: 100, align: 'center' },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '事项', type: 'input', required: true, span: 24 },
    {
      key: 'type', label: '类型', type: 'select', required: true, span: 8, options: [
        { label: '收入', value: 'income' }, { label: '支出', value: 'expense' }
      ]
    },
    { key: 'amount', label: '金额(元)', type: 'number', required: true, span: 8 },
    {
      key: 'category', label: '分类', type: 'select', span: 8, options: [
        { label: '主业工资', value: '主业工资' },
        { label: '自媒体收入', value: '自媒体收入' },
        { label: 'AI收入', value: 'AI收入' },
        { label: '理财收益', value: '理财收益' },
        { label: '日常餐饮', value: '日常餐饮' },
        { label: '交通出行', value: '交通出行' },
        { label: '房租水电', value: '房租水电' },
        { label: '数码设备', value: '数码设备' },
        { label: '学习提升', value: '学习提升' },
        { label: '娱乐休闲', value: '娱乐休闲' },
        { label: '其他', value: '其他' }
      ]
    },
    { key: 'date', label: '日期', type: 'date', span: 8 },
    { key: 'source', label: '来源/去向', type: 'input', placeholder: '微信/支付宝/银行卡', span: 8 },
    { key: 'budget', label: '所属预算', type: 'input', placeholder: '月度预算/专项预算', span: 8 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
