import { useState } from 'react'
import { useNetwork } from '../../context/NetworkContext'

export default function NetworkGate({ children }) {
  const { isOnNetwork, checking, networkKey, tryKey } = useNetwork()
  const [input, setInput] = useState('')
  const [err,   setErr]   = useState(false)

  if (checking) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!networkKey) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-2 text-slate-400">
        <div className="text-3xl">⚙️</div>
        <div className="font-semibold text-slate-600">Mot de passe non configuré</div>
        <div className="text-sm">Allez dans Administration → Clé d'accès réseau</div>
      </div>
    </div>
  )

  if (isOnNetwork) return children

  function submit(e) {
    e.preventDefault()
    if (input.trim() === networkKey) {
      tryKey(input)   // met à jour le contexte → isOnNetwork devient true
    } else {
      setErr(true)
      setInput('')
    }
  }

  return (
    <div className="h-full flex items-center justify-center px-4" style={{ background: '#F4F5F7' }}>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 w-full max-w-sm text-center">

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: '#1C1C2E' }}>
          <span className="text-2xl">🔐</span>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-1">Accès restreint</h2>
        <p className="text-sm text-slate-400 mb-6">
          Cette section contient des données confidentielles.<br />
          Saisissez le mot de passe d'accès ELS.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setErr(false) }}
            autoFocus
            placeholder="Mot de passe…"
            className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-center font-mono tracking-widest focus:outline-none transition-colors ${
              err ? 'border-red-300 bg-red-50' : 'border-slate-100 focus:border-[#E31E24]'
            }`}
          />
          {err && <p className="text-xs text-red-600">Mot de passe incorrect, réessayez.</p>}
          <button type="submit" disabled={!input.trim()}
            className="w-full py-3 text-sm font-bold text-white rounded-xl disabled:opacity-40"
            style={{ background: '#E31E24' }}>
            Accéder
          </button>
        </form>

        <p className="text-xs text-slate-300 mt-5">Mémorisé sur cet appareil</p>
      </div>
    </div>
  )
}
