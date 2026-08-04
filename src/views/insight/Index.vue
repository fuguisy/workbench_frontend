<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  DashboardOutlined,
  LineChartOutlined,
  PieChartOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  RocketOutlined,
  VideoCameraOutlined
} from '@ant-design/icons-vue'
import { statsApi, type InsightStatsVO, type TrendPoint } from '@/api/modules'

const loading = ref(false)
const data = ref<InsightStatsVO | null>(null)

const loadData = async () => {
  loading.value = true
  try {
    const res: any = await statsApi.insight()
    data.value = res as any
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// 计算近7日趋势图最大高度
const trendMax = computed(() => {
  if (!data.value?.last7DaysTrend?.length) return 1
  return Math.max(1, ...data.value.last7DaysTrend.map(t =>
    (t.todoCount || 0) + (t.ideaCount || 0) + (t.noteCount || 0) + (t.moneyCount || 0)
  ))
})

// 收支对比
const moneyBalance = computed(() => {
  if (!data.value) return 0
  const inc = Number(data.value.moneyStats?.income || 0)
  const exp = Number(data.value.moneyStats?.expense || 0)
  return inc - exp
})

// 任务完成率
const todoRate = computed(() => {
  if (!data.value?.todoStats || data.value.todoStats.total === 0) return 0
  return Math.round((data.value.todoStats.done / data.value.todoStats.total) * 100)
})

// 模块分布最大值（用于进度条宽度）
const distMax = computed(() => {
  if (!data.value?.moduleDistribution) return 1
  return Math.max(1, ...Object.values(data.value.moduleDistribution))
})

// 收支分类
const incomeEntries = computed(() => Object.entries(data.value?.moneyStats?.incomeByCategory || {}))
const expenseEntries = computed(() => Object.entries(data.value?.moneyStats?.expenseByCategory || {}))
</script>

<template>
  <div class="insight-page">
    <!-- 头部 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">📊 洞察复盘</h2>
        <p class="page-desc">数据驱动，发现成长节奏，复盘每一周、每一月的产出轨迹</p>
      </div>
      <a-button type="primary" :loading="loading" @click="loadData">
        <LineChartOutlined /> 刷新数据
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <!-- 总览卡片 -->
      <a-row :gutter="16" class="overview-row">
        <a-col :xs="12" :sm="8" :md="6">
          <a-card class="ov-card" :bordered="false" :loading="loading">
            <div class="ov-icon" style="background:#e6f4ff;color:#1677ff"><DashboardOutlined /></div>
            <div class="ov-value">{{ data?.overview?.totalRecords ?? 0 }}</div>
            <div class="ov-label">数据总记录</div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="6">
          <a-card class="ov-card" :bordered="false" :loading="loading">
            <div class="ov-icon" style="background:#f6ffed;color:#52c41a"><CheckCircleOutlined /></div>
            <div class="ov-value">{{ data?.overview?.thisWeekNew ?? 0 }}<span class="ov-suffix">条</span></div>
            <div class="ov-label">本周新增</div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="6">
          <a-card class="ov-card" :bordered="false" :loading="loading">
            <div class="ov-icon" style="background:#fff7e6;color:#fa8c16"><RocketOutlined /></div>
            <div class="ov-value">{{ data?.overview?.thisMonthNew ?? 0 }}<span class="ov-suffix">条</span></div>
            <div class="ov-label">本月新增</div>
          </a-card>
        </a-col>
        <a-col :xs="12" :sm="8" :md="6">
          <a-card class="ov-card" :bordered="false" :loading="loading">
            <div class="ov-icon" style="background:#fff0f6;color:#eb2f96"><PieChartOutlined /></div>
            <div class="ov-value">{{ todoRate }}<span class="ov-suffix">%</span></div>
            <div class="ov-label">任务完成率</div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 近7日趋势 -->
      <a-card class="trend-card" :bordered="false" :loading="loading">
        <template #title>
          <div class="card-title"><LineChartOutlined class="ct-icon" style="color:#1677ff" /> 近7日每日新增趋势</div>
        </template>
        <div class="trend-chart">
          <div v-for="(p, idx) in (data?.last7DaysTrend || []) as TrendPoint[]" :key="idx" class="trend-col">
            <div class="trend-bars">
              <div
                class="bar bar-todo"
                :style="{ height: `${((p.todoCount||0) / trendMax) * 100}%`, background:'#1677ff' }"
                :title="`任务：${p.todoCount||0}`"
              ></div>
              <div
                class="bar bar-idea"
                :style="{ height: `${((p.ideaCount||0) / trendMax) * 100}%`, background:'#faad14' }"
                :title="`灵感：${p.ideaCount||0}`"
              ></div>
              <div
                class="bar bar-note"
                :style="{ height: `${((p.noteCount||0) / trendMax) * 100}%`, background:'#52c41a' }"
                :title="`笔记/稿件：${p.noteCount||0}`"
              ></div>
              <div
                class="bar bar-money"
                :style="{ height: `${((p.moneyCount||0) / trendMax) * 100}%`, background:'#eb2f96' }"
                :title="`记账笔数：${p.moneyCount||0}`"
              ></div>
            </div>
            <div class="trend-date">{{ p.date }}</div>
          </div>
        </div>
        <div class="trend-legend">
          <span class="lg-item"><i style="background:#1677ff"></i> 任务</span>
          <span class="lg-item"><i style="background:#faad14"></i> 灵感</span>
          <span class="lg-item"><i style="background:#52c41a"></i> 笔记/稿件</span>
          <span class="lg-item"><i style="background:#eb2f96"></i> 记账笔数</span>
        </div>
      </a-card>

      <a-row :gutter="16" class="main-row">
        <!-- 左：任务统计 + 项目Top5 -->
        <a-col :xs="24" :lg="12">
          <a-card class="sub-card" :bordered="false" :loading="loading">
            <template #title>
              <div class="card-title"><CheckCircleOutlined class="ct-icon" style="color:#52c41a" /> 任务完成统计</div>
            </template>
            <div class="todo-stat-grid">
              <div class="ts-cell">
                <div class="ts-num" style="color:#1677ff">{{ data?.todoStats?.total ?? 0 }}</div>
                <div class="ts-label">任务总数</div>
              </div>
              <div class="ts-cell">
                <div class="ts-num" style="color:#52c41a">{{ data?.todoStats?.done ?? 0 }}</div>
                <div class="ts-label">已完成</div>
              </div>
              <div class="ts-cell">
                <div class="ts-num" style="color:#faad14">{{ data?.todoStats?.doing ?? 0 }}</div>
                <div class="ts-label">进行中</div>
              </div>
              <div class="ts-cell">
                <div class="ts-num" style="color:#ff4d4f">{{ data?.todoStats?.overdue ?? 0 }}</div>
                <div class="ts-label">已逾期</div>
              </div>
            </div>
            <a-divider />
            <div class="card-title" style="font-size:14px;margin-bottom:12px">📌 优先级分布</div>
            <div class="prio-row">
              <template v-for="(label, p) in { P0:'P0 紧急', P1:'P1 高', P2:'P2 中', P3:'P3 低' }" :key="p">
                <a-tag :color="p==='P0'?'#ff4d4f':p==='P1'?'#fa8c16':p==='P2'?'#1677ff':'#8c8c8c'" style="margin-right:8px;margin-bottom:8px">
                  {{ label }}：{{ data?.todoStats?.priorityCount?.[p] ?? 0 }}
                </a-tag>
              </template>
            </div>
          </a-card>

          <a-card class="sub-card mt16" :bordered="false" :loading="loading">
            <template #title>
              <div class="card-title"><RocketOutlined class="ct-icon" style="color:#722ed1" /> 项目进度 Top 5</div>
            </template>
            <div v-if="!data?.projectTop5?.length" class="empty-tip">暂无项目数据</div>
            <div v-else>
              <div v-for="(p, idx) in data.projectTop5" :key="idx" class="proj-row">
                <div class="proj-head">
                  <span class="proj-title">{{ p.title }}</span>
                  <a-tag :color="p.percent>=100?'green':p.percent>=60?'blue':p.percent>=30?'orange':'red'" style="margin:0">
                    {{ p.status }} · {{ p.percent }}%
                  </a-tag>
                </div>
                <div class="proj-meta" style="color:rgba(0,0,0,0.45);font-size:12px;margin-bottom:6px">
                  当前：{{ p.current }} / 目标：{{ p.target }}
                </div>
                <div class="proj-bar">
                  <div
                    class="proj-bar-inner"
                    :style="{
                      width: p.percent + '%',
                      background: p.percent>=100?'#52c41a':p.percent>=60?'#1677ff':p.percent>=30?'#faad14':'#ff4d4f'
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <!-- 右：收支统计 + 模块分布 + 自媒体产出 -->
        <a-col :xs="24" :lg="12">
          <a-card class="sub-card" :bordered="false" :loading="loading">
            <template #title>
              <div class="card-title"><WalletOutlined class="ct-icon" style="color:#eb2f96" /> 收支统计</div>
            </template>
            <div class="money-top">
              <div class="money-col">
                <div class="money-label">总收入</div>
                <div class="money-value" style="color:#52c41a">¥ {{ Number(data?.moneyStats?.income || 0).toFixed(2) }}</div>
              </div>
              <div class="money-col">
                <div class="money-label">总支出</div>
                <div class="money-value" style="color:#ff4d4f">¥ {{ Number(data?.moneyStats?.expense || 0).toFixed(2) }}</div>
              </div>
              <div class="money-col">
                <div class="money-label">结余</div>
                <div class="money-value" :style="{ color: moneyBalance>=0?'#1677ff':'#ff4d4f' }">¥ {{ moneyBalance.toFixed(2) }}</div>
              </div>
            </div>
            <a-divider />
            <a-row :gutter="12">
              <a-col :xs="24" :md="12">
                <div class="card-title" style="font-size:14px;margin-bottom:10px">📈 收入分类</div>
                <div v-if="!incomeEntries.length" class="empty-tip">暂无记录</div>
                <div v-else>
                  <div v-for="[k,v] in incomeEntries" :key="k" class="cat-row">
                    <span class="cat-name">{{ k }}</span>
                    <span class="cat-val" style="color:#52c41a">¥ {{ Number(v).toFixed(2) }}</span>
                  </div>
                </div>
              </a-col>
              <a-col :xs="24" :md="12">
                <div class="card-title" style="font-size:14px;margin-bottom:10px">📉 支出分类</div>
                <div v-if="!expenseEntries.length" class="empty-tip">暂无记录</div>
                <div v-else>
                  <div v-for="[k,v] in expenseEntries" :key="k" class="cat-row">
                    <span class="cat-name">{{ k }}</span>
                    <span class="cat-val" style="color:#ff4d4f">¥ {{ Number(v).toFixed(2) }}</span>
                  </div>
                </div>
              </a-col>
            </a-row>
          </a-card>

          <a-card class="sub-card mt16" :bordered="false" :loading="loading">
            <template #title>
              <div class="card-title"><DashboardOutlined class="ct-icon" style="color:#13c2c2" /> 模块分布</div>
            </template>
            <div v-for="(v, k) in (data?.moduleDistribution || {})" :key="k" class="dist-row">
              <div class="dist-head">
                <span>{{ k }}</span>
                <span style="color:rgba(0,0,0,0.45)">{{ v }} 条</span>
              </div>
              <div class="dist-bar"><div class="dist-bar-inner" :style="{ width: `${(v/distMax)*100}%` }"></div></div>
            </div>
          </a-card>

          <a-card class="sub-card mt16" :bordered="false" :loading="loading">
            <template #title>
              <div class="card-title"><VideoCameraOutlined class="ct-icon" style="color:#fa8c16" /> 自媒体产出</div>
            </template>
            <div class="media-grid">
              <div class="mg-cell">
                <div class="mg-num" style="color:#faad14">{{ data?.mediaStats?.ideaCount ?? 0 }}</div>
                <div class="mg-label">💡 灵感素材</div>
              </div>
              <div class="mg-cell">
                <div class="mg-num" style="color:#1677ff">{{ data?.mediaStats?.mediaCount ?? 0 }}</div>
                <div class="mg-label">🎬 素材库</div>
              </div>
              <div class="mg-cell">
                <div class="mg-num" style="color:#722ed1">{{ data?.mediaStats?.docsCount ?? 0 }}</div>
                <div class="mg-label">📜 创作稿件</div>
              </div>
              <div class="mg-cell">
                <div class="mg-num" style="color:#52c41a">{{ data?.mediaStats?.boardCount ?? 0 }}</div>
                <div class="mg-label">📊 运营数据</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<style scoped>
.insight-page { display:flex; flex-direction:column; gap:16px; }
.page-header {
  display:flex; justify-content:space-between; align-items:center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 20px 24px; border-radius: 10px; color:#fff;
}
.page-title { margin:0 0 4px 0; color:#fff; font-size:20px; }
.page-desc { margin:0; color:rgba(255,255,255,0.85); font-size:13px; }
.overview-row { margin:0; }
.ov-card { border-radius:10px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,21,41,0.06); }
.ov-card :deep(.ant-card-body) { padding:16px 20px; display:flex; align-items:center; gap:14px; }
.ov-icon { width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
.ov-value { font-size:26px; font-weight:600; color:rgba(0,0,0,0.88); line-height:1.1; }
.ov-suffix { font-size:13px; font-weight:400; margin-left:2px; color:rgba(0,0,0,0.45); }
.ov-label { font-size:13px; color:rgba(0,0,0,0.55); margin-top:4px; }

.card-title { display:flex; align-items:center; gap:6px; font-size:15px; font-weight:600; }
.ct-icon { font-size:16px; }
.trend-card { border-radius:10px; box-shadow:0 1px 4px rgba(0,21,41,0.06); }
.trend-chart { display:flex; align-items:flex-end; gap:12px; height:240px; padding: 20px 10px 10px; }
.trend-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:8px; }
.trend-bars { flex:1; width:100%; display:flex; align-items:flex-end; justify-content:center; gap:3px; }
.bar { width:22%; border-radius:4px 4px 0 0; transition: height .3s; min-height: 2px; }
.trend-date { font-size:12px; color:rgba(0,0,0,0.55); }
.trend-legend { display:flex; gap:16px; justify-content:center; padding: 4px 0; border-top:1px dashed #f0f0f0; margin-top:8px; padding-top:12px; }
.lg-item { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:rgba(0,0,0,0.65); }
.lg-item i { width:10px; height:10px; border-radius:2px; display:inline-block; }

.sub-card { border-radius:10px; box-shadow:0 1px 4px rgba(0,21,41,0.06); }
.mt16 { margin-top:16px; }
.empty-tip { padding:24px 0; text-align:center; color:rgba(0,0,0,0.35); font-size:13px; }

.todo-stat-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; }
.ts-cell { text-align:center; padding:10px 6px; background:#fafafa; border-radius:8px; }
.ts-num { font-size:22px; font-weight:600; }
.ts-label { font-size:12px; color:rgba(0,0,0,0.55); margin-top:4px; }
.prio-row { display:flex; flex-wrap:wrap; }

.proj-row + .proj-row { margin-top:14px; }
.proj-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.proj-title { font-weight:500; color:rgba(0,0,0,0.88); }
.proj-bar { width:100%; height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden; }
.proj-bar-inner { height:100%; border-radius:4px; transition: width .3s; }

.money-top { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; text-align:center; }
.money-col { background:#fafafa; padding:10px 6px; border-radius:8px; }
.money-label { font-size:12px; color:rgba(0,0,0,0.55); }
.money-value { font-size:18px; font-weight:600; margin-top:4px; }
.cat-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px dashed #f5f5f5; font-size:13px; }
.cat-row:last-child { border-bottom:0; }
.cat-name { color:rgba(0,0,0,0.75); }

.dist-row { margin-bottom:10px; }
.dist-head { display:flex; justify-content:space-between; margin-bottom:5px; font-size:13px; color:rgba(0,0,0,0.8); }
.dist-bar { height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden; }
.dist-bar-inner { height:100%; background:linear-gradient(90deg, #1677ff, #722ed1); border-radius:4px; transition: width .3s; }

.media-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; }
.mg-cell { text-align:center; padding:12px 6px; background:linear-gradient(135deg, #fff7e6, #ffe7ba); border-radius:8px; }
.mg-num { font-size:20px; font-weight:600; }
.mg-label { font-size:12px; color:rgba(0,0,0,0.6); margin-top:4px; }
</style>
