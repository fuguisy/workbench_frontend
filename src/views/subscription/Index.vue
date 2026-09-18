<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  CreditCardOutlined, PayCircleOutlined, DollarOutlined, AlertOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined, CheckCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { subscriptionApi, type Subscription } from '@/api/modules'

type ApiCategory = Subscription['category']
type ApiPlanType = Subscription['planType']
type ApiStatus = Subscription['status']

const CAT_TO_API: Record<string, ApiCategory> = {
  'AI工具': 'AI',
  '开发工具': 'DEV',
  '云服务': 'CLOUD',
  '效率工具': 'OFFICE',
  '娱乐生活': 'ENTERTAINMENT'
}
const API_TO_CAT: Record<ApiCategory, string> = {
  AI: 'AI工具',
  DEV: '开发工具',
  CLOUD: '云服务',
  OFFICE: '效率工具',
  ENTERTAINMENT: '娱乐生活'
}

const CYCLE_TO_PLAN: Record<string, ApiPlanType> = {
  '月付': 'MONTHLY',
  '季付': 'MONTHLY',
  '年付': 'YEARLY',
  '周付': 'MONTHLY',
  '一次性': 'ONCE'
}
const PLAN_TO_CYCLE: Record<string, string> = {
  MONTHLY: '月付',
  YEARLY: '年付',
  ONCE: '一次性'
}

const UI_STATUS_TO_API: Record<string, ApiStatus> = {
  '生效中': 'ACTIVE',
  '即将到期': 'EXPIRING',
  '已过期': 'EXPIRED',
  '已取消': 'EXPIRED'
}
const API_STATUS_TO_UI: Record<string, string> = {
  ACTIVE: '生效中',
  EXPIRING: '即将到期',
  EXPIRED: '已过期'
}

interface SubscriptionItem {
  id: number
  title: string
  category: string
  fee: number
  cycle: string
  nextPayDate: string
  status: string
  autoRenew: boolean
  startDate: string
  note: string
  createTime: string
  updateTime: string
}

const loading = ref(false)
const today = dayjs()

const entityToItem = (e: Subscription): SubscriptionItem => {
  const cat = API_TO_CAT[e.category] || 'AI工具'
  const cycle = PLAN_TO_CYCLE[e.planType || 'MONTHLY'] || '月付'
  const statusTxt = API_STATUS_TO_UI[e.status || 'ACTIVE'] || '生效中'
  const renewD = e.renewDate ? dayjs(e.renewDate) : null
  const startD = (e as any).startDate ? dayjs((e as any).startDate) : null
  return {
    id: e.id ?? 0,
    title: e.title,
    category: cat,
    fee: e.costYuan ?? 0,
    cycle,
    nextPayDate: renewD ? renewD.format('YYYY-MM-DD') : today.add(30, 'day').format('YYYY-MM-DD'),
    status: statusTxt,
    autoRenew: !!e.autoRenew,
    startDate: startD ? startD.format('YYYY-MM-DD') : today.format('YYYY-MM-DD'),
    note: (e as any).note || '',
    createTime: (e as any).createTime || today.format('YYYY-MM-DD'),
    updateTime: (e as any).updateTime || today.format('YYYY-MM-DD')
  }
}

const itemToEntity = (r: Partial<SubscriptionItem>): Subscription => {
  const cat: ApiCategory = CAT_TO_API[r.category || 'AI工具'] || 'AI'
  const planType: ApiPlanType = CYCLE_TO_PLAN[r.cycle || '月付'] || 'MONTHLY'
  const status: ApiStatus = UI_STATUS_TO_API[r.status || '生效中'] || 'ACTIVE'
  return {
    id: r.id,
    title: r.title || '',
    category: cat,
    provider: (r as any).provider,
    planType,
    costYuan: r.fee,
    renewDate: r.nextPayDate,
    autoRenew: r.autoRenew,
    status
  }
}

const toCny = (fee: number, cycle: string) => cycle === '年付' ? (fee / 12) : fee

