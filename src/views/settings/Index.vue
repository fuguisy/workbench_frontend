<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  UserOutlined,
  PlusOutlined,
  KeyOutlined,
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
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { userApi, type SysUserVO } from '@/api/user'
export type { FieldSchema }

const appStore = useAppStore()

const activeTab = ref('appearance')

// ============= 1. 基础外观（与 appStore 打通，立即生效） =============
// 全部读写 appStore：主题 / 主色调 / 页面最大宽度 / 弹窗宽度 都会持久化并立即生效
const appearanceForm = reactive({
  theme: appStore.theme,
  primaryColor: appStore.primaryColor || (appStore.theme === 'dark' ? '#5E6AD2' : '#1677ff'),
  layoutWidth: appStore.pageMaxWidth,
  modalWide: appStore.modalWide
})

const themeOptions = [
  { label: '☀️ 亮色', value: 'light' },
  { label: '🌙 暗色', value: 'dark' }
]

const widthOptions = [
  { label: '1200px (紧凑)', value: '1200' },
  { label: '1440px (标准)', value: '1440' },
  { label: '1680px (宽屏推荐)', value: '1680' },
  { label: '1920px (超宽)', value: '1920' }
]

const primaryOptions = ['#5E6AD2', '#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#eb2f96']

const saveAppearance = () => {
  // 主题：响应式 + watch 持久化 + 立即切换 html[data-theme]
  appStore.theme = appearanceForm.theme as 'dark' | 'light'
  // 主色调 / 宽度 / 弹窗：appStore 内 watch 会写入 localStorage 与 CSS 变量
  appStore.primaryColor = appearanceForm.primaryColor
  appStore.pageMaxWidth = appearanceForm.layoutWidth
  appStore.modalWide = appearanceForm.modalWide
  message.success('外观设置已保存并立即生效')
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

// ============= 4. 菜单与显示 =============
const menuConfig = reactive({
  showDev: localStorage.getItem('wb-menu-dev') !== 'false',
  showMedia: localStorage.getItem('wb-menu-media') !== 'false',
  showPersonal: localStorage.getItem('wb-menu-personal') !== 'false',
  showSystem: localStorage.getItem('wb-menu-system') !== 'false'
})

const saveMenuConfig = () => {
  localStorage.setItem('wb-menu-dev', String(menuConfig.showDev))
  localStorage.setItem('wb-menu-media', String(menuConfig.showMedia))
  localStorage.setItem('wb-menu-personal', String(menuConfig.showPersonal))
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
    onOk: () => message.warning('该功能尚未实现，未执行任何清理操作。已删除记录由数据库的 deleted 标记保留。')
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
  storageInfo.records = total
  // 按每条记录约 0.5KB 估算占用空间
  storageInfo.used = Math.round(total * 0.5 * 100) / 100000
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
  },
  focus: {
    label: '专注记录',
    tableName: '专注记录',
    fields: [
      { fieldName: '任务标题', type: 1 },
      { fieldName: '场景', type: 3 },
      { fieldName: '实际时长(分钟)', type: 2 },
      { fieldName: '标准时长(分钟)', type: 2 },
      { fieldName: '状态', type: 3 },
      { fieldName: '日期', type: 5 },
      { fieldName: '关联任务', type: 1 }
    ]
  },
  calendar: {
    label: '日程事件',
    tableName: '日程事件',
    fields: [
      { fieldName: '事件标题', type: 1 },
      { fieldName: '类型', type: 3 },
      { fieldName: '开始时间', type: 5 },
      { fieldName: '结束时间', type: 5 },
      { fieldName: '地点', type: 1 },
      { fieldName: '备注', type: 1 },
      { fieldName: '状态', type: 3 }
    ]
  },
  notification: {
    label: '通知记录',
    tableName: '通知记录',
    fields: [
      { fieldName: '标题', type: 1 },
      { fieldName: '类型', type: 3 },
      { fieldName: '内容', type: 1 },
      { fieldName: '是否已读', type: 3 },
      { fieldName: '优先级', type: 2 },
      { fieldName: '日期', type: 5 },
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
    },
    focus: {
      '任务标题': record.title || '',
      '场景': record.scene || '',
      '实际时长(分钟)': Number(record.minutesActual || 0),
      '标准时长(分钟)': Number(record.minutesStandard || 0),
      '状态': record.status || 'DOING',
      '日期': record.recordDate || '',
      '关联任务': record.taskId ? `任务#${record.taskId}` : ''
    },
    calendar: {
      '事件标题': record.title || '',
      '类型': record.type || '工作',
      '开始时间': record.startTime || '',
      '结束时间': record.endTime || '',
      '地点': record.location || '',
      '备注': record.note || '',
      '状态': record.status || '待办'
    },
    notification: {
      '标题': record.title || '',
      '类型': record.type || 'SYSTEM',
      '内容': record.content || '',
      '是否已读': record.read ? '已读' : '未读',
      '优先级': Number(record.priority || 0),
      '日期': record.date || '',
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
    markdown: (apis as any).markdownApi,
    focus: (apis as any).focusApi,
    calendar: (apis as any).calendarApi,
    notification: (apis as any).notificationApi
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
    markdown: (apis as any).markdownApi,
    focus: (apis as any).focusApi,
    calendar: (apis as any).calendarApi,
    notification: (apis as any).notificationApi
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

// 同步状态统计
const syncStats = computed(() => {
  const total = Object.keys(moduleSchemas).length
  const created = Object.keys(tableIdMap).filter(k => tableIdMap[k]).length
  return { total, created }
})

// 仅同步已建表的数据（不建新表）
const syncAllData = async () => {
  if (!appToken.value) {
    message.warning('请先创建或填入多维表格 appToken')
    return
  }
  const apiMap: Record<string, any> = {
    todo: (apis as any).todoApi,
    project: (apis as any).projectApi,
    bugs: (apis as any).bugsApi,
    idea: (apis as any).ideaApi,
    money: (apis as any).moneyApi,
    checkin: (apis as any).checkinApi,
    read: (apis as any).readApi,
    tech: (apis as any).techApi,
    markdown: (apis as any).markdownApi,
    focus: (apis as any).focusApi,
    calendar: (apis as any).calendarApi,
    notification: (apis as any).notificationApi
  }
  const modules = Object.keys(moduleSchemas) as (keyof typeof moduleSchemas)[]
  feishuLoading.value = true
  addLog('🔄 开始同步所有已建表模块数据...', 'info')
  let successCount = 0
  let totalRecords = 0
  for (const mk of modules) {
    const schema = moduleSchemas[mk]
    const tid = tableIdMap[mk]
    const api = apiMap[mk]
    if (!api?.list || !tid) continue
    addLog(`  → 同步【${schema.label}】...`, 'info')
    try {
      const list = await api.list()
      const records = (Array.isArray(list) ? list : []).map((r: any) => toFeishuRecord(mk, r))
      if (records.length === 0) {
        addLog(`  ↳ 【${schema.label}】无数据，跳过`, 'info')
        continue
      }
      await feishuApi.syncData({ appToken: appToken.value, tableId: tid, records })
      addLog(`  ↳ ✅ ${schema.label}：${records.length} 条`, 'success')
      successCount++
      totalRecords += records.length
    } catch (e: any) {
      addLog(`  ↳ ❌ ${schema.label}失败：` + (e?.message || ''), 'error')
    }
  }
  addLog(`🎉 同步完成：${successCount} 个模块，共 ${totalRecords} 条记录`, 'success')
  message.success(`同步完成（${successCount}模块 / ${totalRecords}条）`)
  feishuLoading.value = false
}

// ============= 8. 用户管理（仅管理员可见） =============
// 自助注册已下线：新增账号统一在这里完成，/sys/user 全部接口要求 admin 角色
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.userInfo?.role === 'admin')

const userLoading = ref(false)
const userList = ref<SysUserVO[]>([])
const userTotal = ref(0)
const userQuery = reactive({ current: 1, size: 10, keyword: '' })

const userColumns = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '用户名', dataIndex: 'username', width: 150 },
  { title: '昵称', dataIndex: 'nickname', width: 130 },
  { title: '角色', dataIndex: 'role', width: 110 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '创建时间', dataIndex: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 260 }
]

