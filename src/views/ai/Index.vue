<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { aiApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: 'AI 实验室',
  api: aiApi,
  searchFields: [
    { key: 'title', label: '实验/提示词名', type: 'input' },
    {
      key: 'category', label: '分类', type: 'select', options: [
        { label: '提示词库', value: '提示词库' },
        { label: '模型管理', value: '模型管理' },
        { label: 'SD绘图', value: 'SD绘图' },
        { label: 'AI脚本', value: 'AI脚本' },
        { label: 'AI自动化', value: 'AI自动化' }
      ]
    },
    {
      key: 'model', label: '模型', type: 'select', options: [
        { label: 'GPT-4o', value: 'GPT-4o' },
        { label: 'GPT-4', value: 'GPT-4' },
        { label: 'Claude 3', value: 'Claude 3' },
        { label: 'DeepSeek', value: 'DeepSeek' },
        { label: '本地 Ollama', value: 'Ollama' },
        { label: 'SDXL', value: 'SDXL' },
        { label: 'Flux', value: 'Flux' }
      ]
    }
  ],
  columns: [
    { title: '实验/提示词名', dataIndex: 'title', width: 240 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      align: 'center',
      tagColorMap: {
        '提示词库': 'blue',
        '模型管理': 'purple',
        'SD绘图': 'magenta',
        'AI脚本': 'cyan',
        'AI自动化': 'orange'
      }
    },
    {
      title: '所用模型',
      dataIndex: 'model',
      width: 130,
      align: 'center',
      tagColorMap: {
        'GPT-4o': 'green',
        'GPT-4': 'blue',
        'Claude 3': 'orange',
        'DeepSeek': 'purple',
        'Ollama': 'cyan',
        'SDXL': 'magenta',
        'Flux': 'red'
      }
    },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '内容摘要', dataIndex: 'content', width: 300, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '实验/提示词名称', type: 'input', required: true, span: 24 },
    {
      key: 'category', label: '分类', type: 'select', required: true, span: 12, options: [
        { label: '提示词库（Prompt）', value: '提示词库' },
        { label: '模型管理（Ollama等）', value: '模型管理' },
        { label: 'SD绘图工程', value: 'SD绘图' },
        { label: 'AI自动化脚本', value: 'AI脚本' },
        { label: 'AI工作流/Agent', value: 'AI自动化' }
      ]
    },
    {
      key: 'model', label: 'AI模型', type: 'select', span: 12, options: [
        { label: 'GPT-4o', value: 'GPT-4o' },
        { label: 'GPT-4 Turbo', value: 'GPT-4' },
        { label: 'Claude 3 Opus/Sonnet', value: 'Claude 3' },
        { label: 'DeepSeek V3', value: 'DeepSeek' },
        { label: '本地 Ollama 模型', value: 'Ollama' },
        { label: 'Stable Diffusion XL', value: 'SDXL' },
        { label: 'Flux.1', value: 'Flux' },
        { label: '其他模型', value: '其他' }
      ]
    },
    { key: 'date', label: '实验日期', type: 'date', span: 12 },
    { key: 'mood', label: '效果评价', type: 'input', placeholder: '⭐⭐⭐⭐⭐ / 效果佳/一般/需优化', span: 12 },
    { key: 'content', label: '提示词内容/脚本/实验记录', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
