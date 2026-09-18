<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { message, Modal, Tag, Tooltip } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined, AuditOutlined,
  CloudServerOutlined, DatabaseOutlined, ContainerOutlined, NodeIndexOutlined,
  ClockCircleOutlined, SearchOutlined, ReloadOutlined, CheckCircleOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { svcApi, type Svc } from '@/api/modules'

const loading = ref(false)
const dataList = ref<Svc[]>([])
const selectedCategory = ref<string | null>(null)
const selectedTag = ref<string | null>(null)
const searchText = ref('')

const categoryList = [
  { key: 'Docker', label: 'Docker 单容器', icon: ContainerOutlined, color: '#00A4FF', bg: 'rgba(0, 164, 255, 0.15)' },
  { key: 'Compose', label: 'Docker Compose', icon: NodeIndexOutlined, color: '#5E6AD2', bg: 'rgba(94, 106, 210, 0.15)' },
  { key: '原生', label: '原生安装', icon: CloudServerOutlined, color: '#FF9F0A', bg: 'rgba(255, 159, 10, 0.15)' },
  { key: 'K8s', label: 'K8s 集群', icon: DatabaseOutlined, color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' },
  { key: '宝塔', label: '面板管理', icon: CheckCircleOutlined, color: '#FF375F', bg: 'rgba(255, 55, 95, 0.15)' }
]
const tagList = ['运行中', '待维护', '已下线', '数据持久化', '反向代理', '备份配置', 'NAS存储', '公网访问']
const deployColorMap: Record<string, string> = {
  'Docker': '#00A4FF', 'Compose': '#5E6AD2', '原生': '#FF9F0A',
  'K8s': '#34C759', '宝塔': '#FF375F'
}

const stats = computed(() => {
  const total = dataList.value.length
  const now = dayjs()
  const monthStart = now.startOf('month')
  const monthNew = dataList.value.filter(r => {
    const t = r.createTime || r.updateTime || r.date
    return t && dayjs(t).isAfter(monthStart)
  }).length
  const running = dataList.value.filter(r => (r.mood || '').includes('运行') || (r.mood || '').includes('✅')).length
  return { total, monthNew, running }
})
const catCounts = computed(() => {
  const c: Record<string, number> = {}
  categoryList.forEach(x => { c[x.key] = 0 })
  dataList.value.forEach(r => {
    const k = r.deploy || 'Docker'
    if (c[k] !== undefined) c[k]++; else c['Docker']++
  })
  return c
})
const filtered = computed(() => dataList.value.filter(r => {
  if (searchText.value) {
    const kw = searchText.value.toLowerCase()
    const key = (r.title + ' ' + (r.host || '') + ' ' + (r.port || '') + ' ' + (r.content || '') + ' ' + (r.mood || '')).toLowerCase()
    if (!key.includes(kw)) return false
  }
  if (selectedCategory.value && r.deploy !== selectedCategory.value) return false
  if (selectedTag.value) {
    const t = selectedTag.value.toLowerCase()
    const md = (r.mood || '').toLowerCase()
    const ct = (r.content || '').toLowerCase()
    if (t === '运行中' && !md.includes('运行') && !md.includes('✅')) return false
    if (t === '已下线' && !md.includes('下线') && !md.includes('❌')) return false
    if (['待维护', '数据持久化', '反向代理', '备份配置', 'NAS存储', '公网访问'].includes(selectedTag.value)) {
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
const getAbstract = (r: Svc) => {
  const t = (r.content || '').replace(/[#*`>\-]/g, '').trim()
  return t.length > 120 ? t.substring(0, 120) + '...' : t || '暂无服务说明'
}
const getTime = (r: Svc) => {
  const t = r.updateTime || r.createTime || r.date
  if (!t) return '-'
  const d = dayjs(t)
  if (d.isAfter(dayjs().subtract(1, 'day'))) return d.format('今天 HH:mm')
  if (d.isAfter(dayjs().subtract(7, 'day'))) return d.format('MM-DD HH:mm')
  return d.format('YYYY-MM-DD')
}
const loadData = async () => {
  loading.value = true
  try { dataList.value = (await svcApi.list()) || [] }
  catch { dataList.value = [] }
  finally { loading.value = false }
}
onMounted(loadData)

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive<Partial<Svc>>({})
const rules = {
  title: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机IP/域名', trigger: 'blur' }]
}
const deployOptions = [
  { label: 'Docker 单容器', value: 'Docker' }, { label: 'Docker Compose', value: 'Compose' },
  { label: '原生安装', value: '原生' }, { label: 'K8s 部署', value: 'K8s' },
  { label: '宝塔/面板', value: '宝塔' }
]
const openAdd = () => {
  isEdit.value = false
  Object.assign(form, { title: '', host: '', port: '', deploy: 'Docker', date: dayjs().format('YYYY-MM-DD'), mood: '✅ 运行中', content: '' })
  delete form.id
  modalVisible.value = true
}
const openEdit = (r: Svc) => { isEdit.value = true; Object.assign(form, r); modalVisible.value = true }
const saveForm = async () => {
  try { await formRef.value?.validate() } catch { return }
  try {
    if (isEdit.value && form.id) await svcApi.update({ ...form } as Svc), message.success('更新成功')
    else await svcApi.add({ ...form } as Svc), message.success('新增成功')
    modalVisible.value = false; await loadData()
  } catch (e: any) { message.error(e?.message || '保存失败') }
}
const del = (r: Svc) => Modal.confirm({
  title: `确认删除「${r.title}」？`, okType: 'danger', okText: '确认删除', cancelText: '取消',
  onOk: async () => { await svcApi.remove(r.id as number); message.success('已删除'); await loadData() }
})
</script>

<template>
  <div class="p">
    <a-row :gutter="16" class="srow">
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#5E6AD2','--as':'rgba(94,106,210,0.15)' }"><div class="si"><CloudServerOutlined /></div><div class="sif"><div class="sv">{{ stats.total }}<span class="su">个</span></div><div class="sl">服务总数</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#34C759','--as':'rgba(52,199,89,0.15)' }"><div class="si"><RiseOutlined /></div><div class="sif"><div class="sv">{{ stats.monthNew }}<span class="su">个</span></div><div class="sl">本月新增</div></div></div></a-col>
      <a-col :xs="24" :sm="8"><div class="sc" :style="{ '--a':'#00A4FF','--as':'rgba(0,164,255,0.15)' }"><div class="si"><CheckCircleOutlined /></div><div class="sif"><div class="sv">{{ stats.running }}<span class="su">个</span></div><div class="sl">运行中</div></div></div></a-col>
    </a-row>
    <div class="st"><span class="stt">部署方式</span><div class="sa"><a-button size="small" @click="loadData"><ReloadOutlined /> 刷新</a-button><a-button size="small" type="primary" @click="openAdd"><PlusOutlined /> 新建服务</a-button></div></div>
    <div class="cg">
      <div v-for="c in categoryList" :key="c.key" class="cc" :class="{ active: selectedCategory === c.key }" :style="{ '--cc':c.color,'--cb':c.bg }" @click="selectedCategory = selectedCategory === c.key ? null : c.key">
        <div class="cbg">{{ catCounts[c.key] }}</div>
        <div class="ci"><component :is="c.icon" /></div>
        <div class="cl">{{ c.label }}</div>
      </div>
    </div>
    <div class="st"><span class="stt"><CloudServerOutlined style="color:#5E6AD2;margin-right:6px" />{{ selectedCategory || '全部服务' }} <span class="scu">({{ sorted.length }})</span></span>
      <a-input v-model:value="searchText" placeholder="搜索服务名/主机/端口" allow-clear size="small" style="width:220px"><template #prefix><SearchOutlined style="color:#71717A" /></template></a-input>
    </div>
    <div class="tr">
      <div v-for="t in tagList" :key="t" class="tc" :class="{ active: selectedTag === t }" @click="selectedTag = selectedTag === t ? null : t">{{ t }}</div>
    </div>
    <a-spin :spinning="loading" tip="加载中...">
      <div v-if="sorted.length" class="nl">
        <div v-for="r in sorted" :key="r.id" class="nc">
          <div class="nm" @click="openEdit(r)">
            <div class="nh"><h4 class="nt">{{ r.title }}</h4>
              <Tag v-if="r.deploy" :color="deployColorMap[r.deploy] || 'default'" class="nct">{{ r.deploy }}</Tag>
            </div>
            <div class="na">{{ getAbstract(r) }}</div>
            <div class="nme">
              <span class="mi">🖥 {{ r.host || '未配置' }}</span>
              <span v-if="r.port" class="mi">🔌 {{ r.port }}</span>
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
      <div v-else class="ec"><div class="ei">🖥️</div><div class="et">暂无自部署服务</div><div class="ed">点击「新建服务」开始管理你的 Homelab</div><a-button type="primary" style="margin-top:16px" @click="openAdd"><PlusOutlined /> 新建服务</a-button></div>
    </a-spin>
    <a-modal v-model:open="modalVisible" :title="isEdit ? '编辑服务' : '新建服务'" ok-text="保存" cancel-text="取消" :width="720" @ok="saveForm" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="24"><a-form-item label="服务/容器名称" name="title"><a-input v-model:value="form.title" placeholder="如：Vaultwarden / OpenWebUI / Nextcloud" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="主机IP/域名" name="host"><a-input v-model:value="form.host" placeholder="192.168.1.100 / myserver.com" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="端口映射"><a-input v-model:value="form.port" placeholder="8080:80 / 3306" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="部署方式"><a-select v-model:value="form.deploy"><a-select-option v-for="o in deployOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option></a-select></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="最近更新日期"><a-date-picker v-model:value="form.date" style="width:100%" valueFormat="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="服务状态/标签"><a-input v-model:value="form.mood" placeholder="✅运行中/⚠维护中/❌已下线 / 是否开启备份" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="服务说明/启动命令/运维命令/挂载目录"><a-textarea v-model:value="form.content" :rows="10" placeholder="记录 docker-compose.yml、启动参数、数据卷挂载、常用运维命令" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
@import './_page-style.css';
</style>
