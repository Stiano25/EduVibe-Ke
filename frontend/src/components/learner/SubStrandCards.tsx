import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Play } from 'lucide-react'
import type { Subject, Strand } from '@/types'

interface SubStrandCardsProps {
  subStrands: { id: string; name: string }[]
  strand: Strand
  subject: Subject
}

export const SubStrandCards = ({ subStrands, strand, subject }: SubStrandCardsProps) => {
  // Generate stable progress values for each sub-strand using useMemo
  const progressValues = useMemo(() => {
    return subStrands.map(() => Math.floor(Math.random() * 40) + 40)
  }, [subStrands.length])

  const durationValues = useMemo(() => {
    return subStrands.map(() => Math.floor(Math.random() * 20) + 10)
  }, [subStrands.length])

  const iconColor = subject.color || 'from-indigo-500 to-purple-600'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
      {subStrands.map((subStrand, index) => {
        const isSpotlight = index === 0
        const cardTheme = isSpotlight
          ? 'from-indigo-400 via-sky-400 to-emerald-400'
          : 'from-purple-400 via-violet-400 to-indigo-400'

        const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = 'translateY(4px)'
          e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
        }

        const resetTransform = (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 10px 0 0 rgba(0,0,0,0.05)'
        }

        return (
          <Link
            key={subStrand.id}
            to={`/learner/lessons?subject=${subject.id}&strand=${strand.id}&substrand=${subStrand.id}`}
            className={`
              group h-full relative transition-transform duration-300
              ${isSpotlight ? 'sm:col-span-2 md:col-span-2 xl:col-span-2' : ''}
            `}
            style={{ 
              fontFamily: 'Manrope, sans-serif',
              boxShadow: '0 10px 0 0 rgba(0,0,0,0.05)'
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={resetTransform}
            onMouseLeave={resetTransform}
          >
            <div
              className={`
                h-full flex flex-col bg-white/80 backdrop-blur-md rounded-[24px]
                border border-slate-200 relative overflow-hidden
                hover:scale-[1.03] transition-transform
              `}
              style={{ borderWidth: '2.5px' }}
            >
              {isSpotlight && (
                <div className="absolute -top-2 right-3 rotate-[-3deg]">
                  <span className="inline-flex px-3 py-1 rounded-2xl bg-amber-400 text-[10px] font-black text-[#0F172A] shadow-md" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    New!
                  </span>
                </div>
              )}

              <div className="p-3 sm:p-4 flex flex-col h-full">
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 bg-gradient-to-br ${iconColor} border border-white shadow-[inset_4px_4px_8px_rgba(0,0,0,0.06),0_10px_18px_rgba(15,23,42,0.08)] flex items-center justify-center`}>
                    <span className="text-white text-lg sm:text-xl font-bold">
                      {subStrand.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] sm:text-[16px] md:text-[18px] font-semibold text-[#0F172A] mb-1 sm:mb-1.5 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {subStrand.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-text-secondary line-clamp-2 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Explore lessons and activities for {subStrand.name} in {strand.name}
                    </p>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      <Clock className="w-3 h-3" />
                      {durationValues[index]}m
                    </div>
                    <div className="flex items-center gap-1 text-indigo-600 font-semibold text-xs group-hover:gap-1.5 transition-all" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Start <Play className="w-3 h-3 fill-current" />
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full rounded-full bg-slate-200/60 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${cardTheme} blur-[1px]`}
                      style={{ width: `${progressValues[index]}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
