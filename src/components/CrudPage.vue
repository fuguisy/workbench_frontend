<script setup lang="ts">
import { ref, reactive, onMounted, computed, defineComponent, h } from 'vue'
import { message, Modal, Tag } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons-vue'
import type { CrudConfig } from '@/types/crud'

// 用于渲染 customRender 返回的 VNode / 字符串 / 数字
const VNodeRenderer = defineComponent({
  name: 'VNodeRenderer',
  props: { content: { type: [Object, String, Number, null], default: null } },
  render() {
    return this.content ?? '-'
  }
})

const props = defineProps<{ config: CrudConfig }>()
// 增删改成功后对外广播，供父页面刷新自己的统计/图表
const emit = defineEmits<{ (e: 'changed'): void }>()

const loading = ref(false)
const dataList = ref<any[]>([])
const modalVisible = ref(false)
const modalTitle = ref('')
const formRef = ref()
const searchParams = reactive<Record<string, any>>({})

const form = reactive<Record<string, any>>({})

// ====== 分页 ======
// 是否有搜索条件：有则回退全量加载+前端过滤+前端分页；无则后端分页
const hasSearch = computed(() => {
  if (!props.config.searchFields) return false
  return props.config.searchFields.some(f => searchParams[f.key])
})
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
  pageSizeOptions: ['10', '20', '50', '100']
})

const loadData = async () => {
  loading.value = true
  try {
    if (hasSearch.value || props.config.extraFilter) {
      // 搜索模式或有外部过滤：全量加载 + 前端过滤 + 前端分页
      const res = await props.config.api.list()
      let all = res || []
      // 应用外部过滤（如月份筛选）
      if (props.config.extraFilter) {
        all = all.filter(props.config.extraFilter)
      }
      // 应用搜索字段过滤
      if (hasSearch.value) {
        all = all.filter((item: any) => {
          return props.config.searchFields!.every((field) => {
            const val = searchParams[field.key]
            if (!val) return true
            const itemVal = String(item[field.key] || '').toLowerCase()
            return itemVal.includes(String(val).toLowerCase())
          })
        })
      }
      dataList.value = all
      pagination.total = dataList.value.length
    } else {
      // 后端分页
      const res: any = await props.config.api.page({ current: pagination.current, size: pagination.pageSize })
      dataList.value = (res && res.records) || []
      pagination.total = Number((res && res.total) || 0)
    }
  } catch (e) {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

// 搜索模式或有外部过滤时前端切片；后端分页模式下直接返回 dataList
const filteredData = computed(() => {
  if (hasSearch.value || props.config.extraFilter) {
    const start = (pagination.current - 1) * pagination.pageSize
    return dataList.value.slice(start, start + pagination.pageSize)
  }
  return dataList.value
})

const onTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  if (!hasSearch.value) {
    loadData()
  }
}

const doSearch = () => {
  pagination.current = 1
  loadData()
}

const resetSearch = () => {
  if (props.config.searchFields) {
    props.config.searchFields.forEach((f) => {
      searchParams[f.key] = ''
    })
  }
  pagination.current = 1
  loadData()
}

const openAdd = () => {
  modalTitle.value = `新增${props.config.title}`
  props.config.formFields.forEach((f) => {
    form[f.key] = f.type === 'number' ? 0 : ''
  })
  delete form.id
  modalVisible.value = true
}

const openEdit = (record: any) => {
  modalTitle.value = `编辑${props.config.title}`
  props.config.formFields.forEach((f) => {
    form[f.key] = record[f.key] ?? (f.type === 'number' ? 0 : '')
  })
  form.id = record.id
  modalVisible.value = true
}

const handleOk = async () => {
  try {
    await formRef.value?.validate()
    if (form.id) {
      await props.config.api.update({ ...form })
      message.success('更新成功')
    } else {
      await props.config.api.add({ ...form })
      message.success('新增成功')
      pagination.current = 1
    }
    modalVisible.value = false
    await loadData()
    emit('changed')
  } catch (e: any) {
    if (e?.errorFields) return
  }
}

const handleDelete = (record: any) => {
  Modal.confirm({
    title: `确认删除「${record.title || record.id}」？`,
    content: '删除后不可恢复',
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await props.config.api.remove(record.id)
      message.success('删除成功')
      await loadData()
      emit('changed')
    }
  })
}

