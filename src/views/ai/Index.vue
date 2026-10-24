<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  ExperimentOutlined, BulbOutlined, ControlOutlined, RobotOutlined,
  ThunderboltOutlined, ClockCircleOutlined, SearchOutlined, ReloadOutlined,
  FileDoneOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { aiApi, type AiLab } from '@/api/modules'

const loading = ref(false)
const dataList = ref<AiLab[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: '提示词库', label: '提示词库', icon: BulbOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' },
  { key: '模型管理', label: '模型管理', icon: RobotOutlined, color: 'var(--color-primary)', bg: 'rgba(94, 106, 210, 0.15)' },
  { key: 'SD绘图', label: 'SD绘图', icon: ExperimentOutlined, color: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.15)' },
  { key: 'AI脚本', label: 'AI脚本', icon: ControlOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: 'AI自动化', label: 'AI自动化', icon: ThunderboltOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' }
]
const tagList = ['GPT-4o', 'GPT-4', 'Claude 3', 'DeepSeek', 'Ollama', 'SDXL', 'Flux', '效果佳']
const catColorMap: Record<string, string> = {
  '提示词库': '#FF9F0A', '模型管理': 'var(--color-primary)', 'SD绘图': '#BF5AF2',
  'AI脚本': '#0A84FF', 'AI自动化': '#34C759'
}
const modelColorMap: Record<string, string> = {
  'GPT-4o': '#34C759', 'GPT-4': '#0A84FF', 'Claude 3': '#FF9F0A',
  'DeepSeek': '#BF5AF2', 'Ollama': '#0A84FF', 'SDXL': '#FF375F', 'Flux': '#FF3B30'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime || r.date
    return t && dayjs(t).isAfter(monthStart)
  }).length
  const categorized = dataList.value.filter(r => r.category).length
  return { total, monthNew, categorized }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    const k = r.category || '提示词库'
    if (c[k] !== undefined) c[k]++; else c['提示词库']++
  })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + (r.content || '') + ' ' + (r.model || '')).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value && r.category !== selectedCategory.value) return false
  if (selectedTag.value) {
    const t = selectedTag.value.toLowerCase()
    const m = (r.model || '').toLowerCase()
    const md = (r.mood || '').toLowerCase()
    if (!m.includes(t) && !md.includes(t)) return false
  }
  return true
}))
const sorted = computed(() => [...filtered.value].sort((a, b) => {
  const ta = a.updateTime || a.createTime || a.date || ''
  const tb = b.updateTime || b.createTime || b.date || ''
  return tb.localeCompare(ta)
}))
const getAbstract = (r: AiLab) => {
  const t = (r.content || '').replace(/[#*`>\-]/g, '').trim()
  return t.length > 120 ? t.substring(0, 120) + '...' : t
}
const getTime = (r: AiLab) => {
  const t = r.updateTime || r.createTime || r.date
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}
const loadData = async () => {
  loading.value = true
  try { dataList.value = (await aiApi.list()) || [] }
  catch { dataList.value = [] }
  finally { loading.value = false }
}
onMounted(loadData)

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<AiLab>>({})
const rules = { title: [{ required: true, message: '请输入名称', trigger: 'blur' }] }
const categoryOptions = [
  { label: '提示词库（Prompt）', value: '提示词库' },
  { label: '模型管理（Ollama等）', value: '模型管理' },
  { label: 'SD绘图工程', value: 'SD绘图' },
  { label: 'AI自动化脚本', value: 'AI脚本' },
  { label: 'AI工作流/Agent', value: 'AI自动化' }
]
const modelOptions = [
  { label: 'GPT-4o', value: 'GPT-4o' }, { label: 'GPT-4 Turbo', value: 'GPT-4' },
  { label: 'Claude 3 Opus/Sonnet', value: 'Claude 3' }, { label: 'DeepSeek V3', value: 'DeepSeek' },
  { label: '本地 Ollama 模型', value: 'Ollama' }, { label: 'Stable Diffusion XL', value: 'SDXL' },
  { label: 'Flux.1', value: 'Flux' }, { label: '其他模型', value: '其他' }
]
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', category: '提示词库', model: 'GPT-4o', date: dayjs().format('YYYY-MM-DD'), mood: '', content: '' })
  delete form.id
  modalVisible.value = true
}
const openEdit = (r: AiLab) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  try {
    if (isEdit.value && form.id) await aiApi.update({ ...form } as AiLab), message.success('更新成功')
    else await aiApi.add({ ...form } as AiLab), message.success('新增成功')
    modalVisible.value = false; await loadData()
  } catch (e: any) { message.error(e?.message || '保存失败') }
}
const del = (r: AiLab) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => { await aiApi.remove(r.id as number); message.success('已删除'); await loadData() }
})
</script>

