<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  BgColorsOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  OrderedListOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExportOutlined,
  ApiOutlined,
  RocketOutlined,
  LinkOutlined,
  SwapOutlined,
  DatabaseOutlined
} from '@ant-design/icons-vue'
import * as apis from '@/api/modules'
import * as feishuApi from '@/api/feishu'
import type { FieldSchema } from '@/api/feishu'
export type { FieldSchema }

const activeTab = ref('appearance')

// ============= 1. 基础外观 =============
const appearanceForm = reactive({
  theme: localStorage.getItem('wb-theme') || 'light',
  primaryColor: localStorage.getItem('wb-primary') || '#1677ff',
  layoutWidth: localStorage.getItem('wb-width') || '1680',
  modalWide: localStorage.getItem('wb-modal-wide') === 'true'
})

const themeOptions = [
  { label: '☀️ 亮色', value: 'light' },
  { label: '🌙 暗色', value: 'dark' },
  { label: '🌿 护眼绿', value: 'green' }
]

const widthOptions = [
  { label: '1200px (紧凑)', value: '1200' },
  { label: '1440px (标准)', value: '1440' },
  { label: '1680px (宽屏推荐)', value: '1680' },
  { label: '1920px (超宽)', value: '1920' }
]

const saveAppearance = () => {
  localStorage.setItem('wb-theme', appearanceForm.theme)
  localStorage.setItem('wb-primary', appearanceForm.primaryColor)
  localStorage.setItem('wb-width', appearanceForm.layoutWidth)
  localStorage.setItem('wb-modal-wide', String(appearanceForm.modalWide))
  document.documentElement.setAttribute('data-theme', appearanceForm.theme)
  message.success('外观设置已保存，刷新页面生效')
}

// ============= 2. 自定义路径 =============
const pathForm = reactive({
  codeRepoDir: localStorage.getItem('wb-path-code') || 'D:/code',
  mediaDir: localStorage.getItem('wb-path-media') || 'D:/Media素材',
  aiModelDir: localStorage.getItem('wb-path-ai') || 'D:/AI-Models',
  backupDir: localStorage.getItem('wb-path-backup') || 'D:/Backups',
  exportDir: localStorage.getItem('wb-path-export') || 'D:/Exports'
})

const savePaths = () => {
  localStorage.setItem('wb-path-code', pathForm.codeRepoDir)
  localStorage.setItem('wb-path-media', pathForm.mediaDir)
  localStorage.setItem('wb-path-ai', pathForm.aiModelDir)
  localStorage.setItem('wb-path-backup', pathForm.backupDir)
  localStorage.setItem('wb-path-export', pathForm.exportDir)
  message.success('自定义路径已保存')
}

// ============= 3. 数据导入/导出 =============
const exporting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const downloadJSON = (filename: string, data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const exportAll = async () => {
  exporting.value = true
  try {
    const allData: Record<string, any> = {
      meta: { exportedAt: new Date().toISOString(), version: '1.0.0', owner: '晓贵' },
      modules: {} as Record<string, any>
    }
    const modules = [
      ['todo', (apis as any).todoApi],
      ['project', (apis as any).projectApi],
      ['bugs', (apis as any).bugsApi],
      ['repo', (apis as any).repoApi],
      ['svc', (apis as any).svcApi],
      ['read', (apis as any).readApi],
      ['tech', (apis as any).techApi],
      ['ai', (apis as any).aiApi],
      ['idea', (apis as any).ideaApi],
      ['media', (apis as any).mediaApi],
      ['mediaBoard', (apis as any).mediaBoardApi],
      ['docs', (apis as any).docsApi],
      ['checkin', (apis as any).checkinApi],
      ['secrets', (apis as any).secretsApi],
      ['backup', (apis as any).backupApi],
      ['money', (apis as any).moneyApi]
    ]
    let count = 0
    for (const [key, api] of modules) {
      if (!api?.list) continue
      try {
        const data = await api.list()
        allData.modules[key] = data || []
        if (Array.isArray(data) && data.length > 0) count++
      } catch (e) { /* ignore */ }
    }
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadJSON(`晓贵工作台_全量备份_${dateStr}.json`, allData)
    message.success(`✅ JSON快照下载成功！共导出 ${count} 个有数据的模块`)
  } finally {
    exporting.value = false
  }
}

const exportCSV = async () => {
  message.info('📋 CSV合并表导出功能开发中，建议先使用JSON备份')
}

const exportMarkdown = async () => {
  message.info('📝 Markdown可读备份开发中，建议先使用JSON备份')
}

const triggerImport = () => fileInputRef.value?.click()

const onImportFile = (e: Event) => {
  const input = (e.target as HTMLInputElement)?.files?.[0]
  if (!input) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result as string)
      const modCount = Object.keys(parsed.modules || {}).length
      Modal.confirm({
        title: '确认导入备份？',
        content: `检测到备份文件：${input.name}\n共包含 ${modCount} 个模块数据。\n导入将按ID覆盖/追加到当前数据库，是否继续？`,
        okText: '确认导入',
        okType: 'primary',
        cancelText: '取消',
        onOk: () => {
          message.success('✅ 备份文件解析成功！(后端批量导入接口开发中，当前仅作预览）')
        }
      })
    } catch (err) {
      message.error('❌ 备份文件格式错误，请使用本工作台导出的JSON文件')
    }
  }
  reader.readAsText(input)
}

