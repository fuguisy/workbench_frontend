<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, h } from 'vue'
import {
  UploadOutlined, DownloadOutlined, FileMarkdownOutlined,
  EditOutlined, DeleteOutlined, CloudDownloadOutlined,
  SaveOutlined, EyeOutlined, FormOutlined,
  FileTextOutlined, FileExcelOutlined, FilePdfOutlined,
  FileWordOutlined, FolderOpenOutlined, RocketOutlined,
  PlusOutlined, FolderOutlined, FolderAddOutlined,
  FileAddOutlined, CloseOutlined, ReloadOutlined,
  CaretRightOutlined, FileDoneOutlined, RiseOutlined,
  AuditOutlined, ClockCircleOutlined, SearchOutlined,
  ScheduleOutlined, ReadOutlined
} from '@ant-design/icons-vue'
import { message, Modal, Upload, Tag, Tooltip, Input, Empty } from 'ant-design-vue'
import dayjs from 'dayjs'
import { markdownApi, docCategoryApi } from '@/api/modules'
import type { MarkdownDoc, CategoryTreeNode } from '@/api/modules'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const ROOT_KEY = 'root'
const treeData = ref<CategoryTreeNode[]>([])
const selectedKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])

const displayTree = computed<CategoryTreeNode[]>(() => {
  return [{
    key: ROOT_KEY,
    title: '全部文档',
    id: 0,
    parentId: 0,
    children: treeData.value
  }]
})

const loadTree = async () => {
  try {
    const res = await docCategoryApi.tree()
    treeData.value = res || []
    if (!expandedKeys.value.includes(ROOT_KEY)) {
      expandedKeys.value = [...expandedKeys.value, ROOT_KEY]
    }
  } catch (e: any) {
    message.error(`加载分类失败：${e?.message || e}`)
    treeData.value = []
  }
}

const contextMenu = ref<{ visible: boolean; x: number; y: number; node: CategoryTreeNode | null }>({
  visible: false, x: 0, y: 0, node: null
})
const onTreeRightClick = ({ event, node }: { event: MouseEvent; node: any }) => {
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, node: node }
}
const closeContextMenu = () => { contextMenu.value.visible = false }

const newNodeTitle = ref('')
const addRootNode = () => {
  newNodeTitle.value = ''
  Modal.confirm({
    title: '新增根分类',
    content: h(Input, { placeholder: '分类名称，如：我的项目', onChange: (e: any) => { newNodeTitle.value = e.target.value } }),
    onOk: async () => {
      const title = newNodeTitle.value.trim()
      if (!title) { message.warning('请输入分类名'); return }
      try {
        await docCategoryApi.add(0, title)
        await loadTree()
        newNodeTitle.value = ''
        message.success('已新增分类')
      } catch (e: any) {
        message.error(`新增失败：${e?.message || e}`)
      }
    }
  })
}
const addChildNode = (parent: CategoryTreeNode) => {
  newNodeTitle.value = ''
  Modal.confirm({
    title: `在「${parent.title}」下新增子分类`,
    content: h(Input, { placeholder: '子分类名称', onChange: (e: any) => { newNodeTitle.value = e.target.value } }),
    onOk: async () => {
      const title = newNodeTitle.value.trim()
      if (!title) { message.warning('请输入分类名'); return }
      try {
        await docCategoryApi.add(parent.id, title)
        if (!expandedKeys.value.includes(parent.key)) {
          expandedKeys.value = [...expandedKeys.value, parent.key]
        }
        await loadTree()
        newNodeTitle.value = ''
        message.success('已新增子分类')
      } catch (e: any) {
        message.error(`新增失败：${e?.message || e}`)
      }
    }
  })
}
const deleteNode = (node: CategoryTreeNode) => {
  Modal.confirm({
    title: `确认删除分类「${node.title}」？`,
    content: '该分类下的子分类也会一并删除，文档不会被删除但会从树中移除',
    okType: 'danger',
    onOk: async () => {
      try {
        await docCategoryApi.remove(node.id)
        await loadTree()
        if (selectedKeys.value[0] === node.key) selectedKeys.value = []
        message.success('已删除分类')
      } catch (e: any) {
        message.error(`删除失败：${e?.message || e}`)
      }
    }
  })
}

