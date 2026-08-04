<script setup lang="ts">
import { h } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { mediaBoardApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '自媒体运营看板',
  api: mediaBoardApi,
  searchFields: [
    { key: 'title', label: '作品名称', type: 'input' },
    {
      key: 'platform', label: '平台', type: 'select', options: [
        { label: '抖音', value: '抖音' },
        { label: 'B站', value: 'B站' },
        { label: '小红书', value: '小红书' },
        { label: '视频号', value: '视频号' },
        { label: '公众号', value: '公众号' },
        { label: '知乎', value: '知乎' }
      ]
    }
  ],
  columns: [
    { title: '作品/排期名称', dataIndex: 'title', width: 240 },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 100,
      align: 'center',
      tagColorMap: {
        '抖音': 'red',
        'B站': 'pink',
        '小红书': 'magenta',
        '视频号': 'cyan',
        '公众号': 'green',
        '知乎': 'blue'
      }
    },
    {
      title: '数据表现',
      dataIndex: 'impression',
      width: 260,
      customRender: ({ record }: any) => {
        const imp = record.impression ?? 0
        const clk = record.clicks ?? 0
        const flw = record.follows ?? 0
        const ctr = imp > 0 ? Math.round((clk / imp) * 1000) / 10 : 0
        return h('div', { style: { fontSize: '12px' } }, [
          h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'space-between', marginBottom: '4px' } }, [
            h('span', {}, `👁 展现 ${imp}`),
            h('span', { style: { color: '#1677ff' } }, `🔗 点击 ${clk}`),
            h('span', { style: { color: '#52c41a' } }, `➕ 涨粉 ${flw}`)
          ]),
          h('div', { style: { color: ctr >= 3 ? '#52c41a' : ctr >= 1 ? '#faad14' : '#ff4d4f', fontWeight: 600 } },
            `点击率 CTR: ${ctr}%`
          )
        ])
      }
    },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '复盘/备注', dataIndex: 'content', width: 220, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '作品/排期名称', type: 'input', required: true, span: 24 },
    {
      key: 'platform', label: '分发平台', type: 'select', required: true, span: 12, options: [
        { label: '抖音', value: '抖音' },
        { label: 'B站（哔哩哔哩）', value: 'B站' },
        { label: '小红书', value: '小红书' },
        { label: '视频号', value: '视频号' },
        { label: '公众号', value: '公众号' },
        { label: '知乎', value: '知乎' }
      ]
    },
    { key: 'date', label: '发布/排期日期', type: 'date', span: 12 },
    { key: 'impression', label: '展现量(曝光)', type: 'number', span: 8 },
    { key: 'clicks', label: '点击/播放量', type: 'number', span: 8 },
    { key: 'follows', label: '涨粉/点赞数', type: 'number', span: 8 },
    { key: 'mood', label: '数据评级/标签', type: 'input', placeholder: '⭐⭐⭐⭐⭐ / 爆款/潜力/常规/冷门', span: 12 },
    { key: 'content', label: '运营复盘/投放策略/改进点', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
