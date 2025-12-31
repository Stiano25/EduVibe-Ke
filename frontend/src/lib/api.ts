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
    
    // Get user ID for learner routes
    // Note: In a real app, this would come from a JWT token or auth context
    // For now, we get it from sessionStorage where the auth store saves it
    let userId = null;
    if (typeof window !== 'undefined') {
      try {
        // First try sessionStorage (where auth store saves userId)
        userId = sessionStorage.getItem('userId');
        
        // Fallback: try to get from user object in sessionStorage
        if (!userId) {
          const userStr = sessionStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            userId = user?.id;
          }
        }
        
        // Last fallback: try localStorage (if auth store uses persist)
        if (!userId) {
          const authData = localStorage.getItem('auth-storage');
          if (authData) {
            const parsed = JSON.parse(authData);
            userId = parsed?.state?.user?.id;
          }
        }
      } catch (e) {
        // Ignore parsing errors
        console.warn('Error getting user ID from storage:', e);
      }
    }
    
    // Debug log for learner routes
    if (endpoint.startsWith('/learner') && !userId) {
      console.warn('No user ID found for learner route:', endpoint);
      console.log('sessionStorage userId:', sessionStorage.getItem('userId'));
      console.log('sessionStorage user:', sessionStorage.getItem('user'));
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(userId && endpoint.startsWith('/learner') ? { 'x-user-id': userId } : {}),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        // Preserve error details from backend
        const errorObj = new Error(error.error || `HTTP error! status: ${response.status}`);
        if (error.details) errorObj.details = error.details;
        if (error.hint) errorObj.hint = error.hint;
        if (error.message) errorObj.message = error.message;
        throw errorObj;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
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
      
      const url = `${this.baseUrl}/admin/upload/pdf`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },

    // Strands
    getStrands: () => this.request('/admin/strands'),
    getStrand: (id: string) => this.request(`/admin/strands/${id}`),
    getStrandsBySubject: (subjectId: string) => 
      this.request(`/admin/strands/subject/${subjectId}`),
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
    updateLesson: (id: string, data: any) => 
      this.request(`/admin/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
      this.request('/learner/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      this.request('/learner/login', { method: 'POST', body: JSON.stringify(data) }),
    
    // Subjects - only for learner's grade, only those with strands
    getSubjects: () => this.request('/learner/subjects'),
    
    // Strands - for a subject, only those with substrands
    getStrands: (subjectId: string) => 
      this.request(`/learner/strands/${subjectId}`),
    
    // Substrands - for a strand, only those with approved lessons
    getSubstrands: (strandId: string) => 
      this.request(`/learner/substrands/${strandId}`),
    
    // Lessons - approved lessons for a substrand with unlock status
    getLessons: (substrandId: string) => 
      this.request(`/learner/lessons/${substrandId}`),
    
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
  };
}

export const api = new ApiClient(API_BASE_URL);
export default api;

