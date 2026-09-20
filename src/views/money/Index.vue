<script setup lang="ts">
import { h, ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import CrudPage from '@/components/CrudPage.vue'
import { moneyApi } from '@/api/modules'
import type { CrudConfig } from '@/types/crud'

// CrudPage 引用，用于月份切换时刷新列表
const crudRef = ref<InstanceType<typeof CrudPage>>()

// —— 月份切换 ——
const selectedMonth = ref(dayjs()) // 默认当前月
const isCurrentMonth = computed(() => selectedMonth.value.isSame(dayjs(), 'month'))

const prevMonth = () => { selectedMonth.value = selectedMonth.value.subtract(1, 'month') }
const nextMonth = () => {
  if (!isCurrentMonth.value) selectedMonth.value = selectedMonth.value.add(1, 'month')
}
const resetMonth = () => { selectedMonth.value = dayjs() }

// 可选月份列表（最近12个月）
const monthOptions = computed(() => {
  const arr: { label: string; value: string }[] = []
  for (let i = 0; i < 12; i++) {
    const m = dayjs().subtract(i, 'month')
    arr.push({ label: m.format('YYYY年MM月'), value: m.format('YYYY-MM') })
  }
  return arr
})

const onMonthPick = (val: string) => {
  selectedMonth.value = dayjs(val + '-01')
}

// —— 月度收支统计 ——
const allRecords = ref<any[]>([])

const loadStats = async () => {
  try {
    const list = await moneyApi.list()
    allRecords.value = Array.isArray(list) ? list : []
  } catch { allRecords.value = [] }
}

const monthStats = computed(() => {
  const ym = selectedMonth.value.format('YYYY-MM')
  const monthData = allRecords.value.filter(r => (r.date || '').startsWith(ym))
  const income = monthData.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount || 0), 0)
  const expense = monthData.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount || 0), 0)
  // 按分类统计支出
  const categoryMap: Record<string, number> = {}
  monthData.filter(r => r.type === 'expense').forEach(r => {
    const cat = r.category || '其他'
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(r.amount || 0)
  })
  const categories = Object.entries(categoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
  return { income, expense, balance: income - expense, categories, count: monthData.length }
})

// 预算配置（按分类，存储在 localStorage）
const budgetConfig = ref<Record<string, number>>(
  JSON.parse(localStorage.getItem('wb-money-budget') || '{}')
)
const budgetVisible = ref(false)
const budgetForm = ref<Record<string, string>>({})

const openBudgetModal = () => {
  const categories = ['日常餐饮', '交通出行', '房租水电', '数码设备', '学习提升', '娱乐休闲', '其他']
  budgetForm.value = {}
  categories.forEach(c => { budgetForm.value[c] = String(budgetConfig.value[c] || '') })
  budgetVisible.value = true
}

const saveBudget = () => {
  const result: Record<string, number> = {}
  Object.entries(budgetForm.value).forEach(([k, v]) => {
    const n = Number(v)
    if (n > 0) result[k] = n
  })
  budgetConfig.value = result
  localStorage.setItem('wb-money-budget', JSON.stringify(result))
  budgetVisible.value = false
}

const budgetWarnings = computed(() => {
  const warnings: string[] = []
  monthStats.value.categories.forEach(c => {
    const budget = budgetConfig.value[c.name]
    if (budget && budget > 0) {
      const pct = Math.round((c.amount / budget) * 100)
      if (pct >= 100) warnings.push(`${c.name}已超支 ${(c.amount - budget).toFixed(0)}元`)
      else if (pct >= 80) warnings.push(`${c.name}已用${pct}%`)
    }
  })
  return warnings
})

onMounted(() => { loadStats() })

// 月份变化时刷新列表
watch(selectedMonth, () => {
  crudRef.value?.loadData()
})

