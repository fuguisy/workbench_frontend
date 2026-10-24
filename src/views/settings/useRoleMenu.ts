import { computed, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  menuApi,
  roleApi,
  type MenuNode,
  type MenuSaveDTO,
  type MenuType,
  type RoleVO
} from '@/api/menu'
import { useMenuStore } from '@/stores/menu'

/**
 * 「角色与授权」「菜单管理」两个管理员面板的全部状态与逻辑。
 * 抽成 composable 是为了不让 1400 行的 settings/Index.vue 再膨胀；
 * 模板里仍以 <a-tab-pane> 直接书写（ant-design-vue 的 Tabs 只认直接的子 vnode）。
 */
export function useRoleMenu() {
  const menuStore = useMenuStore()

  const MENU_TYPE_LABEL: Record<MenuType, string> = {
    DIR: '分组目录',
    MENU: '页面菜单',
    ACTION: '前端动作',
    BUTTON: '能力位'
  }

  /** 表格里 record 是 any，直接用 MENU_TYPE_LABEL[...] 会触发索引签名报错 */
  const menuTypeLabel = (t: string) => MENU_TYPE_LABEL[t as MenuType] || t

  // ==================== 角色 ====================

  const roleLoading = ref(false)
  const roleList = ref<RoleVO[]>([])

  const roleColumns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '角色标识', dataIndex: 'roleKey', width: 140 },
    { title: '角色名称', dataIndex: 'roleName', width: 140 },
    { title: '说明', dataIndex: 'description' },
    { title: '用户数', dataIndex: 'userCount', width: 90 },
    { title: '状态', dataIndex: 'status', width: 90 },
    { title: '排序', dataIndex: 'sort', width: 80 },
    { title: '操作', key: 'action', width: 260 }
  ]

  const loadRoles = async () => {
    roleLoading.value = true
    try {
      roleList.value = (await roleApi.list()) || []
    } catch {
      // 请求拦截器已统一提示
    } finally {
      roleLoading.value = false
    }
  }

  const roleModalOpen = ref(false)
  const roleSubmitting = ref(false)
  const roleForm = reactive({
    id: null as number | null,
    roleKey: '',
    roleName: '',
    description: '',
    status: 1,
    sort: 0
  })
  const roleEditing = computed(() => roleForm.id !== null)
  /** 内置超管角色：标识/状态不可改，后端也会二次拦截 */
  const roleIsBuiltinAdmin = computed(() => roleForm.roleKey === 'admin')

  const openRoleModal = (row?: RoleVO) => {
    roleForm.id = row?.id ?? null
    roleForm.roleKey = row?.roleKey ?? ''
    roleForm.roleName = row?.roleName ?? ''
    roleForm.description = row?.description ?? ''
    roleForm.status = row?.status ?? 1
    roleForm.sort = row?.sort ?? 0
    roleModalOpen.value = true
  }

  const submitRole = async () => {
    if (!roleForm.roleKey.trim()) {
      message.warning('请输入角色标识')
      return
    }
    if (!roleForm.roleName.trim()) {
      message.warning('请输入角色名称')
      return
    }
    roleSubmitting.value = true
    try {
      const payload = {
        roleKey: roleForm.roleKey.trim(),
        roleName: roleForm.roleName.trim(),
        description: roleForm.description.trim() || undefined,
        status: roleForm.status,
        sort: roleForm.sort
      }
      if (roleForm.id === null) {
        await roleApi.create(payload)
        message.success('角色已创建')
      } else {
        await roleApi.update(roleForm.id, payload)
        message.success('角色已更新')
      }
      roleModalOpen.value = false
      await loadRoles()
      await menuStore.load(true)
    } catch {
      // 请求拦截器已统一提示
    } finally {
      roleSubmitting.value = false
    }
  }

  const toggleRoleStatus = async (row: RoleVO) => {
    const target = row.status === 1 ? 0 : 1
    try {
      await roleApi.update(row.id, {
        roleKey: row.roleKey,
        roleName: row.roleName,
        description: row.description ?? undefined,
        status: target,
        sort: row.sort
      })
      message.success(target === 1 ? '已启用' : '已停用')
      await loadRoles()
    } catch {
      // 请求拦截器已统一提示
    }
  }

  const removeRole = (row: RoleVO) => {
    Modal.confirm({
      title: `确认删除角色「${row.roleName}」？`,
      content: '删除会同时清空该角色的菜单授权。若有用户仍在使用该角色，请先调整这些用户的角色。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        await roleApi.remove(row.id)
        message.success('已删除')
        await loadRoles()
      }
    })
  }

  // ==================== 授权（角色 - 菜单） ====================

  const grantOpen = ref(false)
  const grantSubmitting = ref(false)
  const grantRole = ref<RoleVO | null>(null)
  const grantChecked = ref<number[]>([])
  /** 授权用全量菜单平铺（含停用与隐藏项：能力位也必须可勾选） */
  const grantFlat = ref<MenuNode[]>([])

  const grantTreeData = computed(() => {
    const byId = new Map<number, any>()
    grantFlat.value.forEach((m) => {
      byId.set(m.id, {
        key: m.id,
        title: m.permission ? `${m.name}（${m.permission}）` : m.name,
        children: [] as any[]
      })
    })
    const roots: any[] = []
    grantFlat.value.forEach((m) => {
      const node = byId.get(m.id)
      const parent = m.parentId ? byId.get(m.parentId) : null
      if (parent) parent.children.push(node)
      else roots.push(node)
    })
    return roots
  })

  const openGrant = async (row: RoleVO) => {
    grantRole.value = row
    grantOpen.value = true
    grantChecked.value = []
    try {
      grantFlat.value = (await menuApi.list()) || []
      grantChecked.value = (await roleApi.menuIds(row.id)) || []
    } catch {
      // 请求拦截器已统一提示
    }
  }

  const submitGrant = async () => {
    if (!grantRole.value) return
    grantSubmitting.value = true
    try {
      // 勾选只给叶子节点时，父分组要一起存：否则侧边栏会把它挂到兜底的「其他」分组里
      await roleApi.saveMenus(grantRole.value.id, withAncestors(grantChecked.value, grantFlat.value))
      message.success('授权已保存，相关账号重新登录后生效')
      grantOpen.value = false
      await menuStore.load(true)
    } catch {
      // 请求拦截器已统一提示
    } finally {
      grantSubmitting.value = false
    }
  }

  // ==================== 菜单 ====================

  const menuLoading = ref(false)
  const menuFlat = ref<MenuNode[]>([])
  const expandedKeys = ref<number[]>([])

  const menuColumns = [
    { title: '菜单名称', dataIndex: 'name' },
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '类型', dataIndex: 'menuType', width: 100 },
    { title: '路径', dataIndex: 'path', width: 160 },
    { title: '权限码', dataIndex: 'permission', width: 160 },
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '侧边栏', dataIndex: 'visible', width: 90 },
    { title: '状态', dataIndex: 'status', width: 90 },
    { title: '操作', key: 'action', width: 170 }
  ]

  const loadMenus = async () => {
    menuLoading.value = true
    try {
      menuFlat.value = (await menuApi.list()) || []
      // 默认全部展开，方便一眼看到整棵菜单树
      expandedKeys.value = menuFlat.value.map((m) => m.id)
    } catch {
      // 请求拦截器已统一提示
    } finally {
      menuLoading.value = false
    }
  }

  /** 平铺 → 树（表格用；节点自带 children 时 antd 会自动渲染成可展开的树形表格） */
  const menuTreeData = computed(() => {
    const byId = new Map<number, MenuNode & { children: MenuNode[] }>()
    menuFlat.value.forEach((m) => byId.set(m.id, { ...m, children: [] }))
    const roots: (MenuNode & { children: MenuNode[] })[] = []
    byId.forEach((node) => {
      const parent = node.parentId ? byId.get(node.parentId) : null
      if (parent) parent.children.push(node)
      else roots.push(node)
    })
    return roots
  })

  const menuModalOpen = ref(false)
  const menuSubmitting = ref(false)
  const menuForm = reactive({
    id: null as number | null,
    parentId: 0,
    menuType: 'MENU' as MenuType,
    name: '',
    path: '',
    icon: '',
    permission: '',
    sort: 0,
    visible: 1,
    status: 1
  })
  const menuEditing = computed(() => menuForm.id !== null)

  /** 上级候选：DIR 的父级固定为根；MENU/ACTION 只能挂 DIR；BUTTON 可挂 DIR 或 MENU */
  const parentOptions = computed(() => {
    const dirs = menuFlat.value.filter((m) => m.menuType === 'DIR' && m.id !== menuForm.id)
    if (menuForm.menuType === 'BUTTON') {
      const pages = menuFlat.value.filter((m) => m.menuType === 'MENU' && m.id !== menuForm.id)
      return [
        ...dirs.map((m) => ({ value: m.id, label: `📁 ${m.name}` })),
        ...pages.map((m) => ({ value: m.id, label: `　📄 ${m.name}` }))
      ]
    }
    return dirs.map((m) => ({ value: m.id, label: m.name }))
  })

  const openMenuModal = (row?: MenuNode, preset?: Partial<{ parentId: number; menuType: MenuType }>) => {
    menuForm.id = row?.id ?? null
    menuForm.parentId = row?.parentId ?? preset?.parentId ?? 0
    menuForm.menuType = row?.menuType ?? preset?.menuType ?? 'MENU'
    menuForm.name = row?.name ?? ''
    menuForm.path = row?.path ?? ''
    menuForm.icon = row?.icon ?? ''
    menuForm.permission = row?.permission ?? ''
    menuForm.sort = row?.sort ?? 0
    menuForm.visible = row?.visible ?? 1
    menuForm.status = row?.status ?? 1
    menuModalOpen.value = true
  }

  /** 切换类型时清掉会互相冲突的字段，减少一次无谓的提交失败 */
  const onMenuTypeChange = () => {
    if (menuForm.menuType === 'DIR') {
      menuForm.parentId = 0
      menuForm.path = ''
      menuForm.icon = ''
    } else if (menuForm.menuType === 'BUTTON') {
      menuForm.path = ''
      menuForm.icon = ''
    } else if (menuForm.menuType === 'MENU') {
      if (menuForm.path.startsWith('cmd:')) menuForm.path = ''
    } else if (menuForm.menuType === 'ACTION') {
      if (!menuForm.path.startsWith('cmd:')) menuForm.path = 'cmd:'
    }
  }

  const submitMenu = async () => {
    if (!menuForm.name.trim()) {
      message.warning('请输入菜单名称')
      return
    }
    const payload: MenuSaveDTO = {
      parentId: menuForm.menuType === 'DIR' ? 0 : menuForm.parentId,
      menuType: menuForm.menuType,
      name: menuForm.name.trim(),
      path: ['DIR', 'BUTTON'].includes(menuForm.menuType) ? null : menuForm.path.trim() || null,
      icon: ['DIR', 'BUTTON'].includes(menuForm.menuType) ? null : menuForm.icon.trim() || null,
      permission: menuForm.permission.trim() || null,
      sort: menuForm.sort,
      visible: menuForm.visible,
      status: menuForm.status
    }
    menuSubmitting.value = true
    try {
      if (menuForm.id === null) {
        await menuApi.create(payload)
        message.success('菜单已新增')
      } else {
        await menuApi.update(menuForm.id, payload)
        message.success('菜单已更新')
      }
      menuModalOpen.value = false
      await loadMenus()
      await menuStore.load(true)
    } catch {
      // 请求拦截器已统一提示
    } finally {
      menuSubmitting.value = false
    }
  }

  const removeMenu = (row: MenuNode) => {
    const childCount = countDescendants(row.id, menuFlat.value)
    Modal.confirm({
      title: `确认删除「${row.name}」？`,
      content: childCount > 0
        ? `该菜单下还有 ${childCount} 个子节点，会被一并删除，相关角色的授权也会被清理。`
        : '删除后相关角色的授权也会被清理。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        await menuApi.remove(row.id)
        message.success('已删除')
        await loadMenus()
        await menuStore.load(true)
      }
    })
  }

  return {
    MENU_TYPE_LABEL, menuTypeLabel,
    // 角色
    roleLoading, roleList, roleColumns, loadRoles,
    roleModalOpen, roleSubmitting, roleForm, roleEditing, roleIsBuiltinAdmin,
    openRoleModal, submitRole, toggleRoleStatus, removeRole,
    // 授权
    grantOpen, grantSubmitting, grantRole, grantChecked, grantTreeData, openGrant, submitGrant,
    // 菜单
    menuLoading, menuFlat, menuTreeData, expandedKeys, menuColumns, loadMenus,
    menuModalOpen, menuSubmitting, menuForm, menuEditing, parentOptions,
    openMenuModal, onMenuTypeChange, submitMenu, removeMenu
  }
}

/** 把勾选的菜单补全为「含全部祖先」的集合 */
function withAncestors(checked: number[], flat: MenuNode[]): number[] {
  const byId = new Map(flat.map((m) => [m.id, m]))
  const out = new Set<number>()
  checked.forEach((id) => {
    let cur = byId.get(id)
    let guard = 0
    while (cur && guard++ < 20) {
      out.add(cur.id)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
  })
  return [...out]
}

/** 统计子孙节点数量（删除前的提示用） */
function countDescendants(id: number, flat: MenuNode[]): number {
  let n = 0
  let frontier = [id]
  let guard = 0
  while (frontier.length && guard++ < 20) {
    const next = flat.filter((m) => m.parentId && frontier.includes(m.parentId)).map((m) => m.id)
    n += next.length
    frontier = next
  }
  return n
}
