import { QuestObstacleArt, OBSTACLE_HINT, OBSTACLE_LABEL } from './QuestObstacleArt'
import { ResistanceMeter } from './ResistanceMeter'
import type { ObstacleKey } from '@/lib/learnerPathRoad'

type CheckpointHudProps = {
  obstacleKey: ObstacleKey
  unitName: string
  remaining: number
}

export const CheckpointHud = ({ obstacleKey, unitName, remaining }: CheckpointHudProps) => (
  <div
    data-checkpoint-hud="true"
    data-checkpoint-unit={unitName}
    className="rounded-ev-md bg-white p-4 shadow-ev-card"
  >
    <div className="flex items-center gap-3">
      <QuestObstacleArt obstacleKey={obstacleKey} className="h-36 w-36 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ev-muted">{unitName}</p>
        <p className="text-lg font-black leading-tight text-ev-ink">{OBSTACLE_LABEL[obstacleKey]}</p>
        <p className="text-sm font-bold text-ev-muted">{OBSTACLE_HINT[obstacleKey]}</p>
      </div>
    </div>
    <div className="mt-3">
      <ResistanceMeter remaining={remaining} label="Resistance" />
    </div>
    <p className="mt-2 text-xs font-bold text-ev-muted">A miss just waits. Try again.</p>
  </div>
)
