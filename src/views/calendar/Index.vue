<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  CalendarOutlined, ClockCircleOutlined, BellOutlined, CheckCircleOutlined,
  SearchOutlined, ReloadOutlined, UserOutlined, EnvironmentOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { calendarApi, type CalendarEvent } from '@/api/modules'

type ApiCategory = CalendarEvent['category']

const CAT_TO_API: Record<string, ApiCategory> = {
  '工作会议': 'WORK',
  '自媒体事务': 'MEDIA',
  '专注时间': 'FOCUS',
  '个人规划': 'REVIEW',
  '生活事务': 'LIFE',
  '健康生活': 'LIFE'
}
const API_TO_CAT: Record<ApiCategory, string> = {
  WORK: '工作会议',
  MEDIA: '自媒体事务',
  FOCUS: '专注时间',
  REVIEW: '个人规划',
  LIFE: '生活事务'
}
const API_TO_ICON_CAT: Record<ApiCategory, string> = {
  WORK: '工作会议',
  MEDIA: '自媒体事务',
  FOCUS: '专注时间',
  REVIEW: '个人规划',
  LIFE: '生活事务'
}

interface CalendarItem {
  id: number
  title: string
  category: string
  date: string
  startTime: string
  endTime: string
  allDay: boolean
  priority: string
  status: string
  location: string
  attendees: string
  note: string
  createTime: string
  updateTime: string
  _raw?: CalendarEvent
}

const loading = ref(false)
const today = dayjs()

const entityToItem = (e: CalendarEvent): CalendarItem => {
  const st = e.startTime ? dayjs(e.startTime) : null
  const et = e.endTime ? dayjs(e.endTime) : null
  const cat = API_TO_CAT[e.category] || '生活事务'
  return {
    id: e.id ?? 0,
    title: e.title,
    category: cat,
    date: st ? st.format('YYYY-MM-DD') : today.format('YYYY-MM-DD'),
    startTime: st ? st.format('HH:mm') : (e.allDay ? '00:00' : '09:00'),
    endTime: et ? et.format('HH:mm') : (e.allDay ? '00:00' : '10:00'),
    allDay: !!e.allDay,
    priority: e.priority || '中',
    status: e.status || '待开始',
    location: e.location || '',
    attendees: e.attendees || '',
    note: '',
    createTime: (e as any).createTime || today.format('YYYY-MM-DD'),
    updateTime: (e as any).updateTime || today.format('YYYY-MM-DD'),
    _raw: e
  }
}

const itemToEntity = (r: Partial<CalendarItem>): CalendarEvent => {
  const cat: ApiCategory = CAT_TO_API[r.category || '工作会议'] || 'WORK'
  const startStr = r.date && r.startTime ? `${r.date} ${r.startTime}` : undefined
  const endStr = r.date && r.endTime ? `${r.date} ${r.endTime}` : undefined
  return {
    id: r.id,
    title: r.title || '',
    category: cat,
    location: r.location,
    attendees: r.attendees,
    startTime: startStr,
    endTime: endStr,
    allDay: r.allDay,
    priority: r.priority,
    status: r.status
  }
}

