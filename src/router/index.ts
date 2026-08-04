import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Main',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/',
    children: [
      { path: '', name: 'Home', component: () => import('@/views/Home.vue'), meta: { title: '首页' } },
      { path: 'todo', name: 'Todo', component: () => import('@/views/todo/Index.vue'), meta: { title: '任务待办' } },
      // 程序员模块
      { path: 'project', name: 'Project', component: () => import('@/views/project/Index.vue'), meta: { title: '项目进度' } },
      { path: 'bugs', name: 'Bugs', component: () => import('@/views/bugs/Index.vue'), meta: { title: 'Bug台账' } },
      { path: 'repo', name: 'Repo', component: () => import('@/views/repo/Index.vue'), meta: { title: '代码仓库' } },
      { path: 'svc', name: 'Svc', component: () => import('@/views/svc/Index.vue'), meta: { title: '服务器' } },
      { path: 'read', name: 'Read', component: () => import('@/views/read/Index.vue'), meta: { title: '学习阅读' } },
      { path: 'tech', name: 'Tech', component: () => import('@/views/tech/Index.vue'), meta: { title: '技术笔记' } },
      // AI 模块
      { path: 'ai', name: 'Ai', component: () => import('@/views/ai/Index.vue'), meta: { title: 'AI实验室' } },
      { path: 'idea', name: 'Idea', component: () => import('@/views/idea/Index.vue'), meta: { title: '内容灵感' } },
      // 自媒体模块
      { path: 'media', name: 'Media', component: () => import('@/views/media/Index.vue'), meta: { title: '素材库' } },
      { path: 'media-board', name: 'MediaBoard', component: () => import('@/views/media-board/Index.vue'), meta: { title: '自媒体看板' } },
      { path: 'docs', name: 'Docs', component: () => import('@/views/docs/Index.vue'), meta: { title: '创作稿件库' } },
      { path: 'checkin', name: 'Checkin', component: () => import('@/views/checkin/Index.vue'), meta: { title: '习惯打卡' } },
      { path: 'money', name: 'Money', component: () => import('@/views/money/Index.vue'), meta: { title: '收支记账' } },
      { path: 'secrets', name: 'Secrets', component: () => import('@/views/secrets/Index.vue'), meta: { title: '密码管理' } },
      { path: 'backup', name: 'Backup', component: () => import('@/views/backup/Index.vue'), meta: { title: '文件备份' } },
      { path: 'markdown', name: 'Markdown', component: () => import('@/views/markdown/Index.vue'), meta: { title: 'Markdown文档' } },
      // 统计 & 设置
      { path: 'insight', name: 'Insight', component: () => import('@/views/insight/Index.vue'), meta: { title: '洞察复盘' } },
      { path: 'settings', name: 'Settings', component: () => import('@/views/settings/Index.vue'), meta: { title: '工作台设置' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
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
