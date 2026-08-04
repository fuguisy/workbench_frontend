<script setup lang="ts">
import { h } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { projectApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '项目进度',
  api: projectApi,
  searchFields: [
    { key: 'title', label: '项目名称', type: 'input' },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '进行中', value: '进行中' },
        { label: '已完成', value: '已完成' },
        { label: '暂停', value: '暂停' }
      ]
    }
  ],
  columns: [
    { title: '项目名称', dataIndex: 'title', width: 200 },
    {
      title: '进度',
      dataIndex: 'current',
      width: 200,
      align: 'center',
      customRender: ({ record }: any) => {
        const cur = record.current ?? 0
        const tgt = record.target ?? 0
        const unit = record.unit || ''
        const percent = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0
        const color = percent >= 100 ? '#52c41a' : percent >= 60 ? '#1677ff' : percent >= 30 ? '#faad14' : '#ff4d4f'
        return h('div', { style: { width: '100%' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' } }, [
            h('span', {}, `${cur}/${tgt}${unit}`),
            h('span', { style: { color, fontWeight: 600 } }, `${percent}%`)
          ]),
          h('div', { style: { width: '100%', height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' } }, [
            h('div', { style: { width: `${percent}%`, height: '100%', background: color, transition: 'width 0.3s' } })
          ])
        ])
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      tagColorMap: {
        '进行中': 'blue',
        '已完成': 'green',
        '暂停': 'orange'
      }
    },
    { title: '分类', dataIndex: 'category', width: 120, align: 'center' },
    { title: '负责人', dataIndex: 'owner', width: 100, align: 'center' },
    { title: '截止日期', dataIndex: 'deadline', width: 120, align: 'center' },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '项目名称', type: 'input', required: true, span: 24 },
    { key: 'current', label: '当前进度', type: 'number', span: 8 },
    { key: 'target', label: '目标值', type: 'number', span: 8 },
    { key: 'unit', label: '单位', type: 'input', placeholder: '%/页/章', span: 8 },
    {
      key: 'status', label: '状态', type: 'select', span: 8, options: [
        { label: '进行中', value: '进行中' }, { label: '已完成', value: '已完成' }, { label: '暂停', value: '暂停' }
      ]
    },
    {
      key: 'category', label: '分类', type: 'select', span: 8, options: [
        { label: 'Java后端', value: 'Java后端' }, { label: '前端', value: '前端' }, { label: '自媒体', value: '自媒体' }, { label: 'AI', value: 'AI' }, { label: '其他', value: '其他' }
      ]
    },
    { key: 'owner', label: '负责人', type: 'input', span: 8 },
    { key: 'deadline', label: '截止日期', type: 'date', span: 12 },
    { key: 'note', label: '备注', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
