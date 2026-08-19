import { loadAnimation, type AnimationKey } from '@/lib/lottieAnimations'
import { LazyLottie } from '@/components/ui/LazyLottie'

type AnswerCharacterReactionProps = {
  correct: boolean
  runKey: string
}

/** Prefetch so the first tap is not blocked by a Lottie JSON fetch. */
export const prefetchAnswerCharacters = () => {
  void loadAnimation('happyBoy')
  void loadAnimation('yogaDog')
}

/**
 * Brief in-feedback character. Plays inside the existing hold window —
 * do not await this component; unmount with the flash.
 */
export const AnswerCharacterReaction = ({ correct, runKey }: AnswerCharacterReactionProps) => {
  const animationKey: AnimationKey = correct ? 'happyBoy' : 'yogaDog'
  return (
    <div
      key={runKey}
      className="ev-answer-character pointer-events-none absolute bottom-2 right-2 z-30 h-24 w-24 sm:h-28 sm:w-28"
      aria-hidden="true"
    >
      <LazyLottie
        animationKey={animationKey}
        loop={false}
        speed={2}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
