import {
  BLOOM_LABEL,
  MODALITY_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  lessonProgressLabel,
  rateLabel,
  retryPhrase,
  type LearnerReport,
  type LearnerReportLesson,
  type MasteryStatus,
} from '@/lib/learnerReport'

const LessonList = ({
  title,
  empty,
  lessons,
  tone,
}: {
  title: string
  empty: string
  lessons: LearnerReportLesson[]
  tone: 'strength' | 'weakness' | 'steady'
}) => (
  <div
    className={`rounded-[16px] border-2 p-4 ${
      tone === 'strength'
        ? 'border-emerald-100 bg-emerald-50/60'
        : tone === 'weakness'
          ? 'border-rose-100 bg-rose-50/60'
          : 'border-slate-200 bg-slate-50/60'
    }`}
  >
    <h3 className="text-sm font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {title}
    </h3>
    {lessons.length === 0 ? (
      <p className="text-sm text-slate-600">{empty}</p>
    ) : (
      <ul className="space-y-3">
        {lessons.map((lesson) => (
          <li key={lesson.lessonId} className="bg-white/80 rounded-xl px-3 py-2.5 border border-white">
            <p className="text-sm font-semibold text-[#0F172A]">
              {tone === 'weakness' ? 'Weakness: ' : tone === 'strength' ? 'Strength: ' : ''}
              {lesson.title}
            </p>
            <p className="text-[12px] text-slate-600 mt-0.5">
              {lesson.firstTryPercent}% first-try, {retryPhrase(lesson.retryCount)}
            </p>
            {lesson.practiceScorePercent != null &&
            lesson.practiceScorePercent !== lesson.firstTryPercent ? (
              <p className="text-[11px] text-slate-500">{lesson.practiceScorePercent}% with practice credit</p>
            ) : null}
            {lesson.misconception ? (
              <p className="text-[12px] text-amber-900 italic mt-1">Mainly missing: {lesson.misconception}</p>
            ) : null}
            {lesson.bktPKnow != null ? (
              <p className="text-[11px] text-slate-500 mt-1">
                BKT {Math.round(lesson.bktPKnow * 100)}%
                {lesson.bktNObservations != null ? ` · ${lesson.bktNObservations} obs` : ''}
                {lesson.bktSkillFocus ? ` · ${lesson.bktSkillFocus}` : ''}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </div>
)

export const LearnerReportCard = ({ report }: { report: LearnerReport }) => {
  const bloomEntries = Object.entries(report.bloomBreakdown || {}).filter(([, pair]) => pair.total > 0)
  const modalityEntries = Object.entries(report.modalityBreakdown || {}).filter(([, pair]) => pair.total > 0)
  const masteryEntries = (Object.entries(report.masteryCounts || {}) as Array<[MasteryStatus, number]>).filter(
    ([, count]) => count > 0
  )
  const bestModality = report.bestModality
  const steady = report.steady || []

  return (
    <article className="learner-report-card bg-white/90 border-2 border-slate-200 rounded-[24px] p-5 sm:p-6 print:border print:rounded-none print:shadow-none print:break-after-page">
      <header className="mb-4 pb-4 border-b border-slate-200">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Learner report</p>
        <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {report.learner.name || 'Learner'}
        </h2>
        <p className="text-sm text-slate-600">
          {report.learner.grade ? `Grade ${report.learner.grade}` : 'No grade set'}
          {report.learner.email ? ` · ${report.learner.email}` : ''}
          {report.generatedAt ? ` · ${new Date(report.generatedAt).toLocaleDateString()}` : ''}
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Strengths', value: String(report.summary.strengthsCount) },
          { label: 'Weaknesses', value: String(report.summary.weaknessesCount) },
          {
            label: 'Quiz accuracy (all attempts)',
            value: report.summary.accuracyPercent != null ? `${report.summary.accuracyPercent}%` : '—',
          },
          {
            label: 'Avg lesson score (first try)',
            value: report.summary.averageScore != null ? `${report.summary.averageScore}%` : '—',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 leading-tight">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {masteryEntries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {masteryEntries.map(([status, count]) => (
            <span
              key={status}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[status]}`}
            >
              {STATUS_LABEL[status]} · {count}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <LessonList
          title="Strengths"
          empty="No lessons at 75% first-try or above yet."
          lessons={report.strengths}
          tone="strength"
        />
        <LessonList
          title="Weaknesses"
          empty="No lessons at 60% first-try or below."
          lessons={report.weaknesses}
          tone="weakness"
        />
      </div>

      {steady.length > 0 && (
        <div className="mb-5">
          <LessonList
            title="Steady"
            empty=""
            lessons={steady}
            tone="steady"
          />
        </div>
      )}

      {(bloomEntries.length > 0 || modalityEntries.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {bloomEntries.length > 0 && (
            <div className="rounded-[16px] border-2 border-slate-200 p-4">
              <h3 className="text-sm font-bold text-[#0F172A] mb-2">Thinking level</h3>
              <ul className="space-y-1.5">
                {bloomEntries.map(([level, pair]) => (
                  <li key={level} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{BLOOM_LABEL[level] || level}</span>
                    <span className="font-semibold text-[#0F172A]">
                      {rateLabel(pair)} <span className="text-slate-400 font-normal">({pair.correct}/{pair.total})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {modalityEntries.length > 0 && (
            <div className="rounded-[16px] border-2 border-slate-200 p-4">
              <h3 className="text-sm font-bold text-[#0F172A] mb-2">How they learn best</h3>
              {bestModality ? (
                <p className="text-xs text-slate-600 mb-2">
                  Works best with {MODALITY_LABEL[bestModality] || bestModality}
                </p>
              ) : null}
              <ul className="space-y-1.5">
                {modalityEntries.map(([modality, pair]) => (
                  <li key={modality} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{MODALITY_LABEL[modality] || modality}</span>
                    <span className="font-semibold text-[#0F172A]">
                      {rateLabel(pair)} <span className="text-slate-400 font-normal">({pair.correct}/{pair.total})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {report.misconceptions.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-[#0F172A] mb-2">Common mistakes</h3>
          <ul className="flex flex-wrap gap-2">
            {report.misconceptions.map((item) => (
              <li
                key={item.key}
                className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-xs font-semibold text-amber-900"
              >
                {item.key} · {item.count}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-[#0F172A] mb-2">Recent lessons</h3>
        {report.recentLessons.length === 0 ? (
          <p className="text-sm text-slate-600">No lesson progress yet.</p>
        ) : (
          <ul className="space-y-2">
            {report.recentLessons.slice(0, 12).map((lesson) => (
              <li
                key={lesson.lessonId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{lesson.title}</p>
                  <p className="text-[11px] text-slate-500">{lessonProgressLabel(lesson)}</p>
                </div>
                <span className="text-sm font-bold text-indigo-700 shrink-0">
                  {lesson.scorePercentage != null ? `${lesson.scorePercentage}%` : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
