import { defineStore } from 'pinia'
import { computed, ref, type Component } from 'vue'
import { menuApi, type MenuNode, type MyMenuVO } from '@/api/menu'
import { FALLBACK_GROUPS } from '@/config/fallbackMenu'
import { resolveMenuIcon } from '@/utils/menuIcon'

/** 归一化后的侧边栏条目 */
export interface MenuItem {
  /** 路由路径（ACTION 类型为 cmd:xxx） */
  key: string
  label: string
  icon: Component
  order: number
  /** 是否需要跳转路由 */
  cmdOnly: boolean
}

export interface MenuGroup {
  /** 分组唯一标识，用作显隐配置的键 */
  id: string
  label: string
  order: number
  items: MenuItem[]
}

/** 个人显隐偏好：存被隐藏的分组 id 数组 */
const HIDDEN_KEY = 'wb-hidden-menu-groups'

function readHidden(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const useMenuStore = defineStore('menu', () => {
  const role = ref('')
  const permissions = ref<string[]>([])
  // 初始即用内置菜单填充：首屏不闪空，接口回来后原地替换
  const groups = ref<MenuGroup[]>(normalizeGroups(FALLBACK_GROUPS))
  /** db=数据来自后端；local=接口不可用，正在用内置兜底 */
  const source = ref<'db' | 'local'>('local')
  const loading = ref(false)
  const loaded = ref(false)
  const hidden = ref<string[]>(readHidden())

  /** 含首页的分组不允许隐藏，否则侧边栏可能被清空且找不到回到设置页的入口 */
  const pinnedGroupId = computed(() => {
    const g = groups.value.find((it) => it.items.some((m) => !m.cmdOnly && m.key === '/'))
    return g?.id || ''
  })

  const visibleGroups = computed(() =>
    groups.value.filter((g) => g.id === pinnedGroupId.value || !hidden.value.includes(g.id))
  )

  /** 所有可跳转的路由路径（用于判断菜单权限） */
  const routePaths = computed(() =>
    groups.value.flatMap((g) => g.items.filter((m) => !m.cmdOnly).map((m) => m.key))
  )

  const can = (code: string) => permissions.value.includes(code)

  const isGroupVisible = (id: string) => id === pinnedGroupId.value || !hidden.value.includes(id)

  const setGroupVisible = (id: string, visible: boolean) => {
    if (id === pinnedGroupId.value) return
    const next = new Set(hidden.value)
    if (visible) next.delete(id)
    else next.add(id)
    hidden.value = [...next]
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden.value))
  }

  /**
   * 拉取当前用户的菜单与权限码。
   * 接口失败（后端未启动 / 迁移未执行 / 无权限）时静默保留内置菜单，不弹错误提示。
   */
  const load = async (force = false) => {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const res: MyMenuVO = await menuApi.my()
      const gs = normalizeGroups(res?.groups || [])
      if (gs.length) {
        groups.value = gs
        permissions.value = res.permissions || []
        role.value = res.role || ''
        source.value = 'db'
      } else {
        // 后端返回空：可能是角色被停用/未授权，此时保留兜底菜单比给一个空壳导航友好
        source.value = 'local'
      }
    } catch {
      source.value = 'local'
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  /** 退出登录时复位 */
  const reset = () => {
    role.value = ''
    permissions.value = []
    groups.value = normalizeGroups(FALLBACK_GROUPS)
    source.value = 'local'
    loaded.value = false
  }

  return {
    role, permissions, groups, source, loading, loaded, hidden,
    pinnedGroupId, visibleGroups, routePaths,
    can, isGroupVisible, setGroupVisible, load, reset
  }
})

/** 后端菜单树 → 侧边栏分组结构（内置兜底走同一套转换，保证两条路径等价） */
function normalizeGroups(nodes: MenuNode[]): MenuGroup[] {
  return [...nodes]
    .filter((n) => n.menuType === 'DIR')
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((d) => ({
      id: `dir-${d.id}`,
      label: d.name,
      order: d.sort ?? 0,
      items: [...(d.children || [])]
        .filter((c) => c.menuType !== 'BUTTON' && c.visible !== 0)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map((c) => ({
          key: c.menuType === 'ACTION' ? (c.path || `cmd:${c.id}`) : (c.path || `/${c.id}`),
          label: c.name,
          icon: resolveMenuIcon(c.icon),
          order: c.sort ?? 0,
          cmdOnly: c.menuType === 'ACTION'
        }))
    }))
    .filter((g) => g.items.length > 0)
}
