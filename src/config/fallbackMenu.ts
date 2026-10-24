import type { MenuNode } from '@/api/menu'

/**
 * 侧边栏内置兜底菜单 —— 与后端 `db/seed_menu_role.sql` 的第 2 节逐行对应。
 *
 * 用途：接口 `/sys/menu/my` 尚未返回（首屏加载中）或请求失败（后端未启动、迁移未执行）时，
 * 侧边栏仍然可用，不让用户面对一个空壳导航。
 *
 * 维护约定：**数据库才是唯一事实来源**。这里只在「新增分组/菜单并且必须保证离线可用」时同步补一行，
 * 平时调整菜单请改数据库（管理员可在「设置 → 菜单管理」里改），不要改这个文件。
 */
export const FALLBACK_GROUPS: MenuNode[] = [
  dir(1, '工作台', 1, [
    page(101, '首页', '/', 'HomeOutlined', 1),
    page(102, '日历 / 日程', '/calendar', 'CalendarOutlined', 2),
    page(103, '通知中心', '/notification', 'BellOutlined', 3)
  ]),
  dir(2, '效率', 2, [
    page(201, '任务看板', '/todo', 'CheckSquareOutlined', 1),
    page(202, '专注 / 番茄钟', '/focus', 'ClockCircleOutlined', 2),
    page(203, '目标 / OKR', '/okr', 'AimOutlined', 3)
  ]),
  dir(3, '程序员', 3, [
    page(301, '代码仓库', '/repo', 'CodeOutlined', 1),
    page(302, 'AI 实验室', '/ai', 'ExperimentOutlined', 2),
    page(303, 'Bug 台账', '/bugs', 'BugOutlined', 3),
    page(304, '项目进度', '/project', 'ProjectOutlined', 4),
    page(305, '服务器 & 自部署', '/svc', 'CloudServerOutlined', 5),
    page(306, '学习阅读', '/read', 'BookOutlined', 6),
    page(307, '技术笔记', '/tech', 'FileTextOutlined', 7),
    {
      id: 308, parentId: 3, menuType: 'ACTION', name: '命令面板 ⌘K', path: 'cmd:palette',
      icon: 'ThunderboltOutlined', permission: null, sort: 8, visible: 1, status: 1, children: []
    }
  ]),
  dir(4, '自媒体', 4, [
    page(401, '自媒体看板', '/media-board', 'PlayCircleOutlined', 1),
    page(402, '选题池', '/topic', 'BulbOutlined', 2),
    page(403, '创作稿件库', '/docs', 'FileTextOutlined', 3),
    page(404, '素材库', '/media', 'PictureOutlined', 4),
    page(405, '发布管理', '/publish', 'SendOutlined', 5),
    page(406, '线索 / 商机', '/lead', 'FunnelPlotOutlined', 6)
  ]),
  dir(5, '知识与个人', 5, [
    page(501, '知识库', '/markdown', 'ReadOutlined', 1),
    page(502, '灵感记录', '/idea', 'HighlightOutlined', 2),
    page(503, '习惯打卡', '/checkin', 'ClockCircleOutlined', 3),
    page(504, '收支记账', '/money', 'WalletOutlined', 4),
    page(505, '订阅账单', '/subscription', 'SwapOutlined', 5)
  ]),
  dir(6, '系统', 6, [
    page(601, '密码管理', '/secrets', 'KeyOutlined', 1, 'system:secrets'),
    page(602, '文件备份', '/backup', 'CloudOutlined', 2, 'system:backup'),
    page(603, '洞察复盘', '/insight', 'BarChartOutlined', 3, 'system:insight'),
    page(604, '工作台设置', '/settings', 'SettingOutlined', 4, 'system:settings')
  ])
]

function dir(id: number, name: string, sort: number, children: MenuNode[]): MenuNode {
  return {
    id, parentId: 0, menuType: 'DIR', name, path: null, icon: null, permission: null,
    sort, visible: 1, status: 1, children
  }
}

function page(
  id: number, name: string, path: string, icon: string, sort: number, permission: string | null = null
): MenuNode {
  return {
    id, parentId: 0, menuType: 'MENU', name, path, icon, permission,
    sort, visible: 1, status: 1, children: []
  }
}
