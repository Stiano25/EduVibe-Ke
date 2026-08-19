import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'
import { MatatuIcon } from './MatatuIcon'

type PathVehicleProps = {
  pathEl: SVGPathElement | null
  fromProgress: number
  toProgress: number
  layoutKey: string
  onArrived?: () => void
}

export const PathVehicle = ({
  pathEl,
  fromProgress,
  toProgress,
  layoutKey,
  onArrived,
}: PathVehicleProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const vehicleRef = useRef<HTMLDivElement>(null)
  const arrivedRef = useRef(onArrived)
  arrivedRef.current = onArrived

  useGSAP(
    () => {
      const vehicle = vehicleRef.current
      if (!vehicle || !pathEl) return

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const same = Math.abs(toProgress - fromProgress) < 0.004
      const duration = reduce || same ? 0 : Math.min(1.4, 0.6 + Math.abs(toProgress - fromProgress) * 2.2)

      gsap.set(vehicle, { autoAlpha: 1, force3D: true })
      vehicle.setAttribute('data-vehicle-state', same || reduce ? 'parked' : 'moving')
      const tween = gsap.to(vehicle, {
        duration,
        delay: same || reduce ? 0 : 0.35,
        ease: 'power2.inOut',
        immediateRender: true,
        motionPath: {
          path: pathEl,
          align: pathEl,
          alignOrigin: [0.5, 0.8],
          autoRotate: true,
          start: fromProgress,
          end: toProgress,
        },
        onComplete: () => {
          vehicle.setAttribute('data-vehicle-state', 'parked')
          if (!same) arrivedRef.current?.()
        },
      })
      return () => {
        tween.kill()
      }
    },
    { dependencies: [pathEl, fromProgress, toProgress, layoutKey], scope: rootRef }
  )

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      <div
        ref={vehicleRef}
        data-path-vehicle="matatu"
        data-vehicle-state="parked"
        className="ev-path-vehicle absolute left-0 top-0 h-[7.75rem] w-[13rem]"
        style={{ visibility: 'hidden' }}
      >
        <div className="ev-bob origin-bottom">
          <MatatuIcon />
        </div>
      </div>
    </div>
  )
}
