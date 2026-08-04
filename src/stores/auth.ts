import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  login as apiLogin,
  getUserInfo,
  logout as apiLogout,
  type LoginDTO,
  type LoginVO
} from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<LoginVO | null>(null)

  const login = async (dto: LoginDTO) => {
    const res: any = await apiLogin(dto)
    token.value = res.token
    localStorage.setItem('token', res.token)
    userInfo.value = res
    return res
  }

  const fetchUserInfo = async () => {
    const res: any = await getUserInfo()
    userInfo.value = res
    return res
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch {
      // 忽略登出接口错误
    }
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  const isLogin = () => !!token.value

  return { token, userInfo, login, fetchUserInfo, logout, isLogin }
})
