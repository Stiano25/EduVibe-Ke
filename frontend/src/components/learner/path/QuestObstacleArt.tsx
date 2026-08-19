import type { ReactNode } from 'react'
import type { ObstacleKey } from '@/lib/learnerPathRoad'

const INK = '#2E3A45'

const wrap = (label: string, className: string | undefined, inner: ReactNode) => (
  <svg viewBox="0 0 160 160" className={className || 'h-40 w-40'} role="img" aria-label={label}>
    <title>{label}</title>
    {inner}
  </svg>
)

type ArtProps = { className?: string }

/** Sleepy hippo — barrel, tiny ears, huge muzzle with nostrils. */
const Hippo = ({ className }: ArtProps) =>
  wrap(
    'Sleepy hippo',
    className,
    <>
      <ellipse cx="80" cy="148" rx="48" ry="7" fill={INK} opacity="0.14" />
      <ellipse cx="42" cy="128" rx="16" ry="12" fill="#5FB3CE" stroke={INK} strokeWidth="3" />
      <ellipse cx="118" cy="128" rx="16" ry="12" fill="#5FB3CE" stroke={INK} strokeWidth="3" />
      <ellipse cx="80" cy="104" rx="56" ry="36" fill="#7EC9DE" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="46" cy="36" rx="13" ry="16" fill="#8ED4E8" stroke={INK} strokeWidth="3" />
      <ellipse cx="114" cy="36" rx="13" ry="16" fill="#8ED4E8" stroke={INK} strokeWidth="3" />
      <ellipse cx="46" cy="36" rx="5" ry="7" fill="#FFE7F2" />
      <ellipse cx="114" cy="36" rx="5" ry="7" fill="#FFE7F2" />
      <ellipse cx="80" cy="58" rx="38" ry="28" fill="#A8E4F2" stroke={INK} strokeWidth="3.5" />
      <path d="M56 50 Q66 42 76 50" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M86 50 Q96 42 106 50" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="66" cy="60" rx="6" ry="5" fill={INK} />
      <ellipse cx="94" cy="60" rx="6" ry="5" fill={INK} />
      <ellipse cx="80" cy="102" rx="50" ry="30" fill="#9FDBEC" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="80" cy="96" rx="36" ry="16" fill="#C5F0F8" />
      <ellipse cx="62" cy="94" rx="6" ry="8" fill={INK} />
      <ellipse cx="98" cy="94" rx="6" ry="8" fill={INK} />
      <path d="M56 114 Q80 126 104 114" fill="none" stroke="#1A93CE" strokeWidth="3.2" strokeLinecap="round" />
    </>
  )

/** Giggly goat — horns, beard, rectangular body, hooves. */
const Goat = ({ className }: ArtProps) =>
  wrap(
    'Giggly goat',
    className,
    <>
      <ellipse cx="80" cy="148" rx="44" ry="7" fill={INK} opacity="0.14" />
      <rect x="52" y="118" width="10" height="22" rx="4" fill="#E8A8C4" stroke={INK} strokeWidth="3" />
      <rect x="98" y="118" width="10" height="22" rx="4" fill="#E8A8C4" stroke={INK} strokeWidth="3" />
      <ellipse cx="40" cy="128" rx="8" ry="5" fill="#DB3B87" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="80" cy="96" rx="46" ry="32" fill="#FF8FBE" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="80" cy="98" rx="28" ry="18" fill="#FFE7F2" />
      <path d="M48 42 C38 10 18 22 44 52" fill="#DB3B87" stroke={INK} strokeWidth="3" />
      <path d="M112 42 C122 10 142 22 116 52" fill="#DB3B87" stroke={INK} strokeWidth="3" />
      <circle cx="80" cy="58" r="30" fill="#FF8FBE" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="38" cy="62" rx="12" ry="14" fill="#FF8FBE" stroke={INK} strokeWidth="3" />
      <ellipse cx="122" cy="62" rx="12" ry="14" fill="#FF8FBE" stroke={INK} strokeWidth="3" />
      <circle cx="68" cy="54" r="6.5" fill={INK} />
      <circle cx="92" cy="54" r="6.5" fill={INK} />
      <circle cx="70" cy="52" r="2.2" fill="#fff" />
      <circle cx="94" cy="52" r="2.2" fill="#fff" />
      <path d="M66 72 Q80 88 94 72" fill="none" stroke="#DB3B87" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M80 78 L80 104" stroke="#DB3B87" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="80" cy="112" rx="8" ry="12" fill="#FFE7F2" stroke={INK} strokeWidth="2.5" />
    </>
  )

