import { useState, useMemo } from 'react'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function fmtMois(mois) {
  if (!mois) return ''
  const [y, m] = mois.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

function fmt(v, decimals = 0) {
  if (v === null || v === undefined || v === '') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ProgressBar({ value, max, color, label }) {
  if (!max) return null
  const pct = Math.min((value / max) * 100, 120)
  const over = value > max
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={over ? 'text-red-600 font-bold' : 'text-slate-600'}>{fmt(value)} / {fmt(max)}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, background: over ? '#ef4444' : color }} />
      </div>
    </div>
  )
}

function AffaireCard({ numero, affaire, onUpdate }) {
  const [editing, setEditing]   = useState(false)
  const [comment, setComment]   = useState(affaire.commentaireGestion || '')

  const margeColor = affaire.marge < 0 ? 'text-red-600' : affaire.marge > 0 ? 'text-green-600' : 'text-slate-500'
  const status = affaire.marge < -1000 ? 'danger' : affaire.heuresRealisees > affaire.heuresPrevues * 1.1 ? 'warning' : 'ok'

  const statusBorder = status === 'danger' ? 'border-red-200' : status === 'warning' ? 'border-amber-200' : 'border-slate-100'
  const statusDot    = status === 'danger' ? 'bg-red-500' : status === 'warning' ? 'bg-amber-400' : 'bg-green-400'

  function saveComment() {
    onUpdate(numero, { commentaireGestion: comment })
    setEditing(false)
  }

  function togglePoint() {
    onUpdate(numero, { pointFait: !affaire.pointFait })
  }

  return (
    <div className={`bg-white rounded-2xl border ${statusBorder} shadow-sm overflow-hidden transition-all ${affaire.pointFait ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-[#E31E24] text-sm">{numero}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
            {affaire.pctAFacturer > 0 && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-px rounded-lg font-medium">
                À facturer : {fmt(affaire.aFacturerSM || affaire.aFacturer)} €
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-slate-800 leading-snug">{affaire.intitule}</div>
          <div className="text-xs text-slate-400 mt-0.5">{affaire.client}</div>
        </div>
        {/* Point fait toggle */}
        <button onClick={togglePoint}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            affaire.pointFait
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-green-300 hover:text-green-600'
          }`}>
          {affaire.pointFait ? '✓ Vu' : '○ À voir'}
        </button>
      </div>

      {/* KPIs financiers */}
      <div className="px-4 pb-3 grid grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-slate-400 font-medium mb-0.5">Commande</div>
          <div className="font-bold text-slate-800">{fmt(affaire.montantCommande)} €</div>
        </div>
        <div>
          <div className="text-slate-400 font-medium mb-0.5">Facturé</div>
          <div className="font-bold text-slate-700">{affaire.montantFacture ? fmt(affaire.montantFacture) + ' €' : '—'}</div>
        </div>
        <div>
          <div className="text-slate-400 font-medium mb-0.5">Marge</div>
          <div className={`font-bold ${margeColor}`}>{fmt(affaire.marge)} €</div>
        </div>
        <div>
          <div className="text-slate-400 font-medium mb-0.5">Reste à fact.</div>
          <div className="font-bold text-blue-700">{fmt(affaire.resteAFacturer)} €</div>
        </div>
      </div>

      {/* Barres heures / matériel */}
      {(affaire.heuresPrevues > 0 || affaire.achatsPrevus > 0) && (
        <div className="px-4 pb-3 space-y-2">
          {affaire.heuresPrevues > 0 && (
            <ProgressBar value={affaire.heuresRealisees} max={affaire.heuresPrevues}
              color="#3b82f6" label="Heures" />
          )}
          {affaire.achatsPrevus > 0 && (
            <ProgressBar value={affaire.achatsRealises} max={affaire.achatsPrevus}
              color="#f97316" label="Achats" />
          )}
        </div>
      )}

      {/* Commentaire Excel */}
      {affaire.commentaireExcel && (
        <div className="mx-4 mb-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
          📄 {affaire.commentaireExcel}
        </div>
      )}

      {/* Commentaire gestion */}
      <div className="px-4 pb-4">
        {editing ? (
          <div className="space-y-2">
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              rows={3} placeholder="Point de gestion, décision, action…"
              autoFocus
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:outline-none focus:border-[#E31E24] resize-none" />
            <div className="flex gap-2">
              <button onClick={saveComment}
                className="px-4 py-1.5 text-xs font-bold text-white rounded-lg"
                style={{ background: '#E31E24' }}>
                Enregistrer
              </button>
              <button onClick={() => { setComment(affaire.commentaireGestion || ''); setEditing(false) }}
                className="px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className={`w-full text-left text-xs px-3 py-2 rounded-xl border border-dashed transition-colors ${
              affaire.commentaireGestion
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-400 hover:border-[#E31E24]/40 hover:text-[#E31E24] hover:bg-red-50/30'
            }`}>
            {affaire.commentaireGestion
              ? `✏️ ${affaire.commentaireGestion}`
              : '+ Ajouter un commentaire de gestion'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function PointMensuel({ getMoisCA, moisDisponibles, updateAffaire, caList }) {
  const [mois,      setMois]      = useState(moisDisponibles[0] || '')
  const [caId,      setCaId]      = useState('')
  const [search,    setSearch]    = useState('')
  const [filtre,    setFiltre]    = useState('all') // all | a-voir | alerte

  const caInitiales = useMemo(() => {
    const ca = caList?.find(c => c.id === caId)
    return ca ? (ca.prenom[0] + ca.nom[0]).toUpperCase() : ''
  }, [caId, caList])

  const moisData = getMoisCA(mois, caInitiales)
  const affaires = moisData?.affaires || {}

  const filtered = useMemo(() => {
    return Object.entries(affaires).filter(([num, a]) => {
      if (filtre === 'a-voir'  && a.pointFait) return false
      if (filtre === 'alerte'  && a.marge >= 0 && a.heuresRealisees <= a.heuresPrevues * 1.1) return false
      if (search) {
        const q = search.toLowerCase()
        return num.toLowerCase().includes(q)
          || (a.intitule || '').toLowerCase().includes(q)
          || (a.client   || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [affaires, filtre, search])

  // Stats globales
  const stats = useMemo(() => {
    const all = Object.values(affaires)
    return {
      total:       all.length,
      vues:        all.filter(a => a.pointFait).length,
      enAlerte:    all.filter(a => a.marge < -1000 || a.heuresRealisees > a.heuresPrevues * 1.1).length,
      aFacturer:   all.reduce((s, a) => s + (a.resteAFacturer || 0), 0),
    }
  }, [affaires])

  return (
    <div className="space-y-5">
      {/* Sélecteurs */}
      <div className="flex flex-wrap gap-3">
        <select value={mois} onChange={e => setMois(e.target.value)}
          className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E31E24]">
          {moisDisponibles.length === 0 && <option value="">Aucun import disponible</option>}
          {moisDisponibles.map(m => (
            <option key={m} value={m}>{fmtMois(m)}</option>
          ))}
        </select>

        <select value={caId} onChange={e => setCaId(e.target.value)}
          className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E31E24]">
          <option value="">— Sélectionner un CA —</option>
          {caList?.map(ca => (
            <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>
          ))}
        </select>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E31E24] w-48" />
      </div>

      {/* Stats */}
      {Object.keys(affaires).length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Affaires', value: stats.total, color: '#1C1C2E' },
            { label: 'Vues',     value: `${stats.vues} / ${stats.total}`, color: '#22c55e' },
            { label: 'Alertes',  value: stats.enAlerte, color: stats.enAlerte > 0 ? '#ef4444' : '#9ca3af' },
            { label: 'À facturer', value: stats.aFacturer.toLocaleString('fr-FR') + ' €', color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      {Object.keys(affaires).length > 0 && (
        <div className="flex gap-2">
          {[['all','Toutes'],['a-voir','À voir'],['alerte','Alertes']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltre(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filtre === v ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
              style={filtre === v ? { background: '#E31E24' } : {}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Grille affaires */}
      {!caId ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">👤</div>
          <div className="text-sm font-medium">Sélectionnez un chargé d'affaires</div>
        </div>
      ) : !mois || Object.keys(affaires).length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">📂</div>
          <div className="text-sm font-medium">Aucune donnée pour ce mois</div>
          <div className="text-xs mt-1">Importez d'abord le fichier Excel</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(([num, affaire]) => (
            <AffaireCard
              key={num}
              numero={num}
              affaire={affaire}
              onUpdate={(n, patch) => updateAffaire(mois, caInitiales, n, patch)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-10 text-slate-400 text-sm">Aucune affaire correspondante</div>
          )}
        </div>
      )}
    </div>
  )
}