// —— CRUD 配置 ——
const config: CrudConfig = {
  title: '收支记账',
  api: moneyApi,
  extraFilter: (record: any) => {
    const ym = selectedMonth.value.format('YYYY-MM')
    return (record.date || '').startsWith(ym)
  },
  searchFields: [
    { key: 'title', label: '标题/备注', type: 'input' },
    {
      key: 'type', label: '类型', type: 'select', options: [
        { label: '收入', value: 'income' }, { label: '支出', value: 'expense' }
      ]
    },
    {
      key: 'category', label: '分类', type: 'select', options: [
        { label: '主业工资', value: '主业工资' },
        { label: '自媒体收入', value: '自媒体收入' },
        { label: 'AI收入', value: 'AI收入' },
        { label: '日常餐饮', value: '日常餐饮' },
        { label: '交通出行', value: '交通出行' },
        { label: '房租水电', value: '房租水电' },
        { label: '数码设备', value: '数码设备' },
        { label: '其他', value: '其他' }
      ]
    }
  ],
  columns: [
    { title: '事项', dataIndex: 'title', width: 200 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      align: 'center',
      customRender: ({ text, record }: any) => {
        const isIncome = text === 'income'
        return h('a-tag', { color: isIncome ? 'green' : 'red' }, () => [
          isIncome ? '💰 收入' : '💸 支出',
          h('span', { style: { marginLeft: '4px', fontWeight: 600, color: isIncome ? '#52c41a' : '#ff4d4f' } },
            `${isIncome ? '+' : '-'}¥${Number(record.amount || 0).toFixed(2)}`
          )
        ])
      }
    },
    { title: '分类', dataIndex: 'category', width: 120, align: 'center' },
    { title: '来源/去向', dataIndex: 'source', width: 120, align: 'center' },
    { title: '日期', dataIndex: 'date', width: 120, align: 'center' },
    { title: '创建时间', dataIndex: 'createTime', width: 180, align: 'center' },
    { title: '操作', dataIndex: 'action', width: 150, fixed: 'right', align: 'center' }
  ],
  formFields: [
    { key: 'title', label: '事项', type: 'input', required: true, span: 24 },
    {
      key: 'type', label: '类型', type: 'select', required: true, span: 8, options: [
        { label: '收入', value: 'income' }, { label: '支出', value: 'expense' }
      ]
    },
    { key: 'amount', label: '金额(元)', type: 'number', required: true, span: 8 },
    {
      key: 'category', label: '分类', type: 'select', span: 8, options: [
        { label: '主业工资', value: '主业工资' },
        { label: '自媒体收入', value: '自媒体收入' },
        { label: 'AI收入', value: 'AI收入' },
        { label: '理财收益', value: '理财收益' },
        { label: '日常餐饮', value: '日常餐饮' },
        { label: '交通出行', value: '交通出行' },
        { label: '房租水电', value: '房租水电' },
        { label: '数码设备', value: '数码设备' },
        { label: '学习提升', value: '学习提升' },
        { label: '娱乐休闲', value: '娱乐休闲' },
        { label: '其他', value: '其他' }
      ]
    },
    { key: 'date', label: '日期', type: 'date', span: 8 },
    { key: 'source', label: '来源/去向', type: 'input', placeholder: '微信/支付宝/银行卡', span: 8 }
  ]
}

// 数据变化后刷新统计
const onDataChanged = () => { loadStats() }
</script>

<template>
  <div class="money-page">
    <!-- 月度收支概览 -->
    <div class="stats-panel">
      <div class="stats-header">
        <div class="month-switcher">
          <button class="month-btn" @click="prevMonth">‹</button>
          <a-select
            :value="selectedMonth.format('YYYY-MM')"
            @change="onMonthPick"
            class="month-select"
            :bordered="false"
          >
            <a-select-option v-for="m in monthOptions" :key="m.value" :value="m.value">
              {{ m.label }}
            </a-select-option>
          </a-select>
          <button class="month-btn" @click="nextMonth" :disabled="isCurrentMonth">›</button>
          <button v-if="!isCurrentMonth" class="month-reset" @click="resetMonth">回到本月</button>
        </div>
        <a-button size="small" @click="openBudgetModal">设置分类预算</a-button>
      </div>

      <div class="stats-cards">
        <div class="stat-card income">
          <span class="stat-label">{{ isCurrentMonth ? '本月' : '当月' }}收入</span>
          <span class="stat-value">+¥{{ monthStats.income.toFixed(2) }}</span>
        </div>
        <div class="stat-card expense">
          <span class="stat-label">{{ isCurrentMonth ? '本月' : '当月' }}支出</span>
          <span class="stat-value">-¥{{ monthStats.expense.toFixed(2) }}</span>
        </div>
        <div class="stat-card balance" :class="{ negative: monthStats.balance < 0 }">
          <span class="stat-label">{{ isCurrentMonth ? '本月' : '当月' }}结余</span>
          <span class="stat-value">{{ monthStats.balance >= 0 ? '+' : '' }}¥{{ monthStats.balance.toFixed(2) }}</span>
        </div>
      </div>

      <!-- 无数据提示 -->
      <div v-if="monthStats.count === 0" class="empty-month">
        该月份暂无收支记录
      </div>

      <!-- 分类支出明细 + 预算进度 -->
      <div v-if="monthStats.categories.length > 0" class="category-breakdown">
        <div v-for="c in monthStats.categories" :key="c.name" class="cat-row">
          <div class="cat-info">
            <span class="cat-name">{{ c.name }}</span>
            <span class="cat-amount">¥{{ c.amount.toFixed(2) }}</span>
            <template v-if="budgetConfig[c.name]">
              <span class="cat-budget" :class="{ over: c.amount > budgetConfig[c.name] }">
                / ¥{{ budgetConfig[c.name].toFixed(0) }}
              </span>
            </template>
          </div>
          <div class="cat-bar" v-if="budgetConfig[c.name]">
            <div
              class="cat-bar-inner"
              :style="{
                width: Math.min(100, (c.amount / budgetConfig[c.name]) * 100) + '%',
                background: c.amount > budgetConfig[c.name] ? '#ff4d4f' : c.amount > budgetConfig[c.name] * 0.8 ? '#faad14' : '#52c41a'
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 预算预警 -->
      <div v-if="budgetWarnings.length > 0" class="budget-warnings">
        <span v-for="w in budgetWarnings" :key="w" class="warning-tag">{{ w }}</span>
      </div>
    </div>

    <!-- CRUD 表格 -->
    <CrudPage ref="crudRef" :config="config" @changed="onDataChanged" />

    <!-- 预算设置弹窗 -->
    <a-modal
      v-model:open="budgetVisible"
      title="分类预算设置（月度）"
      @ok="saveBudget"
      okText="保存预算"
      cancelText="取消"
    >
      <p style="color: var(--color-text-secondary, rgba(0,0,0,0.45)); margin-bottom: 16px">
        为各支出分类设定月度预算上限，系统将自动从当月流水中统计已用金额并预警。
      </p>
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col v-for="(_, cat) in budgetForm" :key="cat" :span="12">
            <a-form-item :label="cat as string">
              <a-input v-model:value="budgetForm[cat]" addon-before="¥" addon-after="元/月" placeholder="不设预算" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.money-page { display: flex; flex-direction: column; gap: 16px; }