const formatTime = (v?: string) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-')

const loadUsers = async () => {
  if (!isAdmin.value) return
  userLoading.value = true
  try {
    const res = await userApi.page({
      current: userQuery.current,
      size: userQuery.size,
      keyword: userQuery.keyword.trim() || undefined
    })
    userList.value = res?.records || []
    userTotal.value = res?.total || 0
  } catch {
    // 请求拦截器已统一提示
  } finally {
    userLoading.value = false
  }
}

const searchUsers = () => {
  userQuery.current = 1
  loadUsers()
}

const onUserPageChange = (p: any) => {
  userQuery.current = p.current
  loadUsers()
}

// 新增用户
const createOpen = ref(false)
const createSubmitting = ref(false)
const createForm = reactive({
  username: '',
  password: '',
  nickname: '',
  role: 'user' as 'admin' | 'user'
})

const openCreate = () => {
  createForm.username = ''
  createForm.password = ''
  createForm.nickname = ''
  createForm.role = 'user'
  createOpen.value = true
}

const submitCreate = async () => {
  if (!createForm.username.trim()) {
    message.warning('请输入用户名')
    return
  }
  if (createForm.password.length < 8) {
    message.warning('密码至少 8 位')
    return
  }
  createSubmitting.value = true
  try {
    await userApi.create({
      username: createForm.username.trim(),
      password: createForm.password,
      nickname: createForm.nickname.trim() || undefined,
      role: createForm.role
    })
    message.success('用户已创建，可用该账号登录')
    createOpen.value = false
    userQuery.current = 1
    await loadUsers()
  } catch {
    // 请求拦截器已统一提示
  } finally {
    createSubmitting.value = false
  }
}

