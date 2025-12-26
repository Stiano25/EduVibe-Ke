import { mockUsers } from '@/data/mockUsers'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'

export const AdminUsers = () => {
  return (
    <StaggeredEntry>
      <div className="section-spacing">
        <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] mb-6">Manage Users</h1>

        <div className="space-y-6">
          {mockUsers.map((user) => (
            <div key={user.id} className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{user.name}</h3>
                  <p className="text-gray-600">{user.email}</p>
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
      </div>
    </StaggeredEntry>
  )
}