/** Balloon crab — wide body, pincers, stalk eyes, balloons. */
const Crab = ({ className }: ArtProps) =>
  wrap(
    'Balloon crab',
    className,
    <>
      <ellipse cx="80" cy="148" rx="46" ry="7" fill={INK} opacity="0.14" />
      <circle cx="36" cy="28" r="18" fill="#2BB3F3" stroke={INK} strokeWidth="3" />
      <circle cx="36" cy="22" r="7" fill="#E0F5FE" opacity="0.85" />
      <circle cx="124" cy="24" r="16" fill="#FF5CA8" stroke={INK} strokeWidth="3" />
      <circle cx="124" cy="18" r="6" fill="#FFE7F2" opacity="0.9" />
      <path d="M36 46 L62 86" stroke={INK} strokeWidth="2.5" />
      <path d="M124 40 L98 86" stroke={INK} strokeWidth="2.5" />
      <path d="M28 92 Q6 70 18 50" fill="none" stroke="#DB3B87" strokeWidth="7" strokeLinecap="round" />
      <path d="M18 50 Q6 42 16 36 Q32 42 26 54 Q10 56 18 50" fill="#FF5CA8" stroke={INK} strokeWidth="3" />
      <path d="M132 92 Q154 70 142 50" fill="none" stroke="#DB3B87" strokeWidth="7" strokeLinecap="round" />
      <path d="M142 50 Q154 42 144 36 Q128 42 134 54 Q150 56 142 50" fill="#FF5CA8" stroke={INK} strokeWidth="3" />
      <ellipse cx="80" cy="102" rx="48" ry="28" fill="#FF5CA8" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="80" cy="96" rx="32" ry="16" fill="#FF7AB8" />
      <circle cx="64" cy="92" r="8" fill={INK} />
      <circle cx="96" cy="92" r="8" fill={INK} />
      <circle cx="66.5" cy="89.5" r="2.6" fill="#fff" />
      <circle cx="98.5" cy="89.5" r="2.6" fill="#fff" />
      <path d="M66 110 Q80 120 94 110" fill="none" stroke="#DB3B87" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 124 L42 138" stroke="#DB3B87" strokeWidth="4" strokeLinecap="round" />
      <path d="M64 128 L60 140" stroke="#DB3B87" strokeWidth="4" strokeLinecap="round" />
      <path d="M96 128 L100 140" stroke="#DB3B87" strokeWidth="4" strokeLinecap="round" />
      <path d="M112 124 L118 138" stroke="#DB3B87" strokeWidth="4" strokeLinecap="round" />
    </>
  )

/** Shy tortoise — dome shell with plates, head poking out, stubby feet. */
const Tortoise = ({ className }: ArtProps) =>
  wrap(
    'Shy tortoise',
    className,
    <>
      <ellipse cx="80" cy="148" rx="50" ry="7" fill={INK} opacity="0.14" />
      <ellipse cx="28" cy="124" rx="16" ry="10" fill="#5FB93B" stroke={INK} strokeWidth="3" />
      <ellipse cx="62" cy="132" rx="16" ry="10" fill="#5FB93B" stroke={INK} strokeWidth="3" />
      <ellipse cx="98" cy="132" rx="16" ry="10" fill="#5FB93B" stroke={INK} strokeWidth="3" />
      <ellipse cx="80" cy="86" rx="54" ry="40" fill="#5FB93B" stroke={INK} strokeWidth="3.5" />
      <path d="M36 86 Q80 40 124 86 Q80 122 36 86" fill="#7ED957" stroke={INK} strokeWidth="3" />
      <path d="M56 68 L80 52 L104 68 L94 90 L66 90 Z" fill="#9BE37A" stroke={INK} strokeWidth="2.5" />
      <path d="M42 92 L64 82 L80 108 L52 112 Z" fill="#6FCF4A" stroke={INK} strokeWidth="2.5" />
      <path d="M118 92 L96 82 L80 108 L108 112 Z" fill="#6FCF4A" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="128" cy="78" rx="22" ry="18" fill="#C6F09A" stroke={INK} strokeWidth="3.5" />
      <circle cx="136" cy="74" r="4.5" fill={INK} />
      <circle cx="137.5" cy="72.5" r="1.5" fill="#fff" />
      <path d="M120 86 Q130 94 140 86" fill="none" stroke="#5FB93B" strokeWidth="2.8" strokeLinecap="round" />
      <ellipse cx="128" cy="118" rx="14" ry="9" fill="#5FB93B" stroke={INK} strokeWidth="3" />
    </>
  )

/** Banana snail — yellow slug body, spiral shell, eyestalks. */
const Snail = ({ className }: ArtProps) =>
  wrap(
    'Banana snail',
    className,
    <>
      <ellipse cx="80" cy="148" rx="50" ry="7" fill={INK} opacity="0.14" />
      <ellipse cx="58" cy="118" rx="52" ry="22" fill="#FACC15" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="54" cy="112" rx="40" ry="14" fill="#FDE047" />
      <circle cx="108" cy="78" r="38" fill="#FF5CA8" stroke={INK} strokeWidth="3.5" />
      <circle cx="108" cy="78" r="26" fill="#FFE7F2" stroke={INK} strokeWidth="2.5" />
      <circle cx="108" cy="78" r="14" fill="#2BB3F3" stroke={INK} strokeWidth="2.5" />
      <circle cx="108" cy="78" r="6" fill="#1A93CE" />
      <path d="M108 52 A 26 26 0 0 1 134 78" fill="none" stroke="#DB3B87" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="28" cy="106" r="7" fill={INK} />
      <circle cx="30.5" cy="103.5" r="2.4" fill="#fff" />
      <path d="M24 94 L16 58" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M38 94 L48 54" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="16" cy="54" r="8" fill="#7ED957" stroke={INK} strokeWidth="3" />
      <circle cx="48" cy="52" r="8" fill="#7ED957" stroke={INK} strokeWidth="3" />
      <circle cx="16" cy="54" r="3.2" fill={INK} />
      <circle cx="48" cy="52" r="3.2" fill={INK} />
    </>
  )

