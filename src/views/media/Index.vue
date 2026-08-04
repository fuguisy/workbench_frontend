<script setup lang="ts">
import { h } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { mediaApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '素材库 & 脚本分段',
  api: mediaApi,
  searchFields: [
    { key: 'title', label: '素材/脚本名', type: 'input' },
    {
      key: 'stage', label: '创作阶段', type: 'select', options: [
        { label: '大纲', value: '大纲' }, { label: '文案', value: '文案' },
        { label: '剪辑中', value: '剪辑中' }, { label: '待发布', value: '待发布' }, { label: '已发布', value: '已发布' }
      ]
    },
    {
      key: 'platform', label: '平台', type: 'select', options: [
        { label: '抖音', value: '抖音' }, { label: 'B站', value: 'B站' },
        { label: '小红书', value: '小红书' }, { label: '视频号', value: '视频号' }, { label: '公众号', value: '公众号' }
      ]
    }
  ],
  columns: [
    { title: '标题', dataIndex: 'title', width: 220 },
    {
      title: '完成进度',
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
      title: '阶段',
      dataIndex: 'stage',
      width: 100,
      align: 'center',
      tagColorMap: {
        '大纲': 'purple',
        '文案': 'blue',
        '剪辑中': 'orange',
        '待发布': 'cyan',
        '已发布': 'green'
      }
    },
    { title: '平台', dataIndex: 'platform', width: 100, align: 'center' },
    { title: '播放/阅读', dataIndex: 'views', width: 100, align: 'center', customRender: ({ text }: any) => text ? `👁 ${text}` : '-' },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '素材/脚本标题', type: 'input', required: true, span: 24 },
    { key: 'current', label: '当前进度', type: 'number', span: 8 },
    { key: 'target', label: '目标值', type: 'number', span: 8 },
    { key: 'unit', label: '单位', type: 'input', placeholder: '%/分钟/字', span: 8 },
    {
      key: 'stage', label: '创作阶段', type: 'select', span: 12, options: [
        { label: '大纲构思', value: '大纲' },
        { label: '撰写文案', value: '文案' },
        { label: '剪辑制作', value: '剪辑中' },
        { label: '等待发布', value: '待发布' },
        { label: '已发布', value: '已发布' }
      ]
    },
    {
      key: 'platform', label: '分发平台', type: 'select', span: 12, options: [
        { label: '抖音', value: '抖音' },
        { label: 'B站（哔哩哔哩）', value: 'B站' },
        { label: '小红书', value: '小红书' },
        { label: '视频号', value: '视频号' },
        { label: '公众号', value: '公众号' },
        { label: '知乎', value: '知乎' },
        { label: '其他', value: '其他' }
      ]
    },
    { key: 'date', label: '计划发布', type: 'date', span: 12 },
    { key: 'views', label: '播放/阅读量', type: 'number', span: 12 },
    { key: 'url', label: '作品链接', type: 'input', placeholder: '发布后粘贴链接', span: 24 },
    { key: 'note', label: '备注/脚本内容摘要', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
