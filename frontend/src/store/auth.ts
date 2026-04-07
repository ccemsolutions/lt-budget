import { create } from 'zustand'
import type { UserRead } from '../types/api'

interface AuthState {
  user: UserRead | null
  token: string | null
  setAuth: (user: UserRead, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  setAuth: (user, token) => {
    localStorage.setItem('access_token', token)
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, token: null })
  },
}))
