<script setup lang="ts">
import { h } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { readApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '学习阅读',
  api: readApi,
  searchFields: [
    { key: 'title', label: '书名/课程名', type: 'input' }
  ],
  columns: [
    { title: '名称', dataIndex: 'title', width: 260 },
    {
      title: '阅读进度',
      dataIndex: 'current',
      width: 240,
      customRender: ({ record }: any) => {
        const cur = record.current ?? 0
        const tgt = record.target ?? 0
        const unit = record.unit || ''
        const percent = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0
        const color = percent >= 100 ? '#52c41a' : percent >= 60 ? '#1677ff' : percent >= 30 ? '#faad14' : '#ff4d4f'
        return h('div', { style: { width: '100%' } }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' } }, [
            h('span', {}, `📖 ${cur}/${tgt}${unit}`),
            h('span', { style: { color, fontWeight: 600 } }, `${percent}%`)
          ]),
          h('div', { style: { width: '100%', height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' } }, [
            h('div', { style: { width: `${percent}%`, height: '100%', background: color, transition: 'width 0.3s' } })
          ])
        ])
      }
    },
    { title: '备注', dataIndex: 'note', width: 200, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '书名/课程名', type: 'input', required: true, span: 24 },
    { key: 'current', label: '已读进度', type: 'number', span: 8 },
    { key: 'target', label: '总量', type: 'number', span: 8 },
    { key: 'unit', label: '单位', type: 'input', placeholder: '页/章/节/课时', span: 8 },
    { key: 'note', label: '笔记/心得摘要', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
