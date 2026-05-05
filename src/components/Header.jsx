import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../App'
import { utilisateurs as BASE_USERS } from '../data/utilisateurs'

function getAuthUsers() {
  try { const s = localStorage.getItem('els_utilisateurs'); if (s) return JSON.parse(s) } catch {}
  return BASE_USERS
}

const ROLE_LABELS = {
  responsable: { label: 'Responsable', cls: 'bg-blue-900 text-blue-200 border-blue-700' },
  ca:          { label: 'Chargé d\'affaires', cls: 'bg-amber-900 text-amber-200 border-amber-700' },
  technicien:  { label: 'Technicien', cls: 'bg-slate-700 text-slate-300 border-slate-600' },
}

export default function Header() {
  const { session, logout } = useAuth()
  const { personnel, selectedCA, setSelectedCA } = useApp()
  const navigate = useNavigate()

  const planningCAs = personnel.filter(p => (p.role === 'CA' || p.role === 'RS') && p.actif)
  const authResp    = getAuthUsers()
    .filter(u => u.role === 'responsable' && !personnel.find(p => p.id === u.id))
    .map(u => ({ id: u.id, prenom: u.prenom, nom: u.nom }))
  const cas = [...planningCAs, ...authResp]
  const roleInfo = ROLE_LABELS[session?.role] ?? ROLE_LABELS.technicien

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-5 py-2.5 flex items-center justify-between shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 3L5 14h8l-2 7 9-11h-8l2-7z" fill="#1e3a5f" strokeWidth="0.5"/>
          </svg>
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-none">ELS Énergie</div>
          <div className="text-slate-400 text-xs">Electro Loire Services</div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* CA filter — visible pour tous */}
        {cas.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Vue CA :</span>
            <select
              value={selectedCA || ''}
              onChange={e => setSelectedCA(e.target.value || null)}
              className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
            >
              <option value="">Tous les CA</option>
              {cas.map(ca => (
                <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>
              ))}
            </select>
          </div>
        )}

        {/* User info */}
        {session && (
          <div className="flex items-center gap-2.5 pl-4 border-l border-slate-700">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {session.prenom[0]}{session.nom[0]}
            </div>
            <div className="leading-tight">
              <div className="text-slate-200 text-sm font-medium">{session.prenom} {session.nom}</div>
              <div className={`text-xs px-1.5 py-0.5 rounded border font-medium inline-block ${roleInfo.cls}`}>
                {roleInfo.label}
              </div>
            </div>
            {session?.role === 'responsable' && (
              <Link to="/admin"
                className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
                ⚙ Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
