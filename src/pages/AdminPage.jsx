import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { utilisateurs as BASE_USERS } from '../data/utilisateurs'
import { INITIAL_PERSONNEL } from '../data/initial'

const LS_DATA_KEY  = 'els_planning_data'
const LS_USERS_KEY = 'els_utilisateurs'
const DATA_VERSION = 4

const AUTH_ROLES     = ['responsable', 'ca', 'technicien']
const PLANNING_ROLES = ['CA', 'TECH', 'RS']
const TYPES          = ['ELS', 'Intérimaire', 'Sous-traitant']

const AUTH_ROLE_LABELS = { responsable: 'Responsable', ca: 'CA', technicien: 'Technicien' }
const AUTH_ROLE_CLS    = {
  responsable: 'bg-blue-100 text-blue-700',
  ca:          'bg-amber-100 text-amber-700',
  technicien:  'bg-slate-100 text-slate-600',
}

function loadUsers() {
  try {
    const s = localStorage.getItem(LS_USERS_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return BASE_USERS
}

function loadPersonnel() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_DATA_KEY))
    if (d?.personnel?.length) return d.personnel
  } catch {}
  return INITIAL_PERSONNEL
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users))
}

function savePersonnelField(id, updates) {
  try {
    const raw = localStorage.getItem(LS_DATA_KEY)
    const d   = raw ? JSON.parse(raw) : { _version: DATA_VERSION, affaires: [], planning: {}, comments: {}, timesheets: {} }
    if (!d._version) d._version = DATA_VERSION
    if (!d.personnel) d.personnel = INITIAL_PERSONNEL
    d.personnel = d.personnel.map(p => p.id === id ? { ...p, ...updates } : p)
    localStorage.setItem(LS_DATA_KEY, JSON.stringify(d))
  } catch {}
}

export default function AdminPage() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const [users,     setUsers]     = useState(loadUsers)
  const [personnel, setPersonnel] = useState(loadPersonnel)
  const [saved,     setSaved]     = useState(false)
  const [search,    setSearch]    = useState('')

  function getPerson(id) { return personnel.find(p => p.id === id) }

  function updateAuthRole(id, role) {
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, role } : u)
      saveUsers(next)
      return next
    })
    setSaved(true)
  }

  function updatePassword(id, pwd) {
    if (!pwd.trim()) return
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, motDePasse: pwd.trim() } : u)
      saveUsers(next)
      return next
    })
    setSaved(true)
  }

  function updatePlanningField(id, field, value) {
    setPersonnel(prev => {
      const next = prev.map(p => p.id === id ? { ...p, [field]: value } : p)
      savePersonnelField(id, { [field]: value })
      return next
    })
    setSaved(true)
  }

  function handleLogout() { logout(); navigate('/login', { replace: true }) }

  const services = [...new Set(users.map(u => u.serviceId))]
  const SERVICE_LABELS = { direction: 'Direction', energie: 'Energie', petrole: 'Pétrole' }

  const filteredUsers = search.trim()
    ? users.filter(u => `${u.prenom} ${u.nom}`.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 3L5 14h8l-2 7 9-11h-8l2-7z" fill="#1e3a5f"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">Administration — ELS Énergie</div>
            <div className="text-slate-400 text-xs">Gestion des utilisateurs et des droits</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/planning')}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
            ← Planning
          </button>
          <button onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {saved && (
          <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            ✓ Modifications enregistrées. Les changements de rôle prennent effet à la prochaine connexion de l'utilisateur.
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">
            Utilisateurs <span className="text-slate-400 font-normal text-base ml-1">{users.length}</span>
          </h1>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 w-52" />
        </div>

        <div className="space-y-6">
          {services.map(svcId => {
            const svcUsers = filteredUsers.filter(u => u.serviceId === svcId)
            if (!svcUsers.length) return null
            return (
              <div key={svcId}>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {SERVICE_LABELS[svcId] || svcId}
                </h2>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500 font-medium">
                        <th className="px-4 py-2.5 w-44">Nom</th>
                        <th className="px-4 py-2.5 w-32">Identifiant</th>
                        <th className="px-4 py-2.5 w-36">Rôle application</th>
                        <th className="px-4 py-2.5 w-28">Rôle planning</th>
                        <th className="px-4 py-2.5 w-28">Qualification</th>
                        <th className="px-4 py-2.5 w-32">Type</th>
                        <th className="px-4 py-2.5 w-16">Actif</th>
                        <th className="px-4 py-2.5">Mot de passe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {svcUsers.map((u, i) => {
                        const person = getPerson(u.id)
                        return (
                          <tr key={u.id} className={`${i < svcUsers.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50`}>

                            {/* Nom */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                  {(u.prenom || '?')[0]}{(u.nom || '?')[0]}
                                </div>
                                <span className="font-medium text-slate-800 text-sm">{u.prenom} {u.nom}</span>
                              </div>
                            </td>

                            {/* Identifiant */}
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{u.identifiant}</span>
                            </td>

                            {/* Rôle application */}
                            <td className="px-4 py-3">
                              <select value={u.role}
                                onChange={e => updateAuthRole(u.id, e.target.value)}
                                className={`text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer ${AUTH_ROLE_CLS[u.role]}`}>
                                {AUTH_ROLES.map(r => <option key={r} value={r}>{AUTH_ROLE_LABELS[r]}</option>)}
                              </select>
                            </td>

                            {/* Rôle planning */}
                            <td className="px-4 py-3">
                              {person ? (
                                <select value={person.role || 'TECH'}
                                  onChange={e => updatePlanningField(u.id, 'role', e.target.value)}
                                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400">
                                  {PLANNING_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>

                            {/* Qualification */}
                            <td className="px-4 py-3">
                              {person ? (
                                <input
                                  value={person.qualification || ''}
                                  onChange={e => updatePlanningField(u.id, 'qualification', e.target.value)}
                                  placeholder="ex: CE"
                                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-20 bg-white focus:outline-none focus:border-blue-400"
                                />
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>

                            {/* Type */}
                            <td className="px-4 py-3">
                              {person ? (
                                <select value={person.type || 'ELS'}
                                  onChange={e => updatePlanningField(u.id, 'type', e.target.value)}
                                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400">
                                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>

                            {/* Actif */}
                            <td className="px-4 py-3">
                              {person ? (
                                <button onClick={() => updatePlanningField(u.id, 'actif', !person.actif)}
                                  className={`w-9 h-5 rounded-full transition-colors relative ${person.actif !== false ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${person.actif !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>

                            {/* Mot de passe */}
                            <td className="px-4 py-3">
                              <PasswordCell onSave={pwd => updatePassword(u.id, pwd)} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PasswordCell({ onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  if (!editing) return (
    <button onClick={() => setEditing(true)}
      className="text-xs text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-2 py-1 rounded-lg transition-colors">
      Modifier
    </button>
  )

  return (
    <div className="flex gap-1 items-center">
      <input type="text" value={val} onChange={e => setVal(e.target.value)}
        placeholder="Nouveau mdp"
        className="text-xs border border-slate-200 rounded px-2 py-1 w-24 focus:outline-none focus:border-blue-400" />
      <button onClick={() => { onSave(val); setVal(''); setEditing(false) }}
        disabled={!val.trim()}
        className="text-xs bg-blue-600 disabled:bg-blue-200 text-white px-2 py-1 rounded">✓</button>
      <button onClick={() => setEditing(false)}
        className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
    </div>
  )
}
