import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// 自定义路由 meta 字段
type RouteMetaExt = {
  title: string
  desc?: string
  group: 'workbench' | 'efficiency' | 'dev' | 'media' | 'personal' | 'system'
  order: number
  public?: boolean
}

declare module 'vue-router' {
  interface RouteMeta extends RouteMetaExt {}
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', public: true, group: 'system', order: 99 } as RouteMetaExt
  },
  {
    path: '/',
    name: 'Main',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/',
    children: [
      // —— 【工作台】（3）——
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '工作台总览', desc: '下午好晓贵，今天3项高优任务待处理', group: 'workbench', order: 1 }
      },
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/views/calendar/Index.vue'),
        meta: { title: '日历 / 日程', desc: '行程安排 · 会议提醒 · 截止倒计时', group: 'workbench', order: 2 }
      },
      {
        path: 'notification',
        name: 'Notification',
        component: () => import('@/views/notification/Index.vue'),
        meta: { title: '通知中心', desc: '3 条未读 · 今天', group: 'workbench', order: 3 }
      },

      // —— 【效率】（3）——
      {
        path: 'todo',
        name: 'Todo',
        component: () => import('@/views/todo/Index.vue'),
        meta: { title: '任务看板', desc: '12 个任务 · 7 进行中 · 按优先级自动排序', group: 'efficiency', order: 1 }
      },
      {
        path: 'focus',
        name: 'Focus',
        component: () => import('@/views/focus/Index.vue'),
        meta: { title: '专注 / 番茄钟', desc: '深度工作计时 · 本周已专注 12h 24m', group: 'efficiency', order: 2 }
      },
      {
        path: 'okr',
        name: 'Okr',
        component: () => import('@/views/okr/Index.vue'),
        meta: { title: '目标 / OKR', desc: '2026 Q3 · 5 个目标进行中', group: 'efficiency', order: 3 }
      },

      // —— 【程序员】（7：代码仓/AI + 保留原 bugs/project/svc/read/tech）——
      {
        path: 'repo',
        name: 'Repo',
        component: () => import('@/views/repo/Index.vue'),
        meta: { title: '代码仓库', desc: '12 个仓库 · 3 台服务器 · 2 个待审核 PR', group: 'dev', order: 1 }
      },
      {
        path: 'ai',
        name: 'Ai',
        component: () => import('@/views/ai/Index.vue'),
        meta: { title: 'AI 实验室', desc: '提示词库 · 本地模型 · AI 自动化脚本', group: 'dev', order: 2 }
      },
      {
        path: 'bugs',
        name: 'Bugs',
        component: () => import('@/views/bugs/Index.vue'),
        meta: { title: 'Bug 台账', desc: '问题追踪 · 复现步骤 · 修复记录', group: 'dev', order: 3 }
      },
      {
        path: 'project',
        name: 'Project',
        component: () => import('@/views/project/Index.vue'),
        meta: { title: '项目进度', desc: '微服务台账 · 版本迭代 · 联调节点', group: 'dev', order: 4 }
      },
      {
        path: 'svc',
        name: 'Svc',
        component: () => import('@/views/svc/Index.vue'),
        meta: { title: '服务器 & 自部署', desc: 'Docker · Vaultwarden · Nextcloud', group: 'dev', order: 5 }
      },
      {
        path: 'read',
        name: 'Read',
        component: () => import('@/views/read/Index.vue'),
        meta: { title: '学习阅读', desc: '书单进度 · 读书笔记 · 阅读统计', group: 'dev', order: 6 }
      },
      {
        path: 'tech',
        name: 'Tech',
        component: () => import('@/views/tech/Index.vue'),
        meta: { title: '技术笔记', desc: '代码块高亮 · Java/SQL/达梦 · 按服务归档', group: 'dev', order: 7 }
      },

      // —— 【自媒体】（6）——
      {
        path: 'media-board',
        name: 'MediaBoard',
        component: () => import('@/views/media-board/Index.vue'),
        meta: { title: '自媒体看板', desc: '三平台数据总览 · 发布排期 · 作品复盘', group: 'media', order: 1 }
      },
      {
        path: 'topic',
        name: 'Topic',
        component: () => import('@/views/topic/Index.vue'),
        meta: { title: '选题池', desc: '热点 / 灵感 / 客户咨询 → 待评估到已发布的选题队列', group: 'media', order: 2 }
      },
      {
        path: 'docs',
        name: 'Docs',
        component: () => import('@/views/docs/Index.vue'),
        meta: { title: '创作稿件库', desc: '小说大纲 / 章节 · 口播稿 · 技术干货原稿', group: 'media', order: 3 }
      },
      {
        path: 'media',
        name: 'Media',
        component: () => import('@/views/media/Index.vue'),
        meta: { title: '素材库', desc: '图文素材 · 选题状态：草稿 / 撰写 / 发布', group: 'media', order: 4 }
      },
      {
        path: 'publish',
        name: 'Publish',
        component: () => import('@/views/publish/Index.vue'),
        meta: { title: '发布管理', desc: '多平台发布记录 · 排期 · 阅读与线索回流', group: 'media', order: 5 }
      },
      {
        path: 'lead',
        name: 'Lead',
        component: () => import('@/views/lead/Index.vue'),
        meta: { title: '线索 / 商机', desc: '商机漏斗：新线索 → 报价 → 成交 → 交付 → 复盘', group: 'media', order: 6 }
      },

      // —— 【知识与个人】（5）——
      {
        path: 'markdown',
        name: 'Markdown',
        component: () => import('@/views/markdown/Index.vue'),
        meta: { title: '知识库', desc: '沉淀阅读、灵感与复盘，让知识可检索、可复用', group: 'personal', order: 1 }
      },
      {
        path: 'idea',
        name: 'Idea',
        component: () => import('@/views/idea/Index.vue'),
        meta: { title: '灵感记录', desc: '随手记录闪念，后续可转化为选题', group: 'personal', order: 2 }
      },
      {
        path: 'checkin',
        name: 'Checkin',
        component: () => import('@/views/checkin/Index.vue'),
        meta: { title: '习惯打卡', desc: '本周完成率 86% · 连续打卡 47 天', group: 'personal', order: 3 }
      },
      {
        path: 'money',
        name: 'Money',
        component: () => import('@/views/money/Index.vue'),
        meta: { title: '收支记账', desc: '区分主业收入 / 自媒体副业收支', group: 'personal', order: 4 }
      },
      {
        path: 'subscription',
        name: 'Subscription',
        component: () => import('@/views/subscription/Index.vue'),
        meta: { title: '订阅账单', desc: '11 项订阅中 · 本月已支出 ¥468', group: 'personal', order: 5 }
      },

      // —— 【系统】（4）——
      {
        path: 'secrets',
        name: 'Secrets',
        component: () => import('@/views/secrets/Index.vue'),
        meta: { title: '密码管理', desc: '账号密码检索 · 素材路径映射 · 数据集索引', group: 'system', order: 1 }
      },
      {
        path: 'backup',
        name: 'Backup',
        component: () => import('@/views/backup/Index.vue'),
        meta: { title: '文件备份', desc: '自动同步重要文件到云端，再也不怕丢失', group: 'system', order: 2 }
      },
      {
        path: 'insight',
        name: 'Insight',
        component: () => import('@/views/insight/Index.vue'),
        meta: { title: '洞察复盘', desc: '工作数据 · 自媒体产出 · 个人成长', group: 'system', order: 3 }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/Index.vue'),
        meta: { title: '工作台设置', desc: '全局主题 · 自定义路径 · 数据导入导出', group: 'system', order: 4 }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() { return { top: 0 } }
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.public) {
    if (to.path === '/login' && token) { next('/'); return }
    next()
    return
  }
  if (!token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  next()
})

export default router
