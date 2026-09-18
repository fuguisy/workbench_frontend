<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  BookOutlined, ReadOutlined, PlaySquareOutlined, CheckCircleOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { readApi, type ReadProgress } from '@/api/modules'

const loading = ref(false)
const dataList = ref<ReadProgress[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: '技术书籍', label: '技术书籍', icon: BookOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '视频课程', label: '视频课程', icon: PlaySquareOutlined, color: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.15)' },
  { key: '专栏文章', label: '专栏文章', icon: ReadOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' },
  { key: '非虚构', label: '非虚构/认知', icon: AuditOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: '休闲阅读', label: '休闲/小说', icon: CheckCircleOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' }
]
const tagList = ['在读', '已完成', '待读', '强烈推荐', '专业必读', '认知提升', 'AI相关', '产品思维']
const catColorMap: Record<string, string> = {
  '技术书籍': '#0A84FF', '视频课程': '#BF5AF2', '专栏文章': '#FF9F0A',
  '非虚构': '#34C759', '休闲阅读': '#FF375F'
}

const classifyBook = (title: string, note: string): string => {
  const t = (title + ' ' + note).toLowerCase()
  if (t.includes('视频') || t.includes('课程') || t.includes('教程')) return '视频课程'
  if (t.includes('专栏') || t.includes('文章')) return '专栏文章'
  if (t.includes('小说') || t.includes('文学') || t.includes('故事')) return '休闲阅读'
  if (t.includes('心理') || t.includes('经济') || t.includes('哲学') || t.includes('认知') || t.includes('思维')) return '非虚构'
  return '技术书籍'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime
    return t && dayjs(t).isAfter(monthStart)
  }).length
  const finished = dataList.value.filter(r => r.target > 0 && r.current >= r.target).length
  return { total, monthNew, finished }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    const k = classifyBook(r.title, r.note || '')
    c[k]++
  })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + (r.note || '')).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value) {
    const cls = classifyBook(r.title, r.note || '')
    if (cls !== selectedCategory.value) return false
  }
  if (selectedTag.value) {
    const t = selectedTag.value
    const pct = r.target > 0 ? Math.round((r.current / r.target) * 100) : 0
    if (t === '在读' && !(pct > 0 && pct < 100)) return false
    if (t === '已完成' && pct < 100) return false
    if (t === '待读' && pct > 0) return false
    const nt = (r.note || '').toLowerCase()
    if (['强烈推荐', '专业必读', '认知提升', 'AI相关', '产品思维'].includes(t)) {
      if (!nt.includes(t.toLowerCase()) && !(r.title.toLowerCase().includes(t.toLowerCase()))) return false
    }
  }
  return true
}))
const sorted = computed(() => [...filtered.value].sort((a, b) => {
  const ta = a.updateTime || a.createTime || ''
  const tb = b.updateTime || b.createTime || ''
  return tb.localeCompare(ta)
}))
const getPercent = (r: ReadProgress) => r.target > 0 ? Math.min(100, Math.round((r.current / r.target) * 100)) : 0
const getProgressColor = (pct: number) => pct >= 100 ? '#34C759' : pct >= 60 ? '#5E6AD2' : pct >= 30 ? '#FF9F0A' : '#FF375F'
const getAbstract = (r: ReadProgress) => {
  const t = (r.note || '').replace(/[#*`>\-]/g, '').trim()
  return t.length > 120 ? t.substring(0, 120) + '...' : t || '暂无笔记或心得'
}
const getTime = (r: ReadProgress) => {
  const t = r.updateTime || r.createTime
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}
const loadData = async () => {
  loading.value = true
  try { dataList.value = (await readApi.list()) || [] }
  catch { dataList.value = [] }
  finally { loading.value = false }
}
onMounted(loadData)

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<ReadProgress>>({})
const rules = { title: [{ required: true, message: '请输入名称', trigger: 'blur' }] }
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', current: 0, target: 100, unit: '页', note: '' })
  delete form.id
  modalVisible.value = true
}
const openEdit = (r: ReadProgress) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  try {
    if (isEdit.value && form.id) await readApi.update({ ...form } as ReadProgress), message.success('更新成功')
    else await readApi.add({ ...form } as ReadProgress), message.success('新增成功')
    modalVisible.value = false; await loadData()
  } catch (e: any) { message.error(e?.message || '保存失败') }
}
const del = (r: ReadProgress) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => { await readApi.remove(r.id as number); message.success('已删除'); await loadData() }
})
</script>