const dataList = ref<CalendarItem[]>([])
const loadData = async () => {
  loading.value = true
  try {
    const list = await calendarApi.list()
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
  { key: '工作会议', label: '工作/会议', icon: CalendarOutlined, color: '#5E6AD2', bg: 'rgba(94, 106, 210, 0.15)' },
  { key: '自媒体事务', label: '自媒体/内容', icon: BellOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' },
  { key: '专注时间', label: '专注/深度', icon: CheckCircleOutlined, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.15)' },
  { key: '个人规划', label: '复盘/规划', icon: AuditOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: '生活事务', label: '生活/其他', icon: EnvironmentOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' }
]
const tagList = ['今日', '本周', '高优先级', '全天事件', '待开始', '进行中', '已完成', '已过期']
const catColorMap: Record<string, string> = {
  '工作会议': '#5E6AD2', '自媒体事务': '#FF375F', '专注时间': '#0A84FF',
  '个人规划': '#34C759', '生活事务': '#FF9F0A', '健康生活': '#00D4AA'
}
const priorityColorMap: Record<string, string> = { '高': '#FF375F', '中': '#FF9F0A', '低': '#8E8E93' }
const statusColorMap: Record<string, string> = {
  '待开始': '#5E6AD2', '进行中': '#34C759', '已完成': '#00D4AA', '已取消': '#8E8E93', '已过期': '#FF375F'
}

const stats = computed(() => {
  const todayStr = today.format('YYYY-MM-DD')
  const todayCount = dataList.value.filter(r => r.date === todayStr).length
  const thisWeekStart = today.startOf('week').subtract(1, 'second')
  const thisWeekEnd = today.endOf('week')
  const thisWeekCount = dataList.value.filter(r => {
    const d = dayjs(r.date)
    return d.isAfter(thisWeekStart) && d.isBefore(thisWeekEnd)
  }).length
  const highPrio = dataList.value.filter(r => r.priority === '高' && (r.status === '待开始' || r.status === '进行中')).length
  return { today: todayCount, week: thisWeekCount, high: highPrio }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    if (c[r.category] !== undefined) c[r.category]++
    else if (r.category === '健康生活') c['生活事务']++
  })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + r.note + ' ' + r.location + ' ' + r.attendees).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value) {
    if (selectedCategory.value === '生活事务') {
      if (!(r.category === '生活事务' || r.category === '健康生活')) return false
    } else if (r.category !== selectedCategory.value) return false
  }
  if (selectedTag.value) {
    const t = selectedTag.value
    if (t === '今日' && r.date !== today.format('YYYY-MM-DD')) return false
    if (t === '本周') {
      const d = dayjs(r.date)
      if (!(d.isAfter(today.startOf('week').subtract(1, 'second')) && d.isBefore(today.endOf('week')))) return false
    }
    if (t === '高优先级' && r.priority !== '高') return false
    if (t === '全天事件' && !r.allDay) return false
    if (['待开始', '进行中', '已完成'].includes(t) && r.status !== t) return false
    if (t === '已过期' && dayjs(r.date).isBefore(today) && r.status !== '已完成') return false
  }
  return true
}))
const sorted = computed(() => [...filtered.value].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)))
const getAbstract = (r: CalendarItem) => r.note && r.note.trim() ? r.note : '暂无详情'
const formatDate = (r: CalendarItem) => {
  const d = dayjs(r.date)
  if (r.allDay) {
    if (d.isSame(today, 'day')) return '今天 · 全天'
    if (d.isSame(today.add(1, 'day'), 'day')) return '明天 · 全天'
    return d.format('MM-DD dddd') + ' · 全天'
  }
  let prefix = ''
  if (d.isSame(today, 'day')) prefix = '今天 '
  else if (d.isSame(today.add(1, 'day'), 'day')) prefix = '明天 '
  return prefix + d.format('MM-DD dddd ') + r.startTime + ' - ' + r.endTime
}

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<CalendarItem>>({})
const rules = { title: [{ required: true, message: '请输入日程标题', trigger: 'blur' }] }
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', category: '工作会议', date: today.format('YYYY-MM-DD'), startTime: '09:00', endTime: '10:00', allDay: false, priority: '中', status: '待开始', location: '', attendees: '', note: '' })
  modalVisible.value = true
}
const openEdit = (r: CalendarItem) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  const entity = itemToEntity(form)
  try {
    if (isEdit.value) {
      await calendarApi.update(entity)
      const idx = dataList.value.findIndex(x => x.id === form.id)
      if (idx >= 0) dataList.value[idx] = entityToItem(entity)
      message.success('更新成功')
    } else {
      const res: any = await calendarApi.add(entity)
      const newEntity: CalendarEvent = res && typeof res === 'object' && 'id' in res ? res : { ...entity, id: (res as any) ?? Date.now() }
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
const del = (r: CalendarItem) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => {
    try {
      if (r.id) await calendarApi.remove(r.id)
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
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#5E6AD2','--as':'rgba(94,106,210,0.15)' }"><div class="si"><CalendarOutlined /></div><div class="sif"><div class="sv">{{ stats.today }}<span class="su">项</span></div><div class="sl">今日日程</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }"><div class="si"><RiseOutlined /></div><div class="sif"><div class="sv">{{ stats.week }}<span class="su">项</span></div><div class="sl">本周日程</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#FF375F','--as':'rgba(255,55,95,0.15)' }"><div class="si"><BellOutlined /></div><div class="sif"><div class="sv">{{ stats.high }}<span class="su">项</span></div><div class="sl">高优先级</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">日程分类</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建日程</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><CalendarOutlined style="color:#5E6AD2;margin-right:6px" />{{ selectedCategory || '全部日程' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索日程/地点/参与人" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:#71717A" /></template></a-input>
    </div>
    <div class="tr">
      <div v-for="t in tagList" :key="t" class="tc" :class="{ active: selectedTag === t }" @click="selectedTag = selectedTag === t ? null : t">{{ t }}</div>
    </div>
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="r in sorted" :key="r.id" class="nc">
          <div class="nm" @click="openEdit(r)">
            <div class="nh"><h4 class="nt">{{ r.title }}</h4>
              <Tag :color="catColorMap[r.category] || '#FF9F0A'" class="nct">{{ r.category }}</Tag>
              <Tag :color="priorityColorMap[r.priority]" class="nct">P{{ r.priority === '高' ? '0' : r.priority === '中' ? '1' : '2' }}</Tag>
              <Tag :color="statusColorMap[r.status]" class="nct">{{ r.status }}</Tag>
            </div>
            <div class="na">{{ getAbstract(r) }}</div>
            <div class="nme">
              <span class="mi mt" style="background:rgba(94,106,210,0.15);color:#5E6AD2"><ClockCircleOutlined /> {{ formatDate(r) }}</span>
              <span v-if="r.location" class="mi"><EnvironmentOutlined /> {{ r.location }}</span>
              <span v-if="r.attendees && r.attendees !== '自己'" class="mi"><UserOutlined /> {{ r.attendees }}</span>
            </div>
          </div>
          <div class="nacs" @click.stop>
            <Tooltip title="编辑"><a-button type="text" size="small" @click="openEdit(r)"><EditOutlined /></a-button></Tooltip>
            <Tooltip title="删除"><a-button type="text" size="small" danger @click="del(r)"><DeleteOutlined /></a-button></Tooltip>
          </div>
        </div>
      </div>
      <div v-else class="ec"><div class="ei">📅</div><div class="et">暂无日程安排</div><div class="ed">点击「新建日程」规划你的时间</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建日程</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑日程' : '新建日程'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="日程标题" name="title"><a-input v-model:value="form.title" placeholder="如：周会 - 产品迭代评审" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="日程分类"><a-select v-model:value="form.category"><a-select-option v-for="c in [...categoryList, { key:'健康生活', label:'健康/运动', icon:CheckCircleOutlined, color:'#00D4AA', bg:'rgba(0,212,170,0.15)' }]" :key="c.key" :value="c.key">{{ c.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="优先级"><a-select v-model:value="form.priority"><a-select-option value="高">高（P0）</a-select-option><a-select-option value="中">中（P1）</a-select-option><a-select-option value="低">低（P2）</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="状态"><a-select v-model:value="form.status"><a-select-option value="待开始">待开始</a-select-option><a-select-option value="进行中">进行中</a-select-option><a-select-option value="已完成">已完成</a-select-option><a-select-option value="已取消">已取消</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="日程日期"><a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="6"><a-form-item label="开始时间"><a-time-picker v-model:value="form.startTime" style="width:100%" format="HH:mm" valueFormat="HH:mm" /></a-form-item></a-col>
          <a-col :span="6"><a-form-item label="结束时间"><a-time-picker v-model:value="form.endTime" style="width:100%" format="HH:mm" valueFormat="HH:mm" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="全天事件"><a-switch v-model:checked="form.allDay" checked-children="是" un-checked-children="否" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="地点"><a-input v-model:value="form.location" placeholder="线下地点 / 线上会议链接" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="参与人"><a-input v-model:value="form.attendees" placeholder="自己 / 多人姓名" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="议程/备注/准备事项"><a-textarea v-model:value="form.note" :rows="5" placeholder="议程安排、准备材料、参考链接等" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
