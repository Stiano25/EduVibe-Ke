import { MathText } from '@/components/ui/MathText'
import { LiveDiagram, isLiveDiagramType } from './diagrams/LiveDiagram'
import { ObjectQuantityStrip } from './diagrams/objectIcons'
import type { QuizOption } from './quiz/types'

export const isVisualQuizOption = (
  option: QuizOption
): option is { text?: string; diagramType: string; params?: Record<string, unknown> } =>
  typeof option === 'object' && option != null && typeof option.diagramType === 'string'

export const OptionVisual = ({
  option,
  compact = false,
}: {
  option: QuizOption
  compact?: boolean
}) => {
  if (!isVisualQuizOption(option)) {
    return <MathText text={String(option ?? '')} />
  }
  if (option.diagramType === 'object_quantity') {
    return (
      <div className="space-y-1">
        <ObjectQuantityStrip params={option.params} compact={compact} />
        {option.text ? <MathText text={option.text} className="text-xs text-slate-600" /> : null}
      </div>
    )
  }
  if (isLiveDiagramType(option.diagramType)) {
    return (
      <div className="space-y-1">
        <LiveDiagram diagramType={option.diagramType} params={option.params} />
        {option.text ? <MathText text={option.text} className="text-xs text-slate-600" /> : null}
      </div>
    )
  }
  return option.text ? <MathText text={option.text} /> : null
}
