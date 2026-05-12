import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../App'
import { useNetworkKey } from '../hooks/useNetworkKey'
import { utilisateurs as BASE_USERS } from '../data/utilisateurs'

function getAuthUsers() {
  try { const s = localStorage.getItem('els_utilisateurs'); if (s) return JSON.parse(s) } catch {}
  return BASE_USERS
}

function ElsLogo() {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* Cercle ELS — inspiré du logo */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="17" fill="#2A2A3E" stroke="#E31E24" strokeWidth="1.5"/>
        {/* Segments gris */}
        <path d="M18 4 A14 14 0 0 1 30 11 L18 18 Z" fill="#9B9B9B" opacity="0.6"/>
        <path d="M30 11 A14 14 0 0 1 30 25 L18 18 Z" fill="#9B9B9B" opacity="0.4"/>
        <path d="M18 18 L6 11 A14 14 0 0 1 18 4 Z" fill="#9B9B9B" opacity="0.3"/>
        {/* Cercle central blanc */}
        <circle cx="18" cy="18" r="6" fill="#1C1C2E"/>
        {/* Texte "e" stylisé */}
        <text x="18" y="22" textAnchor="middle" fill="#E31E24" fontSize="9" fontWeight="700" fontFamily="Poppins,sans-serif">e</text>
      </svg>
      <div>
        <div className="leading-none">
          <span className="text-[#E31E24] font-bold text-lg tracking-tight">els</span>
          <span className="text-white font-light text-lg tracking-tight"> planning</span>
        </div>
        <div className="text-[10px] text-white/40 font-light tracking-widest uppercase leading-none mt-0.5">by Genesienne</div>
      </div>
    </div>
  )
}

const ROLE_LABELS = {
  responsable: { label: 'Responsable', bg: 'bg-red-900/40 text-red-300 border-red-700/50' },
  ca:          { label: 'Chargé d\'affaires', bg: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
  aca:         { label: 'ACA', bg: 'bg-purple-900/40 text-purple-300 border-purple-700/50' },
  technicien:  { label: 'Technicien', bg: 'bg-slate-700/60 text-slate-300 border-slate-600/50' },
}

export default function Header() {
  const { session, logout } = useAuth()
  const { personnel, selectedCA, setSelectedCA } = useApp()
  const navigate = useNavigate()

  const { isGranted: networkGranted } = useNetworkKey()
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
    <header className="h-14 bg-[#1C1C2E] border-b border-white/10 px-5 flex items-center justify-between shrink-0 shadow-lg">
      {/* Logo */}
      <ElsLogo />

      {/* Right side */}
      <div className="flex items-center gap-3">

        {/* Filtre CA — responsable uniquement */}
        {session?.role === 'responsable' && cas.length > 0 && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-white/40 text-xs hidden sm:block">Vue :</span>
            <select
              value={selectedCA || ''}
              onChange={e => setSelectedCA(e.target.value || null)}
              className="bg-[#2A2A3E] border border-white/20 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-400 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">Tous les CA</option>
              {cas.map(ca => (
                <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>
              ))}
            </select>
          </div>
        )}

        {/* Séparateur */}
        <div className="h-6 w-px bg-white/15" />

        {/* User */}
        {session && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E31E24] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
              {(session.prenom?.[0] || '?')}{(session.nom?.[0] || '?')}
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-white text-xs font-medium">{session.prenom} {session.nom}</div>
              <div className={`text-[10px] px-1.5 py-px rounded border font-medium inline-block ${roleInfo.bg}`}>
                {roleInfo.label}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-1">
          {session?.role === 'responsable' && (
            <Link to="/admin"
              className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-all font-medium">
              ⚙ Admin
            </Link>
          )}
          {session?.role === 'ca' && (
            <Link to="/ca"
              className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-all">
              📱
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-all font-medium">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
