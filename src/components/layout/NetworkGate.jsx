import { useNetwork } from '../../context/NetworkContext'

/**
 * Protège une section sensible.
 * Utilise le contexte réseau (un seul ping au démarrage de l'app).
 * Accessible uniquement si le serveur local NAS (localhost:3001) répond.
 */
export default function NetworkGate({ children }) {
  const { isOnNetwork, checking } = useNetwork()

  if (checking) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isOnNetwork) return children

  return (
    <div className="h-full flex items-center justify-center px-4" style={{ background: '#F4F5F7' }}>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md"
          style={{ background: '#1C1C2E' }}>
          <span className="text-[#E31E24] font-bold text-2xl">🔒</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Réseau entreprise requis</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          Cette section contient des données confidentielles.<br />
          Connectez-vous au réseau interne ELS ou au VPN pour y accéder.
        </p>
        <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-400 border border-slate-100">
          Le serveur local ELS (<code>localhost:3001</code>) est introuvable sur cet appareil.
        </div>
      </div>
    </div>
  )
}