// 重置口令
const pwdOpen = ref(false)
const pwdTarget = ref<SysUserVO | null>(null)
const pwdForm = reactive({ password: '' })

const openResetPwd = (row: SysUserVO) => {
  pwdTarget.value = row
  pwdForm.password = ''
  pwdOpen.value = true
}

const submitResetPwd = async () => {
  if (!pwdTarget.value) return
  if (pwdForm.password.length < 8) {
    message.warning('密码至少 8 位')
    return
  }
  try {
    await userApi.resetPassword(pwdTarget.value.id, pwdForm.password)
    message.success('口令已重置，该账号的登录态已强制失效')
    pwdOpen.value = false
  } catch {
    // 请求拦截器已统一提示
  }
}

// 启用 / 停用
const toggleStatus = async (row: SysUserVO) => {
  const target = row.status === 1 ? 0 : 1
  try {
    await userApi.updateStatus(row.id, target)
    message.success(target === 1 ? '已启用' : '已停用，该账号的登录态已强制失效')
    await loadUsers()
  } catch {
    // 请求拦截器已统一提示
  }
}

// 删除
const removeUser = (row: SysUserVO) => {
  Modal.confirm({
    title: `确认删除用户「${row.username}」？`,
    content: '该账号将被删除且无法再登录。其名下业务数据会保留在库中（按账号隔离，不会展示给其他账号）。',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await userApi.remove(row.id)
      message.success('已删除')
      await loadUsers()
    }
  })
}

