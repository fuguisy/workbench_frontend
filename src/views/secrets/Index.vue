<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  SafetyOutlined, UserOutlined, DatabaseOutlined, CloudOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined, LockOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { secretsApi, type Secrets } from '@/api/modules'

const loading = ref(false)
const dataList = ref<Secrets[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: '工作账号', label: '工作账号', icon: UserOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '自媒体账号', label: '自媒体账号', icon: SafetyOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' },
  { key: '服务器', label: '服务器/SSH', icon: CloudOutlined, color: '#00D4AA', bg: 'rgba(0, 212, 170, 0.15)' },
  { key: '数据库', label: '数据库/Redis', icon: DatabaseOutlined, color: '#BF5AF2', bg: 'rgba(191, 90, 242, 0.15)' },
  { key: '其他', label: '其他敏感信息', icon: LockOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' }
]
const tagList = ['已开启2FA', '高风险🔴', '本地保管', '云端同步', '定期轮换', '素材路径', '数据集', '待更新']
const catColorMap: Record<string, string> = {
  '工作账号': '#0A84FF', '自媒体账号': '#FF375F', '服务器': '#00D4AA',
  '数据库': '#BF5AF2', '素材路径': '#FF2D55', '数据集': '#34C759', '其他': '#FF9F0A'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime || r.date
    return t && dayjs(t).isAfter(monthStart)
  }).length
  const highSec = dataList.value.filter(r => (r.mood || '').includes('2FA') || (r.mood || '').includes('高')).length
  return { total, monthNew, highSec }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    const k = r.category || '其他'
    if (c[k] !== undefined) c[k]++; else c['其他']++
  })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + (r.location || '') + ' ' + (r.content || '') + ' ' + (r.mood || '')).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value && r.category !== selectedCategory.value) return false
  if (selectedTag.value) {
    const t = selectedTag.value.toLowerCase()
    const md = (r.mood || '').toLowerCase()
    const ct = (r.content || '').toLowerCase()
    const lc = (r.location || '').toLowerCase()
    if (t === '已开启2fa' && !md.includes('2fa')) return false
    if (t === '高风险🔴' && !md.includes('高') && !md.includes('🔴')) return false
    if (t === '本地保管' && !lc.includes('本地') && !lc.includes('vault')) return false
    if (t === '云端同步' && !lc.includes('云') && !lc.includes('浏览器')) return false
    if (['定期轮换', '素材路径', '数据集', '待更新'].includes(selectedTag.value)) {
      if (!ct.includes(t) && !md.includes(t)) return false
    }
  }
  return true
}))
const sorted = computed(() => [...filtered.value].sort((a, b) => {
  const ta = a.updateTime || a.createTime || a.date || ''
  const tb = b.updateTime || b.createTime || b.date || ''
  return tb.localeCompare(ta)
}))
const getAbstract = (r: Secrets) => {
  const t = (r.content || '').replace(/[#*`>\-]/g, '').trim()
  const masked = t.length > 60 ? t.substring(0, 30) + ' ****** ' + t.substring(t.length - 15) : t.length > 0 ? '******' : '暂无详情（加密存储）'
  return masked
}
const getTime = (r: Secrets) => {
  const t = r.updateTime || r.createTime || r.date
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}
const loadData = async () => {
  loading.value = true
  try { dataList.value = (await secretsApi.list()) || [] }
  catch { dataList.value = [] }
  finally { loading.value = false }
}
onMounted(loadData)

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<Secrets>>({})
const rules = {
  title: [{ required: true, message: '请输入资源名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }]
}
const categoryOptions = [
  { label: '工作/公司账号', value: '工作账号' }, { label: '自媒体平台账号', value: '自媒体账号' },
  { label: '服务器/SSH', value: '服务器' }, { label: '数据库/Redis', value: '数据库' },
  { label: '硬盘/云盘素材路径映射', value: '素材路径' }, { label: 'AI数据集/模型文件索引', value: '数据集' },
  { label: '其他敏感信息', value: '其他' }
]
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', category: '工作账号', location: '', date: dayjs().format('YYYY-MM-DD'), mood: '', content: '' })
  delete form.id
  modalVisible.value = true
}
const openEdit = (r: Secrets) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  try {
    if (isEdit.value && form.id) await secretsApi.update({ ...form } as Secrets), message.success('更新成功')
    else await secretsApi.add({ ...form } as Secrets), message.success('新增成功')
    modalVisible.value = false; await loadData()
  } catch (e: any) { message.error(e?.message || '保存失败') }
}
const del = (r: Secrets) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => { await secretsApi.remove(r.id as number); message.success('已删除'); await loadData() }
})
</script>

<template>
  <div class="p">
    <a-row :gutter="16" class="srow">
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF375F','--as':'rgba(255,55,95,0.15)' }"><div class="si"><LockOutlined /></div><div class="sif"><div class="sv">{{ stats.total }}<span class="su">项</span></div><div class="sl">资源总数</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }"><div class="si"><RiseOutlined /></div><div class="sif"><div class="sv">{{ stats.monthNew }}<span class="su">项</span></div><div class="sl">本月新增</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#00D4AA','--as':'rgba(0,212,170,0.15)' }"><div class="si"><SafetyOutlined /></div><div class="sif"><div class="sv">{{ stats.highSec }}<span class="su">项</span></div><div class="sl">高安全等级</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">资源分类</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建资源</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><SafetyOutlined style="color:#FF375F;margin-right:6px" />{{ selectedCategory || '全部资源' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索资源名/存储位置" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:#71717A" /></template></a-input>
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
            </div>
            <div class="na">{{ getAbstract(r) }}</div>
            <div class="nme">
              <span v-if="r.location" class="mi">📍 {{ r.location }}</span>
              <span class="mi"><ClockCircleOutlined /> {{ getTime(r) }}</span>
              <span v-if="r.mood" class="mi mt">{{ r.mood }}</span>
            </div>
          </div>
          <div class="nacs" @click.stop>
            <Tooltip title="编辑"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></Tooltip>
            <Tooltip title="删除"><a-button type="text" size="small" danger @click="del(r)"><DeleteOutlined /></a-button></Tooltip>
          </div>
        </div>
      </div>
      <div v-else class="ec"><div class="ei">🔐</div><div class="et">暂无敏感资源</div><div class="ed">点击「新建资源」开始安全保管你的账号与密钥</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建资源</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑资源' : '新建资源'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="账号/资源名称" name="title"><a-input v-model:value="form.title" placeholder="例如：抖音登录 / GitLab账号 / 阿里云服务器root" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="分类" name="category"><a-select v-model:value="form.category"><a-select-option v-for="o in categoryOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="存储位置/托管方"><a-input v-model:value="form.location" placeholder="本地Vaultwarden / 浏览器 / 硬盘D盘 / 阿里云" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="最近更新"><a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="安全等级"><a-input v-model:value="form.mood" placeholder="🔴高/🟡中/🟢低 / 是否开启2FA" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="用户名/密码/提示词/路径详情（建议加密存储）"><a-textarea v-model:value="form.content" :rows="8" placeholder="用户名、密码、双因子备份码、SSH私钥路径等敏感信息" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
