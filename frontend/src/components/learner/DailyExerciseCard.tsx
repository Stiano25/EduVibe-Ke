import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { learnerButton } from '@/lib/learnerUi'

export const DailyExerciseCard = () => {
  return (
    <div className="relative min-h-[148px] overflow-hidden rounded-ev-lg bg-ev-pink shadow-ev-card">
      <div className="relative z-10 flex min-h-[148px] max-w-[64%] flex-col justify-center p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Daily exercise</p>
        <h3 className="mt-1 text-lg font-black leading-tight text-white">Warm up your brain</h3>
        <Link to="/learner/recommendations" className={learnerButton('onColor', 'sm', 'mt-3 self-start')}>
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          Start now
        </Link>
      </div>
      <div className="pointer-events-none absolute -bottom-4 -right-3 h-36 w-36 sm:h-44 sm:w-44">
        <LazyLottie animationKey="flirtingDog" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
