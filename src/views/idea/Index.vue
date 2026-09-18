<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  BulbOutlined, YoutubeOutlined, BgColorsOutlined, BookOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined, FireOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { ideaApi, type Idea } from '@/api/modules'

const loading = ref(false)
const dataList = ref<Idea[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: '抖音', label: '抖音/短视频', icon: YoutubeOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' },
  { key: 'B站', label: 'B站/中长视频', icon: BgColorsOutlined, color: '#00D4AA', bg: 'rgba(0, 212, 170, 0.15)' },
  { key: '小红书', label: '小红书/图文', icon: BookOutlined, color: '#FF2D55', bg: 'rgba(255, 45, 85, 0.15)' },
  { key: '公众号', label: '公众号/文章', icon: BulbOutlined, color: '#07C160', bg: 'rgba(7, 193, 96, 0.15)' },
  { key: '通用', label: '通用/多平台', icon: FireOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' }
]
const tagList = ['爆款潜质', '热点选题', '深度干货', '情感共鸣', '教程类', '评测类', 'Vlog', '待验证']
const catColorMap: Record<string, string> = {
  '抖音': '#FF375F', 'B站': '#00D4AA', '小红书': '#FF2D55', '公众号': '#07C160',
  '视频号': '#5E6AD2', '知乎': '#0A84FF', '通用': '#FF9F0A'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime || r.date
    return t && dayjs(t).isAfter(monthStart)
  }).length
  const hot = dataList.value.filter(r => (r.mood || '').includes('⭐') || (r.mood || '').includes('爆款')).length
  return { total, monthNew, hot }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    const k = r.platform || '通用'
    if (c[k] !== undefined) c[k]++; else c['通用']++
  })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + (r.content || '') + ' ' + (r.mood || '')).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value && r.platform !== selectedCategory.value) return false
  if (selectedTag.value) {
    const t = selectedTag.value.toLowerCase()
    const md = (r.mood || '').toLowerCase()
    const ct = (r.content || '').toLowerCase()
    if (!md.includes(t) && !ct.includes(t)) return false
  }
  return true
}))
const sorted = computed(() => [...filtered.value].sort((a, b) => {
  const ta = a.updateTime || a.createTime || a.date || ''
  const tb = b.updateTime || b.createTime || b.date || ''
  return tb.localeCompare(ta)
}))
const getAbstract = (r: Idea) => {
  const t = (r.content || '').replace(/[#*`>\-]/g, '').trim()
  return t.length > 120 ? t.substring(0, 120) + '...' : t
}
const getTime = (r: Idea) => {
  const t = r.updateTime || r.createTime || r.date
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}
const loadData = async () => {
  loading.value = true
  try { dataList.value = (await ideaApi.list()) || [] }
  catch { dataList.value = [] }
  finally { loading.value = false }
}
onMounted(loadData)

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<Idea>>({})
const rules = { title: [{ required: true, message: '请输入灵感标题', trigger: 'blur' }] }
const platformOptions = [
  { label: '抖音 / 短视频', value: '抖音' }, { label: 'B站 / 中长视频', value: 'B站' },
  { label: '小红书 / 图文种草', value: '小红书' }, { label: '公众号 / 深度文章', value: '公众号' },
  { label: '视频号', value: '视频号' }, { label: '知乎 / 问答', value: '知乎' },
  { label: '通用多平台', value: '通用' }
]
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', platform: '抖音', date: dayjs().format('YYYY-MM-DD'), mood: '', content: '' })
  delete form.id
  modalVisible.value = true
}
const openEdit = (r: Idea) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  try {
    if (isEdit.value && form.id) await ideaApi.update({ ...form } as Idea), message.success('更新成功')
    else await ideaApi.add({ ...form } as Idea), message.success('新增成功')
    modalVisible.value = false; await loadData()
  } catch (e: any) { message.error(e?.message || '保存失败') }
}
const del = (r: Idea) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => { await ideaApi.remove(r.id as number); message.success('已删除'); await loadData() }
})
</script>

<template>
  <div class="p">
    <a-row :gutter="16" class="srow">
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF9F0A','--as':'rgba(255,159,10,0.15)' }"><div class="si"><BulbOutlined /></div><div class="sif"><div class="sv">{{ stats.total }}<span class="su">条</span></div><div class="sl">灵感总数</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }"><div class="si"><RiseOutlined /></div><div class="sif"><div class="sv">{{ stats.monthNew }}<span class="su">条</span></div><div class="sl">本月新增</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF375F','--as':'rgba(255,55,95,0.15)' }"><div class="si"><FireOutlined /></div><div class="sif"><div class="sv">{{ stats.hot }}<span class="su">条</span></div><div class="sl">爆款潜质</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">平台分类</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建灵感</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><BulbOutlined style="color:#FF9F0A;margin-right:6px" />{{ selectedCategory || '全部灵感' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索灵感/关键词" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:#71717A" /></template></a-input>
    </div>
    <div class="tr">
      <div v-for="t in tagList" :key="t" class="tc" :class="{ active: selectedTag === t }" @click="selectedTag = selectedTag === t ? null : t">{{ t }}</div>
    </div>
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="r in sorted" :key="r.id" class="nc">
          <div class="nm" @click="openEdit(r)">
            <div class="nh"><h4 class="nt">{{ r.title }}</h4>
              <Tag v-if="r.platform" :color="catColorMap[r.platform] || 'default'" class="nct">{{ r.platform }}</Tag>
            </div>
            <div class="na">{{ getAbstract(r) || '暂无内容描述' }}</div>
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
      <div v-else class="ec"><div class="ei">💡</div><div class="et">暂无灵感记录</div><div class="ed">点击「新建灵感」开始捕捉每一个创意火花</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建灵感</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑灵感' : '新建灵感'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="灵感/选题标题" name="title"><a-input v-model:value="form.title" placeholder="如：AI 改变内容创作的 5 个趋势" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="适配平台"><a-select v-model:value="form.platform"><a-select-option v-for="o in platformOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="灵感日期"><a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="优先级/热度"><a-input v-model:value="form.mood" placeholder="⭐⭐⭐⭐⭐ / 爆款潜质/一般/待验证" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="灵感详细内容/脚本草稿/参考链接"><a-textarea v-model:value="form.content" :rows="10" placeholder="记录灵感详情、脚本大纲、参考素材等" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
