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
export const register = (data: LoginDTO & { nickname?: string }) => request.post('/auth/register', data)
export const getUserInfo = () => request.get('/auth/info')
export const logout = () => request.post('/auth/logout')
