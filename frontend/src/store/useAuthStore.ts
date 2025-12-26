import { create } from 'zustand'
import type { User } from '@/types'
import { mockUsers } from '@/data/mockUsers'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    // Mock authentication - in real app, this would call an API
    const user = mockUsers.find(u => u.email === email)
    
    if (user && password === 'password') { // Mock password check
      set({ user, isAuthenticated: true })
      // Store user ID in sessionStorage for API client
      if (typeof window !== 'undefined' && user.id) {
        sessionStorage.setItem('userId', user.id)
        sessionStorage.setItem('user', JSON.stringify(user))
      }
      return true
    }
    
    return false
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