<template>
  <div class="p">
    <a-row :gutter="16" class="srow">
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'var(--color-primary)','--as':'rgba(94,106,210,0.15)' }"><div class="si"><ExperimentOutlined /></div><div class="sif"><div class="sv">{{ stats.total }}<span class="su">条</span></div><div class="sl">AI实验总数</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }"><div class="si"><RiseOutlined /></div><div class="sif"><div class="sv">{{ stats.monthNew }}<span class="su">条</span></div><div class="sl">本月新增</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF9F0A','--as':'rgba(255,159,10,0.15)' }"><div class="si"><AuditOutlined /></div><div class="sif"><div class="sv">{{ stats.categorized }}<span class="su">条</span></div><div class="sl">已分类</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">实验分类</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建实验</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><ExperimentOutlined style="color:var(--color-primary);margin-right:6px" />{{ selectedCategory || '全部实验' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索标题/模型" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:var(--color-text-tertiary)" /></template></a-input>
    </div>
    <div class="tr">
      <div v-for="t in tagList" :key="t" class="tc" :class="{ active: selectedTag === t }" @click="selectedTag = selectedTag === t ? null : t">{{ t }}</div>
    </div>
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="r in sorted" :key="r.id" class="nc">
          <div class="nm" @click="openEdit(r)">
            <div class="nh"><h4 class="nt">{{ r.title }}</h4>
              <Tag v-if="r.category" :color="catColorMap[r.category] || 'default'" class="nct">{{ r.category }}</Tag>
              <Tag v-if="r.model" :color="modelColorMap[r.model] || 'default'" class="nct">{{ r.model }}</Tag>
            </div>
            <div class="na">{{ getAbstract(r) || '暂无内容' }}</div>
            <div class="nme">
              <span class="mi"><ClockCircleOutlined /> {{ getTime(r) }}</span>
              <span v-if="r.date" class="mi">📅 {{ r.date }}</span>
              <span v-if="r.mood" class="mi mt">{{ r.mood }}</span>
            </div>
          </div>
          <div class="nacs" @click.stop>
            <Tooltip title="编辑"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></Tooltip>
            <Tooltip title="删除"><a-button type="text" size="small" danger @click="del(r)"><DeleteOutlined /></a-button></Tooltip>
          </div>
        </div>
      </div>
      <div v-else class="ec"><div class="ei">🤖</div><div class="et">暂无 AI 实验</div><div class="ed">点击「新建实验」开始记录你的 AI 探索</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建实验</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑实验' : '新建实验'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="实验/提示词名称" name="title"><a-input v-model:value="form.title" placeholder="如：小红书爆款文案生成 Prompt" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="分类"><a-select v-model:value="form.category"><a-select-option v-for="o in categoryOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="AI模型"><a-select v-model:value="form.model" allow-clear><a-select-option v-for="o in modelOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="实验日期"><a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="效果评价"><a-input v-model:value="form.mood" placeholder="⭐⭐⭐⭐⭐ / 效果佳/一般/需优化" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="提示词内容/脚本/实验记录"><a-textarea v-model:value="form.content" :rows="10" placeholder="粘贴你的 Prompt / 脚本 / 实验记录" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
