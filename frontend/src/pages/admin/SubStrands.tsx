import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Plus, Edit, Trash2, BarChart3, ChevronRight } from 'lucide-react'
import { curriculumData, MainSubject, CurriculumSubject } from '@/data/curriculumData'

export const AdminSubStrands = () => {
  const [strands] = useState<MainSubject[]>(curriculumData)
  const [selectedStrand, setSelectedStrand] = useState<MainSubject | null>(null)
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumSubject | null>(null)

  const handleDelete = (_strandId: string, _curriculumId: string, _substrandId: string) => {
    if (!confirm('Are you sure you want to delete this sub-strand?')) return
  }

  if (selectedCurriculum && selectedStrand) {
    return (
      <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <div className="p-[5px] pt-[5px]">
          <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
            <StaggeredEntry>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedCurriculum(null)}
                    className="p-1.5 sm:p-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {selectedCurriculum.name}
                    </h1>
                    <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {selectedStrand.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedCurriculum.subStrands.map((substrand) => (
                    <div
                      key={substrand.id}
                      className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4 hover:border-emerald-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${selectedCurriculum.color} flex items-center justify-center shadow-lg`}>
                          {(() => {
                            const Icon = selectedCurriculum.icon
                            return <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
                          })()}
                        </div>
                        <div className="flex gap-1.5">
                          <button className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center transition-all">
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(selectedStrand.id, selectedCurriculum.id, substrand.id)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {substrand.name}
                      </h3>
                    </div>
                  ))}
                </div>

                <button className="w-full p-4 rounded-[16px] bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-300 transition-all flex items-center justify-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-700">Add Sub-strand</span>
                </button>
              </div>
            </StaggeredEntry>
          </div>
        </div>
      </div>
    )
  }

  if (selectedStrand) {
    return (
      <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <div className="p-[5px] pt-[5px]">
          <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
            <StaggeredEntry>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedStrand(null)}
                    className="p-1.5 sm:p-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {selectedStrand.name}
                    </h1>
                    <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Select a curriculum subject
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedStrand.curriculumSubjects.map((curriculum) => {
                    const Icon = curriculum.icon
                    return (
                    <button
                      key={curriculum.id}
                      onClick={() => setSelectedCurriculum(curriculum)}
                      className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4 hover:border-emerald-300 transition-all text-left"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${curriculum.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                        </div>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {curriculum.name}
                      </h3>
                      <div className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {curriculum.subStrands.length} sub-strands
                      </div>
                    </button>
                    )
                  })}
                </div>
              </div>
            </StaggeredEntry>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Link
                    to="/admin"
                    className="p-1.5 sm:p-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                  </Link>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Sub-strands
                      </h1>
                      <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Select a strand to manage sub-strands
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {strands.map((strand) => {
                  const Icon = strand.icon
                  return (
                    <button
                      key={strand.id}
                      onClick={() => setSelectedStrand(strand)}
                      className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4 hover:border-emerald-300 transition-all text-left"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${strand.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                        </div>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {strand.name}
                      </h3>
                      <div className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {strand.curriculumSubjects.reduce((acc, curr) => acc + curr.subStrands.length, 0)} sub-strands
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}