// 登录信息是登录后异步补齐的，跟随它的变化加载一次列表
watch(
  isAdmin,
  (v) => {
    if (v) loadUsers()
  },
  { immediate: true }
)
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
                      v-for="c in primaryOptions"
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
            <a-space wrap>
              <a-button type="primary" disabled>
                <CloudUploadOutlined /> 选择备份文件导入
              </a-button>
              <a-tag color="orange">⚠ 后端批量导入接口尚未实现，当前版本请用 JSON 全量快照留档</a-tag>
            </a-space>
          </div>
        </a-card>
      </a-tab-pane>

      <!-- 4. 菜单与显示 -->
      <a-tab-pane key="menu">
        <template #tab><OrderedListOutlined /> 菜单与显示</template>
        <a-card class="setting-card" :bordered="false">
          <p class="section-desc">根据个人习惯隐藏不常用的侧边栏分组；隐藏后对应页面仍可通过地址栏直接访问。工作台和效率分组始终显示。</p>
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showDev" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">💻 程序员分组（代码仓库 / AI实验室 / 命令面板）</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showMedia" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">🎬 自媒体分组（自媒体看板 / 素材库 / 创作稿件库）</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showPersonal" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">📚 知识与个人分组（知识库 / 习惯打卡 / 收支记账 / 订阅账单）</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item>
                  <a-switch v-model:checked="menuConfig.showSystem" checked-children="显示" un-checked-children="隐藏" />
                  <span class="switch-label">⚙️ 系统分组（密码管理 / 文件备份 / 洞察复盘 / 工作台设置）</span>
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
            <a-descriptions-item label="默认管理员账号">admin（初始口令见后端首次启动日志或 ADMIN_INIT_PASSWORD）</a-descriptions-item>
            <a-descriptions-item label="飞书多维表格">✅ 已集成（后端代理模式）</a-descriptions-item>
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
            <a-button type="primary" ghost :loading="feishuLoading" @click="syncAllData" :disabled="syncStats.created === 0">
              <SwapOutlined /> 🔄 同步全部已建表数据（{{ syncStats.created }}/{{ syncStats.total }}）
            </a-button>
          </a-space>

          <div v-if="syncStats.created > 0" class="sync-stats-row">
            <a-tag color="green">已建表：{{ syncStats.created }} / {{ syncStats.total }}</a-tag>
            <a-tag color="blue">待建表：{{ syncStats.total - syncStats.created }}</a-tag>
          </div>

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
      <!-- 8. 用户管理（仅管理员可见） -->
      <a-tab-pane v-if="isAdmin" key="users">
        <template #tab><UserOutlined /> 用户管理</template>
        <a-card class="setting-card" :bordered="false">
          <a-alert
            type="info"
            show-icon
            message="自助注册已关闭"
            description="新增账号只能由管理员在此创建。各账号的数据互相隔离，只能看到自己名下的记录。"
            style="margin-bottom: 16px"
          />
          <a-space style="margin-bottom: 12px">
            <a-input
              v-model:value="userQuery.keyword"
              placeholder="搜索用户名 / 昵称"
              allow-clear
              style="width: 240px"
              @press-enter="searchUsers"
            />
            <a-button @click="searchUsers"><ReloadOutlined /> 刷新</a-button>
            <a-button type="primary" @click="openCreate"><PlusOutlined /> 新增用户</a-button>
          </a-space>
          <a-table
            :columns="userColumns"
            :data-source="userList"
            :loading="userLoading"
            row-key="id"
            size="middle"
            :pagination="{
              current: userQuery.current,
              pageSize: userQuery.size,
              total: userTotal,
              showSizeChanger: false,
              onChange: onUserPageChange
            }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'role'">
                <a-tag :color="record.role === 'admin' ? 'gold' : 'default'">
                  {{ record.role === 'admin' ? '管理员' : '普通用户' }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'status'">
                <a-tag :color="record.status === 1 ? 'green' : 'red'">
                  {{ record.status === 1 ? '启用' : '停用' }}
                </a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'createTime'">
                {{ formatTime(record.createTime) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button size="small" @click="openResetPwd(record)"><KeyOutlined /> 重置口令</a-button>
                  <a-button size="small" @click="toggleStatus(record)">
                    {{ record.status === 1 ? '停用' : '启用' }}
                  </a-button>
                  <a-button size="small" danger @click="removeUser(record)">删除</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>

        <a-modal
          v-model:open="createOpen"
          title="新增用户"
          ok-text="创建"
          cancel-text="取消"
          :confirm-loading="createSubmitting"
          :destroyOnClose="true"
          @ok="submitCreate"
        >
          <a-form layout="vertical">
            <a-form-item label="用户名" required>
              <a-input v-model:value="createForm.username" placeholder="3-50 个字符" />
            </a-form-item>
            <a-form-item label="密码" required>
              <a-input-password v-model:value="createForm.password" placeholder="至少 8 位" />
            </a-form-item>
            <a-form-item label="昵称">
              <a-input v-model:value="createForm.nickname" placeholder="不填则与用户名相同" />
            </a-form-item>
            <a-form-item label="角色">
              <a-select v-model:value="createForm.role">
                <a-select-option value="user">普通用户</a-select-option>
                <a-select-option value="admin">管理员</a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-modal>

        <a-modal
          v-model:open="pwdOpen"
          :title="`重置口令 - ${pwdTarget?.username || ''}`"
          ok-text="重置"
          cancel-text="取消"
          :destroyOnClose="true"
          @ok="submitResetPwd"
        >
          <a-form layout="vertical">
            <a-form-item label="新密码" required>
              <a-input-password v-model:value="pwdForm.password" placeholder="至少 8 位，重置后该账号需重新登录" />
            </a-form-item>
          </a-form>
        </a-modal>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: 16px; flex: 1; min-height: 0; overflow-y: auto; }

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 24px;
  border-radius: 10px;
  color: #fff;
}
.page-title { margin: 0 0 4px 0; color: #fff; font-size: 20px; }
.page-desc { margin: 0; color: rgba(255,255,255,0.85); font-size: 13px; }

.settings-tabs :deep(.ant-tabs-nav) {
  background: var(--color-bg-card, #fff);
  padding: 0 16px;
  border-radius: 10px;
  margin: 0;
  border: 1px solid var(--color-border, #f0f0f0);
}
.settings-tabs :deep(.ant-tabs-tab) {
  color: var(--color-text-secondary, rgba(0,0,0,0.65));
}
.settings-tabs :deep(.ant-tabs-tab-active) {
  color: var(--color-primary, #1677ff);
}
.setting-card {
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,21,41,0.06);
  background: var(--color-bg-card, #fff);
}

.section-desc { color: var(--color-text-secondary, rgba(0,0,0,0.55)); font-size: 13px; margin: 0 0 16px 0; }
.block-title { font-size: 15px; font-weight: 600; margin: 0 0 12px 0; color: var(--color-text, rgba(0,0,0,0.85)); }

.color-row { display: flex; gap: 10px; align-items: center; }
.color-dot {
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  border: 3px solid transparent; transition: all 0.2s;
}
.color-dot.active {
  transform: scale(1.1); border-color: #fff;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.15);
}

.switch-label { margin-left: 10px; font-size: 14px; color: var(--color-text, rgba(0,0,0,0.85)); }
.import-block { background: var(--color-bg-soft, #fafafa); padding: 16px; border-radius: 8px; }

.storage-bar-wrap { margin-top: 8px; }
.storage-text {
  display: flex; justify-content: space-between;
  font-size: 13px; color: var(--color-text-secondary, rgba(0,0,0,0.65)); margin-bottom: 8px;
}
.storage-bar {
  width: 100%; height: 10px; background: var(--color-bg-soft, #f0f0f0);
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

.sync-stats-row {
  display: flex; gap: 8px; margin-bottom: 16px;
}
</style>
