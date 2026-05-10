import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { utilisateurs as BASE_USERS } from '../data/utilisateurs'
import { getItem } from '../lib/supabaseStorage'

async function getUsers() {
  const remote = await getItem('els_utilisateurs')
  if (remote) {
    try { localStorage.setItem('els_utilisateurs', JSON.stringify(remote)) } catch {}
    return remote
  }
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
    if (!user) { setErreur('Identifiant ou mot de passe incorrect.'); return }
    login({ id: user.id, prenom: user.prenom, nom: user.nom, role: user.role, serviceId: user.serviceId, caId: user.caId || null })
    if (user.role === 'technicien') navigate(`/technicien/${user.id}`, { replace: true })
    else navigate('/planning', { replace: true })
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1C1C2E 0%, #2A2A3E 60%, #1C1C2E 100%)' }}>

      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">
        <div className="flex items-center gap-3">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="21" fill="#2A2A3E" stroke="#E31E24" strokeWidth="1.5"/>
            <path d="M22 4 A18 18 0 0 1 38 13 L22 22 Z" fill="#9B9B9B" opacity="0.6"/>
            <path d="M38 13 A18 18 0 0 1 38 31 L22 22 Z" fill="#9B9B9B" opacity="0.4"/>
            <path d="M22 22 L6 13 A18 18 0 0 1 22 4 Z" fill="#9B9B9B" opacity="0.3"/>
            <circle cx="22" cy="22" r="8" fill="#1C1C2E"/>
            <text x="22" y="27" textAnchor="middle" fill="#E31E24" fontSize="11" fontWeight="700" fontFamily="Poppins,sans-serif">e</text>
          </svg>
          <div>
            <div>
              <span className="text-[#E31E24] font-bold text-2xl tracking-tight">els</span>
              <span className="text-white font-light text-2xl tracking-tight"> planning</span>
            </div>
            <div className="text-white/30 text-xs tracking-widest uppercase">by Genesienne</div>
          </div>
        </div>

        <div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Planification<br />
            <span className="text-[#E31E24]">centralisée</span><br />
            et collaborative
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            Gérez le planning de vos équipes, suivez vos affaires et pilotez votre activité en temps réel.
          </p>
        </div>

        <div className="text-white/20 text-xs">
          ELS Énergie — Electro Loire Services · Groupe Genesienne
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="17" fill="#2A2A3E" stroke="#E31E24" strokeWidth="1.5"/>
            <path d="M18 4 A14 14 0 0 1 30 11 L18 18 Z" fill="#9B9B9B" opacity="0.6"/>
            <path d="M30 11 A14 14 0 0 1 30 25 L18 18 Z" fill="#9B9B9B" opacity="0.4"/>
            <path d="M18 18 L6 11 A14 14 0 0 1 18 4 Z" fill="#9B9B9B" opacity="0.3"/>
            <circle cx="18" cy="18" r="6" fill="#1C1C2E"/>
            <text x="18" y="22" textAnchor="middle" fill="#E31E24" fontSize="9" fontWeight="700" fontFamily="Poppins,sans-serif">e</text>
          </svg>
          <div>
            <span className="text-[#E31E24] font-bold text-xl">els</span>
            <span className="text-white font-light text-xl"> planning</span>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Connexion</h2>
            <p className="text-slate-400 text-sm mb-8">Accédez à votre espace de travail</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Identifiant
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={identifiant}
                  onChange={e => { setIdentifiant(e.target.value); setErreur('') }}
                  placeholder="ex: aperret"
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-[#E31E24] bg-slate-50 transition-colors font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={motDePasse}
                  onChange={e => { setMotDePasse(e.target.value); setErreur('') }}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-[#E31E24] bg-slate-50 transition-colors"
                  required
                />
              </div>

              {erreur && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <span>⚠️</span> {erreur}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 mt-2"
                style={{ background: loading ? '#f87171' : '#E31E24' }}
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connexion…</>
                  : 'Se connecter →'
                }
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-white/30">
            Mot de passe par défaut : <span className="font-mono text-white/50">123456</span>
          </p>
        </div>
      </div>
    </div>
  )
}
