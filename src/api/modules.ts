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
export interface Lead {
  id?: number
  userId?: number
  title: string
  source?: string
  stage?: string
  contact?: string
  budget?: number
  quote?: number
  nextFollow?: string
  demand?: string
  note?: string
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

export interface Notification {
  id?: number
  userId?: number
  title: string
  content: string
  type: 'TASK' | 'BUG' | 'DOC' | 'CHECKIN' | 'MONEY' | 'SYSTEM'
  read?: boolean
  extra?: string
  priority?: string
  date?: string
  createTime?: string
  updateTime?: string
}

export interface CalendarEvent {
  id?: number
  userId?: number
  title: string
  category: 'WORK' | 'MEDIA' | 'FOCUS' | 'REVIEW' | 'LIFE'
  location?: string
  attendees?: string
  startTime?: string
  endTime?: string
  allDay?: boolean
  priority?: string
  status?: string
}

export interface OkrObjective {
  id?: number
  userId?: number
  title: string
  category: 'WORK' | 'MEDIA' | 'TECH' | 'READ' | 'HEALTH'
  period?: string
  currValue?: number
  targetValue?: number
  unit?: string
  startDate?: string
  endDate?: string
  status?: string
  progress?: number
  score?: number
  review?: string
}

export interface OkrKeyResult {
  id?: number
  userId?: number
  objectiveId: number
  title: string
  currValue?: number
  targetValue?: number
  unit?: string
  progress?: number
  progressMode?: 'MANUAL' | 'TASK_LINKED'
  taskId?: number
  weight?: number
  status?: string
}

export interface FocusRecord {
  id?: number
  userId?: number
  title: string
  scene: 'DEEP' | 'CREATE' | 'READ' | 'MEET' | 'SPORT'
  minutesActual?: number
  minutesStandard?: number
  pomosExpected?: number
  status?: 'DOING' | 'DONE' | 'CANCEL'
  recordDate?: string
  taskId?: number
  taskTitle?: string
}

export interface Subscription {
  id?: number
  userId?: number
  title: string
  category: 'AI' | 'DEV' | 'CLOUD' | 'OFFICE' | 'ENTERTAINMENT'
  provider?: string
  planType?: 'MONTHLY' | 'YEARLY' | 'ONCE'
  costYuan?: number
  renewDate?: string
  autoRenew?: boolean
  status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED'
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
export const leadApi = createCrud<Lead>('/lead')
export const checkinApi = createCrud<Checkin>('/checkin')

// 习惯打卡面板扩展接口
export interface HabitPanelItem extends Checkin {
  todayDone: boolean
  streak: number
  totalCount: number
}
export interface PanelStats {
  total: number
  done: number
  pending: number
  rate: number
  maxStreak: number
  weekRate?: number
  weekRateMom?: number
  yearCount?: number
  totalCount?: number
  longestStreakName?: string
}
export interface PanelData {
  habits: HabitPanelItem[]
  stats: PanelStats
}
export const checkinPanelApi = {
  panel: () => request.get<any, PanelData>('/checkin/panel'),
  punch: (habitId: number) => request.post<any, boolean>(`/checkin/punch/${habitId}`),
  monthDates: (habitId: number, year: number, month: number) =>
    request.get<any, string[]>(`/checkin/month-dates/${habitId}`, { params: { year, month } })
}
export const secretsApi = createCrud<Secrets>('/secrets')
export const backupApi = createCrud<BackupLog>('/backup')
export const moneyApi = createCrud<Money>('/money')

const _notificationBase = createCrud<Notification>('/notification')
export const notificationApi = {
  ..._notificationBase,
  readOne: (id: number) => request.post<any, void>(`/notification/${id}/read`),
  readAll: () => request.post<any, void>('/notification/read-all')
}
export const calendarApi = createCrud<CalendarEvent>('/calendar')
export const okrApi = createCrud<OkrObjective>('/okr')

// OKR KR API
export const okrKrApi = {
  list: (objectiveId: number) => request.get(`/okr/kr/list/${objectiveId}`),
  add: (data: OkrKeyResult) => request.post('/okr/kr', data),
  update: (data: OkrKeyResult) => request.put('/okr/kr', data),
  remove: (id: number) => request.delete(`/okr/kr/${id}`)
}
export const focusApi = createCrud<FocusRecord>('/focus')
export const subscriptionApi = createCrud<Subscription>('/subscription')

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
export interface InsightItem { title: string; desc: string; tag: string }
export interface CompareItem { label: string; last: number; cur: number; delta: string; deltaColor: string }
export interface NextActionItem { id: number; title: string; role: string; done: boolean }
export interface ContentBreakdown { gzh?: number; video?: number; xhs?: number; other?: number }
export interface InsightStatsVO {
  overview: Overview;
  last7DaysTrend: TrendPoint[];
  moduleDistribution: Record<string, number>;
  todoStats: TodoStats;
  moneyStats: MoneyStats;
  projectTop5: ProjectRank[];
  mediaStats: MediaStats;
  focusHoursThisWeek?: number;
  focusHoursMomPct?: number;
  todoDoneRate?: number;
  todoOverdueCount?: number;
  contentOutputThisWeek?: number;
  contentBreakdown?: ContentBreakdown;
  barsFocus?: number[];
  barsTodo?: number[];
  barsContent?: number[];
  insights?: InsightItem[];
  compares?: CompareItem[];
  nextActions?: NextActionItem[];
}
export const statsApi = {
  dashboard: () => request.get<any, DashboardStatsVO>('/stats/dashboard'),
  insight: () => request.get<any, InsightStatsVO>('/stats/insight')
}

// 文档分类树
export interface DocCategory {
  id?: number
  userId?: number
  parentId?: number
  name: string
  sort?: number
  createTime?: string
  updateTime?: string
}
export interface CategoryTreeNode {
  key: string
  title: string
  id: number
  parentId: number
  sort?: number
  children?: CategoryTreeNode[]
}
export const docCategoryApi = {
  tree: () => request.get<any, CategoryTreeNode[]>('/doc-category/tree'),
  list: () => request.get<any, DocCategory[]>('/doc-category/list'),
  add: (parentId: number, name: string) =>
    request.post<any, DocCategory>('/doc-category', { parentId, name }),
  rename: (id: number, name: string) =>
    request.put<any, void>(`/doc-category/${id}`, { name }),
  remove: (id: number) => request.delete<any, void>(`/doc-category/${id}`)
}
