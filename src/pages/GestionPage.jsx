import { useState, useMemo } from 'react'
import { useApp } from '../App'
import { useAuth } from '../context/AuthContext'
import { useGestion } from '../hooks/useGestion'
import { useNetworkKey } from '../hooks/useNetworkKey'
import ImportExcel from '../components/gestion/ImportExcel'
import PointMensuel from '../components/gestion/PointMensuel'

// ── Écran de saisie de la clé réseau ─────────────────────────────────────────
function NetworkKeyScreen({ onEnter, error }) {
  const [val, setVal] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1C1C2E 0%, #2A2A3E 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Accès restreint</h2>
        <p className="text-sm text-slate-400 mb-6">
          Cette section est accessible uniquement sur le réseau interne ELS.<br />
          Saisissez la clé d'accès réseau.
        </p>
        <form onSubmit={e => { e.preventDefault(); onEnter(val) }} className="space-y-4">
          <input
            type="password"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Clé réseau…"
            autoFocus
            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24] text-center tracking-widest font-mono"
          />
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              ⚠️ Clé incorrecte
            </div>
          )}
          <button type="submit" disabled={!val.trim()}
            className="w-full py-3 text-sm font-bold text-white rounded-xl disabled:opacity-40"
            style={{ background: '#E31E24' }}>
            Accéder
          </button>
        </form>
        <p className="mt-5 text-xs text-slate-400">
          La clé est disponible sur le serveur interne ELS.<br />
          Contactez l'administrateur si vous ne la possédez pas.
        </p>
      </div>
    </div>
  )
}

// ── Page principale Gestion ───────────────────────────────────────────────────
export default function GestionPage() {
  const { personnel, affaires, addAffaire, updateAffaire: updatePlanningAffaire } = useApp()
  const { session } = useAuth()
  const { data, importData, updateAffaire, getMoisCA, moisDisponibles } = useGestion()
  const { isGranted, loading, enterKey, clearKey, localKey, networkKey } = useNetworkKey()

  const isResponsable = session?.role === 'responsable'
  const isCA          = session?.role === 'ca'

  const [activeTab, setActiveTab] = useState('point')
  const [keyError,  setKeyError]  = useState(false)

  const caList = useMemo(() => personnel.filter(p => p.role === 'CA' || p.role === 'RS'), [personnel])

  function handleEnterKey(k) {
    enterKey(k)
    setKeyError(k.trim() !== networkKey && networkKey !== null)
  }

  function handleImport(mois, caInitiales, caId, importedAffaires) {
    const by = session ? `${session.prenom} ${session.nom}` : 'Inconnu'

    // 1. Sauvegarder dans le module gestion
    importData(mois, caInitiales, importedAffaires, by)

    // 2. Synchroniser avec le planning : créer les nouvelles affaires, mettre à jour les existantes
    let colorIdx = affaires.length % 10
    for (const [numero, a] of Object.entries(importedAffaires)) {
      const existing = affaires.find(x => x.numero === numero)
      if (existing) {
        // Mettre à jour les champs financiers sur l'affaire existante
        updatePlanningAffaire(existing.id, {
          montantHT:    a.montantCommande || existing.montantHT,
          heuresPrevues: a.heuresPrevues  || existing.heuresPrevues,
          client:        a.client         || existing.client,
          intitule:      a.intitule       || existing.intitule,
        })
      } else {
        // Créer l'affaire dans le planning
        const id = 'a_' + numero.toLowerCase().replace(/[^a-z0-9]/g, '_')
        addAffaire({
          id,
          numero,
          client:        a.client || '',
          intitule:      a.intitule || '',
          caId:          caId || '',
          montantHT:     a.montantCommande || null,
          heuresPrevues: a.heuresPrevues   || '',
          statut:        'active',
          colorIndex:    colorIdx++ % 10,
          adresse:       '',
        })
      }
    }

    setActiveTab('point')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1C2E]">
      <div className="w-8 h-8 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Pas de clé définie → admin doit la configurer
  if (!networkKey) return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1C1C2E 0%, #2A2A3E 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Clé réseau non configurée</h2>
        <p className="text-sm text-slate-500">
          L'administrateur doit d'abord définir la clé réseau depuis la page Admin → section Sécurité.
        </p>
      </div>
    </div>
  )

  if (!isGranted) return (
    <NetworkKeyScreen onEnter={handleEnterKey} error={keyError} />
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F4F5F7' }}>
      {/* Header */}
      <header className="bg-[#1C1C2E] border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E31E24' }}>
            <span className="text-white font-bold text-xs">ELS</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Gestion des affaires</div>
            <div className="text-white/40 text-xs">Point mensuel · Suivi facturation</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg">
            🔓 Réseau interne
          </span>
          <button onClick={clearKey}
            className="text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
            Verrouiller
          </button>
        </div>
      </header>

      {/* Onglets */}
      <nav className="bg-white border-b border-slate-200 px-6 flex shadow-sm">
        {[
          { id: 'point',    label: '📋 Point mensuel' },
          { id: 'import',   label: '📂 Import Excel' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'text-[#E31E24]' : 'text-slate-500 hover:text-slate-800'
            }`}>
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E31E24] rounded-t-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'import' && (
          <div className="max-w-3xl mx-auto">
            <ImportExcel
              onImport={handleImport}
              caList={caList}
              forcedCaId={isCA ? session?.id : null}
            />
          </div>
        )}
        {activeTab === 'point' && (
          <div className="max-w-7xl mx-auto">
            <PointMensuel
              getMoisCA={getMoisCA}
              moisDisponibles={moisDisponibles}
              updateAffaire={updateAffaire}
              caList={caList}
              forcedCaId={isCA ? session?.id : null}
              isResponsable={isResponsable}
            />
          </div>
        )}
      </div>
    </div>
  )
}
