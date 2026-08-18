import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent-peach' | 'accent-mint' | 'accent-lavender'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles = 'font-semibold rounded-3xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'
  
  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border-b-4 border-indigo-800 hover:translate-y-[2px] hover:border-b-2 focus:ring-primary transition-all',
    secondary: 'bg-white text-indigo-600 border-2 border-indigo-200 border-b-4 border-b-indigo-300 hover:bg-indigo-50 hover:translate-y-[2px] hover:border-b-2 hover:shadow-soft focus:ring-primary transition-all',
    ghost: 'text-indigo-600 hover:bg-indigo-50 focus:ring-primary transition-all',
    'accent-peach': 'bg-accent-peach text-white hover:shadow-glow-orange hover:scale-105 focus:ring-accent-peach active:scale-95',
    'accent-mint': 'gradient-success text-white hover:shadow-glow-teal hover:scale-105 focus:ring-accent-mint active:scale-95',
    'accent-lavender': 'bg-accent-lavender text-white hover:shadow-soft hover:scale-105 focus:ring-accent-lavender active:scale-95',
  }
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  }
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

