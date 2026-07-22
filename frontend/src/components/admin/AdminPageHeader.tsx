import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { adminWorkflowSteps } from '@/config/adminNav'
import type { ReactNode, ComponentType } from 'react'

/** Compact “you are here” strip under the page title on admin screens. */
export const AdminWorkflowHint = ({ currentPath }: { currentPath?: string }) => {
  const location = useLocation()
  const path = currentPath || location.pathname

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-600">
      <span className="font-semibold text-slate-500 uppercase tracking-wide mr-1">Flow</span>
      {adminWorkflowSteps.map((s, i) => {
        const active = path === s.path || (s.path !== '/admin' && path.startsWith(s.path))
        return (
          <span key={s.path} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
            <Link
              to={s.path}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                active
                  ? 'bg-indigo-100 text-indigo-800 font-semibold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
              style={{ fontFamily: 'Manrope, sans-serif' }}
              title={s.detail}
            >
              {s.step}. {s.title}
            </Link>
          </span>
        )
      })}
    </div>
  )
}

export const AdminPageHeader = ({
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'from-indigo-500 to-purple-600',
  actions,
  showWorkflow = true,
}: {
  title: string
  subtitle?: string
  icon?: ComponentType<{ className?: string }>
  iconClassName?: string
  actions?: ReactNode
  showWorkflow?: boolean
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${iconClassName} flex items-center justify-center shadow-lg shrink-0`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-bold text-[#0F172A] truncate"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="text-xs sm:text-sm text-text-secondary"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {showWorkflow && <AdminWorkflowHint />}
    </div>
  )
}
