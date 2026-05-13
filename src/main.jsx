import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import App, { AppProvider } from './App.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import GestionPage from './pages/GestionPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import TechnicienRoute from './components/TechnicienRoute.jsx'
import CAMobileRoute from './components/ca/CAMobileRoute.jsx'
import NetworkBlock from './components/layout/NetworkBlock.jsx'
import { useNetworkAccess } from './hooks/useNetworkAccess.js'
import './index.css'

function RoleRedirect() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.role === 'technicien') return <Navigate to={`/technicien/${session.id}`} replace />
  return <Navigate to="/planning" replace />
}

function NetworkGuard({ children }) {
  const status = useNetworkAccess()
  if (status === 'checking')        return <NetworkBlock checking />
  if (status === 'blocked')         return <NetworkBlock />
  // 'allowed' ou 'not_configured' (env var pas encore définie) → on laisse passer
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NetworkGuard>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RoleRedirect />} />

            <Route element={<ProtectedRoute roles={['responsable', 'ca', 'aca']} />}>
              <Route path="/planning" element={<App />} />
            </Route>

            <Route element={<ProtectedRoute roles={['responsable']} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['responsable', 'ca']} />}>
              <Route path="/gestion" element={<GestionPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['ca', 'responsable']} />}>
              <Route path="/ca" element={<CAMobileRoute />} />
            </Route>

            <Route element={<ProtectedRoute roles={['technicien', 'responsable']} />}>
              <Route path="/technicien/:id" element={<TechnicienRoute />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
      </NetworkGuard>
    </BrowserRouter>
  </React.StrictMode>,
)