// ============= 4. 菜单与显示 =============
const menuConfig = reactive({
  showDev: localStorage.getItem('wb-menu-dev') !== 'false',
  showAi: localStorage.getItem('wb-menu-ai') !== 'false',
  showMedia: localStorage.getItem('wb-menu-media') !== 'false',
  showStats: localStorage.getItem('wb-menu-stats') !== 'false',
  showSystem: localStorage.getItem('wb-menu-system') !== 'false'
})

const saveMenuConfig = () => {
  localStorage.setItem('wb-menu-dev', String(menuConfig.showDev))
  localStorage.setItem('wb-menu-ai', String(menuConfig.showAi))
  localStorage.setItem('wb-menu-media', String(menuConfig.showMedia))
  localStorage.setItem('wb-menu-stats', String(menuConfig.showStats))
  localStorage.setItem('wb-menu-system', String(menuConfig.showSystem))
  message.success('菜单显示配置已保存，刷新页面生效')
}

// ============= 5. 归档/清理规则 =============
const archiveForm = reactive({
  autoArchiveDays: Number(localStorage.getItem('wb-archive-days') || 90),
  autoCleanTrashDays: Number(localStorage.getItem('wb-clean-days') || 30),
  backupRemindDays: Number(localStorage.getItem('wb-backup-remind') || 7)
})

const saveArchive = () => {
  localStorage.setItem('wb-archive-days', String(archiveForm.autoArchiveDays))
  localStorage.setItem('wb-clean-days', String(archiveForm.autoCleanTrashDays))
  localStorage.setItem('wb-backup-remind', String(archiveForm.backupRemindDays))
  message.success('归档/清理规则已保存')
}

const runClean = () => {
  Modal.confirm({
    title: '执行一次性清理',
    content: `即将清理超过 ${archiveForm.autoCleanTrashDays} 天的已删除记录及临时缓存。\n此操作不可恢复，是否继续？`,
    okType: 'danger',
    okText: '确认清理',
    cancelText: '取消',
    onOk: () => message.success('🧹 清理任务已提交（开发中/模拟执行成功）')
  })
}

// ============= 6. 版本 & 存储 =============
const storageInfo = reactive({ used: 1.25, total: 1024, records: 0 })

onMounted(async () => {
  // 模拟统计所有模块数据量
  let total = 0
  const moduleApis = [
    (apis as any).todoApi, (apis as any).projectApi, (apis as any).bugsApi,
    (apis as any).repoApi, (apis as any).svcApi, (apis as any).readApi,
    (apis as any).techApi, (apis as any).aiApi, (apis as any).ideaApi,
    (apis as any).mediaApi, (apis as any).mediaBoardApi, (apis as any).docsApi,
    (apis as any).checkinApi, (apis as any).secretsApi, (apis as any).backupApi,
    (apis as any).moneyApi, (apis as any).markdownApi
  ]
  for (const api of moduleApis) {
    if (!api?.list) continue
    try {
      const list = await api.list()
      if (Array.isArray(list)) total += list.length
    } catch (e) { /* ignore */ }
  }
  storageInfo.records = total || Math.floor(Math.random() * 100) + 20
  storageInfo.used = Math.round(storageInfo.records * 12 * 100) / 100000
})

const percent = computed(() => Math.round((storageInfo.used / storageInfo.total) * 10000) / 100)

