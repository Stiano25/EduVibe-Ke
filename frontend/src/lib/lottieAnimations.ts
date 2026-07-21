/** Dynamic loaders for Lottie JSON — keeps ~1.4MB out of the initial JS bundle. */

export type AnimationKey =
  | 'loading'
  | 'student'
  | 'teacher'
  | 'wingedTeacher'
  | 'happyBoy'
  | 'yogaDog'
  | 'flirtingDog'
  | 'cuteTiger'
  | 'fire'
  | 'emojiAngryFace'

const loaders: Record<AnimationKey, () => Promise<unknown>> = {
  loading: () => import('@/animations/loading.json'),
  student: () => import('@/animations/STUDENT.json'),
  teacher: () => import('@/animations/Teacher in Classroom.json'),
  wingedTeacher: () => import('@/animations/Winged Teacher.json'),
  happyBoy: () => import('@/animations/Happy boy.json'),
  yogaDog: () => import('@/animations/Yoga Dog.json'),
  flirtingDog: () => import('@/animations/Flirting Dog.json'),
  cuteTiger: () => import('@/animations/Cute Tiger.json'),
  fire: () => import('@/animations/Fire.json'),
  emojiAngryFace: () => import('@/animations/Emoji Angry Face.json'),
}

const cache = new Map<AnimationKey, object>()

export async function loadAnimation(key: AnimationKey): Promise<object> {
  const cached = cache.get(key)
  if (cached) return cached

  const mod = (await loaders[key]()) as { default?: object } | object
  const data = (mod as { default?: object }).default ?? (mod as object)
  cache.set(key, data)
  return data
}

/** Stable subject → animation mapping (same algorithm as before). */
const SUBJECT_KEYS: AnimationKey[] = [
  'student',
  'teacher',
  'wingedTeacher',
  'happyBoy',
  'yogaDog',
  'flirtingDog',
  'cuteTiger',
  'fire',
]

export function animationKeyForSubjectId(subjectId: string): AnimationKey {
  const index = parseInt(subjectId.slice(-1) || '0', 16) % SUBJECT_KEYS.length
  return SUBJECT_KEYS[index]
}

export function animationKeyForSubjectName(subjectName: string): AnimationKey {
  const name = subjectName.toLowerCase()

  if (
    name.includes('science') ||
    name.includes('biology') ||
    name.includes('chemistry') ||
    name.includes('physics') ||
    name.includes('agriculture')
  ) {
    return 'fire'
  }
  if (
    name.includes('math') ||
    name.includes('mathematics') ||
    name.includes('algebra') ||
    name.includes('geometry') ||
    name.includes('calculus')
  ) {
    return 'student'
  }
  if (
    name.includes('language') ||
    name.includes('english') ||
    name.includes('kiswahili') ||
    name.includes('french') ||
    name.includes('literature') ||
    name.includes('fasihi')
  ) {
    return 'happyBoy'
  }
  if (
    name.includes('art') ||
    name.includes('music') ||
    name.includes('dance') ||
    name.includes('theatre') ||
    name.includes('film')
  ) {
    return 'cuteTiger'
  }
  if (
    name.includes('sport') ||
    name.includes('phe') ||
    name.includes('physical') ||
    name.includes('recreation') ||
    name.includes('health')
  ) {
    return 'yogaDog'
  }
  if (
    name.includes('technical') ||
    name.includes('computer') ||
    name.includes('aviation') ||
    name.includes('media') ||
    name.includes('construction')
  ) {
    return 'teacher'
  }
  if (
    name.includes('business') ||
    name.includes('geography') ||
    name.includes('history') ||
    name.includes('citizenship') ||
    name.includes('religious') ||
    name.includes('cre') ||
    name.includes('hre') ||
    name.includes('ire')
  ) {
    return 'wingedTeacher'
  }
  if (
    name.includes('home science') ||
    name.includes('food') ||
    name.includes('nutrition')
  ) {
    return 'flirtingDog'
  }

  const hash = subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return SUBJECT_KEYS[hash % SUBJECT_KEYS.length]
}