.stats-panel {
  background: var(--color-bg-card, #fff);
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,21,41,0.06);
}
.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.month-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
}
.month-btn {
  width: 28px;
  height: 28px;
  border: 1.5px solid #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  font-size: 16px;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 2px 6px rgba(102,126,234,0.3);
}
.month-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(102,126,234,0.45);
}
.month-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(102,126,234,0.3);
}
.month-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.month-select {
  min-width: 140px;
  font-weight: 600;
  font-size: 15px;
}
.month-select :deep(.ant-select-selector) {
  padding: 0 8px !important;
  font-weight: 600;
}
.month-reset {
  margin-left: 8px;
  padding: 2px 10px;
  font-size: 12px;
  border: 1px solid #667eea;
  background: transparent;
  color: #667eea;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.month-reset:hover {
  background: #667eea;
  color: #fff;
}
.empty-month {
  text-align: center;
  padding: 32px 0;
  color: var(--color-text-secondary, #86909c);
  font-size: 14px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 10px;
  border: 1px solid var(--color-border, #f0f0f0);
}
.stat-card.income { background: linear-gradient(135deg, #f0fff4 0%, #e6ffec 100%); }
.stat-card.expense { background: linear-gradient(135deg, #fff2f0 0%, #ffe7e6 100%); }
.stat-card.balance { background: linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%); }
.stat-card.balance.negative { background: linear-gradient(135deg, #fff2f0 0%, #ffe7e6 100%); }
.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary, rgba(0,0,0,0.55));
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
}
.stat-card.income .stat-value { color: #52c41a; }
.stat-card.expense .stat-value { color: #ff4d4f; }
.stat-card.balance .stat-value { color: #1677ff; }
.stat-card.balance.negative .stat-value { color: #ff4d4f; }

.category-breakdown {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cat-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cat-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.cat-name {
  color: var(--color-text, rgba(0,0,0,0.85));
  min-width: 80px;
}
.cat-amount {
  font-weight: 600;
  color: var(--color-text, rgba(0,0,0,0.85));
  font-family: 'Consolas', monospace;
}
.cat-budget {
  color: var(--color-text-secondary, rgba(0,0,0,0.45));
  font-family: 'Consolas', monospace;
}
.cat-budget.over { color: #ff4d4f; font-weight: 600; }
.cat-bar {
  width: 100%;
  height: 6px;
  background: var(--color-bg-soft, #f0f0f0);
  border-radius: 3px;
  overflow: hidden;
}
.cat-bar-inner {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.budget-warnings {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.warning-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffe58f;
}

@media (max-width: 768px) {
  .stats-cards { grid-template-columns: 1fr; }
}
</style>
