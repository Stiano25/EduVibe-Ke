import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import gsap from 'gsap'

// Multilingual greetings based on time of day
const getTimeBasedGreetings = () => {
  const hour = new Date().getHours()
  let timeOfDay: 'morning' | 'afternoon' | 'evening'
  
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning'
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon'
  } else {
    timeOfDay = 'evening'
  }

  return {
    timeOfDay,
    greetings: {
      english: timeOfDay === 'morning' ? 'Good Morning' : timeOfDay === 'afternoon' ? 'Good Afternoon' : 'Good Evening',
      swahili: timeOfDay === 'morning' ? 'Habari za Asubuhi' : timeOfDay === 'afternoon' ? 'Habari za Mchana' : 'Habari za Jioni',
      french: timeOfDay === 'morning' ? 'Bonjour' : timeOfDay === 'afternoon' ? 'Bon Après-Midi' : 'Bonsoir',
      spanish: timeOfDay === 'morning' ? 'Buenos Días' : timeOfDay === 'afternoon' ? 'Buenas Tardes' : 'Buenas Noches',
      german: timeOfDay === 'morning' ? 'Guten Morgen' : timeOfDay === 'afternoon' ? 'Guten Tag' : 'Guten Abend',
      hindi: timeOfDay === 'morning' ? 'सुप्रभात' : timeOfDay === 'afternoon' ? 'नमस्ते' : 'शुभ संध्या',
      arabic: timeOfDay === 'morning' ? 'صباح الخير' : timeOfDay === 'afternoon' ? 'مساء الخير' : 'مساء الخير',
    }
  }
}

const fixedGradient = 'from-pink-500 via-rose-500 to-fuchsia-500'
const encryptedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()[]{}|;:,.<>?/~`'

export const WelcomeHeader = () => {
  const { user } = useAuthStore()
  const [displayGreeting, setDisplayGreeting] = useState('')
  const [displayName, setDisplayName] = useState('')
  const welcomeRef = useRef<HTMLDivElement>(null)
  const encryptionIntervalRef = useRef<number | null>(null)
  const displayTimeoutRef = useRef<number | null>(null)
  const currentIndexRef = useRef(0)

  const { greetings, languageKeys } = useMemo(() => {
    const { greetings: timeGreetings } = getTimeBasedGreetings()
    const keys = Object.keys(timeGreetings) as Array<keyof typeof timeGreetings>
    return { greetings: timeGreetings, languageKeys: keys }
  }, [])

  const animateEncryption = (targetGreeting: string, targetName: string, onComplete: () => void) => {
    if (encryptionIntervalRef.current) {
      clearInterval(encryptionIntervalRef.current)
    }

    const duration = 2500
    const steps = 50
    const stepDuration = duration / steps
    let step = 0

    encryptionIntervalRef.current = window.setInterval(() => {
      const progress = step / steps
      const greetingRevealedChars = Math.floor(progress * targetGreeting.length)
      const nameRevealedChars = Math.floor(progress * targetName.length)
      
      const animatedGreeting = targetGreeting
        .split('')
        .map((char, index) => {
          if (index < greetingRevealedChars) return char
          return encryptedChars[Math.floor(Math.random() * encryptedChars.length)]
        })
        .join('')
      
      const animatedName = targetName
        .split('')
        .map((char, index) => {
          if (index < nameRevealedChars) return char
          return encryptedChars[Math.floor(Math.random() * encryptedChars.length)]
        })
        .join('')
      
      setDisplayGreeting(animatedGreeting)
      setDisplayName(animatedName)
      step++

      if (step >= steps) {
        if (encryptionIntervalRef.current) {
          clearInterval(encryptionIntervalRef.current)
        }
        setDisplayGreeting(targetGreeting)
        setDisplayName(targetName)
        onComplete()
      }
    }, stepDuration)
  }

  useEffect(() => {
    if (!user?.name || !greetings || !languageKeys || languageKeys.length === 0) return

    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current)
    }
    if (encryptionIntervalRef.current) {
      clearInterval(encryptionIntervalRef.current)
    }

    const cycleLanguages = () => {
      const currentIndex = currentIndexRef.current
      const currentLanguage = languageKeys[currentIndex]
      const nextIndex = (currentIndex + 1) % languageKeys.length
      
      const currentGreeting = greetings[currentLanguage]
      const nextLanguage = languageKeys[nextIndex]
      const nextGreeting = greetings[nextLanguage]

      setDisplayGreeting(currentGreeting)
      setDisplayName(user.name)

      displayTimeoutRef.current = window.setTimeout(() => {
        animateEncryption(nextGreeting, user.name, () => {
          currentIndexRef.current = nextIndex
          displayTimeoutRef.current = window.setTimeout(cycleLanguages, 5000)
        })
      }, 5000)
    }

    const currentLanguage = languageKeys[0]
    setDisplayGreeting(greetings[currentLanguage])
    setDisplayName(user.name)

    displayTimeoutRef.current = window.setTimeout(cycleLanguages, 5000)

    return () => {
      if (displayTimeoutRef.current) clearTimeout(displayTimeoutRef.current)
      if (encryptionIntervalRef.current) clearInterval(encryptionIntervalRef.current)
    }
  }, [user?.name, greetings, languageKeys])

  useEffect(() => {
    if (welcomeRef.current) {
      gsap.fromTo(
        welcomeRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      )
    }
  }, [])

  return (
    <div className="mb-6 text-center" ref={welcomeRef}>
      <div className="min-h-[80px] sm:min-h-[100px] md:min-h-[120px] flex flex-col justify-center items-center">
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-2 px-2 overflow-hidden"
          style={{ 
            fontFamily: 'Fredoka, sans-serif',
            lineHeight: '1.2',
            wordBreak: 'break-word',
            hyphens: 'auto'
          }}
        >
          <span className={`bg-gradient-to-r ${fixedGradient} bg-clip-text text-transparent inline-block`}>
            {displayGreeting || greetings.english}
          </span>
          <span className={`bg-gradient-to-r ${fixedGradient} bg-clip-text text-transparent`}>, </span>
          <span className={`bg-gradient-to-r ${fixedGradient} bg-clip-text text-transparent inline-block`}>
            {displayName || user?.name}
          </span>!
        </h1>
      </div>
      <p className="text-sm sm:text-base text-text-secondary" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        Ready to learn something amazing today?
      </p>
    </div>
  )
}




