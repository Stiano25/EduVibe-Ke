import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { api } from '@/lib/api'
import type { User } from '@/types'
import { ClipboardList, Users } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const data = await api.admin.getUsers()
        setUsers(data as User[])
      } catch (err: any) {
        console.error('Error fetching users:', err)
        setError(err.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] border-white/40 p-4 sm:p-6 max-w-4xl mx-auto">
          <StaggeredEntry>
            <div className="space-y-5">
              <AdminPageHeader
                title="Users"
                subtitle="Learners and admins on the platform"
                icon={Users}
                iconClassName="from-orange-500 to-amber-600"
                showWorkflow={false}
                actions={
                  <Link
                    to="/admin/reports"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border-2 border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-white"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Learner reports
                  </Link>
                }
              />

              {loading && (
                <p className="text-slate-600 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Loading users…
                </p>
              )}

              {error && (
                <div className="p-4 rounded-[16px] bg-red-50 border-2 border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && users.length === 0 && (
                <p className="text-slate-600 text-sm">No users found.</p>
              )}

              {!loading && !error && users.length > 0 && (
                <ul className="space-y-3">
                  {users.map((user) => (
                    <li
                      key={user.id}
                      className="bg-white/80 border-2 border-slate-200 rounded-[16px] px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h3
                          className="text-base font-semibold text-[#0F172A] truncate"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          {user.name}
                        </h3>
                        <p className="text-sm text-slate-600 truncate">{user.email}</p>
                        {user.grade && (
                          <p className="text-xs text-slate-500 mt-1">Grade {user.grade}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Learner'}
                        </span>
                        {user.role === 'learner' && (
                          <Link
                            to={`/admin/reports?learnerId=${user.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-violet-100 text-violet-800 hover:bg-violet-200"
                          >
                            Report
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
