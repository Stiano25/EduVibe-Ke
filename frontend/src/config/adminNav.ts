import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Library,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavItem = {
  label: string
  shortLabel?: string
  path: string
  icon: LucideIcon
  /** Exact match only (dashboard). Default: path prefix. */
  exact?: boolean
  description: string
}

/** Primary admin destinations — keep this list short and workflow-ordered. */
export const adminNavItems: AdminNavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard,
    exact: true,
    description: 'Overview and where to start',
  },
  {
    label: 'Subjects',
    path: '/admin/subjects',
    icon: GraduationCap,
    description: 'Add subjects and parse curriculum PDFs',
  },
  {
    label: 'Lessons',
    path: '/admin/lessons',
    icon: BookOpen,
    description: 'Generate, review, and approve lessons',
  },
  {
    label: 'Exam bank',
    shortLabel: 'Exams',
    path: '/admin/knowledge',
    icon: Library,
    description: 'Upload past papers to ground AI quizzes',
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: Users,
    description: 'Learners and admins',
  },
  {
    label: 'Analytics',
    path: '/admin/analytics',
    icon: BarChart3,
    description: 'Usage and engagement',
  },
]

/** Numbered curriculum workflow for dashboard / page hints. */
export const adminWorkflowSteps = [
  {
    step: 1,
    title: 'Subjects',
    path: '/admin/subjects',
    detail: 'Create a subject and upload / parse the CBC PDF',
  },
  {
    step: 2,
    title: 'Exam bank',
    path: '/admin/knowledge',
    detail: 'Optional: upload past papers so quizzes match real exams',
  },
  {
    step: 3,
    title: 'Lessons',
    path: '/admin/lessons',
    detail: 'Pick subject → strand → sub-strand, then generate & approve',
  },
]

export const isAdminNavActive = (pathname: string, item: AdminNavItem) => {
  if (item.exact) return pathname === item.path
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}