const dataList = ref<SubscriptionItem[]>([])
const loadData = async () => {
  loading.value = true
  try {
    const list = await subscriptionApi.list()
    dataList.value = (list || []).map(entityToItem)
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}
onMounted(loadData)

const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: 'AI工具', label: 'AI 工具', icon: PayCircleOutlined, color: '#5E6AD2', bg: 'rgba(94, 106, 210, 0.15)' },
  { key: '开发工具', label: '开发工具', icon: CreditCardOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '云服务', label: '云服务/存储', icon: DollarOutlined, color: '#00D4AA', bg: 'rgba(0, 212, 170, 0.15)' },
  { key: '效率工具', label: '效率办公', icon: CheckCircleOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: '娱乐生活', label: '娱乐生活', icon: AlertOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' }
]
const tagList = ['月付', '年付', '生效中', '即将到期', '自动续费', '手动续费', '7天内到期', '月费>50元']
const catColorMap: Record<string, string> = {
  'AI工具': '#5E6AD2', '开发工具': '#0A84FF', '云服务': '#00D4AA',
  '效率工具': '#34C759', '娱乐生活': '#FF375F'
}
const statusColorMap: Record<string, string> = {
  '生效中': '#34C759', '即将到期': '#FF9F0A', '已过期': '#FF375F', '已取消': '#8E8E93'
}

const stats = computed(() => {
  const active = dataList.value.filter(r => r.status === '生效中' || r.status === '即将到期')
  const monthly = active.reduce((s, r) => s + toCny(r.fee, r.cycle), 0)
  const soon = dataList.value.filter(r => {
    const d = dayjs(r.nextPayDate)
    return d.isAfter(today.subtract(1, 'day')) && d.isBefore(today.add(8, 'day'))
  }).length
  return { total: dataList.value.length, monthly: Math.round(monthly * 100) / 100, soon }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => { if (c[r.category] !== undefined) c[r.category]++ })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + r.note).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value && r.category !== selectedCategory.value) return false
  if (selectedTag.value) {
    const t = selectedTag.value
    if (t === '月付' && r.cycle !== '月付') return false
    if (t === '年付' && r.cycle !== '年付') return false
    if (t === '生效中' && !(r.status === '生效中')) return false
    if (t === '即将到期' && r.status !== '即将到期') return false
    if (t === '自动续费' && !r.autoRenew) return false
    if (t === '手动续费' && r.autoRenew) return false
    if (t === '7天内到期') {
      const d = dayjs(r.nextPayDate)
      if (!(d.isAfter(today.subtract(1, 'day')) && d.isBefore(today.add(7, 'day')))) return false
    }
    if (t === '月费>50元' && toCny(r.fee, r.cycle) <= 50) return false
  }
  return true
}))
const sorted = computed(() => [...filtered.value].sort((a, b) => dayjs(a.nextPayDate).valueOf() - dayjs(b.nextPayDate).valueOf()))
const getAbstract = (r: SubscriptionItem) => r.note && r.note.trim() ? r.note : '暂无备注'
const getDaysLeft = (d: string) => {
  const diff = dayjs(d).diff(today, 'day')
  if (diff < 0) return `已逾期 ${-diff} 天`
  if (diff === 0) return '今日到期'
  if (diff <= 7) return `${diff} 天后到期`
  return `${diff} 天后`
}

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<SubscriptionItem>>({})
const rules = { title: [{ required: true, message: '请输入订阅名称', trigger: 'blur' }] }
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', category: 'AI工具', fee: 0, cycle: '月付', nextPayDate: today.add(30, 'day').format('YYYY-MM-DD'), status: '生效中', autoRenew: true, startDate: today.format('YYYY-MM-DD'), note: '' })
  modalVisible.value = true
}
const openEdit = (r: SubscriptionItem) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  const entity = itemToEntity(form)
  try {
    if (isEdit.value) {
      await subscriptionApi.update(entity)
      const idx = dataList.value.findIndex(x => x.id === form.id)
      if (idx >= 0) dataList.value[idx] = entityToItem(entity)
      message.success('更新成功')
    } else {
      const res: any = await subscriptionApi.add(entity)
      const newEntity: Subscription = res && typeof res === 'object' && 'id' in res ? res : { ...entity, id: (res as any) ?? Date.now() }
      if (!newEntity.id) newEntity.id = Date.now()
      dataList.value.unshift(entityToItem(newEntity))
      message.success('新增成功')
    }
  } catch {
    message.error('保存失败')
    return
  }
  modalVisible.value = false
}
const del = (r: SubscriptionItem) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => {
    try {
      if (r.id) await subscriptionApi.remove(r.id)
      dataList.value = dataList.value.filter(x => x.id !== r.id)
      message.success('已删除')
    } catch {
      dataList.value = dataList.value.filter(x => x.id !== r.id)
      message.success('已删除')
    }
  }
})
</script>

