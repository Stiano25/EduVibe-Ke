import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { GraduationCap, Users, LineChart, ShieldCheck, Sparkles, TrendingUp, CheckCircle2, AlertCircle, Lightbulb, BarChart3, Star, Trophy, BookOpen, Target, Zap, Heart, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'

// Squiggly Divider Component
const SquigglyDivider = () => (
  <svg width="100%" height="20" viewBox="0 0 1200 20" preserveAspectRatio="none" className="w-full">
    <path
      d="M0,10 Q300,0 600,10 T1200,10"
      fill="none"
      stroke="#E2E8F0"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

export const Landing = () => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-text-primary">
      {/* Top nav */}
      <header className="w-full sticky top-0 z-20 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg border-b-4 border-indigo-700"
            >
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-bold tracking-tight text-gradient">EduVibe</p>
              <p className="hidden sm:block text-[11px] text-text-secondary">
                Personalized learning insights for Kenyan schools
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">How it works</a>
            <a href="#for-teachers" className="hover:text-text-primary transition-colors">For teachers</a>
            <a href="#for-parents" className="hover:text-text-primary transition-colors">For parents</a>
            <a href="#impact" className="hover:text-text-primary transition-colors">Impact</a>
          </nav>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ y: 2 }}
              whileTap={{ y: 4 }}
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex text-indigo-600 hover:bg-indigo-50 font-semibold rounded-3xl px-4 py-2 text-[13px] transition-all"
            >
              Sign in
            </motion.button>
            <motion.button
              whileHover={{ y: 2 }}
              whileTap={{ y: 4 }}
              onClick={handleGetStarted}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-3xl px-4 py-2 text-[13px] border-b-4 border-blue-700 transition-all shadow-sm"
            >
              Get started
            </motion.button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-16 sm:pt-16 sm:pb-24 space-y-16">
        <section className="grid lg:grid-cols-[3fr_2fr] gap-10 sm:gap-12 items-center">
          <StaggeredEntry>
            <div className="space-y-6">
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 rounded-3xl border border-indigo-200/50 bg-indigo-50/30 px-3 py-1.5 text-[11px] font-medium text-text-secondary"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Built for Kenyan CBC classrooms and busy parents
              </motion.span>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight text-[#0F172A]">
                  Understand every learner&apos;s journey,
                  <span className="block text-gradient">in one beautiful dashboard.</span>
                </h1>
                <p className="text-sm sm:text-base text-text-secondary max-w-xl">
                  EduVibe turns everyday classroom activity into clear insights for teachers and parents.
                  See strengths, gaps, and progress at a glance – so every learner gets the support they need.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <motion.button
                  whileHover={{ y: 2 }}
                  whileTap={{ y: 4 }}
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-3xl px-6 py-3 text-sm border-b-4 border-blue-700 transition-all shadow-sm"
                >
                  Sign in to EduVibe
                </motion.button>
                <motion.button
                  whileHover={{ y: 2 }}
                  whileTap={{ y: 4 }}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-3xl border-2 border-purple-200 bg-white px-5 py-3 text-xs sm:text-sm font-medium text-text-primary hover:bg-purple-50 transition-all border-b-4 border-purple-300"
                >
                  See how it works
                </motion.button>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 text-[11px] sm:text-xs text-text-secondary">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white rounded-3xl border-2 border-purple-200 p-3 sm:p-3.5 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Rocket className="w-8 h-8 text-purple-500" strokeWidth={1.5} />
                    <p className="font-semibold text-[11px] text-text-primary">For Teachers</p>
                  </div>
                  <p>Instant view of performance, engagement, and skills across your class.</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white rounded-3xl border-2 border-pink-200 p-3 sm:p-3.5 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-8 h-8 text-pink-500" strokeWidth={1.5} />
                    <p className="font-semibold text-[11px] text-text-primary">For Parents</p>
                  </div>
                  <p>Simple explanations and weekly highlights you can act on at home.</p>
                </motion.div>
              </div>
            </div>
          </StaggeredEntry>

          {/* Bento Grid Dashboard */}
          <StaggeredEntry delay={0.08}>
            <div className="grid grid-cols-2 gap-3">
              {/* Card A: Weekly Stars (Small) */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white rounded-3xl border-2 border-yellow-200 p-4 flex flex-col items-center justify-center"
              >
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg border-b-4 border-yellow-600">
                    <Star className="w-10 h-10 text-yellow-900 fill-yellow-900" strokeWidth={2} />
                  </div>
                  {/* 3D shadow effect */}
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-yellow-600 opacity-30 blur-md -z-10 translate-y-1"></div>
                </div>
                <p className="text-2xl font-black text-yellow-900 mb-1">24</p>
                <p className="text-xs font-semibold text-yellow-700">Weekly Stars</p>
              </motion.div>

              {/* Card B: Learning Journey (Large) */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="col-span-2 bg-white rounded-3xl border-2 border-blue-200 p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Rocket className="w-10 h-10 text-blue-500" strokeWidth={2} />
                  <div>
                    <p className="text-sm font-black text-text-primary">Learning Journey</p>
                    <p className="text-xs text-text-secondary">Grade 6 Adventure</p>
                  </div>
                </div>
                {/* Dotted-line path SVG */}
                <svg width="100%" height="80" viewBox="0 0 300 80" className="mb-2">
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="#6366F1" />
                    </marker>
                  </defs>
                  <path
                    d="M 20 40 Q 80 20, 140 40 T 260 40"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    strokeLinecap="round"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Checkpoints */}
                  <circle cx="60" cy="30" r="8" fill="#34D399" />
                  <circle cx="140" cy="40" r="8" fill="#34D399" />
                  <circle cx="220" cy="40" r="8" fill="#FBBF24" />
                  <circle cx="260" cy="40" r="8" fill="#FBBF24" stroke="#6366F1" strokeWidth="2" />
                </svg>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-600 font-semibold">✓ Completed</span>
                  <span className="text-yellow-600 font-semibold">→ Next up</span>
                </div>
              </motion.div>

              {/* Card C: Teacher Note (Medium) */}
              <motion.div
                whileHover={{ scale: 1.05, rotate: 0 }}
                className="col-span-2 bg-yellow-100 rounded-3xl border-2 border-yellow-300 p-4 transform -rotate-2 shadow-lg"
                style={{ transform: 'rotate(-2deg)' }}
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-10 h-10 text-yellow-700 flex-shrink-0" strokeWidth={2} />
                  <div>
                    <p className="text-sm font-black text-yellow-900 mb-1">Teacher Note</p>
                    <p className="text-xs text-yellow-800 leading-relaxed">
                      &quot;Sarah is doing amazing in Science! Keep up the great work! 🌟&quot;
                    </p>
                    <p className="text-[10px] text-yellow-700 mt-2 italic">- Ms. Wanjiku</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </StaggeredEntry>
        </section>

        {/* Squiggly Divider */}
        <SquigglyDivider />

        {/* How it works */}
        <section id="how-it-works" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">How EduVibe works</h2>
              <p className="text-sm text-text-secondary max-w-2xl mt-1.5">
                EduVibe connects daily classroom activity with a clear story of each learner&apos;s progress.
                No extra marking, no new exams – just better visibility for teachers and parents.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: 'Step 1',
                title: 'Capture what is already happening',
                description: 'Teachers record quick scores or observations after lessons, assessments, or projects using simple, mobile-friendly screens.',
                icon: Rocket,
                iconBg: 'bg-blue-500',
                borderColor: 'border-blue-200'
              },
              {
                step: 'Step 2',
                title: 'Translate into meaningful insights',
                description: 'EduVibe organises this data into CBC-friendly skills, strands and sub-strands, so you can see strengths and gaps at learner and class level.',
                icon: Lightbulb,
                iconBg: 'bg-yellow-500',
                borderColor: 'border-yellow-200'
              },
              {
                step: 'Step 3',
                title: 'Share a clear story with parents',
                description: 'Parents receive a short, visual summary that explains how their child is doing and suggests 2–3 practical ways to support learning at home.',
                icon: Heart,
                iconBg: 'bg-pink-500',
                borderColor: 'border-pink-200'
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-white rounded-3xl border-2 ${item.borderColor} p-4 sm:p-5 space-y-2`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-16 h-16 rounded-full ${item.iconBg} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">{item.step}</p>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                  <p className="text-[12px] text-text-secondary">{item.description}</p>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Squiggly Divider */}
        <SquigglyDivider />

        {/* Teacher & Parent sections */}
        <section
          id="for-teachers"
          className="grid md:grid-cols-2 gap-4 md:gap-6 items-stretch"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-3xl border-2 border-blue-200 p-4 sm:p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                  <Rocket className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                  For Teachers
                </p>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] mb-2">
                A calm control centre for your class
              </h2>
              <p className="text-[12px] sm:text-sm text-text-secondary mb-3">
                Move away from scattered books and spreadsheets. EduVibe gives you one clean view of
                performance, engagement, and growth – across subjects and terms.
              </p>
              <ul className="space-y-1.5 text-[12px] text-text-secondary">
                <li>• Spot learners who are quietly falling behind before exam time.</li>
                <li>• Filter by strand, sub-strand, or specific skills in seconds.</li>
                <li>• Export summaries for meetings, reports, and school leaders.</li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-3xl border-2 border-pink-200 p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center shadow-lg">
                  <Heart className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-700">
                  For Parents & Guardians
                </p>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] mb-2">
                Clarity and confidence in your child&apos;s learning
              </h2>
              <p className="text-[12px] sm:text-sm text-text-secondary mb-3">
                Instead of long reports full of jargon, EduVibe shows you the big picture in minutes –
                right on your phone.
              </p>
              <ul className="space-y-1.5 text-[12px] text-text-secondary">
                <li>• Simple language, visual progress bars, and clear next steps.</li>
                <li>• Regular updates – not just once a term or once a year.</li>
                <li>• Practical suggestions you can try at home, even if you are busy.</li>
              </ul>
            </div>
          </motion.div>
        </section>

        {/* Squiggly Divider */}
        <SquigglyDivider />

        {/* Impact / CTA */}
        <section id="impact" className="space-y-5">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-white rounded-3xl border-2 border-purple-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                  <Trophy className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                  Why now
                </p>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#0F172A] mb-1">
                Stronger partnership between school and home
              </h2>
              <p className="text-[12px] sm:text-sm text-text-secondary max-w-2xl">
                When teachers and parents have the same clear picture of a learner, everything becomes smoother:
                support is better targeted, feedback is more specific, and learners feel seen.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <motion.button
                whileHover={{ y: 2 }}
                whileTap={{ y: 4 }}
                onClick={handleGetStarted}
                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-3xl px-4 py-2 text-[12px] border-b-4 border-blue-700 transition-all shadow-sm"
              >
                Sign in to try the demo
              </motion.button>
              <motion.button
                whileHover={{ y: 2 }}
                whileTap={{ y: 4 }}
                onClick={handleGetStarted}
                className="w-full sm:w-auto bg-white text-purple-600 border-2 border-purple-200 font-semibold rounded-3xl px-4 py-2 text-[12px] border-b-4 border-purple-300 hover:bg-purple-50 transition-all shadow-sm"
              >
                Explore the dashboards
              </motion.button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-text-tertiary">
          <p>© {new Date().getFullYear()} EduVibe. Built for Kenyan educators and families.</p>
          <div className="flex gap-3">
            <span>Teachers demo: admin@eduvibe.com / password</span>
            <span className="hidden sm:inline">Parents demo: john@eduvibe.com / password</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
