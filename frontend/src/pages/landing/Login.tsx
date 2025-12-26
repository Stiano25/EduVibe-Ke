import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { motion } from 'framer-motion'
import { GraduationCap, ArrowLeft, Lightbulb } from 'lucide-react'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const success = await login(email, password)
    
    if (success) {
      const user = useAuthStore.getState().user
      navigate(user?.role === 'admin' ? '/admin' : '/learner')
    } else {
      setError('Invalid email or password. Use any email from mockUsers with password "password"')
    }
    
    setLoading(false)
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
                  placeholder="admin@eduvibe.com"
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
                  placeholder="password"
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

            {/* Demo Accounts Sticky Note */}
            <motion.div
              initial={{ rotate: -2 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              className="absolute -bottom-4 -right-4 bg-yellow-100 rounded-3xl border-2 border-yellow-300 p-4 shadow-lg max-w-[200px]"
              style={{ transform: 'rotate(-2deg)' }}
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <p className="text-xs font-black text-yellow-900 mb-2">Demo Accounts</p>
                  <button
                    type="button"
                    onClick={() => setEmail('admin@eduvibe.com')}
                    className="text-left text-[10px] text-yellow-800 hover:text-yellow-900 font-semibold block mb-1"
                  >
                    Admin: admin@eduvibe.com
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmail('john@eduvibe.com')}
                    className="text-left text-[10px] text-yellow-800 hover:text-yellow-900 font-semibold block"
                  >
                    Learner: john@eduvibe.com
                  </button>
                  <p className="text-[9px] text-yellow-700 mt-2 italic">Password: password</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
