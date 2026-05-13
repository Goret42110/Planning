import { useState } from 'react'
import { useNetworkKey } from '../../hooks/useNetworkKey'

/**
 * Protège l'accès à un contenu sensible derrière la clé réseau ELS.
 * Utilisé pour : Affaires, Budget, Gestion, données financières.
 */
export default function NetworkGate({ children }) {
  const { isGranted, loading, networkKey, enterKey } = useNetworkKey()
  const [input, setInput] = useState('')
  const [err,   setErr]   = useState(false)

  // Chargement de la clé Supabase
  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Clé non configurée par l'admin
  if (!networkKey) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-slate-400 space-y-2">
        <div className="text-4xl">⚙️</div>
        <div className="font-semibold text-slate-600">Clé réseau non configurée</div>
        <div className="text-sm">Allez dans Administration pour définir la clé d'accès réseau</div>
      </div>
    </div>
  )

  // Accès accordé → afficher le contenu
  if (isGranted) return children

  // Écran de saisie de la clé
  function submit(e) {
    e.preventDefault()
    enterKey(input)
    if (input.trim() !== networkKey) setErr(true)
    else setErr(false)
  }

  return (
    <div className="h-full flex items-center justify-center px-4" style={{ background: '#F4F5F7' }}>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 w-full max-w-sm text-center">

        {/* Logo ELS */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md"
          style={{ background: '#1C1C2E' }}>
          <span className="text-[#E31E24] font-bold text-2xl">e</span>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-1">Accès réseau requis</h2>
        <p className="text-sm text-slate-400 mb-6">
          Cette section est protégée.<br />
          Saisissez la clé réseau interne ELS pour continuer.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setErr(false) }}
            autoFocus
            placeholder="Clé réseau…"
            className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-center font-mono tracking-widest focus:outline-none transition-colors ${
              err ? 'border-red-300 focus:border-red-400' : 'border-slate-100 focus:border-[#E31E24]'
            }`}
          />
          {err && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg py-2">
              Clé incorrecte — vérifiez et réessayez
            </div>
          )}
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full py-3 text-sm font-bold text-white rounded-xl transition-opacity disabled:opacity-40"
            style={{ background: '#E31E24' }}>
            Accéder
          </button>
        </form>

        <p className="text-xs text-slate-300 mt-5">
          La clé est mémorisée sur cet appareil tant que vous ne vous déconnectez pas
        </p>
      </div>
    </div>
  )
}