/** Cloud sheep — side-on woolly body, big face, ears, snout, four legs. */
const Sheep = ({ className }: ArtProps) =>
  wrap(
    'Cloud sheep',
    className,
    <>
      <ellipse cx="80" cy="148" rx="50" ry="7" fill={INK} opacity="0.14" />
      <rect x="40" y="114" width="13" height="26" rx="6" fill="#2BB3F3" stroke={INK} strokeWidth="3" />
      <rect x="62" y="118" width="13" height="24" rx="6" fill="#2BB3F3" stroke={INK} strokeWidth="3" />
      <rect x="88" y="118" width="13" height="24" rx="6" fill="#2BB3F3" stroke={INK} strokeWidth="3" />
      <rect x="110" y="114" width="13" height="26" rx="6" fill="#2BB3F3" stroke={INK} strokeWidth="3" />
      <path
        d="M34 96 C24 86 24 66 40 58 C34 42 56 30 72 44 C80 24 112 26 120 48 C136 40 152 58 144 76 C158 86 150 110 128 116 C112 132 64 132 46 118 C30 124 22 108 34 96 Z"
        fill="#ffffff"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <circle cx="64" cy="78" r="9" fill="#E0F5FE" />
      <circle cx="92" cy="70" r="11" fill="#E0F5FE" />
      <circle cx="84" cy="98" r="9" fill="#E0F5FE" />
      <ellipse cx="28" cy="86" rx="11" ry="13" fill="#ffffff" stroke={INK} strokeWidth="3" />
      <ellipse cx="126" cy="66" rx="26" ry="24" fill="#FFE7F2" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="108" cy="50" rx="10" ry="15" fill="#FFC4DC" stroke={INK} strokeWidth="2.8" />
      <ellipse cx="142" cy="50" rx="10" ry="15" fill="#FFC4DC" stroke={INK} strokeWidth="2.8" />
      <circle cx="118" cy="62" r="5.2" fill={INK} />
      <circle cx="136" cy="62" r="5.2" fill={INK} />
      <circle cx="119.6" cy="60.4" r="1.8" fill="#fff" />
      <circle cx="137.6" cy="60.4" r="1.8" fill="#fff" />
      <ellipse cx="128" cy="76" rx="8" ry="6" fill="#FF5CA8" stroke={INK} strokeWidth="2.2" />
      <path d="M118 84 Q128 92 138 84" fill="none" stroke="#DB3B87" strokeWidth="2.8" strokeLinecap="round" />
    </>
  )

const ART: Record<ObstacleKey, (props: ArtProps) => ReactNode> = {
  hippo: Hippo,
  goat: Goat,
  crab: Crab,
  tortoise: Tortoise,
  snail: Snail,
  sheep: Sheep,
}

export const OBSTACLE_LABEL: Record<ObstacleKey, string> = {
  hippo: 'Sleepy hippo',
  goat: 'Giggly goat',
  crab: 'Balloon crab',
  tortoise: 'Shy tortoise',
  snail: 'Banana snail',
  sheep: 'Cloud sheep',
}

export const OBSTACLE_HINT: Record<ObstacleKey, string> = {
  hippo: 'Help the hippo finish its nap.',
  goat: 'Make the goat giggle and step aside.',
  crab: 'Pop the balloons so the crab can rest.',
  tortoise: 'Cheer the tortoise onto the grass.',
  snail: 'Nudge the snail off the road.',
  sheep: 'Fluff the sheep back onto the hill.',
}

export const QuestObstacleArt = ({
  obstacleKey,
  className,
}: {
  obstacleKey: ObstacleKey
  className?: string
}) => {
  const Art = ART[obstacleKey]
  return <>{Art({ className })}</>
}

/** Soft silhouette for fog-of-war previews — same creature, no extra assets. */
export const QuestObstacleSilhouette = ({
  obstacleKey,
  className,
}: {
  obstacleKey: ObstacleKey
  className?: string
}) => (
  <div className={`origin-bottom scale-125 ${className || ''}`} aria-hidden>
    <QuestObstacleArt
      obstacleKey={obstacleKey}
      className="h-full w-full opacity-70 blur-[1.5px] brightness-110 saturate-75"
    />
  </div>
)