<template>
  <div class="p">
    <a-row :gutter="16" class="srow">
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#0A84FF','--as':'rgba(10,132,255,0.15)' }"><div class="si"><ReadOutlined /></div><div class="sif"><div class="sv">{{ stats.total }}<span class="su">本</span></div><div class="sl">阅读总数</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }"><div class="si"><RiseOutlined /></div><div class="sif"><div class="sv">{{ stats.monthNew }}<span class="su">本</span></div><div class="sl">本月新增</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF9F0A','--as':'rgba(255,159,10,0.15)' }"><div class="si"><CheckCircleOutlined /></div><div class="sif"><div class="sv">{{ stats.finished }}<span class="su">本</span></div><div class="sl">已读完</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">阅读分类</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建阅读</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><BookOutlined style="color:#0A84FF;margin-right:6px" />{{ selectedCategory || '全部阅读' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索书名/笔记" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:#71717A" /></template></a-input>
    </div>
    <div class="tr">
      <div v-for="t in tagList" :key="t" class="tc" :class="{ active: selectedTag === t }" @click="selectedTag = selectedTag === t ? null : t">{{ t }}</div>
    </div>
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="r in sorted" :key="r.id" class="nc">
          <div class="nm" @click="openEdit(r)">
            <div class="nh"><h4 class="nt">{{ r.title }}</h4>
              <Tag :color="catColorMap[classifyBook(r.title, r.note || '')]" class="nct">{{ classifyBook(r.title, r.note || '') }}</Tag>
            </div>
            <div class="pct">
              <span>📖 {{ r.current }}/{{ r.target }}{{ r.unit }}</span>
              <span :style="{ color: getProgressColor(getPercent(r)) }">{{ getPercent(r) }}%</span>
            </div>
            <div class="pr"><div class="pri" :style="{ width: getPercent(r) + '%', background: getProgressColor(getPercent(r)) }"></div></div>
            <div class="na">{{ getAbstract(r) }}</div>
            <div class="nme">
              <span class="mi"><ClockCircleOutlined /> {{ getTime(r) }}</span>
              <span v-if="getPercent(r) >= 100" class="mi mt" style="background:rgba(52,199,89,0.15);color:#34C759">✅ 已完成</span>
              <span v-else-if="getPercent(r) === 0" class="mi mt" style="background:rgba(94,106,210,0.15);color:#5E6AD2">📋 待读</span>
              <span v-else class="mi mt">⏳ 在读</span>
            </div>
          </div>
          <div class="nacs" @click.stop>
            <Tooltip title="编辑"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></Tooltip>
            <Tooltip title="删除"><a-button type="text" size="small" danger @click="del(r)"><DeleteOutlined /></a-button></Tooltip>
          </div>
        </div>
      </div>
      <div v-else class="ec"><div class="ei">📚</div><div class="et">暂无阅读记录</div><div class="ed">点击「新建阅读」开启你的知识旅程</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建阅读</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑阅读' : '新建阅读'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="书名/课程名" name="title"><a-input v-model:value="form.title" placeholder="如：《深入理解计算机系统》" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="已读进度"><a-input-number v-model:value="form.current" :min="0" :style="{width:'100%'}" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="总目标值"><a-input-number v-model:value="form.target" :min="1" :style="{width:'100%'}" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="单位"><a-select v-model:value="form.unit"><a-select-option value="页">页</a-select-option><a-select-option value="章">章</a-select-option><a-select-option value="节">节</a-select-option><a-select-option value="课时">课时</a-select-option><a-select-option value="%">%</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="笔记/心得摘要"><a-textarea v-model:value="form.note" :rows="8" placeholder="记录阅读笔记、核心观点、心得感悟" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
