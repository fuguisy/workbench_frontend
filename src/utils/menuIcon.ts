import type { Component } from 'vue'
import {
  HomeOutlined,
  CalendarOutlined,
  BellOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  AimOutlined,
  CodeOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  FileTextOutlined,
  ReadOutlined,
  WalletOutlined,
  SwapOutlined,
  KeyOutlined,
  CloudOutlined,
  BarChartOutlined,
  SettingOutlined,
  FunnelPlotOutlined,
  BulbOutlined,
  SendOutlined,
  BugOutlined,
  ProjectOutlined,
  CloudServerOutlined,
  BookOutlined,
  HighlightOutlined,
  AppstoreOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
  UserOutlined,
  MenuOutlined,
  FolderOutlined,
  FileOutlined,
  ApiOutlined,
  InboxOutlined,
  TagsOutlined,
  RocketOutlined
} from '@ant-design/icons-vue'

/**
 * 数据库 sys_menu.icon 存的是 Ant Design 图标「组件名」字符串，
 * 这里维护一张「名字 → 组件」的白名单表。
 *
 * 刻意不用 `import * as Icons from '@ant-design/icons-vue'` 全量动态取：
 * 那会把 700+ 个图标全部打进产物，首屏体积翻好几倍。
 */
const ICON_MAP: Record<string, Component> = {
  HomeOutlined,
  CalendarOutlined,
  BellOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  AimOutlined,
  CodeOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  FileTextOutlined,
  ReadOutlined,
  WalletOutlined,
  SwapOutlined,
  KeyOutlined,
  CloudOutlined,
  BarChartOutlined,
  SettingOutlined,
  FunnelPlotOutlined,
  BulbOutlined,
  SendOutlined,
  BugOutlined,
  ProjectOutlined,
  CloudServerOutlined,
  BookOutlined,
  HighlightOutlined,
  AppstoreOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
  UserOutlined,
  MenuOutlined,
  FolderOutlined,
  FileOutlined,
  ApiOutlined,
  InboxOutlined,
  TagsOutlined,
  RocketOutlined
}

/** 可选图标名列表（菜单编辑弹窗的下拉选项） */
export const ICON_NAMES = Object.keys(ICON_MAP)

const DEFAULT_ICON = AppstoreOutlined

/** 图标名 → 组件；未登记的名字统一回退为通用图标，不抛错 */
export function resolveMenuIcon(name?: string | null): Component {
  if (!name) return DEFAULT_ICON
  return ICON_MAP[name.trim()] || DEFAULT_ICON
}
