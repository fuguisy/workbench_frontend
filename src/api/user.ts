import request from './request'

export interface SysUserVO {
  id: number
  username: string
  nickname: string
  avatar: string
  role: string
  status: number
  createTime: string
}

export interface SysUserPage {
  records: SysUserVO[]
  total: number
  current: number
  size: number
}

export interface SysUserCreateDTO {
  username: string
  password: string
  nickname?: string
  role?: 'admin' | 'user'
}

/** 用户管理（后端 /sys/user，全部为管理员专属接口） */
export const userApi = {
  page: (params: { current?: number; size?: number; keyword?: string }) =>
    request.get<any, SysUserPage>('/sys/user/page', { params }),
  create: (data: SysUserCreateDTO) => request.post<any, void>('/sys/user', data),
  resetPassword: (id: number, password: string) =>
    request.put<any, void>(`/sys/user/${id}/password`, { password }),
  updateStatus: (id: number, status: number) =>
    request.put<any, void>(`/sys/user/${id}/status`, { status }),
  remove: (id: number) => request.delete<any, void>(`/sys/user/${id}`)
}
