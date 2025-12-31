import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { motion } from 'framer-motion'
import { GraduationCap, ArrowLeft } from 'lucide-react'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, user, initializeAuth } = useAuthStore()
  const navigate = useNavigate()

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin' : '/learner', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  // Don't show login form if already authenticated
  if (isAuthenticated && user) {
    return null // Will redirect via useEffect
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(email, password)
      
      if (success) {
        // Get the user from store after login
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          // Use replace to prevent back button issues
          navigate(currentUser.role === 'admin' ? '/admin' : '/learner', { replace: true })
        } else {
          setError('Login successful but user data not found. Please try again.')
          setLoading(false)
        }
      } else {
        setError('Invalid email or password. Please check your credentials and try again.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err.message || err.error || 'Failed to login. Please check your credentials and try again.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-text-primary flex flex-col">
      {/* Navbar - Logo and Back Button */}
      <header className="w-full sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg border-b-4 border-indigo-700">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <p className="text-sm font-bold tracking-tight text-gradient">EduVibe</p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[480px] relative">
          {/* Central Bento Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-4xl border-2 border-slate-200 p-8 sm:p-10 shadow-lg relative"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-indigo-600 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                Welcome back!
              </h1>
              <p className="text-sm text-text-secondary">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors text-base bg-white"
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors text-base bg-white"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{ y: 2 }}
                whileTap={{ y: 4 }}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-3xl px-6 py-4 text-base border-b-4 border-indigo-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </motion.button>
            </form>

            {/* Sign up link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                Don't have an account?{' '}
                <Link to="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                  Sign up
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
