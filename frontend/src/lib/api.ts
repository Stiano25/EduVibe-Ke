// API Client for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = sessionStorage.getItem('token');
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };

    // Don't override FormData content-type
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const message =
        error.message ||
        error.error ||
        `HTTP error! status: ${response.status}`;
      const errorObj = new Error(message) as Error & {
        details?: string;
        hint?: string;
        code?: string;
        error?: string;
        status?: number;
      };
      if (error.details) errorObj.details = error.details;
      if (error.hint) errorObj.hint = error.hint;
      if (error.code) errorObj.code = error.code;
      if (error.error) errorObj.error = error.error;
      errorObj.status = response.status;
      throw errorObj;
    }

    return response.json();
  }

  // Admin API methods
  admin = {
    // Dashboard
    getDashboardMetrics: () => this.request('/admin/dashboard/metrics'),

    // Curriculum
    getCurriculumDesigns: () => this.request('/admin/curriculum'),
    getCurriculumDesign: (id: string) => this.request(`/admin/curriculum/${id}`),
    getCurriculumDesignsByGrade: (grade: string) => 
      this.request(`/admin/curriculum/grade/${grade}`),
    createCurriculumDesign: (data: any) => 
      this.request('/admin/curriculum', { method: 'POST', body: JSON.stringify(data) }),
    updateCurriculumDesign: (id: string, data: any) => 
      this.request(`/admin/curriculum/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCurriculumDesign: (id: string) => 
      this.request(`/admin/curriculum/${id}`, { method: 'DELETE' }),

    // Subjects
    getSubjects: () => this.request('/admin/subjects'),
    getSubject: (id: string) => this.request(`/admin/subjects/${id}`),
    getSubjectsByCurriculumDesign: (curriculumDesignId: string) => 
      this.request(`/admin/subjects/curriculum/${curriculumDesignId}`),
    getSubjectsByGrade: (grade: string) => 
      this.request(`/admin/subjects/grade/${grade}`),
    createSubject: (data: any) => 
      this.request('/admin/subjects', { method: 'POST', body: JSON.stringify(data) }),
    parseSubjectPDF: (id: string) => 
      this.request(`/admin/subjects/parse-pdf/${id}`, { method: 'POST' }),
    updateSubject: (id: string, data: any) => 
      this.request(`/admin/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSubject: (id: string) => 
      this.request(`/admin/subjects/${id}`, { method: 'DELETE' }),

    // Upload
    uploadPDF: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      return this.request('/admin/upload/pdf', {
        method: 'POST',
        body: formData,
      });
    },

    // Knowledge bank (exam / past-paper RAG)
    listKnowledge: () => this.request('/admin/knowledge'),
    uploadKnowledge: async (file: File, meta: {
      title?: string
      grade?: string
      subjectId?: string
      subjectName?: string
      sourceType?: 'exam' | 'past_paper' | 'notes'
    }) => {
      const formData = new FormData();
      formData.append('pdf', file);
      if (meta.title) formData.append('title', meta.title);
      if (meta.grade) formData.append('grade', meta.grade);
      if (meta.subjectId) formData.append('subjectId', meta.subjectId);
      if (meta.subjectName) formData.append('subjectName', meta.subjectName);
      if (meta.sourceType) formData.append('sourceType', meta.sourceType);
      return this.request('/admin/knowledge/upload', {
        method: 'POST',
        body: formData,
      });
    },
    deleteKnowledge: (id: string) =>
      this.request(`/admin/knowledge/${id}`, { method: 'DELETE' }),

    listQuestionBank: (params?: { status?: string; subStrandId?: string; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.subStrandId) qs.set('subStrandId', params.subStrandId)
      if (params?.limit) qs.set('limit', String(params.limit))
      const suffix = qs.toString() ? `?${qs.toString()}` : ''
      return this.request(`/admin/question-bank${suffix}`)
    },
    generateQuestionBank: (subStrandId: string, count?: number) =>
      this.request('/admin/question-bank/generate', {
        method: 'POST',
        body: JSON.stringify({ subStrandId, count }),
      }),
    approveQuestionBankEntry: (id: string) =>
      this.request(`/admin/question-bank/${id}/approve`, { method: 'PATCH' }),
    rejectQuestionBankEntry: (id: string, rejectReason?: string) =>
      this.request(`/admin/question-bank/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejectReason }),
      }),
    editQuestionBankEntry: (id: string, question: Record<string, unknown>) =>
      this.request(`/admin/question-bank/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ question }),
      }),

    listPrerequisiteEdges: (params?: { status?: string; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.limit) qs.set('limit', String(params.limit))
      const suffix = qs.toString() ? `?${qs.toString()}` : ''
      return this.request(`/admin/prerequisite-edges${suffix}`)
    },
    approvePrerequisiteEdge: (id: string) =>
      this.request(`/admin/prerequisite-edges/${id}/approve`, { method: 'PATCH' }),
    rejectPrerequisiteEdge: (id: string, rejectReason?: string) =>
      this.request(`/admin/prerequisite-edges/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejectReason }),
      }),
    editPrerequisiteEdge: (
      id: string,
      payload: { reason?: string; confidence?: number; prerequisiteOutcomeId?: string }
    ) =>
      this.request(`/admin/prerequisite-edges/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),

    // Strands
    getStrands: () => this.request('/admin/strands'),
    getStrand: (id: string) => this.request(`/admin/strands/${id}`),
    getStrandsBySubject: (subjectId: string) => 
      this.request(`/admin/strands/subject/${subjectId}`),
    getUnitsByStrand: (strandId: string) =>
      this.request(`/admin/strands/${strandId}/units`),
    createStrand: (data: any) => 
      this.request('/admin/strands', { method: 'POST', body: JSON.stringify(data) }),
    updateStrand: (id: string, data: any) => 
      this.request(`/admin/strands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteStrand: (id: string) => 
      this.request(`/admin/strands/${id}`, { method: 'DELETE' }),

    // Sub-strands
    getSubStrands: () => this.request('/admin/sub-strands'),
    getSubStrand: (id: string) => this.request(`/admin/sub-strands/${id}`),
    getSubStrandsByStrand: (strandId: string) => 
      this.request(`/admin/sub-strands/strand/${strandId}`),
    getSubStrandsBySubject: (subjectId: string) => 
      this.request(`/admin/sub-strands/subject/${subjectId}`),
    createSubStrand: (data: any) => 
      this.request('/admin/sub-strands', { method: 'POST', body: JSON.stringify(data) }),
    updateSubStrand: (id: string, data: any) => 
      this.request(`/admin/sub-strands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSubStrand: (id: string) => 
      this.request(`/admin/sub-strands/${id}`, { method: 'DELETE' }),

    // Lessons
    getLessons: () => this.request('/admin/lessons'),
    getLesson: (id: string) => this.request(`/admin/lessons/${id}`),
    getLessonsByStrand: (strandId: string) => 
      this.request(`/admin/lessons/strand/${strandId}`),
    getLessonsBySubStrand: (subStrandId: string) => 
      this.request(`/admin/lessons/sub-strand/${subStrandId}`),
    getLessonsBySubject: (subjectId: string) => 
      this.request(`/admin/lessons/subject/${subjectId}`),
    getLessonsByStatus: (status: string) => 
      this.request(`/admin/lessons/status/${status}`),
    createLesson: (data: any) => 
      this.request('/admin/lessons', { method: 'POST', body: JSON.stringify(data) }),
    createAIGeneratedLessons: (data: { subStrandId: string; numberOfLessons?: number }) =>
      this.request('/admin/lessons/ai-generate', { method: 'POST', body: JSON.stringify(data) }),
    createAIGeneratedLessonsStream: async (
      data: { subStrandId: string; numberOfLessons?: number },
      onProgress?: (info: { percent: number; message: string }) => void
    ) => {
      const token =
        typeof window !== 'undefined' ? sessionStorage.getItem('token') : null
      const response = await fetch(
        `${this.baseUrl}/admin/lessons/ai-generate?stream=1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.message || error.error || `HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response stream from server')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let lessons: unknown[] | null = null
      let lastError: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const chunk of parts) {
          const line = chunk
            .split('\n')
            .find((l) => l.startsWith('data:'))
          if (!line) continue
          try {
            const payload = JSON.parse(line.slice(5).trim()) as {
              type?: string
              percent?: number
              message?: string
              lessons?: unknown[]
              usage?: {
                calls?: number
                inputTokens?: number
                outputTokens?: number
              }
            }
            if (payload.type === 'progress' || payload.percent != null) {
              onProgress?.({
                percent: payload.percent ?? 0,
                message: payload.message || 'Working…',
              })
            }
            if (payload.type === 'done') {
              lessons = payload.lessons || []
              const usage = payload.usage
              const totalTokens =
                Number(usage?.inputTokens || 0) + Number(usage?.outputTokens || 0)
              const usageSummary =
                usage?.calls != null
                  ? ` · ${usage.calls} AI calls · ${totalTokens.toLocaleString()} tokens`
                  : ''
              onProgress?.({
                percent: 100,
                message: `${payload.message || 'Done'}${usageSummary}`,
              })
            }
            if (payload.type === 'error') {
              lastError = payload.message || 'Generation failed'
            }
          } catch {
            /* ignore malformed SSE chunks */
          }
        }
      }

      if (lastError) throw new Error(lastError)
      if (!lessons) throw new Error('Generation finished without lessons')
      return lessons
    },
    updateLesson: (id: string, data: any) => 
      this.request(`/admin/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    topUpQuizBank: (id: string) =>
      this.request(`/admin/lessons/${id}/quiz/top-up`, { method: 'POST' }) as Promise<{
        lesson: unknown
        added: number
        bankSize: number
        bankStats: Record<string, unknown>
      }>,
    previewDiagram: (brief: Record<string, unknown>) =>
      this.request('/admin/lessons/preview-diagram', {
        method: 'POST',
        body: JSON.stringify(brief),
      }) as Promise<{ svg: string; diagramType: string }>,
    updateLessonVisuals: (
      id: string,
      data: { visualBriefs?: unknown[]; contentBlocks?: unknown[] }
    ) =>
      this.request(`/admin/lessons/${id}/visuals`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    regenerateLessonVisual: (
      lessonId: string,
      briefId: string,
      data?: { instruction?: string; preferredType?: string }
    ) =>
      this.request(`/admin/lessons/${lessonId}/visuals/${briefId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    uploadLessonVisual: async (lessonId: string, briefId: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      return this.request(`/admin/lessons/${lessonId}/visuals/${briefId}/upload`, {
        method: 'POST',
        body: form,
      })
    },
    approveLesson: (id: string) => 
      this.request(`/admin/lessons/${id}/approve`, { 
        method: 'PATCH'
      }),
    rejectLesson: (id: string) => 
      this.request(`/admin/lessons/${id}/reject`, { method: 'PATCH' }),
    deleteLesson: (id: string) => 
      this.request(`/admin/lessons/${id}`, { method: 'DELETE' }),

    // Notes
    getNotes: () => this.request('/admin/notes'),
    getNote: (id: string) => this.request(`/admin/notes/${id}`),
    getNotesBySubStrand: (subStrandId: string) => 
      this.request(`/admin/notes/substrand/${subStrandId}`),
    getNotesByGrade: (grade: string) => 
      this.request(`/admin/notes/grade/${grade}`),
    getNotesByDifficulty: (difficulty: string) => 
      this.request(`/admin/notes/difficulty/${difficulty}`),
    createNote: (data: any) => 
      this.request('/admin/notes', { method: 'POST', body: JSON.stringify(data) }),
    updateNote: (id: string, data: any) => 
      this.request(`/admin/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteNote: (id: string) => 
      this.request(`/admin/notes/${id}`, { method: 'DELETE' }),

    // Quizzes
    getQuizzes: () => this.request('/admin/quizzes'),
    getQuiz: (id: string) => this.request(`/admin/quizzes/${id}`),
    getQuizzesByLink: (type: string, id: string) => 
      this.request(`/admin/quizzes/link/${type}/${id}`),
    getQuizzesByGrade: (grade: string) => 
      this.request(`/admin/quizzes/grade/${grade}`),
    createQuiz: (data: any) => 
      this.request('/admin/quizzes', { method: 'POST', body: JSON.stringify(data) }),
    updateQuiz: (id: string, data: any) => 
      this.request(`/admin/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteQuiz: (id: string) => 
      this.request(`/admin/quizzes/${id}`, { method: 'DELETE' }),

    // Users
    getUsers: () => this.request('/admin/users'),
    getUser: (id: string) => this.request(`/admin/users/${id}`),
    getActiveLearners: () => this.request('/admin/users/active-learners'),

    // Analytics
    getAnalytics: () => this.request('/admin/analytics'),
  };

  // Learner API methods
  learner = {
    // Auth
    register: (data: { name: string; email: string; password: string; grade: string }) =>
      this.request<{ message: string; token: string; user: any }>('/learner/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      this.request<{ message: string; token: string; user: any }>('/learner/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    // Subjects - only for learner's grade, only those with strands
    getSubjects: () => this.request('/learner/subjects'),
    getSubject: (id: string) => this.request(`/learner/subject/${id}`),

    // Strands - for a subject, only those with substrands
    getStrands: (subjectId: string) =>
      this.request(`/learner/strands/${subjectId}`),
    getStrand: (id: string) => this.request(`/learner/strand/${id}`),

    // Substrands - for a strand, only those with approved lessons
    getSubstrands: (strandId: string) =>
      this.request(`/learner/substrands/${strandId}`),
    getSubStrand: (id: string) => this.request(`/learner/substrand/${id}`),

    // Lessons - approved lessons for a substrand with unlock status
    getLessons: (substrandId: string) =>
      this.request(`/learner/lessons/${substrandId}`),
    getLesson: (id: string) => this.request(`/learner/lesson/${id}`),
    // Progress tracking
    completeLesson: (lessonId: string) => 
      this.request(`/learner/lessons/${lessonId}/complete`, { method: 'POST' }),
    
    updateLessonProgress: (lessonId: string, progress: number) => 
      this.request(`/learner/lessons/${lessonId}/progress`, { 
        method: 'PATCH',
        body: JSON.stringify({ progress })
      }),
    
    // Get similar lessons from lower grades
    getSimilarLessons: (lessonId: string) => 
      this.request(`/learner/lessons/${lessonId}/similar`),
    
    // Get next lessons in same sub-strand
    getNextLessons: (lessonId: string) => 
      this.request(`/learner/lessons/${lessonId}/next`),

    getProfile: () => this.request('/learner/profile'),
    updateProfile: (data: {
      preferredModality?: 'visual' | 'text_steps' | 'practice' | 'mixed'
      modalityPromptSeen?: boolean
    }) =>
      this.request('/learner/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    submitSkillAttempts: (data: {
      lessonId: string
      modalityShown?: string
      answers: { questionId: string; selectedOptionIndex: number }[]
    }) =>
      this.request('/learner/skill-attempts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getScaffold: (lessonId: string) =>
      this.request(`/learner/lessons/${lessonId}/scaffold`),
    startAdaptiveQuiz: (lessonId: string) =>
      this.request(`/learner/lessons/${lessonId}/adaptive-start`, { method: 'POST' }),
    nextAdaptiveQuiz: (
      lessonId: string,
      data: {
        session: Record<string, unknown>
        selectedOptionIndex: number
        placedCount?: number
        responseTimeMs: number
      }
    ) =>
      this.request(`/learner/lessons/${lessonId}/adaptive-next`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getAdaptiveReview: (lessonId: string) =>
      this.request(`/learner/lessons/${lessonId}/adaptive-review`),
    getProgressReport: () => this.request('/learner/progress-report'),
    getNextTask: () => this.request('/learner/next-task'),
    getSkillMastery: () => this.request('/learner/skill-mastery'),
  };
}

export const api = new ApiClient(API_BASE_URL);
export default api;

