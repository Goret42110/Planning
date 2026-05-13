/**
 * Écran de blocage affiché quand l'utilisateur n'est pas sur le réseau entreprise.
 * Remplace toute l'application — rien n'est chargé derrière.
 */
export default function NetworkBlock({ checking = false }) {
  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1C1C2E' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Vérification du réseau…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#1C1C2E' }}>
      <div className="text-center max-w-md space-y-6">

        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
          style={{ background: '#E31E24' }}>
          <span className="text-white font-bold text-3xl">e</span>
        </div>

        {/* Titre */}
        <div>
          <div className="mb-1">
            <span className="text-[#E31E24] font-bold text-2xl">els</span>
            <span className="text-white font-light text-2xl"> planning</span>
          </div>
          <div className="text-white/30 text-xs tracking-widest uppercase">by Genesienne</div>
        </div>

        {/* Message */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 space-y-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-white font-semibold text-lg">Accès réseau requis</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Cette application est accessible uniquement depuis le <strong className="text-white/70">réseau interne ELS</strong>.
            <br /><br />
            Connectez-vous au réseau de l'entreprise ou au VPN pour continuer.
          </p>
        </div>

        <p className="text-white/20 text-xs">
          Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.
        </p>
      </div>
    </div>
  )
}
