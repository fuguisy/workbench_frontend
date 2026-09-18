export interface CrudConfig {
  title: string
  api: any
  columns: CrudColumn[]
  formFields: FormField[]
  searchFields?: SearchField[]
  extraFilter?: (record: any) => boolean
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
