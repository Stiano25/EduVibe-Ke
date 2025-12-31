import { create } from 'zustand'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  setUser: (user: User | null) => void
  initializeAuth: () => void
}

// Initialize auth state from sessionStorage
const getStoredUser = () => {
  if (typeof window === 'undefined') return null
  
  try {
    const userStr = sessionStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return user
    }
  } catch (e) {
    console.error('Error restoring auth state:', e)
  }
  return null
}

const storedUser = getStoredUser()

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser,
  isAuthenticated: !!storedUser,
  
  initializeAuth: () => {
    const user = getStoredUser()
    if (user) {
      set({ user, isAuthenticated: true })
    } else {
      set({ user: null, isAuthenticated: false })
    }
  },
  
  login: async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email)
      const response = await api.learner.login({ email, password })
      console.log('Login response:', response)
      
      if (response && response.user) {
        const user: User = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          grade: response.user.grade,
          avatar: response.user.avatar
        }
        
        console.log('Setting user in store:', user)
        set({ user, isAuthenticated: true })
        // Store user ID in sessionStorage for API client
        if (typeof window !== 'undefined' && user.id) {
          sessionStorage.setItem('userId', user.id)
          sessionStorage.setItem('user', JSON.stringify(user))
          console.log('User stored in sessionStorage')
        }
        return true
      }
      
      console.warn('Login response missing user data:', response)
      return false
    } catch (error: any) {
      console.error('Login error details:', error)
      console.error('Error message:', error.message)
      console.error('Error error:', error.error)
      // Re-throw error with message for better error handling
      const errorMessage = error.message || error.error || 'Failed to login. Please check your credentials.'
      throw new Error(errorMessage)
    }
  },
  
  logout: () => {
    set({ user: null, isAuthenticated: false })
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('userId')
      sessionStorage.removeItem('user')
    }
  },
  
  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
    // Store user ID in sessionStorage for API client
    if (typeof window !== 'undefined') {
      if (user?.id) {
        sessionStorage.setItem('userId', user.id)
        sessionStorage.setItem('user', JSON.stringify(user))
      } else {
        sessionStorage.removeItem('userId')
        sessionStorage.removeItem('user')
      }
    }
  },
}))

