import request from './request'

// 通用 CRUD 接口
export function createCrud<T>(baseUrl: string) {
  return {
    list: () => request.get<any, T[]>(`${baseUrl}/list`),
    page: (params: { current: number; size: number }) =>
      request.get<any, { records: T[]; total: number; current: number; size: number }>(`${baseUrl}/page`, { params }),
    add: (data: T) => request.post(`${baseUrl}`, data),
    update: (data: T) => request.put(`${baseUrl}`, data),
    remove: (id: number) => request.delete(`${baseUrl}/${id}`)
  }
}

// 各模块实体接口定义
export interface Project {
  id?: number
  userId?: number
  title: string
  current: number
  target: number
  unit: string
  note?: string
  status: string
  deadline?: string
  category?: string
  owner?: string
  createTime?: string
  updateTime?: string
}
export interface Bugs {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  service?: string
  level?: string
  stage?: string
  fixVer?: string
  createTime?: string
  updateTime?: string
}
export interface Repo {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  category?: string
  repo?: string
  branch?: string
  createTime?: string
  updateTime?: string
}
export interface Svc {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  host?: string
  port?: string
  deploy?: string
  createTime?: string
  updateTime?: string
}
export interface ReadProgress {
  id?: number
  userId?: number
  title: string
  current: number
  target: number
  unit: string
  note?: string
  createTime?: string
  updateTime?: string
}
export interface Tech {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  lang?: string
  createTime?: string
  updateTime?: string
}
export interface AiLab {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  category?: string
  model?: string
  createTime?: string
  updateTime?: string
}
export interface Idea {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  platform?: string
  createTime?: string
  updateTime?: string
}
export interface Media {
  id?: number
  userId?: number
  title: string
  current: number
  target: number
  unit: string
  note?: string
  stage?: string
  platform?: string
  date?: string
  url?: string
  views?: number
  createTime?: string
  updateTime?: string
}
export interface MediaBoard {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  platform?: string
  impression?: number
  clicks?: number
  follows?: number
  createTime?: string
  updateTime?: string
}
export interface Docs {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  category?: string
  wordCount?: number
  createTime?: string
  updateTime?: string
}
export interface Checkin {
  id?: number
  userId?: number
  title: string
  log?: string
  groupName?: string
  cycle?: string
  createTime?: string
  updateTime?: string
}
export interface Secrets {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  category?: string
  location?: string
  createTime?: string
  updateTime?: string
}
export interface BackupLog {
  id?: number
  userId?: number
  title: string
  content?: string
  mood?: string
  date?: string
  category?: string
  destination?: string
  sizeGb?: number
  createTime?: string
  updateTime?: string
}
export interface Money {
  id?: number
  userId?: number
  title: string
  type: string
  amount: number
  category?: string
  date?: string
  source?: string
  budget?: string
  createTime?: string
  updateTime?: string
}

// 任务待办：用 Todo 接口类型 + 复用通用CRUD + 保留 toggleDone
import type { Todo } from './todo'
import { toggleTodoDone } from './todo'

const _todoBase = createCrud<Todo>('/todo')
export const todoApi = { ..._todoBase, toggleDone: toggleTodoDone }

// 导出各模块的 CRUD API
export const projectApi = createCrud<Project>('/project')
export const bugsApi = createCrud<Bugs>('/bugs')
export const repoApi = createCrud<Repo>('/repo')
export const svcApi = createCrud<Svc>('/svc')
export const readApi = createCrud<ReadProgress>('/read')
export const techApi = createCrud<Tech>('/tech')
export const aiApi = createCrud<AiLab>('/ai')
export const ideaApi = createCrud<Idea>('/idea')
export const mediaApi = createCrud<Media>('/media')
export const mediaBoardApi = createCrud<MediaBoard>('/media-board')
export const docsApi = createCrud<Docs>('/docs')
export const checkinApi = createCrud<Checkin>('/checkin')
export const secretsApi = createCrud<Secrets>('/secrets')
export const backupApi = createCrud<BackupLog>('/backup')
export const moneyApi = createCrud<Money>('/money')

// Markdown 文档管理
export interface MarkdownDoc {
  id?: number
  userId?: number
  title: string
  category?: string
  content?: string
  tags?: string
  status?: string
  filePath?: string
  wordCount?: number
  createTime?: string
  updateTime?: string
}
type CrudBase<T> = ReturnType<typeof createCrud<T>>
export interface MarkdownApi extends CrudBase<MarkdownDoc> {
  upload: (file: File, category?: string, saveDir?: string) => Promise<MarkdownDoc>
  downloadUrl: (id: number) => string
  saveToFile: (id: number, dir?: string) => Promise<{ path: string }>
  openTypora: (id: number) => Promise<string>
  openDefault: (id: number) => Promise<string>
}
const _mdBase: Record<string, any> = createCrud<MarkdownDoc>('/markdown')
_mdBase.upload = async (file: File, category?: string, saveDir?: string) => {
  const fd = new FormData()
  fd.append('file', file)
  if (category) fd.append('category', category)
  if (saveDir) fd.append('saveDir', saveDir)
  const res = await request.post<any, any>('/markdown/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as any
}
_mdBase.downloadUrl = (id: number) => `/markdown/download/${id}`
_mdBase.saveToFile = (id: number, dir?: string) => {
  const q = dir ? `?dir=${encodeURIComponent(dir)}` : ''
  return request.post<any, any>(`/markdown/save-to-file/${id}${q}`, {})
}
_mdBase.openTypora = (id: number) => request.post<any, any>(`/markdown/open-typora/${id}`, {})
_mdBase.openDefault = (id: number) => request.post<any, any>(`/markdown/open-default/${id}`, {})
export const markdownApi = _mdBase as MarkdownApi

// 统计接口
export interface DashboardStatsVO {
  todoTodayCount: number; todoDoneCount: number; bugsOpenCount: number; projectProgress: number;
  techNoteCount: number; repoCount: number; aiLabCount: number; ideaCount: number; readCount: number;
  mediaCount: number; docsCount: number; mediaBoardCount: number;
  moneyMonthTotal: number; moneyMonthIncome: number; moneyMonthExpense: number;
  checkinActiveCount: number; totalRecords: number; moduleCounts: Record<string, number>;
}
export interface TrendPoint { date: string; todoCount: number; ideaCount: number; noteCount: number; moneyCount: number; }
export interface ProjectRank { title: string; current: number; target: number; percent: number; status: string; }
export interface TodoStats { total: number; done: number; doing: number; pending: number; overdue: number; priorityCount: Record<string, number>; }
export interface MoneyStats { income: number; expense: number; incomeByCategory: Record<string, number>; expenseByCategory: Record<string, number>; }
export interface MediaStats { ideaCount: number; mediaCount: number; docsCount: number; boardCount: number; }
export interface Overview { totalRecords: number; thisWeekNew: number; thisMonthNew: number; doneTodoCount: number; totalIncome: number; totalExpense: number; }
export interface InsightStatsVO {
  overview: Overview;
  last7DaysTrend: TrendPoint[];
  moduleDistribution: Record<string, number>;
  todoStats: TodoStats;
  moneyStats: MoneyStats;
  projectTop5: ProjectRank[];
  mediaStats: MediaStats;
}
export const statsApi = {
  dashboard: () => request.get<any, DashboardStatsVO>('/stats/dashboard'),
  insight: () => request.get<any, InsightStatsVO>('/stats/insight')
}
