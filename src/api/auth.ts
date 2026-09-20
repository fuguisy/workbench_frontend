import request from './request'

export interface LoginDTO {
  username: string
  password: string
}

export interface LoginVO {
  token: string
  userId: number
  username: string
  nickname: string
  avatar: string
  role: string
}

export const login = (data: LoginDTO) => request.post('/auth/login', data)
// 自助注册已下线（后端 /auth/register 已移除），新增账号走 api/user.ts 的 userApi.create
export const getUserInfo = () => request.get('/auth/info')
export const logout = () => request.post('/auth/logout')