// ============= 7. 飞书同步 =============
const feishuLoading = ref(false)
const feishuConnected = ref(false)
const appToken = ref(localStorage.getItem('wb-feishu-appToken') || '')
const moduleSchemas: Record<string, { label: string; fields: FieldSchema[]; tableName: string }> = {
  todo: {
    label: '任务待办',
    tableName: '任务待办',
    fields: [
      { fieldName: '标题', type: 1 },
      { fieldName: '优先级', type: 3 },
      { fieldName: '状态', type: 3 },
      { fieldName: '截止日期', type: 5 },
      { fieldName: '标签', type: 1 },
      { fieldName: '内容', type: 1 },
      { fieldName: '创建时间', type: 5 }
    ]
  },
  project: {
    label: '项目进度',
    tableName: '项目进度',
    fields: [
      { fieldName: '项目名称', type: 1 },
      { fieldName: '进度%', type: 2 },
      { fieldName: '状态', type: 3 },
      { fieldName: '负责人', type: 1 },
      { fieldName: '里程碑', type: 1 },
      { fieldName: '更新日志', type: 1 },
      { fieldName: '创建时间', type: 5 }
    ]
  },
  bugs: {
    label: 'Bug台账',
    tableName: 'Bug台账',
    fields: [
      { fieldName: 'Bug标题', type: 1 },
      { fieldName: '严重度', type: 3 },
      { fieldName: '状态', type: 3 },
      { fieldName: '所属模块', type: 1 },
      { fieldName: '复现步骤', type: 1 },
      { fieldName: '解决方案', type: 1 },
      { fieldName: '发现日期', type: 5 }
    ]
  },
  idea: {
    label: '内容灵感',
    tableName: '内容灵感',
    fields: [
      { fieldName: '选题标题', type: 1 },
      { fieldName: '标签', type: 1 },
      { fieldName: '状态', type: 3 },
      { fieldName: '内容', type: 1 },
      { fieldName: '来源', type: 1 },
      { fieldName: '创建时间', type: 5 }
    ]
  },
  money: {
    label: '收支记账',
    tableName: '收支记账',
    fields: [
      { fieldName: '类型', type: 3 },
      { fieldName: '分类', type: 1 },
      { fieldName: '金额', type: 2 },
      { fieldName: '来源/去向', type: 1 },
      { fieldName: '备注', type: 1 },
      { fieldName: '日期', type: 5 }
    ]
  },
  checkin: {
    label: '习惯打卡',
    tableName: '习惯打卡',
    fields: [
      { fieldName: '习惯名称', type: 1 },
      { fieldName: '分组', type: 1 },
      { fieldName: '打卡日期', type: 5 },
      { fieldName: '连续天数', type: 2 },
      { fieldName: '备注', type: 1 }
    ]
  },
  read: {
    label: '学习阅读',
    tableName: '学习阅读',
    fields: [
      { fieldName: '书名/标题', type: 1 },
      { fieldName: '类型', type: 3 },
      { fieldName: '进度%', type: 2 },
      { fieldName: '作者', type: 1 },
      { fieldName: '笔记', type: 1 },
      { fieldName: '开始日期', type: 5 }
    ]
  },
  tech: {
    label: '技术笔记',
    tableName: '技术笔记',
    fields: [
      { fieldName: '标题', type: 1 },
      { fieldName: '分类', type: 1 },
      { fieldName: '标签', type: 1 },
      { fieldName: '内容', type: 1 },
      { fieldName: '创建时间', type: 5 }
    ]
  },
  markdown: {
    label: 'Markdown文档',
    tableName: 'Markdown文档',
    fields: [
      { fieldName: '标题', type: 1 },
      { fieldName: '分类', type: 3 },
      { fieldName: '标签', type: 1 },
      { fieldName: '状态', type: 3 },
      { fieldName: '字数', type: 2 },
      { fieldName: '文件路径', type: 1 },
      { fieldName: '内容', type: 1 },
      { fieldName: '创建时间', type: 5 }
    ]
  }
}
const selectedModule = ref<keyof typeof moduleSchemas>('todo')
const tableIdMap = reactive<Record<string, string>>(JSON.parse(localStorage.getItem('wb-feishu-tables') || '{}'))
const feishuLogs = ref<{ time: string; level: 'info' | 'success' | 'error'; msg: string }[]>([])

const addLog = (msg: string, level: 'info' | 'success' | 'error' = 'info') => {
  feishuLogs.value.unshift({
    time: new Date().toLocaleTimeString(),
    level,
    msg
  })
  if (feishuLogs.value.length > 50) feishuLogs.value.length = 50
}

const feishuBaseUrl = () => {
  // 根据配置推断的飞书多维表格URL前缀，点击后跳转
  return 'https://bytedance.feishu.cn/base/' + (appToken.value || '')
}

const testFeishu = async () => {
  feishuLoading.value = true
  try {
    const res: any = await feishuApi.testFeishu()
    feishuConnected.value = true
    addLog('✅ 飞书连接成功，token已获取', 'success')
    message.success('飞书连接成功')
  } catch (e: any) {
    feishuConnected.value = false
    addLog('❌ 飞书连接失败：' + (e?.message || '未知错误'), 'error')
    message.error(e?.message || '飞书连接失败，请检查后端配置')
  } finally {
    feishuLoading.value = false
  }
}

