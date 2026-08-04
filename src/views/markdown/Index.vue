<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import {
  UploadOutlined, DownloadOutlined, FileMarkdownOutlined,
  EditOutlined, DeleteOutlined, CloudDownloadOutlined,
  SaveOutlined, EyeOutlined, FormOutlined,
  FileTextOutlined, FileExcelOutlined, FilePdfOutlined,
  FileWordOutlined, FolderOpenOutlined, RocketOutlined
} from '@ant-design/icons-vue'
import {
  message, Modal, Form, Input, Select, Button, Space,
  Upload, Tag, Radio, Tooltip
} from 'ant-design-vue'
import { markdownApi } from '@/api/modules'
import type { MarkdownDoc } from '@/api/modules'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const categoryOptions = [
  { label: 'Skill 技能', value: 'Skill' },
  { label: '小说', value: '小说' },
  { label: '教程', value: '教程' },
  { label: '技术文档', value: '技术文档' },
  { label: '读书笔记', value: '读书笔记' },
  { label: '日记随笔', value: '日记随笔' },
  { label: 'Word', value: 'Word' },
  { label: 'Excel', value: 'Excel' },
  { label: 'PDF', value: 'PDF' },
  { label: 'TXT', value: 'TXT' },
  { label: '其他', value: '其他' }
]
const statusOptions = [
  { label: '草稿', value: '草稿' },
  { label: '撰写中', value: '撰写中' },
  { label: '已完成', value: '已完成' },
  { label: '已归档', value: '已归档' }
]
const categoryColorMap: Record<string, string> = {
  'Skill': 'geekblue', '小说': 'magenta', '教程': 'green',
  '技术文档': 'blue', '读书笔记': 'orange', '日记随笔': 'purple',
  'Word': 'red', 'Excel': 'green', 'PDF': 'red', 'TXT': 'default',
  '其他': 'default'
}
const statusColorMap: Record<string, string> = {
  '草稿': 'default', '撰写中': 'processing', '已完成': 'success', '已归档': 'warning'
}
const categoryIcon: Record<string, any> = {
  'Skill': FileMarkdownOutlined, '小说': FormOutlined, '教程': EyeOutlined,
  '技术文档': FileTextOutlined, '读书笔记': EyeOutlined, '日记随笔': FormOutlined,
  'Word': FileWordOutlined, 'Excel': FileExcelOutlined, 'PDF': FilePdfOutlined,
  'TXT': FileTextOutlined, '其他': FileTextOutlined
}

// ========== 列表数据 ==========
const loading = ref(false)
const dataList = ref<MarkdownDoc[]>([])
const total = ref(0)
const current = ref(1)
const size = ref(10)

const searchTitle = ref('')
const searchCategory = ref<string | undefined>(undefined)
const searchStatus = ref<string | undefined>(undefined)

const filteredData = computed(() => {
  return dataList.value.filter(r => {
    if (searchTitle.value && !r.title.includes(searchTitle.value)) return false
    if (searchCategory.value && r.category !== searchCategory.value) return false
    if (searchStatus.value && r.status !== searchStatus.value) return false
    return true
  })
})

const loadData = async () => {
  loading.value = true
  try {
    const res: any = await markdownApi.page({ current: current.value, size: size.value })
    dataList.value = (res as any).records || []
    total.value = toInt((res as any).total, 0)
  } finally {
    loading.value = false
  }
}
const toInt = (v: any, fb: number): number => {
  const n = Number(v); return isNaN(n) ? fb : n
}
onMounted(loadData)

