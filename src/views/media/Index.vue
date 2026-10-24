<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  PictureOutlined, VideoCameraOutlined, FileTextOutlined, PaperClipOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined, EyeOutlined, LinkOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { mediaApi, type Media } from '@/api/modules'

const loading = ref(false)
const dataList = ref<Media[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: '大纲', label: '大纲构思', icon: FileTextOutlined, color: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.15)' },
  { key: '文案', label: '文案脚本', icon: PaperClipOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '剪辑中', label: '剪辑制作', icon: VideoCameraOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' },
  { key: '待发布', label: '等待发布', icon: PictureOutlined, color: '#64D2FF', bg: 'rgba(100, 210, 255, 0.15)' },
  { key: '已发布', label: '已发布', icon: EyeOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' }
]
const tagList = ['抖音', 'B站', '小红书', '视频号', '公众号', '高优先级', '已出爆款', '待优化']
const stageColorMap: Record<string, string> = {
  '大纲': '#BF5AF2', '文案': '#0A84FF', '剪辑中': '#FF9F0A', '待发布': '#64D2FF', '已发布': '#34C759'
}
const platformColorMap: Record<string, string> = {
  '抖音': '#FF375F', 'B站': '#00D4AA', '小红书': '#FF2D55', '视频号': '#5E6AD2',
  '公众号': '#07C160', '知乎': '#0A84FF', '其他': '#FF9F0A'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime || r.date
    return t && dayjs(t).isAfter(monthStart)
  }).length
  const published = dataList.value.filter(r => r.stage === '已发布').length
  return { total, monthNew, published }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    const k = r.stage || '大纲'
    if (c[k] !== undefined) c[k]++; else c['大纲']++
  })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + (r.note || '') + ' ' + (r.platform || '')).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value && r.stage !== selectedCategory.value) return false
  if (selectedTag.value) {
    const t = selectedTag.value
    if (['抖音', 'B站', '小红书', '视频号', '公众号'].includes(t) && r.platform !== t) return false
    if (t === '高优先级') {
      if (!r.stage) return false
    }
    if (t === '已出爆款' && !(r.views && r.views > 10000)) return false
  }
  return true
}))
const sorted = computed(() => [...filtered.value].sort((a, b) => {
  const ta = a.updateTime || a.createTime || a.date || ''
  const tb = b.updateTime || b.createTime || b.date || ''
  return tb.localeCompare(ta)
}))
const getPercent = (r: Media) => r.target > 0 ? Math.min(100, Math.round((r.current / r.target) * 100)) : 0
const getProgressColor = (pct: number) => pct >= 100 ? '#34C759' : pct >= 60 ? '#5E6AD2' : pct >= 30 ? '#FF9F0A' : '#FF375F'
const getAbstract = (r: Media) => {
  const t = (r.note || '').replace(/[#*`>\-]/g, '').trim()
  return t.length > 120 ? t.substring(0, 120) + '...' : t || '暂无备注内容'
}
const getTime = (r: Media) => {
  const t = r.updateTime || r.createTime || r.date
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}
const loadData = async () => {
  loading.value = true
  try { dataList.value = (await mediaApi.list()) || [] }
  catch { dataList.value = [] }
  finally { loading.value = false }
}
onMounted(loadData)

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<Media>>({})
const rules = { title: [{ required: true, message: '请输入素材标题', trigger: 'blur' }] }
const stageOptions = [
  { label: '大纲构思', value: '大纲' }, { label: '撰写文案', value: '文案' },
  { label: '剪辑制作', value: '剪辑中' }, { label: '等待发布', value: '待发布' },
  { label: '已发布', value: '已发布' }
]
const platformOptions = [
  { label: '抖音', value: '抖音' }, { label: 'B站（哔哩哔哩）', value: 'B站' },
  { label: '小红书', value: '小红书' }, { label: '视频号', value: '视频号' },
  { label: '公众号', value: '公众号' }, { label: '知乎', value: '知乎' },
  { label: '其他', value: '其他' }
]
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', current: 0, target: 100, unit: '%', stage: '大纲', platform: '抖音', date: '', views: 0, url: '', note: '' })
  delete form.id
  modalVisible.value = true
}
const openEdit = (r: Media) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  try {
    if (isEdit.value && form.id) await mediaApi.update({ ...form } as Media), message.success('更新成功')
    else await mediaApi.add({ ...form } as Media), message.success('新增成功')
    modalVisible.value = false; await loadData()
  } catch (e: any) { message.error(e?.message || '保存失败') }
}
const del = (r: Media) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => { await mediaApi.remove(r.id as number); message.success('已删除'); await loadData() }
})
</script>

