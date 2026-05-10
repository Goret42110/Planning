import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { utilisateurs as BASE_USERS } from '../data/utilisateurs'
import { getItem } from '../lib/supabaseStorage'

async function getUsers() {
  // Priorité : Supabase (source de vérité partagée)
  const remote = await getItem('els_utilisateurs')
  if (remote) {
    try { localStorage.setItem('els_utilisateurs', JSON.stringify(remote)) } catch {}
    return remote
  }
  // Fallback : localStorage puis fichier statique
  try {
    const s = localStorage.getItem('els_utilisateurs')
    if (s) return JSON.parse(s)
  } catch {}
  return BASE_USERS
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse,  setMotDePasse]  = useState('')
  const [erreur,      setErreur]      = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const users = await getUsers()
    const user = users.find(
      u => u.identifiant === identifiant.trim().toLowerCase() && u.motDePasse === motDePasse
    )
    setLoading(false)
    if (!user) {
      setErreur('Identifiant ou mot de passe incorrect.')
      return
    }
    login({ id: user.id, prenom: user.prenom, nom: user.nom, role: user.role, serviceId: user.serviceId, caId: user.caId || null })
    if (user.role === 'technicien') navigate(`/technicien/${user.id}`, { replace: true })
    else navigate('/planning', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center mx-auto mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M13 3L5 14h8l-2 7 9-11h-8l2-7z" fill="#1e3a5f" strokeWidth="0.5"/>
          </svg>
        </div>
        <div className="text-2xl font-bold text-slate-900">ELS Énergie</div>
        <div className="text-slate-500 text-sm mt-1">Connexion à l'espace collaborateurs</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-sm p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Identifiant</label>
            <input
              type="text"
              autoComplete="username"
              value={identifiant}
              onChange={e => { setIdentifiant(e.target.value); setErreur('') }}
              placeholder="ex: yvictorino"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Mot de passe</label>
            <input
              type="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={e => { setMotDePasse(e.target.value); setErreur('') }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 bg-white"
              required
            />
          </div>

          {erreur && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erreur}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Connexion…</> : 'Se connecter'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Mot de passe par défaut : <span className="font-mono">123456</span>
      </p>
    </div>
  )
}
