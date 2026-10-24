import request from './request'

/** 菜单类型：DIR=分组目录 MENU=页面 ACTION=前端动作 BUTTON=仅权限码 */
export type MenuType = 'DIR' | 'MENU' | 'ACTION' | 'BUTTON'

export interface MenuNode {
  id: number
  parentId: number
  menuType: MenuType
  name: string
  path?: string | null
  icon?: string | null
  permission?: string | null
  sort: number
  /** 1=侧边栏显示 0=隐藏 */
  visible: number
  /** 1=启用 0=停用 */
  status: number
  children?: MenuNode[]
}

export interface MyMenuVO {
  role: string
  permissions: string[]
  groups: MenuNode[]
}

export interface RoleVO {
  id: number
  roleKey: string
  roleName: string
  description?: string | null
  status: number
  sort: number
  userCount: number
  createTime?: string
}

export interface RoleSaveDTO {
  roleKey: string
  roleName: string
  description?: string
  status?: number
  sort?: number
}

export interface MenuSaveDTO {
  parentId?: number
  menuType: MenuType
  name: string
  path?: string | null
  icon?: string | null
  permission?: string | null
  sort?: number
  visible?: number
  status?: number
}

/** 菜单接口：/my 面向所有登录用户，其余为管理员专属 */
export const menuApi = {
  my: () => request.get<any, MyMenuVO>('/sys/menu/my'),
  tree: () => request.get<any, MenuNode[]>('/sys/menu/tree'),
  list: () => request.get<any, MenuNode[]>('/sys/menu/list'),
  create: (data: MenuSaveDTO) => request.post<any, MenuNode>('/sys/menu', data),
  update: (id: number, data: MenuSaveDTO) => request.put<any, void>(`/sys/menu/${id}`, data),
  remove: (id: number) => request.delete<any, void>(`/sys/menu/${id}`)
}

/** 角色与授权接口（全部管理员专属） */
export const roleApi = {
  list: () => request.get<any, RoleVO[]>('/sys/role'),
  create: (data: RoleSaveDTO) => request.post<any, RoleVO>('/sys/role', data),
  update: (id: number, data: RoleSaveDTO) => request.put<any, void>(`/sys/role/${id}`, data),
  remove: (id: number) => request.delete<any, void>(`/sys/role/${id}`),
  menuIds: (id: number) => request.get<any, number[]>(`/sys/role/${id}/menus`),
  saveMenus: (id: number, menuIds: number[]) =>
    request.put<any, void>(`/sys/role/${id}/menus`, { menuIds })
}