<template>
  <div class="p">
    <a-row :gutter="16" class="srow">
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#BF5AF2','--as':'rgba(191,90,242,0.15)' }"><div class="si"><VideoCameraOutlined /></div><div class="sif"><div class="sv">{{ stats.total }}<span class="su">条</span></div><div class="sl">素材总数</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }"><div class="si"><RiseOutlined /></div><div class="sif"><div class="sv">{{ stats.monthNew }}<span class="su">条</span></div><div class="sl">本月新增</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#0A84FF','--as':'rgba(10,132,255,0.15)' }"><div class="si"><EyeOutlined /></div><div class="sif"><div class="sv">{{ stats.published }}<span class="su">条</span></div><div class="sl">已发布</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">创作阶段</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建素材</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><PictureOutlined style="color:#BF5AF2;margin-right:6px" />{{ selectedCategory || '全部素材' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索素材/备注" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:var(--color-text-tertiary)" /></template></a-input>
    </div>
    <div class="tr">
      <div v-for="t in tagList" :key="t" class="tc" :class="{ active: selectedTag === t }" @click="selectedTag = selectedTag === t ? null : t">{{ t }}</div>
    </div>
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="r in sorted" :key="r.id" class="nc">
          <div class="nm" @click="openEdit(r)">
            <div class="nh"><h4 class="nt">{{ r.title }}</h4>
              <Tag v-if="r.stage" :color="stageColorMap[r.stage]" class="nct">{{ r.stage }}</Tag>
              <Tag v-if="r.platform" :color="platformColorMap[r.platform] || 'default'" class="nct">{{ r.platform }}</Tag>
            </div>
            <div class="pct">
              <span>🎬 {{ r.current }}/{{ r.target }}{{ r.unit }}</span>
              <span :style="{ color: getProgressColor(getPercent(r)) }">{{ getPercent(r) }}%</span>
            </div>
            <div class="pr"><div class="pri" :style="{ width: getPercent(r) + '%', background: getProgressColor(getPercent(r)) }"></div></div>
            <div class="na">{{ getAbstract(r) }}</div>
            <div class="nme">
              <span class="mi"><ClockCircleOutlined /> {{ getTime(r) }}</span>
              <span v-if="r.date" class="mi">📅 {{ r.date }}</span>
              <span v-if="r.views" class="mi">👁 {{ r.views }} 阅读</span>
              <a v-if="r.url" class="mi mt" :href="r.url" target="_blank" @click.stop style="color:#0A84FF;text-decoration:none"><LinkOutlined /> 查看作品</a>
            </div>
          </div>
          <div class="nacs" @click.stop>
            <Tooltip title="编辑"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></Tooltip>
            <Tooltip title="删除"><a-button type="text" size="small" danger @click="del(r)"><DeleteOutlined /></a-button></Tooltip>
          </div>
        </div>
      </div>
      <div v-else class="ec"><div class="ei">🎬</div><div class="et">暂无素材记录</div><div class="ed">点击「新建素材」开始管理你的内容创作</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建素材</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑素材' : '新建素材'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="素材/脚本标题" name="title"><a-input v-model:value="form.title" placeholder="如：AI 工具测评系列第一集" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="当前进度"><a-input-number v-model:value="form.current" :min="0" :style="{width:'100%'}" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="总目标"><a-input-number v-model:value="form.target" :min="1" :style="{width:'100%'}" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="单位"><a-select v-model:value="form.unit"><a-select-option value="%">%</a-select-option><a-select-option value="分钟">分钟</a-select-option><a-select-option value="字">字</a-select-option><a-select-option value="个">个</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="创作阶段"><a-select v-model:value="form.stage"><a-select-option v-for="o in stageOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="分发平台"><a-select v-model:value="form.platform"><a-select-option v-for="o in platformOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="计划发布日期"><a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="播放/阅读量"><a-input-number v-model:value="form.views" :min="0" :style="{width:'100%'}" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="作品链接"><a-input v-model:value="form.url" placeholder="发布后粘贴链接" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="备注/脚本内容摘要"><a-textarea v-model:value="form.note" :rows="6" placeholder="脚本摘要、分镜说明、素材路径等" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
