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
  CaretRightOutlined
} from '@ant-design/icons-vue'
import { message, Modal, Upload, Tag, Tooltip, Input, Empty } from 'ant-design-vue'
import { markdownApi, docCategoryApi } from '@/api/modules'
import type { MarkdownDoc, CategoryTreeNode } from '@/api/modules'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// ========== 分类树（数据库持久化） ==========
// 后端返回的根节点数组；为统一展示「全部文档」虚拟根，包一层
const ROOT_KEY = 'root'
const treeData = ref<CategoryTreeNode[]>([])
const selectedKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])

// 包装成含「全部文档」虚拟根的展示树
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
    // 默认展开虚拟根
    if (!expandedKeys.value.includes(ROOT_KEY)) {
      expandedKeys.value = [...expandedKeys.value, ROOT_KEY]
    }
  } catch (e: any) {
    message.error(`加载分类失败：${e?.message || e}`)
    treeData.value = []
  }
}

// 树右键菜单
const contextMenu = ref<{ visible: boolean; x: number; y: number; node: CategoryTreeNode | null }>({
  visible: false, x: 0, y: 0, node: null
})
const onTreeRightClick = ({ event, node }: { event: MouseEvent; node: any }) => {
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, node: node }
}
const closeContextMenu = () => { contextMenu.value.visible = false }

// 新增节点
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
        // 确保父节点展开，子节点才能显示
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

// 当前选中的分类（从节点 title 取分类名）
const selectedCategory = computed(() => {
  const key = selectedKeys.value[0]
  if (!key || key === ROOT_KEY) return undefined
  // key 格式：cat-{id}
  const findNode = (nodes: CategoryTreeNode[]): CategoryTreeNode | undefined => {
    for (const n of nodes) {
      if (n.key === key) return n
      if (n.children) { const f = findNode(n.children); if (f) return f }
    }
    return undefined
  }
  return findNode(displayTree.value)?.title
})

// ========== 文档列表 ==========
const loading = ref(false)
const dataList = ref<MarkdownDoc[]>([])
const searchTitle = ref('')

// 前端分页（每页 20 条）
const mdPage = ref(1)
const mdPageSize = 20

// 搜索时重置到第 1 页
watch(searchTitle, () => { mdPage.value = 1 })

const filteredData = computed(() => {
  const filtered = dataList.value.filter(r => {
    if (searchTitle.value && !r.title?.toLowerCase().includes(searchTitle.value.toLowerCase())) return false
    if (selectedCategory.value && r.category !== selectedCategory.value) return false
    return true
  })
  const start = (mdPage.value - 1) * mdPageSize
  return filtered.slice(start, start + mdPageSize)
})
const filteredTotal = computed(() => {
  return dataList.value.filter(r => {
    if (searchTitle.value && !r.title?.toLowerCase().includes(searchTitle.value.toLowerCase())) return false
    if (selectedCategory.value && r.category !== selectedCategory.value) return false
    return true
  }).length
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await markdownApi.list()
    dataList.value = res || []
    mdPage.value = 1
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
  mdPage.value = 1
}

// ========== 上传 ==========
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

// ========== 新建/编辑表单 ==========
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
  return opts
})