const selectedCategory = computed(() => {
  const key = selectedKeys.value[0]
  if (!key || key === ROOT_KEY) return undefined
  const findNode = (nodes: CategoryTreeNode[]): CategoryTreeNode | undefined => {
    for (const n of nodes) {
      if (n.key === key) return n
      if (n.children) { const f = findNode(n.children); if (f) return f }
    }
    return undefined
  }
  return findNode(displayTree.value)?.title
})

const loading = ref(false)
const dataList = ref<MarkdownDoc[]>([])
const searchTitle = ref('')
const selectedTag = ref<string | null>(null)

const mdCategoryList = [
  { key: 'Skill 技能', label: '技能文档', icon: FileMarkdownOutlined, color: '#5E6AD2', bg: 'rgba(94, 106, 210, 0.15)' },
  { key: '小说', label: '小说创作', icon: FormOutlined, color: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.15)' },
  { key: '教程', label: '教程笔记', icon: EyeOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: '技术文档', label: '技术文档', icon: FileTextOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '读书笔记', label: '读书笔记', icon: ReadOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' },
  { key: '日记随笔', label: '日记随笔', icon: ScheduleOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' }
]
const mdTagList = ['Markdown', 'Word', 'PDF', 'Excel', 'TXT', '已发布', '草稿']

const mdStats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime
    return t && dayjs(t).isAfter(monthStart)
  }).length
  let totalWords = 0
  dataList.value.forEach(r => { totalWords += (r.wordCount || 0) })
  return { total, monthNew, totalWords }
})

const mdCategoryCounts = computed(() => {
  const counts: Record<string, number> = {}
  mdCategoryList.forEach(c => { counts[c.key] = 0 })
  dataList.value.forEach(r => {
    const cat = r.category || '其他'
    if (counts[cat] !== undefined) counts[cat]++
    else counts['日记随笔'] = (counts['日记随笔'] || 0) + 1
  })
  return counts
})

const filteredData = computed(() => {
  return dataList.value.filter(r => {
    if (searchTitle.value && !r.title?.toLowerCase().includes(searchTitle.value.toLowerCase())) return false
    if (selectedCategory.value && r.category !== selectedCategory.value) return false
    if (selectedTag.value) {
      const tag = selectedTag.value
      const cat = r.category || ''
      const status = r.status || ''
      if (tag === 'Markdown' && !(cat.includes('技能') || cat.includes('教程') || cat.includes('技术') || cat.includes('笔记') || cat.includes('随笔'))) return false
      if (tag === 'Word' && cat !== 'Word') return false
      if (tag === 'PDF' && cat !== 'PDF') return false
      if (tag === 'Excel' && cat !== 'Excel') return false
      if (tag === 'TXT' && cat !== 'TXT') return false
      if (tag === '已发布' && status !== '已完成') return false
      if (tag === '草稿' && (status !== '草稿' && status !== '撰写中')) return false
    }
    return true
  })
})

