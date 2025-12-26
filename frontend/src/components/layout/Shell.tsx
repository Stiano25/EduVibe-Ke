import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  GraduationCap, 
  Sparkles,
  Bell,
  Menu,
  X,
  LogOut
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ShellProps {
  children: ReactNode
}

export const Shell = ({ children }: ShellProps) => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = user?.role === 'admin' 
    ? [
        { label: 'Dashboard', path: '/admin' },
        { label: 'Lessons', path: '/admin/lessons' },
        { label: 'Users', path: '/admin/users' },
        { label: 'Analytics', path: '/admin/analytics' },
      ]
    : [
        { label: 'Dashboard', path: '/learner' },
        { label: 'Lessons', path: '/learner/lessons' },
        { label: 'Recommendations', path: '/learner/recommendations' },
      ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-text-primary">
      {/* Top nav */}
      <header className="w-full sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to={user?.role === 'admin' ? '/admin' : '/learner'} className="flex items-center gap-2 sm:gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg border-b-4 border-indigo-700"
            >
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-bold tracking-tight text-gradient">EduVibe</p>
              <p className="hidden sm:block text-[11px] text-text-secondary">
                {user?.role === 'admin' ? 'Admin Dashboard' : 'Learner Dashboard'}
              </p>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`hover:text-text-primary transition-colors ${isActive ? 'text-indigo-600 font-semibold' : ''}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-3xl hover:bg-slate-100 transition-all relative">
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
            </button>
            
            {/* User Profile Dropdown */}
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
                <p className="text-[11px] font-medium text-text-secondary capitalize">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg border-b-4 border-indigo-700">
                {user?.name?.charAt(0)}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 rounded-3xl hover:bg-slate-100 transition-all"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-text-primary" /> : <Menu className="w-5 h-5 text-text-primary" />}
            </button>

            {/* Logout Button - Desktop */}
            <motion.button
              whileHover={{ y: 2 }}
              whileTap={{ y: 4 }}
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-3xl px-4 py-2 text-[13px] transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>
          </div>
          </div>
        </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[55] sm:hidden animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white border-l border-slate-200 p-6 flex flex-col animate-slide-up shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg border-b-4 border-indigo-700">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="text-text-primary font-semibold truncate max-w-[140px]">{user?.name}</p>
                <p className="text-[11px] text-text-secondary capitalize">{user?.role}</p>
              </div>
            </div>

            <nav className="flex flex-col gap-2 mb-6">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-3xl transition-all text-sm font-semibold ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200' 
                        : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <button
              onClick={() => {
                handleLogout()
                setIsMobileMenuOpen(false)
              }}
              className="mt-auto px-4 py-3 rounded-3xl bg-slate-100 hover:bg-slate-200 text-text-primary font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
