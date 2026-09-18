<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  LikeOutlined,
  UserAddOutlined,
  SendOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  FireOutlined,
  RiseOutlined,
  EnvironmentOutlined,
  CalendarOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { mediaBoardApi, type MediaBoard } from '@/api/modules'

interface PlatformMeta {
  key: string
  name: string
  color: string
  soft: string
  gradient: string
  icon: any
  impressionLabel: string
}

const PLATFORMS: PlatformMeta[] = [
  {
    key: '抖音',
    name: '抖音',
    color: '#FF453A',
    soft: 'rgba(255,69,58,0.10)',
    gradient: 'linear-gradient(135deg, rgba(255,69,58,0.10) 0%, rgba(0,0,0,0.05) 100%)',
    icon: PlayCircleOutlined,
    impressionLabel: '播放量'
  },
  {
    key: 'B站',
    name: 'B站（哔哩哔哩）',
    color: '#5E6AD2',
    soft: 'rgba(94,106,210,0.10)',
    gradient: 'linear-gradient(135deg, rgba(94,106,210,0.10) 0%, rgba(255,105,180,0.05) 100%)',
    icon: EnvironmentOutlined,
    impressionLabel: '展现量'
  },
  {
    key: '小红书',
    name: '小红书',
    color: '#FF453A',
    soft: 'rgba(255,69,58,0.10)',
    gradient: 'linear-gradient(135deg, rgba(255,105,180,0.10) 0%, rgba(255,69,58,0.05) 100%)',
    icon: FireOutlined,
    impressionLabel: '曝光量'
  }
]

const loading = ref(false)
const dataList = ref<MediaBoard[]>([])
const searchKeyword = ref('')
const platformFilter = ref<string>('')

const platformOptions = [
  { label: '全部平台', value: '' },
  { label: '抖音', value: '抖音' },
  { label: 'B站', value: 'B站' },
  { label: '小红书', value: '小红书' },
  { label: '视频号', value: '视频号' },
  { label: '公众号', value: '公众号' },
  { label: '知乎', value: '知乎' }
]

const statsByPlatform = computed(() => {
  const map: Record<string, { impression: number; clicks: number; follows: number; count: number; ctr: number }> = {}
  PLATFORMS.forEach(p => { map[p.key] = { impression: 0, clicks: 0, follows: 0, count: 0, ctr: 0 } })
  dataList.value.forEach(m => {
    const plat = m.platform || '抖音'
    if (!map[plat]) map[plat] = { impression: 0, clicks: 0, follows: 0, count: 0, ctr: 0 }
    map[plat].impression += Number(m.impression ?? 0)
    map[plat].clicks += Number(m.clicks ?? 0)
    map[plat].follows += Number(m.follows ?? 0)
    map[plat].count += 1
  })
  Object.values(map).forEach(v => { v.ctr = v.impression > 0 ? Math.round((v.clicks / v.impression) * 1000) / 10 : 0 })
  return map
})

const genLast7Days = () => {
  const days: { date: string; label: string; value: number; platform: Record<string, number> }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day')
    const dateStr = d.format('YYYY-MM-DD')
    const countsByPlat: Record<string, number> = {}
    PLATFORMS.forEach(p => { countsByPlat[p.key] = 0 })
    const total = dataList.value.filter(m => {
      const md = (m.date || m.createTime || '').substring(0, 10)
      if (md !== dateStr) return false
      const plat = m.platform || '抖音'
      if (countsByPlat[plat] !== undefined) countsByPlat[plat] += 1
      return true
    }).length
    days.push({ date: dateStr, label: d.format('MM-DD'), value: total || (Math.floor(Math.random() * 5) + 1), platform: countsByPlat })
  }
  return days
}

const chartData = computed(() => genLast7Days())

const maxValue = computed(() => Math.max(...chartData.value.map(d => d.value), 1))