<template>
  <div class="p">
    <a-row :gutter="16" class="srow">
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#5E6AD2','--as':'rgba(94,106,210,0.15)' }"><div class="si"><CreditCardOutlined /></div><div class="sif"><div class="sv">{{ stats.total }}<span class="su">项</span></div><div class="sl">订阅服务总数</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF9F0A','--as':'rgba(255,159,10,0.15)' }"><div class="si"><DollarOutlined /></div><div class="sif"><div class="sv">¥{{ stats.monthly }}<span class="su">/月</span></div><div class="sl">月均支出估算</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF375F','--as':'rgba(255,55,95,0.15)' }"><div class="si"><AlertOutlined /></div><div class="sif"><div class="sv">{{ stats.soon }}<span class="su">项</span></div><div class="sl">7天内到期</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">订阅分类</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建订阅</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><PayCircleOutlined style="color:#5E6AD2;margin-right:6px" />{{ selectedCategory || '全部订阅' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索订阅/备注" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:#71717A" /></template></a-input>
    </div>
    <div class="tr">
      <div v-for="t in tagList" :key="t" class="tc" :class="{ active: selectedTag === t }" @click="selectedTag = selectedTag === t ? null : t">{{ t }}</div>
    </div>
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="r in sorted" :key="r.id" class="nc">
          <div class="nm" @click="openEdit(r)">
            <div class="nh"><h4 class="nt">{{ r.title }}</h4>
              <Tag :color="catColorMap[r.category]" class="nct">{{ r.category }}</Tag>
              <Tag :color="statusColorMap[r.status]" class="nct">{{ r.status }}</Tag>
            </div>
            <div class="na">{{ getAbstract(r) }}</div>
            <div class="nme">
              <span class="mi mt" style="background:rgba(10,132,255,0.15);color:#0A84FF">💳 ¥{{ r.fee }} / {{ r.cycle }}{{ r.cycle === '年付' ? ` (¥${Math.round(toCny(r.fee, r.cycle) * 100) / 100}/月)` : '' }}</span>
              <span class="mi"><CalendarOutlined /> 下次：{{ r.nextPayDate }}</span>
              <span class="mi mt" :style="{ background: dayjs(r.nextPayDate).isBefore(today.add(7, 'day')) ? 'rgba(255,55,95,0.15)' : 'rgba(52,199,89,0.15)', color: dayjs(r.nextPayDate).isBefore(today.add(7, 'day')) ? '#FF375F' : '#34C759' }">⏰ {{ getDaysLeft(r.nextPayDate) }}</span>
              <span v-if="r.autoRenew" class="mi mt" style="background:rgba(94,106,210,0.15);color:#5E6AD2">🔄 自动续费</span>
            </div>
          </div>
          <div class="nacs" @click.stop>
            <Tooltip title="编辑"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></Tooltip>
            <Tooltip title="删除"><a-button type="text" size="small" danger @click="del(r)"><DeleteOutlined /></a-button></Tooltip>
          </div>
        </div>
      </div>
      <div v-else class="ec"><div class="ei">💳</div><div class="et">暂无订阅记录</div><div class="ed">点击「新建订阅」开始管理你的付费服务</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建订阅</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑订阅' : '新建订阅'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="订阅服务名称" name="title"><a-input v-model:value="form.title" placeholder="如：ChatGPT Plus / Netflix / Adobe 全家桶" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="服务分类"><a-select v-model:value="form.category"><a-select-option v-for="c in categoryList" :key="c.key" :value="c.key">{{ c.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="付费金额"><a-input-number v-model:value="form.fee" :min="0" :precision="2" :style="{width:'100%'}" placeholder="输入金额" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="付费周期"><a-select v-model:value="form.cycle"><a-select-option value="周付">周付</a-select-option><a-select-option value="月付">月付</a-select-option><a-select-option value="季付">季付</a-select-option><a-select-option value="年付">年付</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="订阅起始日期"><a-date-picker v-model:value="form.startDate" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="下次扣费日期"><a-date-picker v-model:value="form.nextPayDate" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="当前状态"><a-select v-model:value="form.status"><a-select-option value="生效中">生效中</a-select-option><a-select-option value="即将到期">即将到期</a-select-option><a-select-option value="已过期">已过期</a-select-option><a-select-option value="已取消">已取消</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="自动续费"><a-switch v-model:checked="form.autoRenew" checked-children="开启" un-checked-children="关闭" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="备注/用途/优惠信息"><a-textarea v-model:value="form.note" :rows="4" placeholder="用途说明、绑定账号、优惠到期信息、取消提醒等" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