// ========== 上传 ==========
const uploadProps = {
  name: 'file',
  multiple: true,
  accept: '.md,.markdown,.txt,.docx,.doc,.xlsx,.xls,.pdf',
  customRequest: async (options: any) => {
    try {
      await markdownApi.upload(options.file)
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

const openAdd = () => {
  isEdit.value = false
  formModel.value = { category: 'Skill', status: '草稿', content: '# 新文档\n\n在此开始编写...\n' }
  formVisible.value = true
  nextTick(() => formRef.value?.resetFields?.())
}
const openEdit = async (r: MarkdownDoc) => {
  isEdit.value = true
  formModel.value = { ...r }
  formVisible.value = true
}
const saveForm = async () => {
  try {
    await formRef.value?.validate()
  } catch { return }
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
  } finally {
    formLoading.value = false
  }
}

// ========== 删除 ==========
const handleDelete = (r: MarkdownDoc) => {
  Modal.confirm({
    title: `确认删除「${r.title}」？`,
    content: '删除后不可恢复',
    okText: '删除', okType: 'danger', cancelText: '取消',
    onOk: async () => {
      await markdownApi.remove(r.id as number)
      message.success('已删除')
      await loadData()
    }
  })
}

// ========== 下载 / 打开外部程序 ==========
const downloadFile = (r: MarkdownDoc) => {
  if (!r.id) return
  // 通过带 token 的 fetch 下载（需鉴权）
  const url = `/markdown/download/${r.id}`
  fetch(url, { headers: { Authorization: authStore.token || '' } })
    .then(res => res.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const ext = resolveExt(r.category, r.filePath)
      a.download = `${r.title || 'doc'}${ext}`
      document.body.appendChild(a); a.click(); a.remove()
    })
    .catch(e => {
      // 降级：直接打开新标签下载（需要后端鉴权支持）
      window.open(url, '_blank')
    })
}
const resolveExt = (cat?: string, path?: string) => {
  if (path) {
    const i = path.lastIndexOf('.')
    if (i >= 0) return path.substring(i)
  }
  switch (cat) {
    case 'Word': return '.docx'
    case 'Excel': return '.xlsx'
    case 'PDF': return '.pdf'
    case 'TXT': return '.txt'
    default: return '.md'
  }
}
const openTypora = async (r: MarkdownDoc) => {
  try {
    const msg: any = await markdownApi.openTypora(r.id as number)
    message.success(msg || 'Typora 打开中')
  } catch (e: any) { message.error(`打开失败：${e?.message || e}`) }
}
const openDefault = async (r: MarkdownDoc, label: string = '本地应用') => {
  try {
    const msg: any = await markdownApi.openDefault(r.id as number)
    message.success(msg || `${label} 打开中`)
  } catch (e: any) { message.error(`打开失败：${e?.message || e}`) }
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
watch(editorContent, val => {
  editorPreview.value = renderMd(val)
})

// 轻量 Markdown 渲染（不引重型库，支持常见语法：标题/粗体/斜体/代码块/行内代码/列表/链接/图片/分割线/引用）
function renderMd(src: string): string {
  if (!src) return ''
  const esc = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inCode = false; let codeLang = ''; const codeBuf: string[] = []
  let inQuote = false; const quoteBuf: string[] = []
  let inUl = false; let inOl = false
  const pushListClose = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }
  const pushQuoteClose = () => {
    if (inQuote) {
      out.push(`<blockquote>${renderMdInline(quoteBuf.join('\n'))}</blockquote>`)
      quoteBuf.length = 0; inQuote = false
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // code fence
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      if (!inCode) {
        pushListClose(); pushQuoteClose()
        inCode = true; codeLang = fence[1] || ''; codeBuf.length = 0
      } else {
        out.push(`<pre class="md-fence"><code class="lang-${esc(codeLang)}">${esc(codeBuf.join('\n'))}</code></pre>`)
        inCode = false; codeLang = ''; codeBuf.length = 0
      }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }

    // blank line
    if (/^\s*$/.test(line)) {
      pushListClose(); pushQuoteClose(); continue
    }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      pushListClose(); pushQuoteClose()
      out.push(`<h${h[1].length}>${renderMdInline(h[2])}</h${h[1].length}>`)
      continue
    }

    // hr
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      pushListClose(); pushQuoteClose(); out.push('<hr/>'); continue
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      pushListClose()
      inQuote = true; quoteBuf.push(line.replace(/^>\s?/, '')); continue
    } else {
      pushQuoteClose()
    }

    // unordered list
    const ulm = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ulm) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul>'); inUl = true }
      out.push(`<li>${renderMdInline(ulm[1])}</li>`); continue
    }
    // ordered list
    const olm = line.match(/^\s*\d+\.\s+(.*)$/)
    if (olm) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol>'); inOl = true }
      out.push(`<li>${renderMdInline(olm[1])}</li>`); continue
    }
    pushListClose()

    // paragraph
    out.push(`<p>${renderMdInline(line)}</p>`)
  }
  if (inCode) out.push(`<pre class="md-fence"><code>${esc(codeBuf.join('\n'))}</code></pre>`)
  pushListClose(); pushQuoteClose()
  return out.join('\n')
}
function renderMdInline(s: string): string {
  // 转义
  let r = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 图片 ![alt](url)
  r = r.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, alt, url) => `<img src="${url}" alt="${alt}" style="max-width:100%"/>`)
  // 链接 [text](url)
  r = r.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`)
  // 行内代码
  r = r.replace(/`([^`]+)`/g, (_m, c) => `<code class="md-inline-code">${c}</code>`)
  // 加粗
  r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  r = r.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  // 斜体
  r = r.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  r = r.replace(/_([^_]+)_/g, '<em>$1</em>')
  // 删除线
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
  } finally {
    editorSaving.value = false
  }
}
const downloadMd = () => {
  const blob = new Blob([editorContent.value], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${editorTitle.value || 'doc'}.md`
  document.body.appendChild(a); a.click(); a.remove()
}
</script>

<template>
  <div class="markdown-page">
    <!-- 搜索条 + 按钮 -->
    <div class="toolbar">
      <a-form layout="inline" :model="{ title: searchTitle, category: searchCategory, status: searchStatus }">
        <a-form-item label="标题">
          <a-input v-model:value="searchTitle" placeholder="搜索标题" allow-clear style="width:200px" />
        </a-form-item>
        <a-form-item label="分类">
          <a-select v-model:value="searchCategory" placeholder="全部分类" allow-clear style="width:160px">
            <a-select-option v-for="o in categoryOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="searchStatus" placeholder="全部状态" allow-clear style="width:140px">
            <a-select-option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
      <div class="toolbar-actions">
        <Upload v-bind="uploadProps" :show-upload-list="false">
          <a-button type="dashed"><UploadOutlined /> 上传文件（md/Word/Excel/PDF/TXT）</a-button>
        </Upload>
        <a-button type="primary" @click="openAdd"><FileMarkdownOutlined /> 新建文档</a-button>
      </div>
    </div>

    <!-- 列表 -->
    <a-table
      :columns="[
        { title: '文档标题', dataIndex: 'title', width: 260, ellipsis: true, scopedSlots: { customRender: 'title' } },
        { title: '分类', dataIndex: 'category', width: 120, align: 'center', scopedSlots: { customRender: 'category' } },
        { title: '标签', dataIndex: 'tags', width: 160, ellipsis: true },
        { title: '状态', dataIndex: 'status', width: 100, align: 'center', scopedSlots: { customRender: 'status' } },
        { title: '字数', dataIndex: 'wordCount', width: 90, align: 'right', scopedSlots: { customRender: 'wc' } },
        { title: '本地文件', dataIndex: 'filePath', width: 220, ellipsis: true, scopedSlots: { customRender: 'path' } },
        { title: '更新时间', dataIndex: 'updateTime', width: 180, align: 'center' },
        { title: '操作', dataIndex: 'action', width: 360, fixed: 'right', align: 'center', scopedSlots: { customRender: 'action' } }
      ]"
      :data-source="filteredData"
      :loading="loading"
      :pagination="{
        current, pageSize: size, total, showSizeChanger: true,
        showTotal: (t: number) => `共 ${t} 条`
      }"
      row-key="id"
      @change="(pg: any) => { current = pg.current; size = pg.pageSize; loadData() }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'title'">
          <a class="doc-title" @click="openEditor(record)">
            <component :is="categoryIcon[record.category] || FileTextOutlined" style="margin-right:6px"/>
            {{ record.title }}
          </a>
        </template>
        <template v-else-if="column.dataIndex === 'category'">
          <a-tag :color="categoryColorMap[record.category] || 'default'">{{ record.category || '-' }}</a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          <a-tag :color="statusColorMap[record.status] || 'default'">{{ record.status || '草稿' }}</a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'wc'">
          {{ record.wordCount ? `${record.wordCount} 字` : '-' }}
        </template>
        <template v-else-if="column.dataIndex === 'path'">
          <template v-if="record.filePath">
            <Tooltip :title="record.filePath">
              <span class="path-text">📁 {{ record.filePath.split(/[\\/]/).pop() }}</span>
            </Tooltip>
          </template>
          <a-button v-else type="link" size="small" @click="saveToFile(record)"><CloudDownloadOutlined /> 写入本地</a-button>
        </template>
        <template v-else-if="column.dataIndex === 'action'">
          <a-space :size="4" wrap>
            <a-button type="link" size="small" @click="openEditor(record)"><EyeOutlined /> 编辑/预览</a-button>
            <a-button type="link" size="small" @click="openEdit(record)"><EditOutlined /> 元信息</a-button>
            <a-button type="link" size="small" @click="downloadFile(record)"><DownloadOutlined /> 下载</a-button>
            <a-tooltip v-if="record.category === 'Skill' || record.category === 'TXT' || record.category === '其他' || !record.category" title="用 Typora 打开">
              <a-button type="link" size="small" @click="openTypora(record)"><FolderOpenOutlined /> Typora</a-button>
            </a-tooltip>
            <a-tooltip v-if="record.category === 'Word' || record.category === 'Excel' || record.category === 'PDF'" :title="`用本地${record.category}打开`">
              <a-button type="link" size="small" @click="openDefault(record, record.category!)"><RocketOutlined /> {{ record.category }}</a-button>
            </a-tooltip>
            <a-tooltip v-if="record.category !== 'Word' && record.category !== 'Excel' && record.category !== 'PDF' && !(record.category === 'Skill' || record.category === 'TXT' || record.category === '其他' || !record.category)" title="用默认程序打开">
              <a-button type="link" size="small" @click="openDefault(record)"><FolderOpenOutlined /> 默认程序</a-button>
            </a-tooltip>
            <a-tooltip v-if="!record.filePath || (record.category === 'Skill' || record.category === '小说' || record.category === '教程' || record.category === '技术文档' || record.category === '读书笔记' || record.category === '日记随笔' || record.category === 'TXT')" title="保存正文到本地文件">
              <a-button type="link" size="small" @click="saveToFile(record)"><SaveOutlined /> 写入本地</a-button>
            </a-tooltip>
            <a-button type="link" danger size="small" @click="handleDelete(record)"><DeleteOutlined /> 删除</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

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
              <a-select v-model:value="formModel.category">
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
              <a-input v-model:value="formModel.tags" placeholder="多个标签用逗号分隔" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="本地文件路径（可选）">
              <a-input v-model:value="formModel.filePath" placeholder="如 D:/workbench-docs/skill/vue3-cheatsheet.md" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="Markdown 正文">
              <a-textarea
                v-model:value="formModel.content"
                :rows="8"
                placeholder="在此输入 Markdown 正文内容，支持代码块、列表、标题等语法"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Markdown 编辑器 + 预览弹窗 -->
    <a-modal
      v-model:open="editorVisible"
      :title="`${editorTitle || '文档'} - 编辑与预览`"
      :footer="null"
      :width="1280"
      :body-style="{ padding: 0, height: '72vh', display: 'flex', flexDirection: 'column' }"
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
          <a-button type="primary" size="small" :loading="editorSaving" @click="editorSave"><SaveOutlined /> 保存到后端</a-button>
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
.markdown-page { padding: 18px 24px; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
.toolbar-actions { display: flex; gap: 8px; }
.doc-title { color: var(--md-link, #1677ff); cursor: pointer; font-weight: 500; }
.doc-title:hover { text-decoration: underline; }
.path-text { color: #666; font-size: 12px; }

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
  font-family: Consolas, Monaco, "Courier New", monospace; font-size: 14px; line-height: 1.7;
  background: var(--color-bg, #fff); color: var(--color-text, #222);
}
.md-preview-pane { overflow: auto; }
.md-preview { padding: 18px 24px; line-height: 1.75; color: var(--color-text, #222); }
.md-preview h1, .md-preview h2, .md-preview h3, .md-preview h4 { margin: 18px 0 10px; font-weight: 600; }
.md-preview h1 { font-size: 26px; border-bottom: 1px solid var(--color-border, #eee); padding-bottom: 6px; }
.md-preview h2 { font-size: 22px; border-bottom: 1px solid var(--color-border, #eee); padding-bottom: 4px; }
.md-preview h3 { font-size: 18px; }
.md-preview h4 { font-size: 16px; }
.md-preview p { margin: 8px 0; }
.md-preview ul, .md-preview ol { padding-left: 24px; margin: 8px 0; }
.md-preview li { margin: 3px 0; }
.md-preview blockquote {
  margin: 10px 0; padding: 8px 14px; border-left: 4px solid #1677ff;
  background: var(--color-bg-card, #f0f7ff); color: #444; border-radius: 0 4px 4px 0;
}
.md-preview code.md-inline-code {
  padding: 2px 6px; background: #f5f5f5; border-radius: 4px;
  font-family: Consolas, Monaco, monospace; font-size: 13px; color: #c7254e;
}
.md-preview pre.md-fence {
  background: #1e1e1e; color: #d4d4d4; padding: 14px 16px; border-radius: 6px;
  overflow: auto; margin: 10px 0;
  font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.6;
}
.md-preview pre.md-fence code { background: none; padding: 0; color: inherit; }
.md-preview hr { border: none; border-top: 1px solid var(--color-border, #eee); margin: 18px 0; }
.md-preview a { color: #1677ff; }
.md-preview img { border-radius: 4px; margin: 8px 0; }
</style>
