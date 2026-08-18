/**
 * Short synthesised answer tones.
 *
 * Generated with the Web Audio API rather than shipped as audio files: the
 * cues are two notes long, and an oscillator costs nothing in the bundle.
 * The context is created on the first answer tap, which is a user gesture, so
 * autoplay policies never block it.
 */

const STORAGE_KEY = 'eduvibe_quiz_sound'

let context: AudioContext | null = null

const getContext = () => {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  if (context.state === 'suspended') void context.resume()
  return context
}

export const isQuizSoundOn = () => {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== 'off'
}

export const setQuizSoundOn = (on: boolean) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
}

const tone = (ctx: AudioContext, frequency: number, startAt: number, duration: number, peak: number) => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = frequency
  // Ramped rather than switched, so the cue never clicks in headphones.
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

export const playAnswerSound = (correct: boolean) => {
  if (!isQuizSoundOn()) return
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  if (correct) {
    tone(ctx, 659.25, now, 0.14, 0.18)
    tone(ctx, 880, now + 0.11, 0.26, 0.16)
  } else {
    // Deliberately soft and low: a wrong answer should not feel like a buzzer.
    tone(ctx, 246.94, now, 0.22, 0.1)
  }
}
