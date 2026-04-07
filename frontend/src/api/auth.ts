import api from './client'
import type { TokenResponse, UserRead } from '../types/api'

export const authApi = {
  register: (data: { company_name: string; email: string; password: string; full_name?: string }) =>
    api.post<TokenResponse>('/auth/register', data).then(r => r.data),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }).then(r => r.data),

  me: () => api.get<UserRead>('/auth/me').then(r => r.data),
}
