<script setup lang="ts">
import CrudPage from '@/components/CrudPage.vue'
import { svcApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

const config: CrudConfig = {
  title: '服务器 & 自部署服务',
  api: svcApi,
  searchFields: [
    { key: 'title', label: '服务名', type: 'input' },
    {
      key: 'deploy', label: '部署方式', type: 'select', options: [
        { label: 'Docker', value: 'Docker' },
        { label: 'Docker Compose', value: 'Compose' },
        { label: '原生', value: '原生' },
        { label: 'K8s', value: 'K8s' },
        { label: '面板', value: '宝塔' }
      ]
    }
  ],
  columns: [
    { title: '服务名称', dataIndex: 'title', width: 200 },
    { title: '主机IP', dataIndex: 'host', width: 150, align: 'center' },
    { title: '端口映射', dataIndex: 'port', width: 130, align: 'center' },
    {
      title: '部署方式',
      dataIndex: 'deploy',
      width: 130,
      align: 'center',
      tagColorMap: {
        'Docker': 'cyan',
        'Compose': 'blue',
        '原生': 'orange',
        'K8s': 'purple',
        '宝塔': 'green'
      }
    },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '说明/运维备忘', dataIndex: 'content', width: 280, ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '服务/容器名称', type: 'input', required: true, span: 24, placeholder: '如：Vaultwarden / OpenWebUI / Nextcloud' },
    { key: 'host', label: '主机IP/域名', type: 'input', required: true, span: 12, placeholder: '192.168.1.100 / myserver.com' },
    { key: 'port', label: '端口映射', type: 'input', placeholder: '8080:80 / 3306', span: 12 },
    {
      key: 'deploy', label: '部署方式', type: 'select', span: 12, options: [
        { label: 'Docker 单容器', value: 'Docker' },
        { label: 'Docker Compose', value: 'Compose' },
        { label: '原生安装', value: '原生' },
        { label: 'K8s 部署', value: 'K8s' },
        { label: '宝塔/面板', value: '宝塔' }
      ]
    },
    { key: 'date', label: '最近更新日期', type: 'date', span: 12 },
    { key: 'mood', label: '服务状态/标签', type: 'input', placeholder: '✅运行中/⚠维护中/❌已下线', span: 24 },
    { key: 'content', label: '服务说明/启动命令/运维命令/挂载目录', type: 'textarea', span: 24 }
  ]
}
</script>

<template>
  <CrudPage :config="config" />
</template>
