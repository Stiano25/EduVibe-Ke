import {
  BLOOM_LABEL,
  MODALITY_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  rateLabel,
  type LearnerReport,
  type LearnerReportSkill,
  type MasteryStatus,
} from '@/lib/learnerReport'

const SkillList = ({
  title,
  empty,
  skills,
  tone,
}: {
  title: string
  empty: string
  skills: LearnerReportSkill[]
  tone: 'strength' | 'weakness'
}) => (
  <div
    className={`rounded-[16px] border-2 p-4 ${
      tone === 'strength' ? 'border-emerald-100 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/60'
    }`}
  >
    <h3 className="text-sm font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {title}
    </h3>
    {skills.length === 0 ? (
      <p className="text-sm text-slate-600">{empty}</p>
    ) : (
      <ul className="space-y-2">
        {skills.map((skill) => (
          <li
            key={skill.learningOutcomeKey}
            className="flex items-start justify-between gap-3 bg-white/80 rounded-xl px-3 py-2 border border-white"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0F172A]">{skill.skillFocus}</p>
              {skill.preferredModality ? (
                <p className="text-[11px] text-slate-500">
                  Works best with {MODALITY_LABEL[skill.preferredModality] || skill.preferredModality}
                </p>
              ) : null}
            </div>
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                STATUS_CLASS[skill.status]
              }`}
            >
              {STATUS_LABEL[skill.status]}
            </span>
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
            label: 'Quiz accuracy',
            value: report.summary.accuracyPercent != null ? `${report.summary.accuracyPercent}%` : '—',
          },
          {
            label: 'Avg lesson score',
            value: report.summary.averageScore != null ? `${report.summary.averageScore}%` : '—',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-[#0F172A]">{stat.value}</p>
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
        <SkillList
          title="Strengths"
          empty="No mastered or developing skills yet."
          skills={report.strengths}
          tone="strength"
        />
        <SkillList
          title="Weaknesses"
          empty="No struggling skills right now."
          skills={report.weaknesses}
          tone="weakness"
        />
      </div>

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
                  <p className="text-[11px] text-slate-500">
                    {lesson.completed ? 'Completed' : `${lesson.progress}% progress`}
                  </p>
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
