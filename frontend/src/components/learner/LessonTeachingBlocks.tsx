import { LessonContentRenderer } from '@/components/learner/LessonContentRenderer'
import type { Lesson, LessonContentBlock, LessonVisualAsset, LessonVisualBrief } from '@/types'

interface LessonTeachingBlocksProps {
  content?: string
  contentBlocks?: LessonContentBlock[]
  visualBriefs?: LessonVisualBrief[]
  visualAssets?: LessonVisualAsset[]
  images?: string[]
  /** When true, prefer showing diagrams even without visual preference */
  showDiagrams?: boolean
}

const resolveAsset = (
  briefId: string | undefined,
  briefs: LessonVisualBrief[],
  assets: LessonVisualAsset[],
  images: string[]
) => {
  if (!briefId) return null
  const briefIndex = briefs.findIndex((b) => b.id === briefId)
  const byId = assets.find((a) => a.id === briefId)
  if (byId?.url) return byId
  if (briefIndex >= 0) {
    if (assets[briefIndex]?.url) return assets[briefIndex]
    if (images[briefIndex]) {
      return {
        url: images[briefIndex],
        alt: briefs[briefIndex]?.brief,
        skillFocus: briefs[briefIndex]?.skillFocus,
      } as LessonVisualAsset
    }
  }
  return null
}

/** Renders interleaved text + diagram blocks (falls back to plain content). */
export const LessonTeachingBlocks = ({
  content,
  contentBlocks,
  visualBriefs = [],
  visualAssets = [],
  images = [],
  showDiagrams = true,
}: LessonTeachingBlocksProps) => {
  const blocks =
    contentBlocks && contentBlocks.length > 0
      ? contentBlocks
      : content
        ? ([{ type: 'text' as const, text: content }] as LessonContentBlock[])
        : []

  if (blocks.length === 0) return null

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.type === 'diagram' && showDiagrams) {
          const asset = resolveAsset(block.briefId, visualBriefs, visualAssets, images)
          const brief = visualBriefs.find((b) => b.id === block.briefId)
          if (!asset?.url) {
            return (
              <div
                key={block.id || `d-${i}`}
                className="rounded-[16px] border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Diagram pending approval
                {brief?.brief ? `: ${brief.brief}` : ''}
              </div>
            )
          }
          return (
            <figure
              key={block.id || `d-${i}`}
              className="rounded-[16px] overflow-hidden border-2 border-slate-200 bg-slate-50"
            >
              <img
                src={asset.url}
                alt={asset.alt || brief?.brief || 'Lesson diagram'}
                className="w-full h-auto object-contain max-h-72 bg-white"
              />
              {(brief?.brief || asset.alt || asset.skillFocus || brief?.skillFocus) && (
                <figcaption
                  className="px-3 py-2 text-xs italic text-slate-600 border-t border-slate-200 leading-relaxed"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {brief?.brief || asset.alt || asset.skillFocus || brief?.skillFocus}
                </figcaption>
              )}
            </figure>
          )
        }

        if (block.type === 'text' && block.text) {
          return (
            <div key={block.id || `t-${i}`} className="prose max-w-none">
              <LessonContentRenderer content={block.text} />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

interface LessonProps {
  lesson: Lesson
  showDiagrams?: boolean
}

export const LessonTeachingFromLesson = ({ lesson, showDiagrams = true }: LessonProps) => (
  <LessonTeachingBlocks
    content={lesson.content}
    contentBlocks={lesson.contentBlocks || lesson.quiz?.contentBlocks}
    visualBriefs={lesson.visualBriefs}
    visualAssets={lesson.visualAssets}
    images={lesson.images}
    showDiagrams={showDiagrams}
  />
)