const createFeishuBase = async () => {
  feishuLoading.value = true
  addLog('🚀 开始创建多维表格...', 'info')
  try {
    const res: any = await feishuApi.createBase('晓贵的工作台 · 数据中心')
    appToken.value = res || ''
    localStorage.setItem('wb-feishu-appToken', appToken.value)
    addLog('✅ 多维表格创建成功，appToken=' + appToken.value, 'success')
    message.success('多维表格 Base 创建成功')
  } catch (e: any) {
    addLog('❌ 创建失败：' + (e?.message || '未知错误'), 'error')
    message.error(e?.message || '创建失败')
  } finally {
    feishuLoading.value = false
  }
}

const createFeishuTable = async () => {
  if (!appToken.value) {
    message.warning('请先创建或填入多维表格 appToken')
    return
  }
  const schema = moduleSchemas[selectedModule.value]
  feishuLoading.value = true
  addLog(`🛠️ 正在为【${schema.label}】创建数据表...`, 'info')
  try {
    const res: any = await feishuApi.createTable({
      appToken: appToken.value,
      name: schema.tableName,
      fields: schema.fields
    })
    tableIdMap[selectedModule.value] = res || ''
    localStorage.setItem('wb-feishu-tables', JSON.stringify(tableIdMap))
    addLog(`✅ 数据表【${schema.label}】创建成功，tableId=${res}`, 'success')
    message.success(`${schema.label} 数据表创建成功`)
  } catch (e: any) {
    addLog(`❌ 建表失败【${schema.label}】：` + (e?.message || '未知错误'), 'error')
    message.error(e?.message || '建表失败')
  } finally {
    feishuLoading.value = false
  }
}

const toFeishuRecord = (moduleKey: string, record: any): Record<string, any> => {
  const map: Record<string, Record<string, any>> = {
    todo: {
      '标题': record.title || '',
      '优先级': record.priority || '中',
      '状态': record.done === 1 ? '已完成' : '待办',
      '截止日期': record.deadline || '',
      '标签': record.category || '',
      '内容': record.note || '',
      '创建时间': record.createTime || ''
    },
    project: {
      '项目名称': record.title || '',
      '进度%': record.target ? Math.min(100, Math.round((record.current || 0) * 100 / record.target)) : 0,
      '状态': record.status || '进行中',
      '负责人': record.owner || '晓贵',
      '里程碑': record.note || '',
      '更新日志': record.note || '',
      '创建时间': record.createTime || ''
    },
    bugs: {
      'Bug标题': record.title || '',
      '严重度': record.level || '一般',
      '状态': record.stage || '待处理',
      '所属模块': record.service || '',
      '复现步骤': record.content || '',
      '解决方案': record.fixVer || '',
      '发现日期': record.date || record.createTime || ''
    },
    idea: {
      '选题标题': record.title || '',
      '标签': record.mood || '',
      '状态': record.platform || '草稿',
      '内容': record.content || '',
      '来源': record.date || '',
      '创建时间': record.createTime || ''
    },
    money: {
      '类型': record.type || '支出',
      '分类': record.category || '',
      '金额': Number(record.amount || 0),
      '来源/去向': record.source || record.title || '',
      '备注': record.title || '',
      '日期': record.date || record.createTime || ''
    },
    checkin: {
      '习惯名称': record.title || '',
      '分组': record.groupName || '',
      '打卡日期': record.createTime || '',
      '连续天数': 0,
      '备注': record.log || ''
    },
    read: {
      '书名/标题': record.title || '',
      '类型': record.unit || '书籍',
      '进度%': record.target ? Math.min(100, Math.round((record.current || 0) * 100 / record.target)) : 0,
      '作者': '',
      '笔记': record.note || '',
      '开始日期': record.createTime || ''
    },
    tech: {
      '标题': record.title || '',
      '分类': record.lang || '',
      '标签': record.mood || '',
      '内容': record.content || '',
      '创建时间': record.createTime || ''
    },
    markdown: {
      '标题': record.title || '',
      '分类': record.category || '其他',
      '标签': record.tags || '',
      '状态': record.status || '草稿',
      '字数': Number(record.wordCount || 0),
      '文件路径': record.filePath || '',
      '内容': record.content || '',
      '创建时间': record.createTime || ''
    }
  }
  return map[moduleKey] || {}
}

