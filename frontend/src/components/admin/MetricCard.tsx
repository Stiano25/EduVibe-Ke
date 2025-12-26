import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

export const MetricCard = ({ title, value, subtitle, icon: Icon, iconColor = 'bg-indigo-100 text-indigo-600', trend }: MetricCardProps) => {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] sm:text-xs font-semibold text-text-secondary uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </p>
        <span className={`inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full ${iconColor}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-[10px] sm:text-xs ${trend?.isPositive ? 'text-emerald-700' : 'text-text-secondary'}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
          {trend ? `${trend.value} • ` : ''}{subtitle}
        </p>
      )}
    </div>
  )
}

