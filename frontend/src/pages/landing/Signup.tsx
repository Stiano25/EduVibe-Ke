import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { BackgroundBeams } from '@/components/aceternity/BackgroundBeams'
import { Spotlight } from '@/components/aceternity/Spotlight'
import { InfiniteMovingCards, type MovingCard } from '@/components/aceternity/InfiniteMovingCards'
import { GraduationCap, Lock, ShieldCheck, Sparkles } from 'lucide-react'

export const Signup = () => {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const testimonials = useMemo<MovingCard[]>(
    () => [
      {
        quote: 'It’s the first time parents actually understand the progress report without a meeting.',
        name: 'Head of Academics',
        role: 'Private School • Nairobi',
      },
      {
        quote: 'The dashboard is calm, fast, and makes follow‑ups feel obvious.',
        name: 'Class Teacher',
        role: 'Upper Primary',
      },
      {
        quote: 'Weekly highlights changed how we support at home. It’s simple and actionable.',
        name: 'Parent',
        role: 'Grade 6',
      },
    ],
    []
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Please enter your name.')
    if (!email.trim()) return setError('Please enter your email.')
    if (!password) return setError('Please create a password.')
    if (password.length < 6) return setError('Password should be at least 6 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    if (!grade) return setError('Please select your grade.')

    setLoading(true)

    try {
      const response = await api.learner.register({
        name: name.trim(),
        email: email.trim(),
        password: password,
        grade: grade,
      })

      if (!response?.user || !response?.token) {
        throw new Error('Registration succeeded but session token was missing')
      }

      setSession(
        {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          grade: response.user.grade,
        },
        response.token
      )

      navigate('/learner')
    } catch (err: any) {
      console.error('Registration error:', err)
      // Show more detailed error message
      const errorMessage = err.message || 'Failed to create account. Please try again.'
      const errorDetails = err.details || err.hint || ''
      setError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen premium-mesh text-text-primary relative overflow-hidden">
      <BackgroundBeams />
      <Spotlight />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight text-gradient leading-none">EduVibe</p>
              <p className="text-[11px] text-text-tertiary">School ↔ Home, beautifully connected</p>
            </div>
          </Link>

          <Link to="/login" className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
            Already have an account? <span className="text-primary-600">Sign in</span>
          </Link>
        </div>

        <div className="mt-8 grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* Left: brand & social proof */}
          <StaggeredEntry className="space-y-4">
            <div className="glassmorphic-card p-5 sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/70 px-3 py-1 text-[11px] font-semibold text-text-secondary">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                Create your EduVibe account
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                Start seeing progress as a <span className="text-gradient">story</span>, not a spreadsheet.
              </h1>
              <p className="mt-2 text-sm text-text-secondary max-w-md">
                Demo signup logs you in instantly. You can explore the learner dashboard right away.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-[12px] text-text-secondary">
                <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3">
                  <p className="font-semibold text-text-primary">Fast</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Takes under 30 seconds</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3">
                  <p className="font-semibold text-text-primary">Private</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Clear, minimal data</p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[11px] text-text-tertiary">
                <ShieldCheck className="w-4 h-4 text-success-600" />
                Your demo account is stored in session only (logout clears it).
              </div>
            </div>

            <div className="hidden lg:block">
              <InfiniteMovingCards items={testimonials} />
            </div>
          </StaggeredEntry>

          {/* Right: form */}
          <StaggeredEntry>
            <div className="glassmorphic-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-[0.18em]">Sign up</p>
                  <p className="mt-1 text-lg font-bold text-text-primary">Create your account</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary-600" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mary Wanjiku"
                  className="px-4 py-3 text-sm"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. mary@example.com"
                  className="px-4 py-3 text-sm"
                  required
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="px-4 py-3 text-sm"
                    required
                  />
                  <Input
                    label="Confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="px-4 py-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-2">
                    Grade *
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-primary-100 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm"
                    required
                  >
                    <option value="">Select your grade</option>
                    <option value="K">Kindergarten</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={String(g)}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="p-3 rounded-2xl border border-red-100 bg-red-50 text-red-700 text-[12px]">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Create account'}
                </Button>

                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  By signing up, you agree to use this demo responsibly. This project is in development.
                </p>
              </form>

              <div className="mt-5 pt-4 border-t border-primary-50 flex items-center justify-between text-[12px]">
                <Link to="/" className="text-text-secondary hover:text-text-primary transition-colors">
                  Back to landing
                </Link>
                <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                  Sign in instead
                </Link>
              </div>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}




