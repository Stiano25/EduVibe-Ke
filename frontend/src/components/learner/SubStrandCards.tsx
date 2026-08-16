import { Link } from 'react-router-dom'
import { Clock, Lock, Play } from 'lucide-react'
import type { Subject, Strand } from '@/types'

type SubStrandCardItem = {
  id: string
  name: string
  progressPercent?: number
  estimatedMinutes?: number
  lessonCount?: number
  isUnlocked?: boolean
  sequenceNumber?: number | null
  lessonsAllocated?: number | null
}

interface SubStrandCardsProps {
  subStrands: SubStrandCardItem[]
  strand: Strand
  subject: Subject
}

export const SubStrandCards = ({ subStrands, strand, subject }: SubStrandCardsProps) => {
  const iconColor = subject.color || 'bg-primary-600'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
      {subStrands.map((subStrand, index) => {
        const locked = subStrand.isUnlocked === false
        const isSpotlight = index === 0 && !locked
        const cardTheme = isSpotlight
          ? 'from-indigo-400 via-sky-400 to-emerald-400'
          : 'from-primary-400 via-primary-500 to-teal-400'
        const progress = Math.max(0, Math.min(100, subStrand.progressPercent ?? 0))
        const minutes =
          subStrand.estimatedMinutes ??
          (subStrand.lessonCount ? subStrand.lessonCount * 10 : null)

        const handleMouseDown = (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = 'translateY(4px)'
          e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
        }

        const resetTransform = (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 10px 0 0 rgba(0,0,0,0.05)'
        }

        const Wrapper: 'div' | typeof Link = locked ? 'div' : Link
        const wrapperProps = locked
          ? {}
          : {
              to: `/learner/lessons?subject=${subject.id}&strand=${strand.id}&substrand=${subStrand.id}`,
              onMouseDown: handleMouseDown,
              onMouseUp: resetTransform,
              onMouseLeave: resetTransform,
            }

        return (
          <Wrapper
            key={subStrand.id}
            className={`
              group h-full relative transition-transform duration-300
              ${isSpotlight ? 'sm:col-span-2 md:col-span-2 xl:col-span-2' : ''}
              ${locked ? 'cursor-not-allowed' : ''}
            `}
            style={{
              fontFamily: 'Manrope, sans-serif',
              boxShadow: '0 10px 0 0 rgba(0,0,0,0.05)',
            }}
            {...wrapperProps}
          >
            <div
              className={`
                h-full flex flex-col bg-white/80 backdrop-blur-md rounded-[24px]
                border border-slate-200 relative overflow-hidden
                hover:scale-[1.03] transition-transform
                ${locked ? 'hover:scale-100 grayscale-[0.3]' : ''}
              `}
              style={{ borderWidth: '2.5px' }}
            >
              {locked && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                </div>
              )}
              {isSpotlight && (
                <div className="absolute -top-2 right-3 rotate-[-3deg]">
                  <span
                    className="inline-flex px-3 py-1 rounded-2xl bg-amber-400 text-[10px] font-black text-[#0F172A] shadow-md"
                     
                  >
                    New!
                  </span>
                </div>
              )}

              <div className="p-3 sm:p-4 flex flex-col h-full">
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 bg-gradient-to-br ${iconColor} border border-white shadow-[inset_4px_4px_8px_rgba(0,0,0,0.06),0_10px_18px_rgba(15,23,42,0.08)] flex items-center justify-center`}
                  >
                    <span className="text-white text-lg sm:text-xl font-bold">
                      {subStrand.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-[14px] sm:text-[16px] md:text-[18px] font-semibold text-[#0F172A] mb-1 sm:mb-1.5 line-clamp-2 group-hover:text-primary-700 transition-colors leading-snug"
                       
                    >
                      {subStrand.name}
                    </h3>
                    <p
                      className="text-[11px] sm:text-xs text-text-secondary line-clamp-2 leading-relaxed"
                       
                    >
                      {locked
                        ? 'Finish the previous unit first.'
                        : `Explore lessons and activities for ${subStrand.name} in ${strand.name}`}
                    </p>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div
                      className="flex items-center gap-1.5 text-xs text-text-secondary font-medium"
                       
                    >
                      <Clock className="w-3 h-3" />
                      {minutes != null ? `${minutes}m` : '—'}
                      {subStrand.lessonCount != null && (
                        <span className="text-slate-400">
                          · {subStrand.lessonCount} lesson
                          {subStrand.lessonCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-1 text-primary-700 font-semibold text-xs group-hover:gap-1.5 transition-all"
                       
                    >
                      {locked ? (
                        <>
                          Locked <Lock className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          {progress > 0 ? 'Continue' : 'Start'}{' '}
                          <Play className="w-3 h-3 fill-current" />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="h-2 flex-1 rounded-full bg-slate-200/60 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${cardTheme} transition-[width] duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-bold text-slate-500 tabular-nums shrink-0"
                       
                    >
                      {progress}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Wrapper>
        )
      })}
    </div>
  )
}