const formatDate = (val: any) => {
  if (!val) return '-'
  if (typeof val === 'string' && val.includes('T')) {
    return val.replace('T', ' ').substring(0, 19)
  }
  return val
}

onMounted(() => {
  loadData()
})

defineExpose({ loadData })
</script>

<template>
  <div class="crud-page">
    <!-- 搜索栏 -->
    <div class="search-bar" v-if="config.searchFields?.length">
      <a-row :gutter="16">
        <a-col v-for="field in config.searchFields" :key="field.key" :span="6">
          <a-form-item :label="field.label">
            <a-input v-if="field.type === 'input'" v-model:value="searchParams[field.key]" allow-clear />
            <a-select v-else v-model:value="searchParams[field.key]" allow-clear>
              <a-select-option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-space>
            <a-button type="primary" @click="doSearch"><SearchOutlined /> 搜索</a-button>
            <a-button @click="resetSearch">重置</a-button>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <h3 class="page-title">{{ config.title }}</h3>
      <a-button type="primary" @click="openAdd"><PlusOutlined /> 新增</a-button>
    </div>

    <!-- 数据表格 -->
    <a-table
      :columns="config.columns"
      :data-source="filteredData"
      :loading="loading"
      row-key="id"
      :pagination="pagination"
      :scroll="{ x: 'max-content' }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.dataIndex === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record)"><EditOutlined /> 编辑</a-button>
            <a-button type="link" danger size="small" @click="handleDelete(record)"><DeleteOutlined /> 删除</a-button>
          </a-space>
        </template>
        <template v-else-if="column.dataIndex === 'createTime' || column.dataIndex === 'updateTime'">
          {{ formatDate(record[column.dataIndex]) }}
        </template>
        <template v-else-if="column.customRender">
          <VNodeRenderer :content="column.customRender({ text: record[column.dataIndex], record, index, column })" />
        </template>
        <template v-else-if="column.tagColorMap">
          <a-tag :color="column.tagColorMap[record[column.dataIndex]] || 'default'">
            {{ record[column.dataIndex] || '-' }}
          </a-tag>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑弹窗 -->
    <a-modal v-model:open="modalVisible" :title="modalTitle" width="700px" @ok="handleOk" :destroyOnClose="true">
      <a-form ref="formRef" :model="form" layout="vertical">
        <a-row :gutter="16">
          <a-col v-for="field in config.formFields" :key="field.key" :span="field.span || 24">
            <a-form-item
              :label="field.label"
              :name="field.key"
              :rules="field.required ? [{ required: true, message: `请输入${field.label}` }] : []"
            >
              <a-input v-if="field.type === 'input'" v-model:value="form[field.key]" :placeholder="field.placeholder || `请输入${field.label}`" />
              <a-input-number v-else-if="field.type === 'number'" v-model:value="form[field.key]" :placeholder="field.placeholder" style="width: 100%" />
              <a-textarea v-else-if="field.type === 'textarea'" v-model:value="form[field.key]" :rows="4" :placeholder="`请输入${field.label}`" />
              <a-date-picker v-else-if="field.type === 'date'" v-model:value="form[field.key]" style="width: 100%" valueFormat="YYYY-MM-DD" />
              <a-select v-else-if="field.type === 'select'" v-model:value="form[field.key]" :placeholder="`请选择${field.label}`" allow-clear>
                <a-select-option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.crud-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}
.search-bar {
  flex-shrink: 0;
  background: var(--color-bg-card, #fff);
  padding: 16px;
  border-radius: 8px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
</style>