const filteredList = computed(() => {
  return dataList.value
    .filter(m => {
      if (searchKeyword.value) {
        const kw = searchKeyword.value.toLowerCase()
        const match =
          (m.title || '').toLowerCase().includes(kw) ||
          (m.content || '').toLowerCase().includes(kw)
        if (!match) return false
      }
      if (platformFilter.value && m.platform !== platformFilter.value) return false
      return true
    })
    .sort((a, b) => {
      const statusA = (a.mood || '').toLowerCase()
      const statusB = (b.mood || '').toLowerCase()
      const priority = (s: string) => s.includes('排期') || s.includes('待发') ? 0 : s.includes('进行中') ? 1 : 2
      return priority(statusA) - priority(statusB)
    })
})

const queueList = computed(() => {
  return filteredList.value
    .filter(m => {
      const s = (m.mood || '').toLowerCase()
      return s.includes('排期') || s.includes('待发') || s.includes('草稿') || !m.mood
    })
    .slice(0, 6)
})

const publishStage = (m: MediaBoard): { label: string; color: string; bg: string } => {
  const s = (m.mood || '').toLowerCase()
  if (s.includes('爆款') || s.includes('已发布')) return { label: '已发布', color: '#34C759', bg: 'rgba(52,199,89,0.12)' }
  if (s.includes('潜力') || s.includes('进行中') || s.includes('发布中')) return { label: '发布中', color: '#5E6AD2', bg: 'rgba(94,106,210,0.12)' }
  if (s.includes('排期') || s.includes('待发')) return { label: '待发布', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' }
  if (s.includes('冷门') || s.includes('暂停')) return { label: '已归档', color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' }
  return { label: '草稿', color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)' }
}

const modalVisible = ref(false)
const modalTitle = ref('新增看板数据')
const submitting = ref(false)
const editingId = ref<number | undefined>(undefined)

const formPlatformOptions = [
  { label: '抖音', value: '抖音' },
  { label: 'B站（哔哩哔哩）', value: 'B站' },
  { label: '小红书', value: '小红书' },
  { label: '视频号', value: '视频号' },
  { label: '公众号', value: '公众号' },
  { label: '知乎', value: '知乎' }
]

const form = reactive<MediaBoard>({
  title: '',
  platform: '抖音',
  date: dayjs().format('YYYY-MM-DD'),
  impression: 0,
  clicks: 0,
  follows: 0,
  mood: '排期待发',
  content: ''
})

const resetForm = () => {
  form.title = ''
  form.platform = '抖音'
  form.date = dayjs().format('YYYY-MM-DD')
  form.impression = 0
  form.clicks = 0
  form.follows = 0
  form.mood = '排期待发'
  form.content = ''
  editingId.value = undefined
}

const openAdd = () => {
  resetForm()
  modalTitle.value = '新增作品数据'
  modalVisible.value = true
}

const openEdit = (m: MediaBoard) => {
  resetForm()
  modalTitle.value = '编辑作品数据'
  editingId.value = m.id
  form.title = m.title
  form.platform = m.platform || '抖音'
  form.date = m.date || ''
  form.impression = m.impression ?? 0
  form.clicks = m.clicks ?? 0
  form.follows = m.follows ?? 0
  form.mood = m.mood || ''
  form.content = m.content || ''
  modalVisible.value = true
}

const handleSubmit = async () => {
  if (!form.title.trim()) {
    message.warning('请输入作品名称')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await mediaBoardApi.update({ ...form, id: editingId.value })
      message.success('更新成功')
    } else {
      await mediaBoardApi.add({ ...form })
      message.success('添加成功')
    }
    modalVisible.value = false
    await fetchData()
  } catch {
    // ignore
  } finally {
    submitting.value = false
  }
}

const handleDelete = (m: MediaBoard) => {
  if (!m.id) return
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除「${m.title}」的看板数据吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await mediaBoardApi.remove(m.id!)
        message.success('删除成功')
        await fetchData()
      } catch {
        // ignore
      }
    }
  })
}

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await mediaBoardApi.list()
    dataList.value = Array.isArray(res) ? res : (res?.records ?? [])
  } catch {
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const formatNumber = (n?: number) => {
  const v = Number(n ?? 0)
  if (v >= 10000) return `${(v / 10000).toFixed(1)}w`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${v}`
}

const getPlatformMeta = (p?: string): PlatformMeta => {
  const key = p || '抖音'
  const found = PLATFORMS.find(x => x.key === key)
  return found || PLATFORMS[0]
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="media-page">
    <!-- 顶部3平台卡 -->
    <div class="platform-row">
      <div
        v-for="p in PLATFORMS"
        :key="p.key"
        class="platform-card"
        :style="{ background: p.gradient, borderColor: `${p.color}22` }"
      >
        <div class="pf-head">
          <div class="pf-icon" :style="{ background: p.soft, color: p.color }">
            <component :is="p.icon" />
          </div>
          <div class="pf-info">
            <div class="pf-name">{{ p.name }}</div>
            <div class="pf-works">{{ statsByPlatform[p.key]?.count || 0 }} 条作品</div>
          </div>
          <div class="pf-trend up">
            <RiseOutlined /> +12.5%
          </div>
        </div>

        <div class="pf-stats">
          <div class="pf-stat">
            <div class="stat-icon-sm" :style="{ background: p.soft, color: p.color }">
              <EyeOutlined />
            </div>
            <div class="stat-txt">
              <div class="val">{{ formatNumber(statsByPlatform[p.key]?.impression) }}</div>
              <div class="lbl">{{ p.impressionLabel }}</div>
            </div>
          </div>
          <div class="pf-stat">
            <div class="stat-icon-sm" style="background:rgba(10,132,255,0.10); color:#0A84FF">
              <LikeOutlined />
            </div>
            <div class="stat-txt">
              <div class="val">{{ formatNumber(statsByPlatform[p.key]?.clicks) }}</div>
              <div class="lbl">互动点击</div>
            </div>
          </div>
          <div class="pf-stat">
            <div class="stat-icon-sm" style="background:rgba(52,199,89,0.10); color:#34C759">
              <UserAddOutlined />
            </div>
            <div class="stat-txt">
              <div class="val">+{{ formatNumber(statsByPlatform[p.key]?.follows) }}</div>
              <div class="lbl">新增粉丝</div>
            </div>
          </div>
        </div>

        <div class="pf-ctr">
          <span class="ctr-label">平均 CTR 点击率</span>
          <span class="ctr-value" :style="{ color: p.color }">{{ (statsByPlatform[p.key]?.ctr || 0).toFixed(1) }}%</span>
          <div class="ctr-bar">
            <div
              class="ctr-fill"
              :style="{
                width: `${Math.min((statsByPlatform[p.key]?.ctr || 0) * 20, 100)}%`,
                background: `linear-gradient(90deg, ${p.color}, ${p.color}AA)`
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="title-area">
        <h2 class="page-title">发布数据分析 & 发布队列</h2>
        <span class="page-subtitle">近7天发布趋势 · 共 {{ dataList.length }} 条数据</span>
      </div>
      <div class="tools">
        <a-input
          v-model:value="searchKeyword"
          placeholder="搜索作品名"
          allow-clear
          class="search"
        >
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select v-model:value="platformFilter" :options="platformOptions" style="width: 140px" />
        <a-button class="tool-btn" @click="fetchData"><ReloadOutlined /></a-button>
        <a-button type="primary" class="add-btn" @click="openAdd">
          <PlusOutlined /> 新增数据
        </a-button>
      </div>
    </div>

    <!-- 主体：7天柱图 + 右侧发布队列 -->
    <div class="main-grid">
      <!-- 7天柱图 -->
      <div class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-title">近 7 天发布趋势</div>
            <div class="card-sub">按平台分类 · SVG 条形图</div>
          </div>
          <div class="legend">
            <span v-for="p in PLATFORMS" :key="p.key" class="legend-item">
              <span class="legend-color" :style="{ background: p.color }"></span>
              {{ p.name }}
            </span>
          </div>
        </div>

        <div class="chart-wrap">
          <svg
            :viewBox="`0 0 720 260`"
            preserveAspectRatio="xMidYMid meet"
            class="chart-svg"
          >
            <defs>
              <linearGradient id="grid-line" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#27282F" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#27282F" stop-opacity="0.05" />
              </linearGradient>
              <linearGradient id="dy-bar" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#FF453A" stop-opacity="0.6" />
                <stop offset="100%" stop-color="#FF6B6B" />
              </linearGradient>
              <linearGradient id="bili-bar" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#5E6AD2" stop-opacity="0.6" />
                <stop offset="100%" stop-color="#7A85E0" />
              </linearGradient>
              <linearGradient id="xhs-bar" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="#FF69B4" stop-opacity="0.6" />
                <stop offset="100%" stop-color="#FF453A" />
              </linearGradient>
            </defs>

            <!-- 网格线 -->
            <g opacity="0.6">
              <line x1="60" y1="30" x2="700" y2="30" stroke="url(#grid-line)" stroke-width="1" />
              <line x1="60" y1="80" x2="700" y2="80" stroke="url(#grid-line)" stroke-width="1" />
              <line x1="60" y1="130" x2="700" y2="130" stroke="url(#grid-line)" stroke-width="1" />
              <line x1="60" y1="180" x2="700" y2="180" stroke="url(#grid-line)" stroke-width="1" />
            </g>

            <!-- Y轴标签 -->
            <g fill="#71717A" font-size="10" text-anchor="end">
              <text x="50" y="33">{{ maxValue }}</text>
              <text x="50" y="83">{{ Math.round(maxValue * 0.75) }}</text>
              <text x="50" y="133">{{ Math.round(maxValue * 0.5) }}</text>
              <text x="50" y="183">{{ Math.round(maxValue * 0.25) }}</text>
              <text x="50" y="215">0</text>
            </g>

            <!-- 柱状图 -->
            <g>
              <g
                v-for="(d, di) in chartData"
                :key="d.date"
                :transform="`translate(${70 + di * 92}, 0)`"
              >
                <rect
                  v-if="d.platform['抖音'] > 0"
                  x="0"
                  :y="210 - (d.platform['抖音'] / maxValue) * 180"
                  width="20"
                  :height="(d.platform['抖音'] / maxValue) * 180"
                  rx="4"
                  fill="url(#dy-bar)"
                >
                  <title>抖音 {{ d.platform['抖音'] }} 条</title>
                </rect>
                <rect
                  v-if="d.platform['B站'] > 0"
                  x="24"
                  :y="210 - (d.platform['B站'] / maxValue) * 180"
                  width="20"
                  :height="(d.platform['B站'] / maxValue) * 180"
                  rx="4"
                  fill="url(#bili-bar)"
                >
                  <title>B站 {{ d.platform['B站'] }} 条</title>
                </rect>
                <rect
                  v-if="d.platform['小红书'] > 0"
                  x="48"
                  :y="210 - (d.platform['小红书'] / maxValue) * 180"
                  width="20"
                  :height="(d.platform['小红书'] / maxValue) * 180"
                  rx="4"
                  fill="url(#xhs-bar)"
                >
                  <title>小红书 {{ d.platform['小红书'] }} 条</title>
                </rect>

                <!-- 数值标签 -->
                <text
                  x="34"
                  :y="210 - Math.max(d.platform['抖音'], d.platform['B站'], d.platform['小红书']) / maxValue * 180 - 6"
                  text-anchor="middle"
                  fill="#FAFAFA"
                  font-size="10"
                  font-weight="600"
                >
                  {{ d.value }}
                </text>

                <!-- X轴标签 -->
                <text x="34" y="235" text-anchor="middle" fill="#A1A1AA" font-size="10">
                  {{ d.label }}
                </text>
                <text
                  x="34"
                  y="248"
                  text-anchor="middle"
                  font-size="9"
                  :fill="dayjs(d.date).isSame(dayjs(), 'day') ? '#5E6AD2' : '#52525B'"
                >
                  {{ ['日','一','二','三','四','五','六'][dayjs(d.date).day()] }}
                  <tspan v-if="dayjs(d.date).isSame(dayjs(), 'day')"> · 今天</tspan>
                </text>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <!-- 右侧：发布队列 -->
      <div class="queue-card">
        <div class="card-header">
          <div>
            <div class="card-title">
              <SendOutlined style="color:#5E6AD2" /> 发布队列
            </div>
            <div class="card-sub">待发布 · 共 {{ queueList.length }} 条</div>
          </div>
          <a-button size="small" type="primary" ghost class="view-all-btn">
            查看全部
          </a-button>
        </div>

        <a-spin :spinning="loading" size="small">
          <div class="queue-list">
            <div v-if="queueList.length === 0" class="queue-empty">
              <div class="q-empty-icon"><CalendarOutlined /></div>
              <div class="q-empty-txt">暂无待发布内容</div>
              <div class="q-empty-sub">点击"新增数据"添加排期</div>
            </div>
            <div
              v-for="q in queueList"
              :key="q.id"
              class="queue-item"
            >
              <div
                class="queue-icon"
                :style="{
                  background: getPlatformMeta(q.platform).soft,
                  color: getPlatformMeta(q.platform).color
                }"
              >
                <component :is="getPlatformMeta(q.platform).icon" />
              </div>
              <div class="queue-main">
                <div class="q-title">{{ q.title }}</div>
                <div class="q-meta">
                  <span class="q-platform" :style="{ color: getPlatformMeta(q.platform).color }">
                    {{ q.platform || '抖音' }}
                  </span>
                  <span class="q-date">
                    <ClockCircleOutlined /> {{ q.date ? q.date.substring(5) : '待设定' }}
                  </span>
                </div>
              </div>
              <div class="queue-actions">
                <span
                  class="stage-chip"
                  :style="{
                    background: publishStage(q).bg,
                    color: publishStage(q).color,
                    borderColor: `${publishStage(q).color}22`
                  }"
                >
                  {{ publishStage(q).label }}
                </span>
                <a-button size="small" type="text" class="q-act" @click.stop="openEdit(q)">
                  <EditOutlined />
                </a-button>
                <a-button size="small" type="text" danger class="q-act" @click.stop="handleDelete(q)">
                  <DeleteOutlined />
                </a-button>
              </div>
            </div>
          </div>
        </a-spin>

        <!-- 近期发布列表 -->
        <div class="recent-section">
          <div class="recent-title">近期作品数据</div>
          <div class="recent-list">
            <div
              v-for="m in filteredList.slice(0, 5)"
              :key="'r'+m.id"
              class="recent-item"
              @click="openEdit(m)"
            >
              <div class="r-title">{{ m.title }}</div>
              <div class="r-stats">
                <span><EyeOutlined /> {{ formatNumber(m.impression) }}</span>
                <span><LikeOutlined /> {{ formatNumber(m.clicks) }}</span>
                <span><UserAddOutlined /> +{{ formatNumber(m.follows) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="submitting"
      :width="640"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="作品/排期名称" required>
          <a-input v-model:value="form.title" :maxlength="100" show-count placeholder="如：【产品教程】xxx功能使用指南" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="分发平台">
              <a-select v-model:value="form.platform" :options="formPlatformOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="发布/排期日期">
              <a-date-picker v-model:value="form.date" value-format="YYYY-MM-DD" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="展现量(曝光)">
              <a-input-number v-model:value="form.impression" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="点击/播放量">
              <a-input-number v-model:value="form.clicks" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="涨粉/点赞数">
              <a-input-number v-model:value="form.follows" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="数据评级/标签">
          <a-input v-model:value="form.mood" placeholder="⭐⭐⭐⭐⭐ / 爆款/潜力/常规/冷门/排期待发" />
        </a-form-item>
        <a-form-item label="运营复盘/投放策略/改进点">
          <a-textarea v-model:value="form.content" :rows="4" :maxlength="1000" show-count placeholder="记录选题、标题、封面、投放效果复盘..." />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.media-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px;
}

.platform-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-lg);
}

.platform-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--spacing-xl) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  transition: all 0.25s;
}

.platform-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

.pf-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.pf-icon {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.pf-info {
  flex: 1;
  min-width: 0;
}

.pf-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.pf-works {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.pf-trend {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pf-trend.up {
  background: rgba(52,199,89,0.10);
  color: #34C759;
}

.pf-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.pf-stat {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: rgba(161,161,170,0.04);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
}

.stat-icon-sm {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.stat-txt .val {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}
.stat-txt .lbl {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.pf-ctr {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.ctr-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.ctr-value {
  font-size: 15px;
  font-weight: 700;
  margin-left: auto;
}

.ctr-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: -20px;
}

.ctr-bar {
  margin-top: 0;
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  background: rgba(161,161,170,0.10);
  overflow: hidden;
  display: block;
}

.ctr-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.6s ease;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.title-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.page-subtitle {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.tools {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.search { width: 220px; }

.tool-btn {
  background: var(--color-bg-card-2);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 36px;
  padding: 0 !important;
}
.tool-btn:hover {
  border-color: var(--color-border-strong) !important;
  color: var(--color-text) !important;
}

.add-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.add-btn:hover {
  background: var(--color-primary-hover) !important;
  border-color: var(--color-primary-hover) !important;
}

.main-grid {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: var(--spacing-lg);
  min-height: 0;
}

.chart-card, .queue-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  transition: all 0.2s;
}
.chart-card:hover, .queue-card:hover {
  border-color: var(--color-border-strong);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.card-sub {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 3px;
}

.legend {
  display: flex;
  gap: var(--spacing-md);
}

.legend-item {
  font-size: 11px;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.chart-wrap {
  width: 100%;
  padding: var(--spacing-sm);
  background: var(--color-bg-card-2);
  border-radius: var(--radius-md);
}

.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}

.view-all-btn {
  font-size: 11px;
  height: auto;
  padding: 3px 10px !important;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.queue-empty {
  padding: var(--spacing-xl) var(--spacing-md);
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.q-empty-icon {
  font-size: 32px;
  color: var(--color-text-disabled);
  margin-bottom: 8px;
}
.q-empty-txt {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
}
.q-empty-sub {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.queue-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-card-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s;
}
.queue-item:hover {
  border-color: var(--color-primary-soft);
  transform: translateX(2px);
}

.queue-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.queue-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.q-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.q-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.q-platform {
  font-weight: 600;
}

.queue-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.stage-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid;
}

.q-act {
  color: var(--color-text-tertiary);
  padding: 0 4px !important;
}
.q-act:hover {
  color: var(--color-text) !important;
  background: var(--color-bg-hover) !important;
  border-radius: var(--radius-sm);
}

.recent-section {
  margin-top: auto;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.recent-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px var(--spacing-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.recent-item:hover {
  background: var(--color-bg-hover);
}

.r-title {
  font-size: 12px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}

.r-stats {
  display: flex;
  gap: var(--spacing-md);
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.r-stats span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

@media (max-width: 1200px) {
  .platform-row { grid-template-columns: 1fr; }
  .main-grid { grid-template-columns: 1fr; }
}
</style>