const statusOptions = [
  { label: '草稿', value: '草稿' },
  { label: '撰写中', value: '撰写中' },
  { label: '已完成', value: '已完成' },
  { label: '已归档', value: '已归档' }
]
const categoryColorMap: Record<string, string> = {
  'Skill 技能': 'geekblue', '小说': 'magenta', '教程': 'green',
  '技术文档': 'blue', '读书笔记': 'orange', '日记随笔': 'purple',
  'Word': 'red', 'Excel': 'green', 'PDF': 'red', 'TXT': 'default',
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

// ========== 下载 / 打开外部程序 ==========
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

// ========== 内置 Markdown 编辑器 + 预览 ==========
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

// ========== 选中文档 ==========
const selectedDoc = ref<MarkdownDoc | null>(null)
const selectDoc = (r: MarkdownDoc) => { selectedDoc.value = r; openEditor(r) }

onMounted(loadTree)
</script>

<template>
  <div class="doc-page">
    <!-- 左侧：分类树 -->
    <div class="doc-sider">
      <div class="sider-header">
        <span class="sider-title"><FolderOutlined /> 文档分类</span>
        <a-tooltip title="新增根分类">
          <a-button type="text" size="small" @click="addRootNode"><FolderAddOutlined /></a-button>
        </a-tooltip>
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
              <FileMarkdownOutlined v-else style="color:#1677ff;margin-right:4px" />
              {{ title }}
            </span>
          </template>
        </a-tree>
      </div>
      <!-- 右键菜单 -->
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

    <!-- 右侧：文档列表 + 操作 -->
    <div class="doc-main">
      <!-- 工具栏 -->
      <div class="doc-toolbar">
        <div class="toolbar-left">
          <span class="current-cat">
            <FolderOutlined /> {{ selectedCategory || '全部文档' }}
            <span class="doc-count">{{ filteredTotal }} 篇</span>
          </span>
        </div>
        <div class="toolbar-right">
          <a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button>
          <Upload v-bind="uploadProps" :show-upload-list="false">
            <a-button size="small" type="dashed"><UploadOutlined /> 上传</a-button>
          </Upload>
          <a-button size="small" type="primary" @click="openAdd"><FileAddOutlined /> 新建文档</a-button>
        </div>
      </div>

      <!-- 文档列表 -->
      <div class="doc-list" v-if="filteredData.length">
        <div
          v-for="r in filteredData"
          :key="r.id"
          class="doc-item"
          :class="{ active: selectedDoc?.id === r.id }"
          @click="selectDoc(r)"
        >
          <div class="doc-item-left">
            <component :is="categoryIcon[r.category || '其他'] || FileTextOutlined" class="doc-item-icon" />
            <div class="doc-item-info">
              <div class="doc-item-title">{{ r.title }}</div>
              <div class="doc-item-meta">
                <a-tag v-if="r.category" :color="categoryColorMap[r.category] || 'default'" style="font-size:11px">{{ r.category }}</a-tag>
                <a-tag v-if="r.status" :color="statusColorMap[r.status] || 'default'" style="font-size:11px">{{ r.status }}</a-tag>
                <span v-if="r.wordCount" class="meta-text">{{ r.wordCount }} 字</span>
                <span class="meta-text">{{ r.updateTime || r.createTime }}</span>
              </div>
            </div>
          </div>
          <div class="doc-item-actions" @click.stop>
            <a-tooltip title="下载"><a-button type="text" size="small" @click="downloadFile(r)"><DownloadOutlined /></a-button></a-tooltip>
            <a-tooltip title="Typora打开" v-if="['Skill 技能','TXT','其他'].includes(r.category || '') || !r.category">
              <a-button type="text" size="small" @click="openTypora(r)"><FolderOpenOutlined /></a-button>
            </a-tooltip>
            <a-tooltip title="本地打开" v-if="['Word','Excel','PDF'].includes(r.category || '')">
              <a-button type="text" size="small" @click="openDefault(r, r.category!)"><RocketOutlined /></a-button>
            </a-tooltip>
            <a-tooltip title="写入本地"><a-button type="text" size="small" @click="saveToFile(r)"><CloudDownloadOutlined /></a-button></a-tooltip>
            <a-tooltip title="元信息"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></a-tooltip>
            <a-tooltip title="删除"><a-button type="text" size="small" danger @click="handleDelete(r)"><DeleteOutlined /></a-button></a-tooltip>
          </div>
        </div>
      </div>
      <div v-else class="doc-empty">
        <Empty description="暂无文档，点击右上角新建或上传" />
      </div>
      <!-- 分页器 -->
      <div class="doc-pagination" v-if="filteredTotal > mdPageSize">
        <a-pagination
          v-model:current="mdPage"
          :page-size="mdPageSize"
          :total="filteredTotal"
          size="small"
          show-quick-jumper
          :show-total="(t: number) => `共 ${t} 篇`"
        />
      </div>
    </div>

    <!-- 新建/编辑元信息弹窗 -->
    <a-modal
      v-model:open="formVisible"
      :title="isEdit ? '编辑文档元信息' : '新建文档'"
      :confirm-loading="formLoading"
      ok-text="保存" cancel-text="取消"
      @ok="saveForm"
      :width="640"
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

    <!-- Markdown 编辑器弹窗 -->
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

/* 左侧 */
.doc-sider {
  width: 240px; flex-shrink: 0; border-right: 1px solid var(--color-border, #f0f0f0);
  display: flex; flex-direction: column; background: var(--color-bg-card, #fafafa);
}
.sider-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px 8px; }
.sider-title { font-weight: 600; font-size: 14px; color: var(--color-text, #222); }
.sider-search { padding: 0 14px 8px; }
.sider-tree { flex: 1; overflow: auto; padding: 0 6px; }
.sider-tree :deep(.ant-tree-node-content-wrapper) { width: 100%; }
.tree-node-title { font-size: 13px; }

/* 右键菜单 */
.ctx-menu {
  position: fixed; z-index: 9999; background: #fff; border: 1px solid #e8e8e8;
  border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 4px 0; min-width: 140px;
}
.ctx-item { padding: 6px 14px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; }
.ctx-item:hover { background: #f5f5f5; }
.ctx-danger { color: #ff4d4f; }

/* 右侧 */
.doc-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.doc-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 18px; border-bottom: 1px solid var(--color-border, #f0f0f0);
  flex-shrink: 0;
}
.toolbar-left { display: flex; align-items: center; }
.current-cat { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.doc-count { font-size: 12px; color: #999; font-weight: normal; }
.toolbar-right { display: flex; gap: 8px; }

/* 文档列表 */
.doc-list { flex: 1; overflow-y: auto; padding: 8px 12px; min-height: 0; }
.doc-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; margin-bottom: 6px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent; transition: all 0.2s;
}
.doc-item:hover { background: var(--color-bg-card, #f5f7fa); border-color: #e8e8e8; }
.doc-item.active { background: #e6f4ff; border-color: #91caff; }
.doc-item-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.doc-item-icon { font-size: 20px; color: #1677ff; flex-shrink: 0; }
.doc-item-info { flex: 1; min-width: 0; }
.doc-item-title {
  font-size: 14px; font-weight: 500; color: var(--color-text, #222);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.doc-item-meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.meta-text { font-size: 11px; color: #999; }
.doc-item-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.doc-empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.doc-pagination { padding: 8px 12px; border-top: 1px solid var(--color-border, #f0f0f0); display: flex; justify-content: flex-end; flex-shrink: 0; }

/* 编辑器 */
.md-editor-modal :deep(.ant-modal-body) { padding: 0; }
.md-editor-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 18px; border-bottom: 1px solid var(--color-border, #f0f0f0);
  background: var(--color-bg-card, #fafafa);
}
.md-editor-body { flex: 1; display: flex; min-height: 0; }
.md-editor-body.mode-edit .md-edit-pane { width: 100%; }
.md-editor-body.mode-edit .md-preview-pane { display: none; }
.md-editor-body.mode-preview .md-edit-pane { display: none; }
.md-editor-body.mode-preview .md-preview-pane { width: 100%; }
.md-editor-body.mode-split .md-edit-pane,
.md-editor-body.mode-split .md-preview-pane { width: 50%; border-right: 1px solid var(--color-border, #f0f0f0); }
.md-editor-body.mode-split .md-preview-pane { border-right: none; }
.md-edit-pane { display: flex; min-height: 0; }
.md-textarea {
  flex: 1; width: 100%; padding: 18px; border: none; outline: none; resize: none;
  font-family: Consolas, Monaco, monospace; font-size: 14px; line-height: 1.7;
  background: var(--color-bg, #fff); color: var(--color-text, #222);
}
.md-preview-pane { overflow: auto; }
.md-preview { padding: 18px 24px; line-height: 1.75; color: var(--color-text, #222); }
.md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4 { margin: 18px 0 10px; font-weight: 600; }
.md-preview h1 { font-size: 26px; border-bottom: 1px solid var(--color-border, #eee); padding-bottom: 6px; }
.md-preview h2 { font-size: 22px; border-bottom: 1px solid var(--color-border, #eee); padding-bottom: 4px; }
.md-preview h3 { font-size: 18px; }
.md-preview p { margin: 8px 0; }
.md-preview ul, .md-preview ol { padding-left: 24px; margin: 8px 0; }
.md-preview blockquote { margin: 10px 0; padding: 8px 14px; border-left: 4px solid #1677ff; background: #f0f7ff; border-radius: 0 4px 4px 0; }
.md-preview code.md-inline-code { padding: 2px 6px; background: #f5f5f5; border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 13px; color: #c7254e; }
.md-preview pre.md-fence { background: #1e1e1e; color: #d4d4d4; padding: 14px 16px; border-radius: 6px; overflow: auto; margin: 10px 0; font-family: Consolas, Monaco, monospace; font-size: 13px; }
.md-preview pre.md-fence code { background: none; color: inherit; }
.md-preview hr { border: none; border-top: 1px solid var(--color-border, #eee); margin: 18px 0; }
.md-preview a { color: #1677ff; }
.md-preview img { max-width: 100%; border-radius: 4px; margin: 8px 0; }
</style>