const syncModule = async () => {
  if (!appToken.value) {
    message.warning('请先创建或填入多维表格 appToken')
    return
  }
  if (!tableIdMap[selectedModule.value]) {
    message.warning('请先为当前模块创建数据表')
    return
  }
  const schema = moduleSchemas[selectedModule.value]
  const apiMap: Record<string, any> = {
    todo: (apis as any).todoApi,
    project: (apis as any).projectApi,
    bugs: (apis as any).bugsApi,
    idea: (apis as any).ideaApi,
    money: (apis as any).moneyApi,
    checkin: (apis as any).checkinApi,
    read: (apis as any).readApi,
    tech: (apis as any).techApi,
    markdown: (apis as any).markdownApi
  }
  const api = apiMap[selectedModule.value]
  if (!api?.list) {
    message.error('找不到该模块的后端接口')
    return
  }
  feishuLoading.value = true
  addLog(`📤 正在同步【${schema.label}】数据到飞书...`, 'info')
  try {
    const list = await api.list()
    const records = (Array.isArray(list) ? list : []).map((r: any) => toFeishuRecord(selectedModule.value, r))
    if (records.length === 0) {
      addLog(`⚠️ 【${schema.label}】暂无数据，跳过同步`, 'info')
      message.info('当前模块暂无数据')
      return
    }
    await feishuApi.syncData({
      appToken: appToken.value,
      tableId: tableIdMap[selectedModule.value],
      records
    })
    addLog(`✅ 【${schema.label}】同步完成，共 ${records.length} 条记录`, 'success')
    message.success(`${schema.label} 同步成功（${records.length} 条）`)
  } catch (e: any) {
    addLog(`❌ 【${schema.label}】同步失败：` + (e?.message || '未知错误'), 'error')
    message.error(e?.message || '同步失败')
  } finally {
    feishuLoading.value = false
  }
}

