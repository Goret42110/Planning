import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../App'
import { utilisateurs as BASE_USERS } from '../data/utilisateurs'
import { getItem, setItem } from '../lib/supabaseStorage'
import SuiviAffaires from '../components/admin/SuiviAffaires'

const LS_USERS_KEY = 'els_utilisateurs'

const AUTH_ROLES     = ['aucun', 'responsable', 'ca', 'aca', 'technicien']
const PLANNING_ROLES = ['CA', 'TECH', 'RS']
const TYPES          = ['ELS', 'Intérimaire', 'Sous-traitant']

const AUTH_ROLE_LABELS = { aucun: 'Aucun accès', responsable: 'Responsable', ca: 'CA', aca: 'ACA', technicien: 'Technicien' }
const AUTH_ROLE_CLS    = {
  aucun:       'bg-slate-100 text-slate-400',
  responsable: 'bg-blue-100 text-blue-700',
  ca:          'bg-amber-100 text-amber-700',
  aca:         'bg-purple-100 text-purple-700',
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

async function loadUsersFromSupabase() {
  const remote = await getItem(LS_USERS_KEY)
  if (remote) {
    try { localStorage.setItem(LS_USERS_KEY, JSON.stringify(remote)) } catch {}
    return remote
  }
  return loadUsers()
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users))
  setItem(LS_USERS_KEY, users)
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function AdminPage() {
  const { logout }    = useAuth()
  const navigate      = useNavigate()
  const { personnel, updatePerson } = useApp()

  const [activeTab, setActiveTab] = useState('personnel')
  const [users,  setUsers]  = useState(loadUsers)
  const [saved,  setSaved]  = useState(false)
  const [search, setSearch] = useState('')

  // Charger les utilisateurs depuis Supabase au montage
  useEffect(() => {
    loadUsersFromSupabase().then(u => setUsers(u))
  }, [])

  function getUser(id) { return users.find(u => u.id === id) }

  // ── Mutations auth ─────────────────────────────────────────────────────────
  function updateAuthRole(person, role) {
    setUsers(prev => {
      const exists = prev.find(u => u.id === person.id)
      let next
      if (role === 'aucun') {
        next = prev.filter(u => u.id !== person.id)
      } else if (exists) {
        next = prev.map(u => u.id === person.id ? { ...u, role } : u)
      } else {
        const identifiant = genIdentifiant(person.prenom, person.nom)
        next = [...prev, {
          id: person.id,
          prenom: person.prenom,
          nom: person.nom,
          identifiant,
          motDePasse: '123456',
          role,
          serviceId: person.serviceId || 'energie',
          caId: null,
        }]
      }
      saveUsers(next)
      return next
    })
    setSaved(true)
  }

  function updateAcaCA(userId, caId) {
    setUsers(prev => {
      const next = prev.map(u => u.id === userId ? { ...u, caId: caId || null } : u)
      saveUsers(next)
      return next
    })
    setSaved(true)
  }

  function updateIdentifiant(id, identifiant) {
    const val = identifiant.trim().toLowerCase().replace(/\s+/g, '')
    if (!val) return
    const taken = users.some(u => u.id !== id && u.identifiant === val)
    if (taken) return { error: `"${val}" est déjà utilisé` }
    setUsers(prev => {
      const next = prev.map(u => u.id === id ? { ...u, identifiant: val } : u)
      saveUsers(next)
      return next
    })
    setSaved(true)
    return null
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
    updatePerson(id, { [field]: value })
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
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F5F7' }}>
      {/* Header */}
      <header className="bg-[#1C1C2E] border-b border-white/10 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E31E24' }}>
            <span className="text-white font-bold text-xs">ELS</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Administration</div>
            <div className="text-white/40 text-xs">ELS Énergie · Groupe Genesienne</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/planning')}
            className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all font-medium">
            ← Planning
          </button>
          <button onClick={handleLogout}
            className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all font-medium">
            Déconnexion
          </button>
        </div>
      </header>

      {/* Onglets */}
      <nav className="bg-white border-b border-slate-200 px-6 flex shrink-0 shadow-sm">
        {[
          { id: 'personnel', label: '👷 Personnel & Accès' },
          { id: 'suivi',     label: '📋 Suivi des affaires' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'text-[#E31E24]' : 'text-slate-500 hover:text-slate-800'
            }`}>
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E31E24] rounded-t-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Onglet Suivi */}
      {activeTab === 'suivi' && (
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>
          <SuiviAffaires />
        </div>
      )}

      {/* Onglet Personnel */}
      {activeTab === 'personnel' && (
      <div className="flex-1 overflow-y-auto">
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
                        <th className="px-4 py-2.5 w-36">CA rattaché (ACA)</th>
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
                            caList={personnel.filter(p => p.role === 'CA')}
                            onRoleChange={r => updateAuthRole(person, r)}
                            onIdentifiantChange={val => updateIdentifiant(person.id, val)}
                            onPasswordChange={pwd => updatePassword(person.id, pwd)}
                            onPlanningChange={(field, val) => updatePlanningField(person.id, field, val)}
                            onAcaCAChange={caId => updateAcaCA(person.id, caId)}
                          />
                        )
                      })}

                      {/* Utilisateurs auth-only (ex: resp_07) */}
                      {svcAuthOnly.map((user, i) => (
                        <AuthOnlyRow key={user.id} user={user}
                          isLast={i === svcAuthOnly.length - 1}
                          onRoleChange={r => updateAuthRole({ id: user.id, prenom: user.prenom, nom: user.nom }, r)}
                          onIdentifiantChange={val => updateIdentifiant(user.id, val)}
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
      )}
    </div>
  )
}

// ── Ligne personnel planning ──────────────────────────────────────────────────
function PersonnelRow({ person, user, role, isLast, caList, onRoleChange, onIdentifiantChange, onPasswordChange, onPlanningChange, onAcaCAChange }) {
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
          ? <IdentifiantCell value={user.identifiant} onSave={onIdentifiantChange} />
          : <span className="text-xs text-slate-300 italic">auto à la création</span>
        }
      </td>

      {/* CA rattaché — visible uniquement pour ACA */}
      <td className="px-4 py-3">
        {role === 'aca' ? (
          <select value={user?.caId || ''}
            onChange={e => onAcaCAChange(e.target.value)}
            className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-purple-400">
            <option value="">— Choisir un CA —</option>
            {caList.map(ca => (
              <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
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
function AuthOnlyRow({ user, isLast, onRoleChange, onIdentifiantChange, onPasswordChange }) {
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
        <IdentifiantCell value={user.identifiant} onSave={onIdentifiantChange} />
      </td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3"><span className="text-xs text-slate-300">—</span></td>
      <td className="px-4 py-3"><PasswordCell onSave={onPasswordChange} /></td>
    </tr>
  )
}

// ── Cellule identifiant éditable ──────────────────────────────────────────────
function IdentifiantCell({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)
  const [error, setError]     = useState('')

  function handleSave() {
    const result = onSave(val)
    if (result?.error) { setError(result.error); return }
    setError('')
    setEditing(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setVal(value); setEditing(false); setError('') }
  }

  if (!editing) return (
    <button onClick={() => { setVal(value); setEditing(true) }}
      className="font-mono text-xs text-slate-500 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-1.5 py-0.5 rounded transition-colors cursor-pointer">
      {value}
    </button>
  )

  return (
    <div>
      <div className="flex gap-1 items-center">
        <input type="text" value={val}
          onChange={e => { setVal(e.target.value.toLowerCase().replace(/\s/g, '')); setError('') }}
          onKeyDown={handleKey}
          autoFocus
          className="font-mono text-xs border border-blue-400 rounded px-1.5 py-0.5 w-28 focus:outline-none" />
        <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">✓</button>
        <button onClick={() => { setEditing(false); setError('') }} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
      </div>
      {error && <div className="text-xs text-red-500 mt-0.5">{error}</div>}
    </div>
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
