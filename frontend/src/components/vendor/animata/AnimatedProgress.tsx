import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

/** Animata-style animated progress bar. */
export const AnimatedProgress = ({
  value,
  className,
  barClassName,
}: {
  value: number
  className?: string
  barClassName?: string
}) => {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden', className)}>
      <motion.div
        className={cn('h-full rounded-full bg-primary-600', barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      />
    </div>
  )
}

/** Animata-style pressable scale wrapper. */
export const Pressable = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
    className={className}
  >
    {children}
  </motion.div>
)
