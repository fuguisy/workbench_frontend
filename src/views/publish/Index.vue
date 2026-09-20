<script setup lang="ts">
import { h, ref, onMounted } from 'vue'
import CrudPage from '@/components/CrudPage.vue'
import { publishApi, topicApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const platformOptions = [
  { label: '公众号', value: '公众号' }, { label: '知乎', value: '知乎' },
  { label: 'B站', value: 'B站' }, { label: '掘金', value: '掘金' },
  { label: '小红书', value: '小红书' }, { label: 'CSDN', value: 'CSDN' }
]
const statusOptions = [
  { label: '待发布', value: '待发布' }, { label: '已发布', value: '已发布' },
  { label: '失败', value: '失败' }, { label: '已下线', value: '已下线' }
]

const num = (v: any) => Number(v || 0).toLocaleString()

const config = ref<CrudConfig>({
  title: '发布管理',
  api: publishApi,
  searchFields: [
    { key: 'title', label: '内容标题', type: 'input' },
    { key: 'platform', label: '平台', type: 'select', options: platformOptions },
    { key: 'status', label: '状态', type: 'select', options: statusOptions }
  ],
  columns: [
    { title: '内容标题', dataIndex: 'title', width: 260, ellipsis: true },
    {
      title: '平台', dataIndex: 'platform', width: 100, align: 'center',
      tagColorMap: {
        '公众号': 'green', '知乎': 'blue', 'B站': 'cyan',
        '掘金': 'purple', '小红书': 'magenta', 'CSDN': 'orange'
      }
    },
    {
      title: '状态', dataIndex: 'status', width: 90, align: 'center',
      tagColorMap: { '待发布': 'default', '已发布': 'green', '失败': 'red', '已下线': 'orange' }
    },
    { title: '计划发布', dataIndex: 'planTime', width: 110, align: 'center' },
    { title: '实际发布', dataIndex: 'publishTime', width: 110, align: 'center' },
    {
      title: '链接', dataIndex: 'url', width: 100, align: 'center',
      customRender: ({ text }) =>
        text ? h('a', { href: text, target: '_blank', rel: 'noopener' }, '查看') : '-'
    },
    { title: '阅读', dataIndex: 'views', width: 90, align: 'right', customRender: ({ text }) => num(text) },
    { title: '点赞', dataIndex: 'likes', width: 80, align: 'right', customRender: ({ text }) => num(text) },
    { title: '评论', dataIndex: 'comments', width: 80, align: 'right', customRender: ({ text }) => num(text) },
    { title: '收藏', dataIndex: 'collects', width: 80, align: 'right', customRender: ({ text }) => num(text) },
    {
      title: '咨询 / 线索', dataIndex: 'leads', width: 110, align: 'right',
      customRender: ({ text }) => {
        const n = Number(text || 0)
        return n > 0 ? h('strong', null, String(n)) : '0'
      }
    },
    { title: '创建时间', dataIndex: 'createTime', width: 170, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '内容标题', type: 'input', required: true, span: 24, placeholder: '与发布到平台的标题保持一致' },
    { key: 'topicId', label: '关联选题', type: 'select', span: 12, options: [] },
    { key: 'platform', label: '平台', type: 'select', span: 12, options: platformOptions },
    { key: 'status', label: '状态', type: 'select', span: 12, options: statusOptions },
    { key: 'planTime', label: '计划发布时间', type: 'date', span: 12 },
    { key: 'publishTime', label: '实际发布时间', type: 'date', span: 12 },
    { key: 'url', label: '发布链接', type: 'input', span: 12, placeholder: '发布后的文章地址' },
    { key: 'views', label: '阅读 / 播放数', type: 'number', span: 6 },
    { key: 'likes', label: '点赞数', type: 'number', span: 6 },
    { key: 'comments', label: '评论数', type: 'number', span: 6 },
    { key: 'collects', label: '收藏数', type: 'number', span: 6 },
    { key: 'leads', label: '带来的咨询 / 线索数', type: 'number', span: 12, placeholder: '把 opc_lead 与内容效果挂上钩' },
    { key: 'note', label: '备注', type: 'textarea', span: 24, placeholder: '如：选题来自 8/12 知乎热榜' }
  ]
})

onMounted(async () => {
  try {
    const list = await topicApi.list()
    const options = (list || [])
      .filter((t) => t.id != null && t.stage !== '已放弃')
      .map((t) => ({ label: t.title, value: t.id as number }))
    const field = config.value.formFields.find((f) => f.key === 'topicId')
    if (field) field.options = options
  } catch {
    // 选题列表加载失败不影响发布记录本身的使用
  }
})
</script>

<template>
  <CrudPage :config="config" />
</template>