const sortedList = computed(() => {
  return [...filteredData.value].sort((a, b) => {
    const ta = a.updateTime || a.createTime || ''
    const tb = b.updateTime || b.createTime || ''
    return tb.localeCompare(ta)
  })
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await markdownApi.list()
    dataList.value = res || []
  } catch (e: any) {
    message.error(`加载文档失败：${e?.message || e}`)
    dataList.value = []
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

const onTreeSelect = (keys: any) => {
  selectedKeys.value = keys
}

const uploadProps = {
  name: 'file',
  multiple: true,
  accept: '.md,.markdown,.txt,.docx,.doc,.xlsx,.xls,.pdf',
  customRequest: async (options: any) => {
    try {
      const cat = selectedCategory.value
      await markdownApi.upload(options.file, cat)
      message.success(`上传成功：${options.file.name}`)
      await loadData()
    } catch (e: any) {
      message.error(`上传失败：${e?.message || e}`)
    }
  }
}

const categoryColorMap: Record<string, string> = {
  'Skill 技能': '#5E6AD2', '小说': '#BF5AF2', '教程': '#34C759',
  '技术文档': '#0A84FF', '读书笔记': '#FF9F0A', '日记随笔': '#FF375F',
  'Word': '#FF3B30', 'Excel': '#34C759', 'PDF': '#FF3B30', 'TXT': 'default',
  '其他': 'default'
}
const statusColorMap: Record<string, string> = {
  '草稿': 'default', '撰写中': 'processing', '已完成': 'success', '已归档': 'warning'
}
const categoryIcon: Record<string, any> = {
  'Skill 技能': FileMarkdownOutlined, '小说': FormOutlined, '教程': EyeOutlined,
  '技术文档': FileTextOutlined, '读书笔记': EyeOutlined, '日记随笔': FormOutlined,
  'Word': FileWordOutlined, 'Excel': FileExcelOutlined, 'PDF': FilePdfOutlined,
  'TXT': FileTextOutlined, '其他': FileTextOutlined
}

const getAbstract = (r: MarkdownDoc): string => {
  const text = (r.content || '').replace(/```[\s\S]*?```/g, '').replace(/[#*`>\-]/g, '').trim()
  return text.length > 120 ? text.substring(0, 120) + '...' : text
}

const getTimeText = (r: MarkdownDoc): string => {
  const t = r.updateTime || r.createTime
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}

const formVisible = ref(false)
const formLoading = ref(false)
const isEdit = ref(false)
const formModel = ref<Partial<MarkdownDoc>>({})
const formRef = ref()
const formRules = {
  title: [{ required: true, message: '请输入文档标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const categoryOptions = computed(() => {
  const opts: { label: string; value: string }[] = []
  const walk = (nodes: CategoryTreeNode[]) => {
    for (const n of nodes) {
      if (n.key !== ROOT_KEY) opts.push({ label: n.title, value: n.title })
      if (n.children) walk(n.children)
    }
  }
  walk(displayTree.value)
  if (!opts.find(o => o.value === 'Skill 技能')) {
    opts.unshift(
      { label: 'Skill 技能', value: 'Skill 技能' },
      { label: '小说', value: '小说' },
      { label: '教程', value: '教程' },
      { label: '技术文档', value: '技术文档' },
      { label: '读书笔记', value: '读书笔记' },
      { label: '日记随笔', value: '日记随笔' }
    )
  }
  return opts
})

const statusOptions = [
  { label: '草稿', value: '草稿' },
  { label: '撰写中', value: '撰写中' },
  { label: '已完成', value: '已完成' },
  { label: '已归档', value: '已归档' }
]

const openAdd = () => {
  isEdit.value = false
  formModel.value = {
    category: selectedCategory.value || 'Skill 技能',
    status: '草稿',
    content: '# 新文档\n\n在此开始编写...\n'
  }
  formVisible.value = true
  nextTick(() => formRef.value?.resetFields?.())
}
const openEdit = (r: MarkdownDoc) => {
  isEdit.value = true
  formModel.value = { ...r }
  formVisible.value = true
}
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  formLoading.value = true
  try {
    if (isEdit.value && formModel.value.id) {
      await markdownApi.update(formModel.value as any)
      message.success('更新成功')
    } else {
      await markdownApi.add(formModel.value as any)
      message.success('新建成功')
    }
    formVisible.value = false
    await loadData()
  } finally { formLoading.value = false }
}

const handleDelete = (r: MarkdownDoc) => {
  Modal.confirm({
    title: `确认删除「${r.title}」？`,
    content: '删除后不可恢复',
    okType: 'danger',
    onOk: async () => {
      await markdownApi.remove(r.id as number)
      message.success('已删除')
      await loadData()
    }
  })
}

const resolveExt = (cat?: string, path?: string) => {
  if (path) { const i = path.lastIndexOf('.'); if (i >= 0) return path.substring(i) }
  switch (cat) {
    case 'Word': return '.docx'; case 'Excel': return '.xlsx'
    case 'PDF': return '.pdf'; case 'TXT': return '.txt'; default: return '.md'
  }
}
const downloadFile = (r: MarkdownDoc) => {
  const url = `/markdown/download/${r.id}`
  fetch(url, { headers: { Authorization: authStore.token || '' } })
    .then(res => res.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${r.title || 'doc'}${resolveExt(r.category, r.filePath)}`
      document.body.appendChild(a); a.click(); a.remove()
    })
    .catch(() => window.open(url, '_blank'))
}
const openTypora = async (r: MarkdownDoc) => {
  try { message.success((await markdownApi.openTypora(r.id as number)) || 'Typora 打开中') }
  catch (e: any) { message.error(`打开失败：${e?.message || e}`) }
}
const openDefault = async (r: MarkdownDoc, label: string = '本地应用') => {
  try { message.success((await markdownApi.openDefault(r.id as number)) || `${label} 打开中`) }
  catch (e: any) { message.error(`打开失败：${e?.message || e}`) }
}
const saveToFile = async (r: MarkdownDoc) => {
  try {
    const res: any = await markdownApi.saveToFile(r.id as number)
    message.success(`已保存到：${res?.path || '成功'}`)
    await loadData()
  } catch (e: any) { message.error(`保存失败：${e?.message || e}`) }
}

const editorVisible = ref(false)
const editorTitle = ref('')
const editorContent = ref('')
const editorPreview = ref('')
const editorSplit = ref<'edit' | 'split' | 'preview'>('split')
const editorId = ref<number | undefined>(undefined)
const editorSaving = ref(false)

const openEditor = (r: MarkdownDoc) => {
  editorId.value = r.id
  editorTitle.value = r.title
  editorContent.value = r.content || ''
  editorPreview.value = renderMd(r.content || '')
  editorVisible.value = true
}
watch(editorContent, val => { editorPreview.value = renderMd(val) })

function renderMd(src: string): string {
  if (!src) return ''
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inCode = false; let codeLang = ''; const codeBuf: string[] = []
  let inQuote = false; const quoteBuf: string[] = []
  let inUl = false; let inOl = false
  const pushListClose = () => { if (inUl) { out.push('</ul>'); inUl = false }; if (inOl) { out.push('</ol>'); inOl = false } }
  const pushQuoteClose = () => { if (inQuote) { out.push(`<blockquote>${renderMdInline(quoteBuf.join('\n'))}</blockquote>`); quoteBuf.length = 0; inQuote = false } }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      if (!inCode) { pushListClose(); pushQuoteClose(); inCode = true; codeLang = fence[1] || ''; codeBuf.length = 0 }
      else { out.push(`<pre class="md-fence"><code class="lang-${esc(codeLang)}">${esc(codeBuf.join('\n'))}</code></pre>`); inCode = false; codeLang = ''; codeBuf.length = 0 }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }
    if (/^\s*$/.test(line)) { pushListClose(); pushQuoteClose(); continue }
    const hd = line.match(/^(#{1,6})\s+(.*)$/)
    if (hd) { pushListClose(); pushQuoteClose(); out.push(`<h${hd[1].length}>${renderMdInline(hd[2])}</h${hd[1].length}>`); continue }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { pushListClose(); pushQuoteClose(); out.push('<hr/>'); continue }
    if (/^>\s?/.test(line)) { pushListClose(); inQuote = true; quoteBuf.push(line.replace(/^>\s?/, '')); continue }
    else pushQuoteClose()
    const ulm = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ulm) { if (inOl) { out.push('</ol>'); inOl = false }; if (!inUl) { out.push('<ul>'); inUl = true }; out.push(`<li>${renderMdInline(ulm[1])}</li>`); continue }
    const olm = line.match(/^\s*\d+\.\s+(.*)$/)
    if (olm) { if (inUl) { out.push('</ul>'); inUl = false }; if (!inOl) { out.push('<ol>'); inOl = true }; out.push(`<li>${renderMdInline(olm[1])}</li>`); continue }
    pushListClose()
    out.push(`<p>${renderMdInline(line)}</p>`)
  }
  if (inCode) out.push(`<pre class="md-fence"><code>${esc(codeBuf.join('\n'))}</code></pre>`)
  pushListClose(); pushQuoteClose()
  return out.join('\n')
}
function renderMdInline(s: string): string {
  let r = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  r = r.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m, alt, url) => `<img src="${url}" alt="${alt}" style="max-width:100%"/>`)
  r = r.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`)
  r = r.replace(/`([^`]+)`/g, (_m, c) => `<code class="md-inline-code">${c}</code>`)
  r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  r = r.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  r = r.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  r = r.replace(/_([^_]+)_/g, '<em>$1</em>')
  r = r.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return r
}
const editorSave = async () => {
  if (!editorId.value) return
  editorSaving.value = true
  try {
    await markdownApi.update({ id: editorId.value, content: editorContent.value } as any)
    message.success('已保存')
    await loadData()
  } finally { editorSaving.value = false }
}
const downloadMd = () => {
  const blob = new Blob([editorContent.value], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${editorTitle.value || 'doc'}.md`
  document.body.appendChild(a); a.click(); a.remove()
}

const selectedDoc = ref<MarkdownDoc | null>(null)
const selectDoc = (r: MarkdownDoc) => { selectedDoc.value = r; openEditor(r) }

onMounted(loadTree)
</script>

<template>
  <div class="doc-page">
    <div class="doc-sider">
      <div class="sider-header">
        <span class="sider-title"><FolderOutlined /> 文档分类</span>
        <Tooltip title="新增根分类">
          <a-button type="text" size="small" @click="addRootNode"><FolderAddOutlined /></a-button>
        </Tooltip>
      </div>
      <div class="sider-search">
        <a-input v-model:value="searchTitle" placeholder="搜索文档标题" allow-clear size="small">
          <template #prefix><FormOutlined style="color:#999" /></template>
        </a-input>
      </div>
      <div class="sider-tree" @click="closeContextMenu">
        <a-tree
          v-model:selectedKeys="selectedKeys"
          v-model:expandedKeys="expandedKeys"
          :tree-data="displayTree"
          :default-expand-all="true"
          :block-node="true"
          @select="onTreeSelect"
          @right-click="onTreeRightClick"
        >
          <template #title="{ key, title }">
            <span class="tree-node-title">
              <FolderOutlined v-if="key === 'root'" style="color:#faad14;margin-right:4px" />
              <FileMarkdownOutlined v-else style="color:#5E6AD2;margin-right:4px" />
              {{ title }}
            </span>
          </template>
        </a-tree>
      </div>
      <div
        v-if="contextMenu.visible"
        class="ctx-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div class="ctx-item" @click="addChildNode(contextMenu.node!); closeContextMenu()"><FolderAddOutlined /> 新增子分类</div>
        <div v-if="contextMenu.node?.key !== 'root'" class="ctx-item ctx-danger" @click="deleteNode(contextMenu.node!); closeContextMenu()"><DeleteOutlined /> 删除分类</div>
      </div>
    </div>

    <div class="doc-main">
      <div class="main-inner">
        <a-row :gutter="16" class="stat-row">
          <a-col :xs="24" :sm="8">
            <div class="stat-card" :style="{ '--accent': '#5E6AD2', '--accent-soft': 'rgba(94, 106, 210, 0.15)' }">
              <div class="stat-icon"><FileDoneOutlined /></div>
              <div class="stat-info">
                <div class="stat-value">{{ mdStats.total }}<span class="stat-unit">篇</span></div>
                <div class="stat-label">文档总数</div>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="8">
            <div class="stat-card" :style="{ '--accent': '#34C759', '--accent-soft': 'rgba(52, 199, 89, 0.15)' }">
              <div class="stat-icon"><RiseOutlined /></div>
              <div class="stat-info">
                <div class="stat-value">{{ mdStats.monthNew }}<span class="stat-unit">篇</span></div>
                <div class="stat-label">本月新增</div>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="8">
            <div class="stat-card" :style="{ '--accent': '#FF9F0A', '--accent-soft': 'rgba(255, 159, 10, 0.15)' }">
              <div class="stat-icon"><AuditOutlined /></div>
              <div class="stat-info">
                <div class="stat-value">{{ (mdStats.totalWords / 1000).toFixed(1) }}<span class="stat-unit">K字</span></div>
                <div class="stat-label">累计字数</div>
              </div>
            </div>
          </a-col>
        </a-row>

        <div class="section-title">
          <span class="title-text">文档分类</span>
          <div class="section-actions">
            <a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button>
            <Upload v-bind="uploadProps" :show-upload-list="false">
              <a-button size="small" type="dashed"><UploadOutlined /> 上传</a-button>
            </Upload>
            <a-button size="small" type="primary" @click="openAdd"><FileAddOutlined /> 新建文档</a-button>
          </div>
        </div>
        <div class="category-grid">
          <div
            v-for="cat in mdCategoryList"
            :key="cat.key"
            class="category-card"
            :class="{ active: selectedCategory === cat.key }"
            :style="{ '--cat-color': cat.color, '--cat-bg': cat.bg }"
            @click="selectedCategory = selectedCategory === cat.key ? null : (selectedCategory = cat.key as any); selectedKeys = []"
          >
            <div class="cat-badge">{{ mdCategoryCounts[cat.key] || 0 }}</div>
            <div class="cat-icon"><component :is="cat.icon" /></div>
            <div class="cat-label">{{ cat.label }}</div>
          </div>
        </div>

        <div class="section-title">
          <span class="title-text">
            <FolderOutlined style="color:#5E6AD2;margin-right:6px" />
            {{ selectedCategory || '全部文档' }}
            <span class="sub-count">({{ sortedList.length }} 篇)</span>
          </span>
        </div>
        <div class="tag-row">
          <div
            v-for="tag in mdTagList"
            :key="tag"
            class="tag-chip"
            :class="{ active: selectedTag === tag }"
            @click="selectedTag = selectedTag === tag ? null : tag"
          >
            {{ tag }}
          </div>
        </div>

        <a-spin :spinning="loading" tip="加载中...">
          <div v-if="sortedList.length" class="note-list">
            <div
              v-for="r in sortedList"
              :key="r.id"
              class="note-card"
            >
              <div class="note-main" @click="selectDoc(r)">
                <div class="note-head">
                  <component :is="categoryIcon[r.category || '其他'] || FileTextOutlined" class="doc-icon" />
                  <h4 class="note-title">{{ r.title }}</h4>
                  <Tag
                    :color="categoryColorMap[r.category || '其他'] || 'default'"
                    class="note-cat-tag"
                  >
                    {{ r.category || '未分类' }}
                  </Tag>
                </div>
                <div class="note-abstract">{{ getAbstract(r) || '暂无内容摘要，点击查看详情' }}</div>
                <div class="note-meta">
                  <span class="meta-item"><ClockCircleOutlined /> {{ getTimeText(r) }}</span>
                  <span v-if="r.wordCount" class="meta-item"><FileTextOutlined /> {{ r.wordCount }} 字</span>
                  <span v-if="r.status" class="meta-item status-tag" :data-status="r.status">{{ r.status }}</span>
                </div>
              </div>
              <div class="note-actions" @click.stop>
                <Tooltip title="下载"><a-button type="text" size="small" @click="downloadFile(r)"><DownloadOutlined /></a-button></Tooltip>
                <Tooltip title="Typora打开" v-if="['Skill 技能','TXT','其他'].includes(r.category || '') || !r.category">
                  <a-button type="text" size="small" @click="openTypora(r)"><FolderOpenOutlined /></a-button>
                </Tooltip>
                <Tooltip title="本地打开" v-if="['Word','Excel','PDF'].includes(r.category || '')">
                  <a-button type="text" size="small" @click="openDefault(r, r.category!)"><RocketOutlined /></a-button>
                </Tooltip>
                <Tooltip title="写入本地"><a-button type="text" size="small" @click="saveToFile(r)"><CloudDownloadOutlined /></a-button></Tooltip>
                <Tooltip title="元信息"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></Tooltip>
                <Tooltip title="删除"><a-button type="text" size="small" danger @click="handleDelete(r)"><DeleteOutlined /></a-button></Tooltip>
              </div>
            </div>
          </div>
          <div v-else class="note-empty">
            <div class="empty-icon">📄</div>
            <div class="empty-title">暂无文档</div>
            <div class="empty-desc">点击右上角「新建文档」或「上传」开始记录</div>
            <a-space style="margin-top:16px">
              <a-button type="primary" @click="openAdd"><PlusOutlined /> 新建文档</a-button>
              <Upload v-bind="uploadProps" :show-upload-list="false">
                <a-button type="dashed"><UploadOutlined /> 上传文件</a-button>
              </Upload>
            </a-space>
          </div>
        </a-spin>
      </div>
    </div>

    <a-modal
      v-model:open="formVisible"
      :title="isEdit ? '编辑文档元信息' : '新建文档'"
      :confirm-loading="formLoading"
      ok-text="保存" cancel-text="取消"
      @ok="saveForm"
      :width="640"
      :destroyOnClose="true"
    >
      <a-form ref="formRef" :model="formModel" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="文档标题" name="title">
              <a-input v-model:value="formModel.title" placeholder="如：Vue3 组合式 API 速查 / 第一章 龙裔觉醒" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="分类" name="category">
              <a-select v-model:value="formModel.category" show-search>
                <a-select-option v-for="o in categoryOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="状态">
              <a-select v-model:value="formModel.status">
                <a-select-option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="标签">
              <a-input v-model:value="formModel.tags" placeholder="逗号分隔" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="本地文件路径（可选）">
              <a-input v-model:value="formModel.filePath" placeholder="如 D:/workbench-docs/skill/vue3.md" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="Markdown 正文">
              <a-textarea v-model:value="formModel.content" :rows="6" placeholder="输入 Markdown 正文" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="editorVisible"
      :title="`${editorTitle || '文档'} - 编辑与预览`"
      :footer="null"
      :width="1280"
      :body-style="{ padding: 0, height: '74vh', display: 'flex', flexDirection: 'column' }"
      class="md-editor-modal"
    >
      <div class="md-editor-header">
        <a-radio-group v-model:value="editorSplit" button-style="solid" size="small">
          <a-radio-button value="edit">编辑</a-radio-button>
          <a-radio-button value="split">双栏</a-radio-button>
          <a-radio-button value="preview">预览</a-radio-button>
        </a-radio-group>
        <a-space>
          <a-button size="small" @click="downloadMd"><DownloadOutlined /> 下载 .md</a-button>
          <a-button type="primary" size="small" :loading="editorSaving" @click="editorSave"><SaveOutlined /> 保存</a-button>
        </a-space>
      </div>
      <div class="md-editor-body" :class="'mode-' + editorSplit">
        <div v-if="editorSplit !== 'preview'" class="md-edit-pane">
          <textarea v-model="editorContent" spellcheck="false" class="md-textarea"></textarea>
        </div>
        <div v-if="editorSplit !== 'edit'" class="md-preview-pane">
          <div class="md-preview" v-html="editorPreview"></div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.doc-page { display: flex; flex: 1; min-height: 0; overflow: hidden; }

.doc-sider {
  width: 240px; flex-shrink: 0; border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column; background: var(--color-bg-card);
}
.sider-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 10px; }
.sider-title { font-weight: 600; font-size: 14px; color: var(--color-text); display: flex; align-items: center; gap: 6px; }
.sider-search { padding: 0 14px 10px; }
.sider-tree { flex: 1; overflow: auto; padding: 0 6px 10px; }
.sider-tree :deep(.ant-tree) { background: transparent; color: var(--color-text-secondary); }
.sider-tree :deep(.ant-tree-node-selected .ant-tree-node-content-wrapper) {
  background: var(--color-primary-soft) !important;
  color: var(--color-text) !important;
  border-radius: 6px;
}
.sider-tree :deep(.ant-tree-node-content-wrapper:hover) {
  background: var(--color-bg-hover) !important;
  border-radius: 6px;
}
.sider-tree :deep(.ant-tree-node-content-wrapper) { width: 100%; }
.tree-node-title { font-size: 13px; }

.ctx-menu {
  position: fixed; z-index: 9999; background: var(--color-bg-elevated); border: 1px solid var(--color-border-strong);
  border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); padding: 4px 0; min-width: 140px;
}
.ctx-item { padding: 7px 14px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; color: var(--color-text-secondary); }
.ctx-item:hover { background: var(--color-bg-hover); color: var(--color-text); }
.ctx-danger { color: var(--color-error); }
.ctx-danger:hover { background: var(--color-error-soft); }

.doc-main { flex: 1; overflow: hidden; min-height: 0; background: var(--color-bg); }
.main-inner {
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-row { margin: 0; }
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  transition: all 0.25s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--accent);
}
.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}
.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}
.stat-info { flex: 1; min-width: 0; }
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}
.stat-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-left: 3px;
}
.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 5px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}
.title-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
}
.sub-count {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin-left: 4px;
}
.section-actions { display: flex; gap: 8px; }

