import { Navigate } from 'react-router-dom'

/**
 * AdminRoute — only allows access if user has role='admin' in localStorage.
 * Redirects to /login if not authenticated, /customer-dashboard if not admin.
 */
export default function AdminRoute({ children }) {
  const token = localStorage.getItem('access')
  const role = localStorage.getItem('role')

  if (!token) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/customer-dashboard" replace />

  return children
}
