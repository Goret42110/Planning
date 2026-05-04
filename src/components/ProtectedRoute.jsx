import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles }) {
  const { session } = useAuth()

  if (!session) return <Navigate to="/login" replace />

  if (roles && !roles.includes(session.role)) {
    if (session.role === 'technicien') return <Navigate to={`/technicien/${session.id}`} replace />
    return <Navigate to="/planning" replace />
  }

  return <Outlet />
}