.category-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
@media (max-width: 1300px) {
  .category-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 720px) {
  .category-grid { grid-template-columns: repeat(2, 1fr); }
}
.category-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
}
.category-card:hover {
  transform: translateY(-3px);
  border-color: var(--cat-color);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
}
.category-card.active {
  background: var(--cat-bg);
  border-color: var(--cat-color);
  box-shadow: 0 0 0 2px var(--cat-color) inset;
}
.cat-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--cat-color);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cat-bg);
  color: var(--cat-color);
  font-size: 20px;
}
.cat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tag-chip {
  padding: 5px 14px;
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.tag-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft);
}
.tag-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.note-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.note-card {
  display: flex;
  gap: 10px;
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  transition: all 0.25s ease;
}
.note-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}
.note-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.note-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.doc-icon {
  font-size: 22px;
  color: var(--color-primary);
  flex-shrink: 0;
}
.note-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.note-cat-tag {
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 10px;
  flex-shrink: 0;
}
.note-abstract {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.note-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-warning-soft);
  color: var(--color-warning);
  font-weight: 500;
}
.status-tag[data-status="已完成"] { background: var(--color-success-soft); color: var(--color-success); }
.status-tag[data-status="撰写中"] { background: var(--color-info-soft); color: var(--color-info); }
.status-tag[data-status="草稿"] { background: var(--color-bg-elevated); color: var(--color-text-secondary); }

