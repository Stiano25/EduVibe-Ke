import { useParams, Link, useNavigate } from 'react-router-dom'
import { useLessonStore } from '@/store/useLessonStore'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Clock, BookOpen, Play, CheckCircle2 } from 'lucide-react'

export const LessonView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getLessonById } = useLessonStore()
  const lesson = id ? getLessonById(id) : undefined

  if (!lesson) {
    return (
      <div className="min-h-screen premium-mesh flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] border-2 border-slate-200 p-8 text-center max-w-md">
          <h1 className="text-3xl font-black text-[#0F172A] mb-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            Lesson Not Found
          </h1>
          <p className="text-text-secondary mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            The lesson you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link 
            to="/learner" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all text-sm font-semibold text-slate-700"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px) scale(0.98)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = ''
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = ''
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                  {lesson.title}
                </h1>
                <p className="text-lg sm:text-xl text-text-secondary mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {lesson.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Grade {lesson.grade}</span>
                  </div>
                  <span>•</span>
                  <span className="capitalize px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                    {lesson.difficulty}
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{lesson.duration} minutes</span>
                  </div>
                  <span>•</span>
                  <span className="capitalize">{lesson.contentType}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {lesson.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-3 py-1 text-xs bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full font-semibold"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-6 sm:p-8">
                {lesson.contentType === 'video' && lesson.videoUrl ? (
                  <div className="aspect-video bg-slate-100 rounded-[16px] flex items-center justify-center mb-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-600 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                      <p className="text-lg font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Video Lesson
                      </p>
                      <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Video player will be integrated with backend
                      </p>
                      <p className="text-xs text-text-secondary mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        URL: {lesson.videoUrl}
                      </p>
                    </div>
                  </div>
                ) : lesson.content ? (
                  <div className="prose max-w-none">
                    <div 
                      className="text-slate-900 leading-relaxed text-base sm:text-lg space-y-6"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {lesson.content.split('\n').map((line, index) => {
                        // Handle markdown headers
                        if (line.startsWith('# ')) {
                          return (
                            <h2 key={index} className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-8 mb-4 first:mt-0" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                              {line.replace('# ', '')}
                            </h2>
                          )
                        }
                        if (line.startsWith('## ')) {
                          return (
                            <h3 key={index} className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-6 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              {line.replace('## ', '')}
                            </h3>
                          )
                        }
                        if (line.startsWith('### ')) {
                          return (
                            <h4 key={index} className="text-lg sm:text-xl font-semibold text-indigo-700 mt-5 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              {line.replace('### ', '')}
                            </h4>
                          )
                        }
                        // Handle bullet points
                        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                          return (
                            <div key={index} className="flex items-start gap-2 ml-4">
                              <span className="text-indigo-600 mt-1.5">•</span>
                              <span>{line.replace(/^[•-]\s*/, '')}</span>
                            </div>
                          )
                        }
                        // Handle numbered lists
                        if (/^\d+\.\s/.test(line.trim())) {
                          return (
                            <div key={index} className="flex items-start gap-2 ml-4">
                              <span className="text-indigo-600 font-semibold mt-1.5">{line.match(/^\d+\./)?.[0]}</span>
                              <span>{line.replace(/^\d+\.\s*/, '')}</span>
                            </div>
                          )
                        }
                        // Handle bold text
                        if (line.includes('**')) {
                          const parts = line.split(/(\*\*[^*]+\*\*)/g)
                          return (
                            <p key={index} className="mb-3">
                              {parts.map((part, i) => 
                                part.startsWith('**') && part.endsWith('**') ? (
                                  <strong key={i} className="font-bold text-[#0F172A]">{part.slice(2, -2)}</strong>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )}
                            </p>
                          )
                        }
                        // Handle horizontal rule
                        if (line.trim() === '---') {
                          return <hr key={index} className="my-6 border-slate-200" />
                        }
                        // Handle empty lines
                        if (line.trim() === '') {
                          return <br key={index} />
                        }
                        // Regular paragraphs
                        return (
                          <p key={index} className="mb-3 text-slate-700">
                            {line}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[16px] p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-600 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Interactive Content
                    </p>
                    <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Interactive content will be displayed here
                    </p>
                    <p className="text-xs text-text-secondary mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      (Interactive content will be integrated with backend)
                    </p>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-200">
                  <button
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(2px) scale(0.98)'
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = ''
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = ''
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Mark as Complete
                  </button>
                </div>
              </div>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
