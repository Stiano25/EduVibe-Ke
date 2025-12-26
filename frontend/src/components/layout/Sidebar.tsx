import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  GraduationCap, 
  Sparkles,
  LogOut,
  Plus,
  Settings,
  HelpCircle
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Lessons', path: '/admin/lessons', icon: BookOpen },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
]

const learnerNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/learner', icon: LayoutDashboard },
  { label: 'My Lessons', path: '/learner/lessons', icon: GraduationCap },
  { label: 'Recommendations', path: '/learner/recommendations', icon: Sparkles },
]

export const Sidebar = () => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const sidebarRef = useRef<HTMLElement>(null)
  
  const navItems = user?.role === 'admin' ? adminNavItems : learnerNavItems

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(sidebarRef.current, 
        { x: -100, opacity: 0 },
        { x: 0, opacity: 1, duration: 1, ease: 'expo.out' }
      )
    }
  }, [])

  return (
    <aside 
      ref={sidebarRef}
      className="sticky top-0 h-screen w-20 md:w-28 glassmorphic-dark flex flex-col items-center py-10 z-50 border-r border-white/10 shadow-2xl"
    >
      {/* Brand Logo */}
      <div className="mb-14">
        <Link to={user?.role === 'admin' ? '/admin' : '/learner'} className="group block relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow group-hover:scale-110 transition-all duration-500 group-hover:rotate-12 relative z-10">
            <Plus className="w-7 h-7 text-white" strokeWidth={3.5} />
          </div>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-8 w-full items-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                w-16 h-16 rounded-[24px] flex items-center justify-center
                transition-all duration-500 group relative
                ${isActive 
                  ? 'bg-white/10 text-white shadow-glow-primary' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon 
                className={`w-7 h-7 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-6 px-4 py-2 rounded-2xl bg-white text-primary-900 text-[11px] font-black uppercase tracking-[0.15em] opacity-0 group-hover:opacity-100 pointer-events-none translate-x-[-10px] group-hover:translate-x-0 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.3)] whitespace-nowrap z-50">
                {item.label}
              </div>

              {isActive && (
                <div className="absolute -left-3 w-2 h-10 bg-primary rounded-r-full shadow-[0_0_15px_rgba(124,58,237,0.8)]" />
              )}
            </Link>
          )
        })}
      </nav>
      
      {/* Bottom Actions */}
      <div className="flex flex-col gap-5 mt-auto pb-6">
        <button className="w-14 h-14 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all group">
          <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" strokeWidth={2} />
        </button>
        <button className="w-14 h-14 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all group">
          <HelpCircle className="w-6 h-6" strokeWidth={2} />
        </button>
        <div className="w-12 h-[1px] bg-white/10 mx-auto my-3" />
        <button
          onClick={logout}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-secondary/60 hover:text-secondary hover:bg-secondary/10 transition-all group"
          title="Logout"
        >
          <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
        </button>
      </div>
    </aside>
  )
}