.note-actions {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}
.note-card:hover .note-actions {
  opacity: 1;
}

.note-empty {
  padding: 56px 24px;
  text-align: center;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
}
.empty-icon { font-size: 52px; margin-bottom: 10px; }
.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 5px;
}
.empty-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.md-editor-modal :deep(.ant-modal-body) { padding: 0; }
.md-editor-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 18px; border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
}
.md-editor-body { flex: 1; display: flex; min-height: 0; }
.md-editor-body.mode-edit .md-edit-pane { width: 100%; }
.md-editor-body.mode-edit .md-preview-pane { display: none; }
.md-editor-body.mode-preview .md-edit-pane { display: none; }
.md-editor-body.mode-preview .md-preview-pane { width: 100%; }
.md-editor-body.mode-split .md-edit-pane,
.md-editor-body.mode-split .md-preview-pane { width: 50%; border-right: 1px solid var(--color-border); }
.md-editor-body.mode-split .md-preview-pane { border-right: none; }
.md-edit-pane { display: flex; min-height: 0; }
.md-textarea {
  flex: 1; width: 100%; padding: 16px; border: none; outline: none; resize: none;
  font-family: Consolas, Monaco, monospace; font-size: 14px; line-height: 1.7;
  background: var(--color-bg); color: var(--color-text);
}
.md-preview-pane { overflow: auto; }
.md-preview { padding: 16px 24px; line-height: 1.75; color: var(--color-text); }
.md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4 { margin: 16px 0 8px; font-weight: 600; }
.md-preview h1 { font-size: 24px; border-bottom: 1px solid var(--color-border); padding-bottom: 6px; }
.md-preview h2 { font-size: 20px; border-bottom: 1px solid var(--color-border); padding-bottom: 4px; }
.md-preview h3 { font-size: 17px; }
.md-preview p { margin: 6px 0; }
.md-preview ul, .md-preview ol { padding-left: 24px; margin: 6px 0; }
.md-preview blockquote { margin: 8px 0; padding: 8px 14px; border-left: 4px solid var(--color-primary); background: var(--color-primary-soft); border-radius: 0 4px 4px 0; }
.md-preview code.md-inline-code { padding: 2px 6px; background: var(--color-bg-elevated); border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 13px; color: var(--color-primary); }
.md-preview pre.md-fence { background: #1e1e1e; color: #d4d4d4; padding: 12px 14px; border-radius: 6px; overflow: auto; margin: 8px 0; font-family: Consolas, Monaco, monospace; font-size: 13px; }
.md-preview pre.md-fence code { background: none; color: inherit; }
.md-preview hr { border: none; border-top: 1px solid var(--color-border); margin: 16px 0; }
.md-preview a { color: var(--color-primary); }
.md-preview img { max-width: 100%; border-radius: 4px; margin: 6px 0; }

:deep(.ant-modal),
:deep(.ant-modal-title),
:deep(.ant-modal-content) {
  background: var(--color-bg-card);
  color: var(--color-text);
}
:deep(.ant-modal-header) {
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
}
:deep(.ant-modal-footer) {
  border-top: 1px solid var(--color-border);
}
:deep(.ant-form-item-label > label) {
  color: var(--color-text-secondary);
}
:deep(.ant-input),
:deep(.ant-select-selector),
:deep(.ant-input-number),
:deep(.ant-picker) {
  background: var(--color-bg-elevated) !important;
  border-color: var(--color-border-strong) !important;
  color: var(--color-text) !important;
}
:deep(.ant-input::placeholder) {
  color: var(--color-text-tertiary);
}
:deep(.ant-spin-nested-loading > div > .ant-spin .ant-spin-dot i) {
  background-color: var(--color-primary);
}
:deep(.ant-tag) {
  border: none !important;
}
:deep(.ant-btn-text) {
  color: var(--color-text-secondary) !important;
}
:deep(.ant-btn-text:hover) {
  color: var(--color-text) !important;
  background: var(--color-bg-hover) !important;
}
</style>