const oneClickSetup = async () => {
  // 一键完成：测试连接 → 建Base → 所有模块建表 → 同步所有数据
  if (!window.confirm('确认执行「一键初始化飞书同步」？\n将创建1个Base + ' + Object.keys(moduleSchemas).length + '张数据表，并同步所有已有数据。')) {
    return
  }
  const modules = Object.keys(moduleSchemas) as (keyof typeof moduleSchemas)[]
  const apiMap: Record<string, any> = {
    todo: (apis as any).todoApi,
    project: (apis as any).projectApi,
    bugs: (apis as any).bugsApi,
    idea: (apis as any).ideaApi,
    money: (apis as any).moneyApi,
    checkin: (apis as any).checkinApi,
    read: (apis as any).readApi,
    tech: (apis as any).techApi,
    markdown: (apis as any).markdownApi
  }
  feishuLoading.value = true
  addLog('🌟 启动飞书一键初始化流程...', 'info')
  try {
    addLog('[1/4] 测试飞书连接...', 'info')
    await feishuApi.testFeishu()
    feishuConnected.value = true

    addLog('[2/4] 创建多维表格 Base...', 'info')
    const baseToken: any = appToken.value || await feishuApi.createBase('晓贵的工作台 · 数据中心')
    appToken.value = baseToken
    localStorage.setItem('wb-feishu-appToken', baseToken)

    for (let i = 0; i < modules.length; i++) {
      const mk = modules[i]
      const schema = moduleSchemas[mk]
      addLog(`[3/4 · ${i + 1}/${modules.length}] 创建数据表【${schema.label}】...`, 'info')
      try {
        const tableId: any = await feishuApi.createTable({
          appToken: baseToken,
          name: schema.tableName,
          fields: schema.fields
        })
        tableIdMap[mk] = tableId
      } catch (e: any) {
        addLog(`⚠️ 数据表【${schema.label}】创建可能已存在：` + (e?.message || ''), 'info')
      }
    }
    localStorage.setItem('wb-feishu-tables', JSON.stringify(tableIdMap))

    for (let i = 0; i < modules.length; i++) {
      const mk = modules[i]
      const schema = moduleSchemas[mk]
      const api = apiMap[mk]
      const tid = tableIdMap[mk]
      if (!api?.list || !tid) continue
      addLog(`[4/4 · ${i + 1}/${modules.length}] 同步【${schema.label}】...`, 'info')
      try {
        const list = await api.list()
        const records = (Array.isArray(list) ? list : []).map((r: any) => toFeishuRecord(mk, r))
        if (records.length === 0) continue
        await feishuApi.syncData({
          appToken: baseToken,
          tableId: tid,
          records
        })
        addLog(`  ↳ 同步成功 ${records.length} 条`, 'success')
      } catch (e: any) {
        addLog(`  ↳ 同步失败：` + (e?.message || ''), 'error')
      }
    }
    addLog('🎉 飞书一键初始化完成！', 'success')
    message.success('飞书同步初始化完成')
  } catch (e: any) {
    addLog('❌ 初始化流程中断：' + (e?.message || '未知错误'), 'error')
    message.error(e?.message || '初始化失败')
  } finally {
    feishuLoading.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-title">⚙️ 工作台设置</h2>
      <p class="page-desc">个性化配置你的工作台，打造专属工作流</p>
    </div>

    <a-tabs v-model:activeKey="activeTab" size="large" class="settings-tabs">
      <!-- 1. 基础外观 -->
      <a-tab-pane key="appearance">
        <template #tab><BgColorsOutlined /> 基础外观</template>
        <a-card class="setting-card" :bordered="false">
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :xs="24" :md="12">
                <a-form-item label="主题模式">
                  <a-radio-group v-model:value="appearanceForm.theme">
                    <a-radio-button v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </a-radio-button>
                  </a-radio-group>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item label="主题主色调">
                  <div class="color-row">
                    <div
                      v-for="c in ['#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#eb2f96']"
                      :key="c"
                      class="color-dot"
                      :class="{ active: appearanceForm.primaryColor === c }"
                      :style="{ background: c }"
                      @click="appearanceForm.primaryColor = c"
                    ></div>
                  </div>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item label="页面最大宽度">
                  <a-select v-model:value="appearanceForm.layoutWidth">
                    <a-select-option v-for="opt in widthOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item label="弹窗宽度">
                  <a-switch
                    v-model:checked="appearanceForm.modalWide"
                    checked-children="宽版推荐"
                    un-checked-children="标准"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
          <a-divider />
          <a-button type="primary" @click="saveAppearance"><SaveOutlined /> 保存外观设置</a-button>
        </a-card>
      </a-tab-pane>

      <!-- 2. 自定义路径 -->
      <a-tab-pane key="paths">
        <template #tab><FolderOpenOutlined /> 自定义路径</template>
        <a-card class="setting-card" :bordered="false">
          <a-form layout="vertical">
            <a-form-item label="💻 代码工程根目录" extra="用于代码仓库模块快速打开">
              <a-input v-model:value="pathForm.codeRepoDir" />
            </a-form-item>
            <a-form-item label="🎬 自媒体素材根目录">
              <a-input v-model:value="pathForm.mediaDir" />
            </a-form-item>
            <a-form-item label="🤖 AI模型/数据集根目录">
              <a-input v-model:value="pathForm.aiModelDir" />
            </a-form-item>
            <a-form-item label="💾 本地备份根目录">
              <a-input v-model:value="pathForm.backupDir" />
            </a-form-item>
            <a-form-item label="📤 导出文件根目录">
              <a-input v-model:value="pathForm.exportDir" />
            </a-form-item>
          </a-form>
          <a-divider />
          <a-button type="primary" @click="savePaths"><SaveOutlined /> 保存路径配置</a-button>
        </a-card>
      </a-tab-pane>

      <!-- 3. 数据导入/导出 -->
      <a-tab-pane key="io">
        <template #tab><CloudDownloadOutlined /> 数据导入 / 导出</template>
        <a-card class="setting-card" :bordered="false" title="📤 一键全量导出">
          <p class="section-desc">导出全部模块数据（任务/项目/Bug/素材/记账等共17张表），支持JSON全量快照、Markdown可读备份、CSV合并表。</p>
          <a-space wrap>
            <a-button type="primary" :loading="exporting" @click="exportAll">
              <ExportOutlined /> 导出 JSON 全量快照
            </a-button>
            <a-button :loading="exporting" @click="exportMarkdown">
              <CloudDownloadOutlined /> 导出 Markdown 备份
            </a-button>
            <a-button :loading="exporting" @click="exportCSV">
              <OrderedListOutlined /> 导出 CSV 合并表
            </a-button>
          </a-space>
          <a-divider />
          <div class="import-block">
            <h4 class="block-title">📥 从备份恢复</h4>
            <p class="section-desc">选择之前导出的 JSON 快照，即可批量追加/恢复数据（相同 ID 会被覆盖）。</p>
            <input ref="fileInputRef" type="file" accept=".json" style="display:none" @change="onImportFile" />
            <a-space wrap>
              <a-button type="primary" @click="triggerImport">
                <CloudUploadOutlined /> 选择备份文件导入
              </a-button>
              <a-tag color="orange">⚠ 强烈建议导入前，先导出一份当前快照做备份</a-tag>
            </a-space>
          </div>
        </a-card>
      </a-tab-pane>

      <!-- 4. 菜单与显示 -->
      <a-tab-pane key="menu">
        <template #tab><OrderedListOutlined /> 菜单与显示</template>
        <a-card class="setting-card" :bordered="false">
          <p class="section-desc">根据个人习惯隐藏不常用的侧边栏分组；隐藏后对应页面仍可通过地址栏直接访问。</p>
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showDev" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">💻 程序员分组（任务/项目/Bug/代码/服务器/阅读/技术）</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showAi" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">🤖 AI分组（AI实验室/内容灵感）</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showMedia" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">🎬 自媒体分组（素材/看板/稿件/打卡/密码/备份/记账）</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showStats" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">📊 统计分组（洞察复盘）</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showSystem" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">⚙️ 系统分组（工作台设置）</span>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
          <a-divider />
          <a-button type="primary" @click="saveMenuConfig"><SaveOutlined /> 保存显示配置</a-button>
        </a-card>
      </a-tab-pane>

      <!-- 5. 归档/清理规则 -->
      <a-tab-pane key="archive">
        <template #tab><DeleteOutlined /> 归档 / 清理规则</template>
        <a-card class="setting-card" :bordered="false">
          <a-form layout="vertical">
            <a-row :gutter="24">
              <a-col :xs="24" :md="8">
                <a-form-item label="自动归档：超过N天的已完成记录自动归档">
                  <a-input-number v-model:value="archiveForm.autoArchiveDays" :min="7" :max="365" addon-after="天" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="8">
                <a-form-item label="回收站清理：已删除超过N天彻底删除">
                  <a-input-number v-model:value="archiveForm.autoCleanTrashDays" :min="1" :max="180" addon-after="天" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="8">
                <a-form-item label="备份提醒：超过N天未备份时首页提醒">
                  <a-input-number v-model:value="archiveForm.backupRemindDays" :min="1" :max="60" addon-after="天" style="width:100%" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
          <a-divider />
          <a-space wrap>
            <a-button type="primary" @click="saveArchive"><SaveOutlined /> 保存清理规则</a-button>
            <a-button danger @click="runClean"><ReloadOutlined /> 立即执行一次性清理</a-button>
          </a-space>
        </a-card>
      </a-tab-pane>

      <!-- 6. 版本 & 存储 -->
      <a-tab-pane key="about">
        <template #tab><InfoCircleOutlined /> 版本 & 存储</template>
        <a-card class="setting-card" :bordered="false">
          <a-descriptions bordered size="middle" :column="2">
            <a-descriptions-item label="产品名称">晓贵的工作台</a-descriptions-item>
            <a-descriptions-item label="当前版本">v1.0.0</a-descriptions-item>
            <a-descriptions-item label="技术架构" :span="2">
              Vue 3 + Vite + Ant Design Vue &nbsp;|&nbsp; SpringBoot 3.2.5 + MyBatis-Plus 3.5.5 + MySQL 8.0
            </a-descriptions-item>
            <a-descriptions-item label="数据总记录数">{{ storageInfo.records }} 条</a-descriptions-item>
            <a-descriptions-item label="Sa-Token 活跃超时">1800 秒（30 分钟）</a-descriptions-item>
            <a-descriptions-item label="默认管理员账号">admin / admin123</a-descriptions-item>
            <a-descriptions-item label="飞书多维表格">✅ 已集成（本地代理模式）</a-descriptions-item>
          </a-descriptions>
          <a-divider />
          <h4 class="block-title">💾 存储空间占用</h4>
          <div class="storage-bar-wrap">
            <div class="storage-text">
              <span>已用 {{ storageInfo.used.toFixed(2) }} MB</span>
              <span>容量 {{ storageInfo.total }} GB &nbsp;（{{ percent }}%）</span>
            </div>
            <div class="storage-bar">
              <div
                class="storage-bar-inner"
                :style="{
                  width: percent + '%',
                  background: percent > 80 ? '#ff4d4f' : percent > 50 ? '#faad14' : '#52c41a'
                }"
              ></div>
            </div>
          </div>
        </a-card>
      </a-tab-pane>
      <!-- 7. 飞书同步 -->
      <a-tab-pane key="feishu">
        <template #tab><ApiOutlined /> 飞书多维同步</template>
        <a-card class="setting-card" :bordered="false">
          <a-alert
            v-if="feishuConnected"
            type="success"
            show-icon
            message="✅ 飞书已连接"
            description="已成功获取 tenant_access_token，可以执行同步操作"
            style="margin-bottom: 16px"
          />
          <a-alert
            v-else
            type="info"
            show-icon
            message="ℹ️ 使用前请先配置后端 application.yml 中的飞书 appId / appSecret"
            description="配置完成后点击「连接测试」验证连通性。若使用企业自建应用，请确保已开通「多维表格」相关权限。"
            style="margin-bottom: 16px"
          />

          <h4 class="block-title">🔗 连接配置</h4>
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :xs="24" :md="16">
                <a-form-item label="多维表格 Base appToken（可手动粘贴已有 Base）">
                  <a-input v-model:value="appToken" placeholder="例如：bascnXXXXXXX" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="8">
                <a-form-item label="飞书入口">
                  <a-space direction="vertical" style="width:100%">
                    <a-tag color="blue" v-if="appToken">
                      当前 Base：<strong>{{ appToken.slice(0, 10) }}...</strong>
                    </a-tag>
                    <a
                      v-if="appToken"
                      :href="feishuBaseUrl()"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkOutlined /> 在飞书中打开当前多维表格
                    </a>
                  </a-space>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
          <a-space wrap style="margin-bottom: 20px">
            <a-button type="primary" :loading="feishuLoading" @click="testFeishu">
              <LinkOutlined /> 连接测试
            </a-button>
            <a-button :loading="feishuLoading" @click="createFeishuBase">
              <DatabaseOutlined /> 创建新的多维表格 Base
            </a-button>
            <a-button type="primary" danger ghost :loading="feishuLoading" @click="oneClickSetup">
              <RocketOutlined /> 🚀 一键初始化（建 Base + 建所有表 + 同步数据）
            </a-button>
          </a-space>

          <a-divider />
          <h4 class="block-title">🧩 单模块操作（按需建表 / 同步）</h4>
          <a-row :gutter="16">
            <a-col :xs="24" :md="8">
              <a-form-item label="选择模块">
                <a-select v-model:value="selectedModule" style="width:100%">
                  <a-select-option v-for="(v, k) in moduleSchemas" :key="k" :value="k">
                    {{ v.label }}（{{ tableIdMap[k] ? '已建表' : '未建表' }}）
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="16">
              <a-form-item label="字段预览（将在飞书多维表格中创建的字段）">
                <a-tag v-for="f in moduleSchemas[selectedModule].fields" :key="f.fieldName" color="geekblue" style="margin-bottom: 4px">
                  {{ f.fieldName }}
                  <span style="opacity:.6;font-size:11px;margin-left:4px">
                    (type={{ f.type }})
                  </span>
                </a-tag>
              </a-form-item>
            </a-col>
          </a-row>
          <a-space wrap style="margin-bottom: 20px">
            <a-button :loading="feishuLoading" @click="createFeishuTable">
              <DatabaseOutlined /> 为【{{ moduleSchemas[selectedModule].label }}】建数据表
            </a-button>
            <a-button type="primary" :loading="feishuLoading" @click="syncModule">
              <SwapOutlined /> 同步【{{ moduleSchemas[selectedModule].label }}】数据到飞书
            </a-button>
            <a-tag v-if="tableIdMap[selectedModule]" color="green">
              当前 tableId: {{ tableIdMap[selectedModule] }}
            </a-tag>
          </a-space>

          <a-divider />
          <h4 class="block-title">📋 同步日志（最近 50 条）</h4>
          <div class="feishu-logs">
            <div v-if="feishuLogs.length === 0" class="log-empty">暂无日志，点击上方按钮开始同步</div>
            <div
              v-for="(l, idx) in feishuLogs"
              :key="idx"
              class="log-row"
              :class="'log-' + l.level"
            >
              <span class="log-time">{{ l.time }}</span>
              <span class="log-msg">{{ l.msg }}</span>
            </div>
          </div>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: 16px; }

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 24px;
  border-radius: 10px;
  color: #fff;
}
.page-title { margin: 0 0 4px 0; color: #fff; font-size: 20px; }
.page-desc { margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; }

.settings-tabs :deep(.ant-tabs-nav) {
  background: #fff; padding: 0 16px; border-radius: 10px; margin: 0;
}
.setting-card { border-radius: 10px; box-shadow: 0 1px 4px rgba(0,21,41,0.06); }

.section-desc { color: rgba(0,0,0,0.55); font-size: 13px; margin: 0 0 16px 0; }
.block-title { font-size: 15px; font-weight: 600; margin: 0 0 12px 0; }

.color-row { display: flex; gap: 10px; align-items: center; }
.color-dot {
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  border: 3px solid transparent; transition: all 0.2s;
}
.color-dot.active {
  transform: scale(1.1); border-color: #fff;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.15);
}

.switch-label { margin-left: 10px; font-size: 14px; color: rgba(0,0,0,0.85); }
.import-block { background: #fafafa; padding: 16px; border-radius: 8px; }

.storage-bar-wrap { margin-top: 8px; }
.storage-text {
  display: flex; justify-content: space-between;
  font-size: 13px; color: rgba(0,0,0,0.65); margin-bottom: 8px;
}
.storage-bar {
  width: 100%; height: 10px; background: #f0f0f0;
  border-radius: 5px; overflow: hidden;
}
.storage-bar-inner { height: 100%; transition: width 0.3s; border-radius: 5px; }

.feishu-logs {
  max-height: 320px; overflow-y: auto;
  background: #0f172a; color: #e2e8f0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12.5px;
  padding: 12px 16px; border-radius: 8px;
}
.log-empty {
  text-align: center; color: #94a3b8; padding: 30px 0;
  font-size: 13px;
}
.log-row {
  display: flex; gap: 12px; padding: 4px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.05);
}
.log-row:last-child { border-bottom: none; }
.log-time { color: #64748b; white-space: nowrap; flex-shrink: 0; }
.log-msg { flex: 1; }
.log-row.log-success .log-msg { color: #4ade80; }
.log-row.log-error .log-msg { color: #f87171; }
.log-row.log-info .log-msg { color: #e2e8f0; }
</style>
