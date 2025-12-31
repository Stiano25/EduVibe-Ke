import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { Shell } from '@/components/layout/Shell'
import { Login } from '@/pages/landing/Login'
import { Landing } from '@/pages/landing/Landing'
import { Signup } from '@/pages/landing/Signup'

// Admin pages
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminLessons } from '@/pages/admin/Lessons'
import { LessonForm } from '@/pages/admin/LessonForm'
import { AdminUsers } from '@/pages/admin/Users'
import { AdminAnalytics } from '@/pages/admin/Analytics'
import { AdminStrands } from '@/pages/admin/Strands'
import { AdminCurriculum } from '@/pages/admin/Curriculum'
import { AdminSubStrands } from '@/pages/admin/SubStrands'
import { AdminNotes } from '@/pages/admin/Notes'
import { AdminQuizzes } from '@/pages/admin/Quizzes'
import { AdminSubjects } from '@/pages/admin/Subjects'

// Learner pages
import { LearnerDashboard } from '@/pages/learner/Dashboard'
import { LearnerLessons } from '@/pages/learner/Lessons'
import { LessonView } from '@/pages/learner/LessonView'
import { LearnerRecommendations } from '@/pages/learner/Recommendations'

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'learner' }) => {
  const { isAuthenticated, user, initializeAuth } = useAuthStore()
  const [isInitializing, setIsInitializing] = useState(true)

  // Ensure auth is initialized before checking
  useEffect(() => {
    initializeAuth()
    // Small delay to ensure sessionStorage is read
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [initializeAuth])

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/learner'} replace />
  }

  return <Shell>{children}</Shell>
}

function App() {
  const { initializeAuth } = useAuthStore()

  // Initialize auth state from sessionStorage on app mount
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

