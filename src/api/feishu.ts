import request from './request'

export interface FieldSchema { fieldName: string; type: number }

export const testFeishu = () => request.post('/feishu/test')
export const createBase = (name: string) => request.post<any, string>('/feishu/base/create', { name })
export const createTable = (data: { appToken: string; name: string; fields: FieldSchema[] }) =>
  request.post<any, string>('/feishu/table/create', data)
export const syncData = (data: { appToken: string; tableId: string; records: Record<string, any>[] }) =>
  request.post('/feishu/data/sync', data)
