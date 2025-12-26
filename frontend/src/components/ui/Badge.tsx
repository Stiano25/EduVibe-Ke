import { ReactNode } from 'react'
import { Award, Star, Trophy, Zap } from 'lucide-react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'primary' | 'secondary'
  icon?: 'award' | 'star' | 'trophy' | 'zap'
  size?: 'sm' | 'md' | 'lg'
}

const iconMap = {
  award: Award,
  star: Star,
  trophy: Trophy,
  zap: Zap,
}

export const Badge = ({ children, variant = 'default', icon, size = 'md' }: BadgeProps) => {
  const Icon = icon ? iconMap[icon] : null
  
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    primary: 'bg-primary-50 text-primary-700',
    secondary: 'bg-secondary-50 text-secondary-700',
  }
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${variantStyles[variant]} ${sizeStyles[size]} transition-all duration-200 hover:scale-105`}>
      {Icon && <Icon className={iconSizes[size]} strokeWidth={2.5} />}
      {children}
    </span>
  )
}




