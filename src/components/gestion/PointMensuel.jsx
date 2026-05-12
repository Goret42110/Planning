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

function FacturationEnvisagee({ value, aFacturerSM, resteAFacturer, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value != null ? String(value) : '')
  const suggestion = aFacturerSM || resteAFacturer || 0

  function handleSave() {
    const v = parseFloat(draft.replace(',', '.'))
    onSave(isNaN(v) ? null : Math.round(v * 100) / 100)
    setEditing(false)
  }

  if (editing) return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
      <span className="text-xs font-semibold text-blue-700 shrink-0">Fact. envisagée :</span>
      <input type="text" value={draft} onChange={e => setDraft(e.target.value)}
        autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
        className="flex-1 bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-400 w-28"
        placeholder="0" />
      <span className="text-xs text-blue-400">€</span>
      {suggestion > 0 && (
        <button onClick={() => setDraft(String(suggestion))}
          className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-lg whitespace-nowrap">
          = {suggestion.toLocaleString('fr-FR')} €
        </button>
      )}
      <button onClick={handleSave}
        className="px-2 py-1 text-xs font-bold text-white rounded-lg" style={{ background: '#E31E24' }}>✓</button>
      <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
    </div>
  )

  return (
    <button onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true) }}
      className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
        value != null
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
          : 'border-dashed border-blue-200 text-blue-400 hover:border-blue-400 hover:bg-blue-50'
      }`}>
      {value != null
        ? `💳 Facturation envisagée : ${Number(value).toLocaleString('fr-FR')} €`
        : `+ Saisir la facturation envisagée ce mois${suggestion > 0 ? ` (suggéré : ${suggestion.toLocaleString('fr-FR')} €)` : ''}`
      }
    </button>
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

      {/* Facturation envisagée ce mois */}
      <div className="px-4 pb-3">
        <FacturationEnvisagee
          value={affaire.facturationEnvisagee}
          aFacturerSM={affaire.aFacturerSM}
          resteAFacturer={affaire.resteAFacturer}
          onSave={v => onUpdate(numero, { facturationEnvisagee: v })}
        />
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

export default function PointMensuel({ getMoisCA, moisDisponibles, updateAffaire, caList, forcedCaId, isResponsable }) {
  const [mois,      setMois]      = useState(moisDisponibles[0] || '')
  const [caId,      setCaId]      = useState(forcedCaId || '')
  const [search,    setSearch]    = useState('')
  const [filtre,    setFiltre]    = useState('all') // all | a-voir | alerte

  const caIdEffectif = forcedCaId || caId

  const caInitiales = useMemo(() => {
    const ca = caList?.find(c => c.id === caIdEffectif)
    return ca ? (ca.prenom[0] + ca.nom[0]).toUpperCase() : ''
  }, [caIdEffectif, caList])

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
      total:                all.length,
      vues:                 all.filter(a => a.pointFait).length,
      enAlerte:             all.filter(a => a.marge < -1000 || a.heuresRealisees > a.heuresPrevues * 1.1).length,
      aFacturer:            all.reduce((s, a) => s + (a.resteAFacturer || 0), 0),
      facturationEnvisagee: all.reduce((s, a) => s + (a.facturationEnvisagee || 0), 0),
      nbSaisies:            all.filter(a => a.facturationEnvisagee != null).length,
    }
  }, [affaires])

  return (
    <div className="space-y-5">
      {/* Sélecteurs */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={mois} onChange={e => setMois(e.target.value)}
          className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E31E24]">
          {moisDisponibles.length === 0 && <option value="">Aucun import disponible</option>}
          {moisDisponibles.map(m => (
            <option key={m} value={m}>{fmtMois(m)}</option>
          ))}
        </select>

        {/* Sélecteur CA — visible uniquement pour le responsable */}
        {isResponsable ? (
          <select value={caId} onChange={e => setCaId(e.target.value)}
            className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E31E24]">
            <option value="">— Sélectionner un CA —</option>
            {caList?.map(ca => (
              <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>
            ))}
          </select>
        ) : (
          /* Pour un CA : affiche son nom, pas de sélecteur */
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-sm text-slate-600 font-medium">
            <span className="w-6 h-6 rounded-full bg-[#E31E24] text-white text-xs font-bold flex items-center justify-center">
              {caList?.find(c => c.id === forcedCaId)?.prenom?.[0]}
              {caList?.find(c => c.id === forcedCaId)?.nom?.[0]}
            </span>
            {caList?.find(c => c.id === forcedCaId)?.prenom} {caList?.find(c => c.id === forcedCaId)?.nom}
          </div>
        )}

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#E31E24] w-48" />
      </div>

      {/* Stats */}
      {Object.keys(affaires).length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Affaires',              value: stats.total, color: '#1C1C2E' },
            { label: 'Vues',                  value: `${stats.vues} / ${stats.total}`, color: '#22c55e' },
            { label: 'Alertes',               value: stats.enAlerte, color: stats.enAlerte > 0 ? '#ef4444' : '#9ca3af' },
            { label: 'Fact. envisagée',       value: stats.facturationEnvisagee.toLocaleString('fr-FR') + ' €', color: '#E31E24',
              sub: `${stats.nbSaisies}/${stats.total} affaires saisies` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
              {s.sub && <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>}
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
