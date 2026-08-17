import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import {
  GraduationCap,
  Bell,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { adminNavItems, isAdminNavActive } from '@/config/adminNav'
import { usesQuestNavigation } from '@/lib/complexityBands'

interface ShellProps {
  children: ReactNode
}

const learnerNavItems = [
  { label: 'Dashboard', path: '/learner', icon: LayoutDashboard, exact: true },
  { label: 'Lessons', path: '/learner/lessons', icon: BookOpen, exact: false },
  { label: 'Recommendations', path: '/learner/recommendations', icon: Sparkles, exact: false },
]

export const Shell = ({ children }: ShellProps) => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === 'admin'
  const questNav = !isAdmin && usesQuestNavigation(user?.grade)
  const visibleLearnerNav = questNav
    ? learnerNavItems.filter((item) => item.path === '/learner' || item.path === '/learner/lessons')
    : learnerNavItems

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeMobile = () => setIsMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-text-primary">
      <header className="w-full sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            to={isAdmin ? '/admin' : '/learner'}
            className="flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md"
            >
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </motion.div>
            <div className="hidden xs:block sm:block">
              <p className="text-sm font-bold tracking-tight text-[#0F172A]">EduVibe</p>
              <p className="hidden sm:block text-[11px] text-text-secondary">
                {isAdmin ? 'Admin' : 'Learner'}
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-3xl mx-2">
            {isAdmin
              ? adminNavItems.map((item) => {
                  const active = isAdminNavActive(location.pathname, item)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.description}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                        active
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.shortLabel || item.label}</span>
                    </Link>
                  )
                })
              : visibleLearnerNav.map((item) => {
                  const active = item.exact
                    ? location.pathname === item.path
                    : location.pathname === item.path ||
                      location.pathname.startsWith(`${item.path}/`)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                        active
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  )
                })}
          </nav>

          {/* Tablet: scrollable chip nav */}
          <nav className="hidden md:flex lg:hidden items-center gap-1 flex-1 overflow-x-auto no-scrollbar mx-1">
            {(isAdmin ? adminNavItems : visibleLearnerNav).map((item) => {
              const active = isAdmin
                ? isAdminNavActive(location.pathname, item as (typeof adminNavItems)[0])
                : (item as (typeof learnerNavItems)[0]).exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`shrink-0 px-2.5 py-1.5 rounded-full text-xs font-semibold ${
                    active ? 'bg-indigo-100 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {'shortLabel' in item && item.shortLabel ? item.shortLabel : item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              className="hidden sm:inline-flex p-2 rounded-2xl hover:bg-slate-100 transition-all relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-text-secondary" />
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-text-primary truncate max-w-[100px]">
                  {user?.name}
                </p>
                <p className="text-[11px] font-medium text-text-secondary capitalize">{user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-2xl hover:bg-slate-100 transition-all"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-text-primary" />
              ) : (
                <Menu className="w-5 h-5 text-text-primary" />
              )}
            </button>

            <motion.button
              whileHover={{ y: 1 }}
              whileTap={{ y: 2 }}
              onClick={handleLogout}
              className="hidden md:inline-flex items-center gap-1.5 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-2xl px-3 py-2 text-[13px] transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </motion.button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[55] md:hidden animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeMobile} />
          <div className="absolute right-0 top-0 bottom-0 w-[min(100%,20rem)] bg-white border-l border-slate-200 p-5 flex flex-col shadow-xl">
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-200">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="text-text-primary font-semibold truncate max-w-[160px]">{user?.name}</p>
                <p className="text-[11px] text-text-secondary capitalize">{user?.role}</p>
              </div>
            </div>

            {isAdmin && (
              <p
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Navigate
              </p>
            )}

            <nav className="flex flex-col gap-1.5 mb-6 overflow-y-auto">
              {isAdmin
                ? adminNavItems.map((item) => {
                    const active = isAdminNavActive(location.pathname, item)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={closeMobile}
                        className={`flex items-start gap-3 px-3 py-3 rounded-2xl transition-all ${
                          active
                            ? 'bg-indigo-50 text-indigo-800 border-2 border-indigo-200'
                            : 'text-slate-700 hover:bg-slate-50 border-2 border-transparent'
                        }`}
                      >
                        <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                        <span>
                          <span
                            className="block text-sm font-semibold"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {item.label}
                          </span>
                          <span
                            className="block text-[11px] text-slate-500 mt-0.5"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    )
                  })
                : visibleLearnerNav.map((item) => {
                    const active = item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={closeMobile}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${
                          active
                            ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200'
                            : 'text-text-secondary hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </Link>
                    )
                  })}
            </nav>

            <button
              type="button"
              onClick={() => {
                handleLogout()
                closeMobile()
              }}
              className="mt-auto px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-text-primary font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>
    </div>
  )
}
