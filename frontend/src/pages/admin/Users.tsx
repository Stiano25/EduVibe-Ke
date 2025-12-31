import { useState, useEffect } from 'react'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { api } from '@/lib/api'
import type { User } from '@/types'

export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const data = await api.admin.getUsers()
        setUsers(data)
      } catch (err: any) {
        console.error('Error fetching users:', err)
        setError(err.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (loading) {
    return (
      <div className="section-spacing">
        <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] mb-6">Manage Users</h1>
        <p className="text-gray-600">Loading users...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="section-spacing">
        <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] mb-6">Manage Users</h1>
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <StaggeredEntry>
      <div className="section-spacing">
        <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] mb-6">Manage Users</h1>

        {users.length === 0 ? (
          <p className="text-gray-600">No users found.</p>
        ) : (
          <div className="space-y-6">
            {users.map((user) => (
              <div key={user.id} className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{user.name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    {user.grade && (
                      <p className="text-sm text-gray-500 mt-1">Grade: {user.grade}</p>
                    )}
                    <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'Learner'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StaggeredEntry>
  )
}

