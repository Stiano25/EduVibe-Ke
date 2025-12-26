import { useAuthStore } from '@/store/useAuthStore'
import { Search, Bell, Settings, ChevronDown } from 'lucide-react'

export const Topbar = () => {
  const { user } = useAuthStore()

  return (
    <header className="w-full bg-white px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search lessons, students..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-gray-50 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>

        {/* Actions & User */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all duration-200 relative group">
            <Bell className="w-4 h-4 text-text-secondary group-hover:text-primary" strokeWidth={2.5} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full"></span>
          </button>

          {/* Settings */}
          <button className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all duration-200 group">
            <Settings className="w-4 h-4 text-text-secondary group-hover:text-primary" strokeWidth={2.5} />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
            <div className="text-right">
              <p className="text-xs font-semibold text-primary-600">{user?.name}</p>
              <p className="text-[10px] text-text-secondary">{user?.role === 'admin' ? 'Admin' : 'Learner'}</p>
            </div>
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-soft hover:scale-110 transition-transform duration-200">
              <span className="text-white font-bold text-xs">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-text-secondary" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </header>
  )
}

