<script setup lang="ts">
import { ref, reactive, onMounted, computed, defineComponent, h } from 'vue'
import { message, Modal, Tag } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons-vue'

export interface CrudConfig {
  title: string
  api: any
  columns: CrudColumn[]
  formFields: FormField[]
  searchFields?: SearchField[]
}

export interface CrudColumn {
  title: string
  dataIndex: string
  width?: number | string
  fixed?: 'left' | 'right' | boolean
  align?: 'left' | 'center' | 'right'
  ellipsis?: boolean
  customRender?: (params: { text: any; record: any; index: number; column: any }) => any
  tagColorMap?: Record<string, string>
}

export interface FormField {
  key: string
  label: string
  type: 'input' | 'textarea' | 'select' | 'number' | 'date'
  options?: { label: string; value: string }[]
  required?: boolean
  placeholder?: string
  span?: number
}

export interface SearchField {
  key: string
  label: string
  type: 'input' | 'select'
  options?: { label: string; value: string }[]
}

// 用于渲染 customRender 返回的 VNode / 字符串 / 数字
const VNodeRenderer = defineComponent({
  name: 'VNodeRenderer',
  props: { content: { type: [Object, String, Number, null], default: null } },
  render() {
    return this.content ?? '-'
  }
})

const props = defineProps<{ config: CrudConfig }>()

const loading = ref(false)
const dataList = ref<any[]>([])
const modalVisible = ref(false)
const modalTitle = ref('')
const formRef = ref()
const searchParams = reactive<Record<string, any>>({})

const form = reactive<Record<string, any>>({})

const loadData = async () => {
  loading.value = true
  try {
    const res = await props.config.api.list()
    dataList.value = res || []
  } catch (e) {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

const filteredData = computed(() => {
  if (!props.config.searchFields) return dataList.value
  return dataList.value.filter((item: any) => {
    return props.config.searchFields!.every((field) => {
      const val = searchParams[field.key]
      if (!val) return true
      const itemVal = String(item[field.key] || '').toLowerCase()
      return itemVal.includes(String(val).toLowerCase())
    })
  })
})

const resetSearch = () => {
  if (props.config.searchFields) {
    props.config.searchFields.forEach((f) => {
      searchParams[f.key] = ''
    })
  }
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
    }
    modalVisible.value = false
    loadData()
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
      loadData()
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
            <a-button type="primary" @click="loadData"><SearchOutlined /> 搜索</a-button>
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
      :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }"
      :scroll="{ x: 'max-content' }"
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
}
.search-bar {
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
