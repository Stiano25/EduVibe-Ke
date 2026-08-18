import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, Suspense, lazy, type ReactNode } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { Shell } from '@/components/layout/Shell'

// Keep entry/auth screens eager for fast first paint
import { Login } from '@/pages/landing/Login'
import { Landing } from '@/pages/landing/Landing'
import { Signup } from '@/pages/landing/Signup'

// Heavy admin/learner pages load only when navigated to
const AdminDashboard = lazy(() =>
  import('@/pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboard }))
)
const AdminLessons = lazy(() =>
  import('@/pages/admin/Lessons').then((m) => ({ default: m.AdminLessons }))
)
const LessonForm = lazy(() =>
  import('@/pages/admin/LessonForm').then((m) => ({ default: m.LessonForm }))
)
const AdminUsers = lazy(() =>
  import('@/pages/admin/Users').then((m) => ({ default: m.AdminUsers }))
)
const AdminAnalytics = lazy(() =>
  import('@/pages/admin/Analytics').then((m) => ({ default: m.AdminAnalytics }))
)
const AdminStrands = lazy(() =>
  import('@/pages/admin/Strands').then((m) => ({ default: m.AdminStrands }))
)
const AdminCurriculum = lazy(() =>
  import('@/pages/admin/Curriculum').then((m) => ({ default: m.AdminCurriculum }))
)
const AdminSubStrands = lazy(() =>
  import('@/pages/admin/SubStrands').then((m) => ({ default: m.AdminSubStrands }))
)
const AdminNotes = lazy(() =>
  import('@/pages/admin/Notes').then((m) => ({ default: m.AdminNotes }))
)
const AdminQuizzes = lazy(() =>
  import('@/pages/admin/Quizzes').then((m) => ({ default: m.AdminQuizzes }))
)
const AdminSubjects = lazy(() =>
  import('@/pages/admin/Subjects').then((m) => ({ default: m.AdminSubjects }))
)
const AdminKnowledgeBank = lazy(() =>
  import('@/pages/admin/KnowledgeBank').then((m) => ({ default: m.AdminKnowledgeBank }))
)
const AdminLearnerReports = lazy(() =>
  import('@/pages/admin/LearnerReports').then((m) => ({ default: m.AdminLearnerReports }))
)

const LearnerDashboard = lazy(() =>
  import('@/pages/learner/Dashboard').then((m) => ({ default: m.LearnerDashboard }))
)
const LearnerLessons = lazy(() =>
  import('@/pages/learner/Lessons').then((m) => ({ default: m.LearnerLessons }))
)
const LessonView = lazy(() =>
  import('@/pages/learner/LessonView').then((m) => ({ default: m.LessonView }))
)
const LearnerRecommendations = lazy(() =>
  import('@/pages/learner/Recommendations').then((m) => ({
    default: m.LearnerRecommendations,
  }))
)

const PageFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
  </div>
)

const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: ReactNode
  requiredRole?: 'admin' | 'learner'
}) => {
  const { isAuthenticated, user, initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/learner'} replace />
  }

  return (
    <Shell>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </Shell>
  )
}

function App() {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lessons"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLessons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lessons/new"
          element={
            <ProtectedRoute requiredRole="admin">
              <LessonForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lessons/:id/edit"
          element={
            <ProtectedRoute requiredRole="admin">
              <LessonForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLearnerReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/strands"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminStrands />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/curriculum"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminCurriculum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSubjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/knowledge"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminKnowledgeBank />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/substrands"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSubStrands />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notes"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminNotes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/quizzes"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminQuizzes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/learner"
          element={
            <ProtectedRoute requiredRole="learner">
              <LearnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learner/lessons"
          element={
            <ProtectedRoute requiredRole="learner">
              <LearnerLessons />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learner/lessons/:id"
          element={
            <ProtectedRoute requiredRole="learner">
              <LessonView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learner/recommendations"
          element={
            <ProtectedRoute requiredRole="learner">
              <LearnerRecommendations />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
