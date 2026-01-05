// @ts-ignore - lottie-react types
import Lottie from 'lottie-react'
// @ts-ignore - JSON imports for animations
import flirtingDogAnimation from '@/animations/Flirting Dog.json'

export const DailyExerciseCard = () => {
  return (
    <div className="mb-4 sm:mb-6 px-2 sm:px-3 md:px-5">
      <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] border border-white/30 shadow-xl backdrop-blur-xl bg-gradient-to-br from-pink-600 via-rose-600 to-fuchsia-700 max-w-2xl mx-auto">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex-shrink-0">
            <Lottie 
              animationData={flirtingDogAnimation}
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/80 font-semibold mb-1">
              Daily Exercise
            </p>
            <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-white">
              Are you ready for the daily exercise?
            </h3>
            <p className="mt-1 text-[10px] sm:text-[11px] text-white/85">
              Short, fun activities picked just for you. Let&apos;s get your brain warmed up.
            </p>
            <button
              className="mt-2 sm:mt-3 inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/90 text-pink-600 text-[10px] sm:text-xs font-semibold shadow-lg hover:bg-white transition-all"
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px) scale(0.97)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = ''
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
              }}
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}





