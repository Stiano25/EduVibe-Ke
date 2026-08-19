const SEEN_UNLOCKED_KEY = 'ev-path-seen-unlocked'
const celebratedKey = (badgeKey: string) => `ev-unit-celebrated-${badgeKey}`

const readSeen = (): string[] | null => {
  if (typeof sessionStorage === 'undefined') return []
  const raw = sessionStorage.getItem(SEEN_UNLOCKED_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

/** Compare against the last remembered set. Does not write — call rememberUnlocked after paint. */
export const justUnlockedAgainstSeen = (currentlyUnlocked: string[]): Set<string> => {
  const prev = readSeen()
  if (prev == null) return new Set()
  const seen = new Set(prev)
  return new Set(currentlyUnlocked.filter((id) => !seen.has(id)))
}

export const rememberUnlocked = (currentlyUnlocked: string[]) => {
  if (typeof sessionStorage === 'undefined') return
  const prev = readSeen() || []
  sessionStorage.setItem(
    SEEN_UNLOCKED_KEY,
    JSON.stringify([...new Set([...prev, ...currentlyUnlocked])])
  )
}

export const hasCelebratedUnit = (badgeKey: string) => {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(celebratedKey(badgeKey)) === '1'
}

export const markUnitCelebrated = (badgeKey: string) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(celebratedKey(badgeKey), '1')
}
