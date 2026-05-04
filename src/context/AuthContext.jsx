import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const s = localStorage.getItem('session_active')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  function login(sessionData) {
    localStorage.setItem('session_active', JSON.stringify(sessionData))
    setSession(sessionData)
  }

  function logout() {
    localStorage.removeItem('session_active')
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
