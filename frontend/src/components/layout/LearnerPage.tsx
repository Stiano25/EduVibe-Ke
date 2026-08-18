import type { ReactNode } from 'react'

type LearnerPageProps = {
  children: ReactNode
  /** "wide" is for catalog grids; "default" keeps a comfortable reading measure. */
  width?: 'default' | 'wide'
  className?: string
}

const WIDTHS = {
  default: 'max-w-[1100px]',
  wide: 'max-w-[1320px]',
} as const

/**
 * The single page frame for every learner screen.
 *
 * The page is a faint blue-grey rather than white so the white cards on top
 * of it read as raised objects. Nothing here draws a border.
 */
export const LearnerPage = ({ children, width = 'default', className = '' }: LearnerPageProps) => (
  <div className="min-h-screen bg-ev-page text-ev-ink">
    <div
      className={`mx-auto w-full ${WIDTHS[width]} px-4 py-4 sm:px-6 sm:py-6 print:p-0 ${className}`.trim()}
    >
      {children}
    </div>
  </div>
)
