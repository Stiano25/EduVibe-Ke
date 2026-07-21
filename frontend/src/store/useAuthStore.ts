import { create } from 'zustand'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  setSession: (user: User, token: string) => void
  setUser: (user: User | null) => void
  initializeAuth: () => void
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null

  try {
    const userStr = sessionStorage.getItem(USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

const clearQuizLocalStorage = () => {
  if (typeof window === 'undefined') return

  Object.keys(localStorage).forEach((key) => {
    if (
      key.startsWith('quiz_answers_') ||
      key.startsWith('quiz_results_') ||
      key.startsWith('quiz_show_results_') ||
      key.startsWith('failed_lesson_id') ||
      key.startsWith('failed_lesson_title') ||
      key.startsWith('failed_lesson_subject_id')
    ) {
      localStorage.removeItem(key)
    }
  })
}

const persistSession = (user: User | null, token: string | null) => {
  if (typeof window === 'undefined') return

  if (user?.id && token) {
    clearQuizLocalStorage()
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    sessionStorage.setItem('userId', user.id)
  } else {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    sessionStorage.removeItem('userId')
  }
}

const storedUser = getStoredUser()
const storedToken = getStoredToken()
const hasValidSession = !!(storedUser && storedToken)

export const useAuthStore = create<AuthState>((set) => ({
  user: hasValidSession ? storedUser : null,
  isAuthenticated: hasValidSession,

  initializeAuth: () => {
    const user = getStoredUser()
    const token = getStoredToken()
    const valid = !!(user && token)
    set({ user: valid ? user : null, isAuthenticated: valid })
    if (!valid) persistSession(null, null)
  },

  login: async (email: string, password: string) => {
    try {
      const response = await api.learner.login({ email, password })

      if (!response?.user || !response?.token) return false

      const user: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        grade: response.user.grade,
        avatar: response.user.avatar,
      }

      set({ user, isAuthenticated: true })
      persistSession(user, response.token)
      return true
    } catch (error: any) {
      throw new Error(error.message || error.error || 'Failed to login. Please check your credentials.')
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
    persistSession(null, null)
  },

  setSession: (user, token) => {
    set({ user, isAuthenticated: true })
    persistSession(user, token)
  },

  setUser: (user) => {
    if (!user) {
      set({ user: null, isAuthenticated: false })
      persistSession(null, null)
      return
    }
    const token = getStoredToken()
    if (!token) {
      set({ user, isAuthenticated: false })
      return
    }
    set({ user, isAuthenticated: true })
    persistSession(user, token)
  },
}))
