import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { utilisateurs as BASE_USERS } from '../data/utilisateurs'
import { INITIAL_PERSONNEL } from '../data/initial'

const LS_DATA_KEY  = 'els_planning_data'
const LS_USERS_KEY = 'els_utilisateurs'
const DATA_VERSION = 4

const AUTH_ROLES     = ['aucun', 'responsable', 'ca', 'technicien']
const PLANNING_ROLES = ['CA', 'TECH', 'RS']
const TYPES          = ['ELS', 'Intérimaire', 'Sous-traitant']

const AUTH_ROLE_LABELS = { aucun: 'Aucun accès', responsable: 'Responsable', ca: 'CA', technicien: 'Technicien' }
const AUTH_ROLE_CLS    = {
  aucun:       'bg-slate-100 text-slate-400',
  responsable: 'bg-blue-100 text-blue-700',
  ca:          'bg-amber-100 text-amber-700',
  technicien:  'bg-green-100 text-green-700',
}

// ── Utilitaires ───────────────────────────────────────────────────────────────
function toSlug(str = '') {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')
}
function genIdentifiant(prenom, nom) {
  return (toSlug(prenom)[0] || '') + toSlug(nom)
}

function loadUsers() {
  try { const s = localStorage.getItem(LS_USERS_KEY); if (s) return JSON.parse(s) } catch {}
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

// ── Composant principal ───────────────────────────────────────────────────────
export default function AdminPage() {
  const { logout }  = useAuth()
  const navigate    = useNavigate()

  const [users,     setUsers]     = useState(loadUsers)
  const [personnel, setPersonnel] = useState(loadPersonnel)
  const [saved,     setSaved]     = useState(false)
  const [search,    setSearch]    = useState('')

  function getUser(id) { return users.find(u => u.id === id) }

  // ── Mutations auth ─────────────────────────────────────────────────────────
  function updateAuthRole(person, role) {
    setUsers(prev => {
      const exists = prev.find(u => u.id === person.id)
      let next
      if (role === 'aucun') {
        // Retirer l'accès
        next = prev.filter(u => u.id !== person.id)
      } else if (exists) {
        next = prev.map(u => u.id === person.id ? { ...u, role } : u)
      } else {
        // Créer un nouvel accès
        const identifiant = genIdentifiant(person.prenom, person.nom)
        next = [...prev, {
          id: person.id,
          prenom: person.prenom,
          nom: person.nom,
          identifiant,
          motDePasse: '123456',
          role,
          serviceId: person.serviceId || 'energie',
        }]
      }
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

  // ── Mutations planning ─────────────────────────────────────────────────────
  function updatePlanningField(id, field, value) {
    setPersonnel(prev => {
      const next = prev.map(p => p.id === id ? { ...p, [field]: value } : p)
      savePersonnelField(id, { [field]: value })
      return next
    })
    setSaved(true)
  }

  function handleLogout() { logout(); navigate('/login', { replace: true }) }

  // ── Données fusionnées ─────────────────────────────────────────────────────
  // Tout le personnel planning + utilisateurs auth-only (ex : resp_07)
  const authOnlyUsers = users.filter(u => !personnel.find(p => p.id === u.id))

  const serviceOrder = ['direction', 'energie', 'petrole']
  const allServices  = [...new Set([
    ...authOnlyUsers.map(u => u.serviceId),
    ...personnel.map(p => p.serviceId || 'energie'),
  ])].sort((a, b) => serviceOrder.indexOf(a) - serviceOrder.indexOf(b))

  const SERVICE_LABELS = { direction: 'Direction', energie: 'Energie', petrole: 'Pétrole' }
  const TYPE_LABELS    = { ELS: 'ELS', 'Intérimaire': 'INT', 'Sous-traitant': 'SST' }

  const q = search.trim().toLowerCase()

  function matchSearch(prenom, nom) {
    if (!q) return true
    return `${prenom} ${nom}`.toLowerCase().includes(q)
  }

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
            <div className="text-slate-400 text-xs">Gestion des accès et des informations</div>
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
            ✓ Modifications enregistrées. Les changements de rôle prennent effet à la prochaine connexion.
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-900">
            Personnel <span className="text-slate-400 font-normal text-base ml-1">{personnel.length + authOnlyUsers.length}</span>
          </h1>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 w-52" />
        </div>

        <div className="space-y-6">
          {allServices.map(svcId => {
            const svcPersonnel = personnel.filter(p => (p.serviceId || 'energie') === svcId && matchSearch(p.prenom, p.nom))
            const svcAuthOnly  = authOnlyUsers.filter(u => u.serviceId === svcId && matchSearch(u.prenom, u.nom))
            if (!svcPersonnel.length && !svcAuthOnly.length) return null

            return (
              <div key={svcId}>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {SERVICE_LABELS[svcId] || svcId}
                </h2>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500 font-medium">
                        <th className="px-4 py-2.5">Nom</th>
                        <th className="px-4 py-2.5 w-14">Type</th>
                        <th className="px-4 py-2.5 w-36">Accès application</th>
                        <th className="px-4 py-2.5 w-32">Identifiant</th>
                        <th className="px-4 py-2.5 w-28">Rôle planning</th>
                        <th className="px-4 py-2.5 w-28">Qualification</th>
                        <th className="px-4 py-2.5 w-16">Actif</th>
                        <th className="px-4 py-2.5">Mot de passe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Personnel planning */}
                      {svcPersonnel.map((person, i) => {
                        const user = getUser(person.id)
                        const role = user?.role || 'aucun'
                        const isLast = i === svcPersonnel.length - 1 && !svcAuthOnly.length
                        return (
                          <PersonnelRow key={person.id}
                            person={person} user={user} role={role} isLast={isLast}
                            onRoleChange={r => updateAuthRole(person, r)}
                            onPasswordChange={pwd => updatePassword(person.id, pwd)}
                            onPlanningChange={(field, val) => updatePlanningField(person.id, field, val)}
                          />
                        )
                      })}

                      {/* Utilisateurs auth-only (ex: resp_07) */}
                      {svcAuthOnly.map((user, i) => (
                        <AuthOnlyRow key={user.id} user={user}
                          isLast={i === svcAuthOnly.length - 1}
                          onRoleChange={r => updateAuthRole({ id: user.id, prenom: user.prenom, nom: user.nom }, r)}
                          onPasswordChange={pwd => updatePassword(user.id, pwd)}
                        />
                      ))}
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

// ── Ligne personnel planning ──────────────────────────────────────────────────
function PersonnelRow({ person, user, role, isLast, onRoleChange, onPasswordChange, onPlanningChange }) {
  return (
    <tr className={`${!isLast ? 'border-b border-slate-100' : ''} hover:bg-slate-50`}>
      {/* Nom */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
            {(person.prenom || '?')[0]}{(person.nom || '?')[0]}
          </div>
          <span className="font-medium text-slate-800 text-sm">{person.prenom} {person.nom}</span>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <select value={person.type || 'ELS'}
          onChange={e => onPlanningChange('type', e.target.value)}
          className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-blue-400">
          {['ELS','Intérimaire','Sous-traitant'].map(t => <option key={t} value={t}>{t === 'ELS' ? 'ELS' : t === 'Intérimaire' ? 'INT' : 'SST'}</option>)}
        </select>
      </td>

      {/* Accès application */}
      <td className="px-4 py-3">
        <select value={role}
          onChange={e => onRoleChange(e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer ${AUTH_ROLE_CLS[role] || AUTH_ROLE_CLS.aucun}`}>
          {AUTH_ROLES.map(r => <option key={r} value={r}>{AUTH_ROLE_LABELS[r]}</option>)}
        </select>
      </td>

      {/* Identifiant */}
      <td className="px-4 py-3">
        {user
          ? <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{user.identifiant}</span>
          : <span className="text-xs text-slate-300 italic">— (auto à la création)</span>
        }
      </td>

      {/* Rôle planning */}
      <td className="px-4 py-3">
        <select value={person.role || 'TECH'}
          onChange={e => onPlanningChange('role', e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400">
          {['CA','TECH','RS'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>

      {/* Qualification */}
      <td className="px-4 py-3">
        <input value={person.qualification || ''}
          onChange={e => onPlanningChange('qualification', e.target.value)}
          placeholder="CE, EL…"
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-20 bg-white focus:outline-none focus:border-blue-400" />
      </td>

      {/* Actif */}
      <td className="px-4 py-3">
        <button onClick={() => onPlanningChange('actif', !person.actif)}
          className={`w-9 h-5 rounded-full transition-colors relative ${person.actif !== false ? 'bg-blue-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${person.actif !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </td>

      {/* Mot de passe */}
      <td className="px-4 py-3">
        {user ? <PasswordCell onSave={onPasswordChange} /> : <span className="text-xs text-slate-300">—</span>}
      </td>
    </tr>
  )
}

// ── Ligne utilisateur auth-only (ex: resp_07 sans fiche planning) ─────────────
function AuthOnlyRow({ user, isLast, onRoleChange, onPasswordChange }) {
  return (
    <tr className={`${!isLast ? 'border-b border-slate-100' : ''} hover:bg-slate-50 bg-blue-50/30`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
            {(user.prenom || '?')[0]}{(user.nom || '?')[0]}
          </div>
          <div>
            <span className="font-medium text-slate-800 text-sm">{user.prenom} {user.nom}</span>
            <span className="ml-2 text-xs text-slate-400 italic">admin uniquement</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3">
        <select value={user.role}
          onChange={e => onRoleChange(e.target.value)}
          className={`text-xs font-medium px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer ${AUTH_ROLE_CLS[user.role] || AUTH_ROLE_CLS.aucun}`}>
          {AUTH_ROLES.map(r => <option key={r} value={r}>{AUTH_ROLE_LABELS[r]}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{user.identifiant}</span>
      </td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3"><PasswordCell onSave={onPasswordChange} /></td>
    </tr>
  )
}

// ── Cellule mot de passe ──────────────────────────────────────────────────────
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
