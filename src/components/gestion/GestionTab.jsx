import { useState, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useApp } from '../../App'
import { useAuth } from '../../context/AuthContext'
import { useNetworkKey } from '../../hooks/useNetworkKey'

// ── Parser Excel (identique ImportExcel.jsx) ──────────────────────────────────
function detectFormat(rows) {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (rows[i].some(c => String(c).toLowerCase().includes('chantier'))) {
      return { headerRow: i, hasClient: rows[i].some(c => String(c).toLowerCase() === 'client') }
    }
  }
  return { headerRow: 1, hasClient: false }
}

function buildCOL(hasClient) {
  const o = hasClient ? 1 : 0
  return {
    numero: 0, intitule: 2+o, client: hasClient ? 2 : -1,
    caInitiales: 4+o, montantCommande: 6+o, montantFacture: 7+o,
    heuresPrevues: 8+o, heuresRealisees: 9+o,
    achatsPrevus: 10+o, achatsRealises: 11+o,
    prixRevient: 12+o, marge: 13+o, resteAFacturer: 15+o,
    aFacturer: 17+o, aFacturerSM: 19+o, pctAFacturer: 20+o,
    commentaireExcel: 21+o,
  }
}

function n(v) { const x = parseFloat(v); return isNaN(x) ? 0 : Math.round(x * 100) / 100 }

function parseFile(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets['Synthese TN'] || wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const { headerRow, hasClient } = detectFormat(rows)
        const COL = buildCOL(hasClient)
        const affaires = {}
        let caInit = ''
        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i]
          const num = String(row[0] || '').trim()
          if (!num.toUpperCase().startsWith('ELS')) continue
          const ca = String(row[COL.caInitiales] || '').trim()
          if (ca) caInit = ca
          affaires[num] = {
            client: COL.client >= 0 ? String(row[COL.client] || '').trim() : '',
            intitule: String(row[COL.intitule] || '').trim(),
            montantCommande: n(row[COL.montantCommande]),
            montantFacture:  n(row[COL.montantFacture]),
            heuresPrevues:   n(row[COL.heuresPrevues]),
            heuresRealisees: n(row[COL.heuresRealisees]),
            achatsPrevus:    n(row[COL.achatsPrevus]),
            achatsRealises:  n(row[COL.achatsRealises]),
            prixRevient:     n(row[COL.prixRevient]),
            marge:           n(row[COL.marge]),
            resteAFacturer:  n(row[COL.resteAFacturer]),
            aFacturerSM:     n(row[COL.aFacturerSM]),
            commentaireExcel:String(row[COL.commentaireExcel] || '').trim(),
          }
        }
        // Détecter mois depuis nom de fichier
        const m = file.name.match(/(\d{2})(\d{2})/)
        const mois = m ? `20${m[2]}-${m[1]}` : new Date().toISOString().slice(0, 7)
        res({ affaires, caInit, mois, count: Object.keys(affaires).length })
      } catch(err) { rej(err) }
    }
    r.onerror = rej
    r.readAsArrayBuffer(file)
  })
}

function matchCA(init, caList) {
  if (!init || !caList) return null
  const u = init.toUpperCase()
  return caList.find(ca => {
    const p = ca.prenom.toUpperCase(), nm = ca.nom.toUpperCase().replace(/\s/g, '')
    if (u.length === 2) return p[0] + nm[0] === u
    if (u.length === 3) return p[0] + nm.slice(0, 2) === u
    return false
  }) || null
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
function fmtMois(m) {
  if (!m) return ''
  const [y, mo] = m.split('-')
  return `${MONTHS[parseInt(mo)-1]} ${y}`
}
function fmt(v) {
  if (!v && v !== 0) return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  if (Math.abs(n) >= 1000) return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function GestionTab() {
  const { affaires, personnel, addAffaire, updateAffaire } = useApp()
  const { session } = useAuth()
  const { isGranted, networkKey, enterKey, localKey } = useNetworkKey()

  const isResponsable = session?.role === 'responsable'
  const isCA          = session?.role === 'ca'
  const caIdEffectif  = isCA ? session?.id : null

  const caList = useMemo(() => personnel.filter(p => p.role === 'CA' || p.role === 'RS'), [personnel])

  const [moisActif,   setMoisActif]   = useState(() => {
    // Défaut : mois précédent (les imports sont généralement du mois passé)
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtreCA,    setFiltreCA]    = useState(caIdEffectif || '')
  const [search,      setSearch]      = useState('')
  const [importing,   setImporting]   = useState(false)
  const [importMsg,   setImportMsg]   = useState('')
  const [netKeyInput, setNetKeyInput] = useState('')
  const [netKeyErr,   setNetKeyErr]   = useState(false)
  const [selectedId,  setSelectedId]  = useState(null)
  const inputRef = useRef()

  // ── Import Excel ────────────────────────────────────────────────────────────
  async function handleFiles(fileList) {
    setImporting(true)
    setImportMsg('')
    let total = 0, created = 0, updated = 0
    try {
      for (const file of Array.from(fileList)) {
        const { affaires: parsed, caInit, mois } = await parseFile(file)
        const ca = matchCA(caInit, caList)
        for (const [numero, fin] of Object.entries(parsed)) {
          total++
          const existing = affaires.find(a => a.numero === numero)
          if (existing) {
            // Mettre à jour les données financières sur l'affaire existante
            const prevGestion = existing._gestion || {}
            updateAffaire(existing.id, {
              client:   fin.client   || existing.client,
              intitule: fin.intitule || existing.intitule,
              montantHT: fin.montantCommande || existing.montantHT,
              heuresPrevues: fin.heuresPrevues || existing.heuresPrevues,
              _finance: { ...fin, importedMois: mois, importedAt: new Date().toISOString() },
              _gestion: {
                ...prevGestion,
                [mois]: {
                  facturationEnvisagee: prevGestion[mois]?.facturationEnvisagee ?? null,
                  commentaire:          prevGestion[mois]?.commentaire          ?? '',
                  pointFait:            prevGestion[mois]?.pointFait            ?? false,
                },
              },
            })
            updated++
          } else {
            // Créer la nouvelle affaire
            addAffaire({
              numero,
              client:        fin.client || '',
              intitule:      fin.intitule || '',
              caId:          ca?.id || '',
              montantHT:     fin.montantCommande || null,
              heuresPrevues: fin.heuresPrevues   || '',
              statut:        'active',
              _finance: { ...fin, importedMois: mois, importedAt: new Date().toISOString() },
              _gestion: {
                [mois]: { facturationEnvisagee: null, commentaire: '', pointFait: false },
              },
            })
            created++
          }
        }
        setMoisActif(mois)
      }
      setImportMsg(`✅ ${total} affaires traitées — ${created} créées, ${updated} mises à jour`)
    } catch(e) {
      setImportMsg(`❌ Erreur : ${e.message}`)
    }
    setImporting(false)
  }

  // ── Affaires filtrées ───────────────────────────────────────────────────────
  const affairesFiltrees = useMemo(() => {
    return affaires.filter(a => {
      if (a.statut === 'terminée' || a.statut === 'perdue') return false
      if (caIdEffectif && a.caId !== caIdEffectif) return false
      if (filtreCA      && a.caId !== filtreCA)      return false
      if (search) {
        const q = search.toLowerCase()
        return a.numero.toLowerCase().includes(q)
          || (a.intitule || '').toLowerCase().includes(q)
          || (a.client   || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [affaires, caIdEffectif, filtreCA, search])

  // ── Collecte des mois disponibles ──────────────────────────────────────────
  const moisDisponibles = useMemo(() => {
    const s = new Set()
    // Ajouter les mois depuis les données importées
    for (const a of affaires) {
      if (a._finance?.importedMois) s.add(a._finance.importedMois)
      if (a._gestion) Object.keys(a._gestion).forEach(m => s.add(m))
    }
    // Toujours inclure le mois précédent et le mois courant
    const now  = new Date()
    const prev = new Date(now); prev.setMonth(prev.getMonth() - 1)
    s.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    s.add(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`)
    return [...s].sort((a, b) => b.localeCompare(a))
  }, [affaires])

  // ── Stats du mois ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const list = affairesFiltrees
    const gestionList = list.map(a => ({
      ...a._finance,
      ...(a._gestion?.[moisActif] || {}),
    }))
    return {
      total:    list.length,
      vus:      gestionList.filter(g => g.pointFait).length,
      alertes:  list.filter(a => a._finance && (a._finance.marge < -1000 || a._finance.heuresRealisees > a._finance.heuresPrevues * 1.1)).length,
      factEnv:  gestionList.reduce((s, g) => s + (g.facturationEnvisagee || 0), 0),
      nbSaisies:gestionList.filter(g => g.facturationEnvisagee != null).length,
    }
  }, [affairesFiltrees, moisActif])

  const selectedAffaire = affaires.find(a => a.id === selectedId)

  // ── Mise à jour gestion d'une affaire ───────────────────────────────────────
  function updateGestion(id, patch) {
    const a = affaires.find(x => x.id === id)
    if (!a) return
    updateAffaire(id, {
      _gestion: {
        ...(a._gestion || {}),
        [moisActif]: {
          ...(a._gestion?.[moisActif] || {}),
          ...patch,
        },
      },
    })
  }

  // ── Écran clé réseau ────────────────────────────────────────────────────────
  if (!isGranted && !networkKey) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-slate-400">
        <div className="text-4xl mb-3">⚙️</div>
        <div className="font-semibold text-slate-600">Clé réseau non configurée</div>
        <div className="text-sm mt-1">Allez dans Admin pour définir la clé d'accès</div>
      </div>
    </div>
  )

  if (!isGranted) return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Accès restreint</h2>
        <p className="text-sm text-slate-400 mb-5">Saisissez la clé réseau interne ELS</p>
        <form onSubmit={e => { e.preventDefault(); enterKey(netKeyInput); setNetKeyErr(netKeyInput.trim() !== networkKey) }} className="space-y-3">
          <input type="password" value={netKeyInput} onChange={e => setNetKeyInput(e.target.value)}
            autoFocus placeholder="Clé réseau…"
            className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm text-center font-mono focus:outline-none focus:border-[#E31E24]" />
          {netKeyErr && <div className="text-xs text-red-600">Clé incorrecte</div>}
          <button type="submit" disabled={!netKeyInput.trim()}
            className="w-full py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-40"
            style={{ background: '#E31E24' }}>Accéder</button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Colonne gauche ──────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col">

        {/* Contrôles */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          {/* Import + mois */}
          <div className="flex gap-2">
            <select value={moisActif} onChange={e => setMoisActif(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#E31E24]">
              {moisDisponibles.length === 0 && <option value={moisActif}>{fmtMois(moisActif)}</option>}
              {moisDisponibles.map(m => <option key={m} value={m}>{fmtMois(m)}</option>)}
            </select>
            <button onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg whitespace-nowrap"
              style={{ background: '#E31E24' }}>
              {importing ? '…' : '+ Import'}
            </button>
            <input ref={inputRef} type="file" multiple accept=".xlsx,.xlsm" className="hidden"
              onChange={e => handleFiles(e.target.files)} />
          </div>

          {importMsg && (
            <div className={`text-xs px-2 py-1.5 rounded-lg ${importMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {importMsg}
            </div>
          )}

          {/* Filtre CA */}
          {isResponsable && (
            <select value={filtreCA} onChange={e => setFiltreCA(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#E31E24]">
              <option value="">Tous les CA</option>
              {caList.map(ca => <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}{!ca.actif ? ' (ancien)' : ''}</option>)}
            </select>
          )}

          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#E31E24]" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-1.5 p-3 border-b border-slate-100">
          {[
            { label: 'Affaires', value: stats.total, color: '#1C1C2E' },
            { label: `Vus ${stats.vus}/${stats.total}`, value: '', color: '#22c55e' },
            { label: 'Alertes', value: stats.alertes, color: stats.alertes > 0 ? '#E31E24' : '#9ca3af' },
            { label: 'Fact. envisagée', value: stats.factEnv > 0 ? (stats.factEnv/1000).toFixed(0)+'k€' : '—', color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl px-2 py-1.5 text-center">
              <div className="text-xs text-slate-400">{s.label}</div>
              {s.value !== '' && <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>}
            </div>
          ))}
        </div>

        {/* Liste affaires */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {affairesFiltrees.map(a => {
            const fin  = a._finance || {}
            const gest = a._gestion?.[moisActif] || {}
            const alerte = fin.marge < -1000 || fin.heuresRealisees > fin.heuresPrevues * 1.1
            return (
              <button key={a.id} onClick={() => setSelectedId(a.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors ${selectedId === a.id ? 'bg-red-50 border-l-2 border-[#E31E24]' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${selectedId === a.id ? 'text-[#E31E24]' : 'text-slate-600'}`}>{a.numero}</span>
                      {alerte && <span className="text-red-500 text-xs">⚠️</span>}
                      {gest.pointFait && <span className="text-green-500 text-xs">✓</span>}
                    </div>
                    <div className="text-xs text-slate-600 truncate">{a.intitule}</div>
                    {a.client && <div className="text-xs text-slate-400 truncate">{a.client}</div>}
                  </div>
                  {fin.marge !== undefined && (
                    <div className={`text-xs font-bold shrink-0 ${fin.marge < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {(fin.marge/1000).toFixed(0)}k€
                    </div>
                  )}
                </div>
                {gest.facturationEnvisagee != null && (
                  <div className="mt-1 text-xs text-blue-600">💳 {(gest.facturationEnvisagee/1000).toFixed(1)}k€</div>
                )}
              </button>
            )
          })}
          {affairesFiltrees.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              {moisDisponibles.length === 0 ? 'Importez des fichiers Excel pour commencer' : 'Aucune affaire pour ce filtre'}
            </div>
          )}
        </div>
      </div>

      {/* ── Détail affaire ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {selectedAffaire
          ? <AffaireDetail
              affaire={selectedAffaire}
              mois={moisActif}
              onUpdate={patch => updateGestion(selectedAffaire.id, patch)}
              caList={caList}
            />
          : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="text-4xl mb-3">📋</div>
                <div className="font-semibold text-slate-600">Sélectionnez une affaire</div>
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Détail d'une affaire ──────────────────────────────────────────────────────
function AffaireDetail({ affaire, mois, onUpdate, caList }) {
  const fin  = affaire._finance || {}
  const gest = affaire._gestion?.[mois] || {}
  const ca   = caList.find(c => c.id === affaire.caId)

  const [editComment, setEditComment] = useState(false)
  const [comment,     setComment]     = useState(gest.commentaire || '')
  const [editFact,    setEditFact]    = useState(false)
  const [fact,        setFact]        = useState(gest.facturationEnvisagee != null ? String(gest.facturationEnvisagee) : '')

  const margeColor = fin.marge < 0 ? 'text-red-600' : fin.marge > 0 ? 'text-green-600' : 'text-slate-500'
  const hDepass = fin.heuresRealisees > fin.heuresPrevues && fin.heuresPrevues > 0

  function saveComment() { onUpdate({ commentaire: comment }); setEditComment(false) }
  function saveFact() {
    const v = parseFloat(fact.replace(',', '.'))
    onUpdate({ facturationEnvisagee: isNaN(v) ? null : Math.round(v * 100) / 100 })
    setEditFact(false)
  }

  return (
    <div className="p-5 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-[#E31E24] text-sm bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">{affaire.numero}</span>
              {affaire.probabilite && affaire.probabilite < 100 && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">{affaire.probabilite}%</span>
              )}
              {fin.importedMois && <span className="text-xs text-slate-400">Import : {fin.importedMois}</span>}
            </div>
            <div className="font-semibold text-slate-900">{affaire.intitule}</div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
              {affaire.client && <span>🏢 {affaire.client}</span>}
              {ca && <span>👤 {ca.prenom} {ca.nom}</span>}
            </div>
          </div>
          <button onClick={() => onUpdate({ pointFait: !gest.pointFait })}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${gest.pointFait ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-green-300'}`}>
            {gest.pointFait ? '✓ Point fait' : '○ À traiter'}
          </button>
        </div>
      </div>

      {/* Données financières */}
      {fin.montantCommande > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Données financières</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
            <div><div className="text-xs text-slate-400 mb-0.5">Commande</div><div className="font-bold">{fmt(fin.montantCommande)}</div></div>
            <div><div className="text-xs text-slate-400 mb-0.5">Facturé</div><div className="font-bold">{fmt(fin.montantFacture) || '—'}</div></div>
            <div><div className="text-xs text-slate-400 mb-0.5">Reste à fact.</div><div className="font-bold text-blue-700">{fmt(fin.resteAFacturer)}</div></div>
            <div><div className="text-xs text-slate-400 mb-0.5">Marge</div><div className={`font-bold ${margeColor}`}>{fmt(fin.marge)}</div></div>
          </div>
          <div className="space-y-2">
            {fin.heuresPrevues > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Heures</span>
                  <span className={hDepass ? 'text-red-600 font-bold' : ''}>{fin.heuresRealisees}h / {fin.heuresPrevues}h</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((fin.heuresRealisees/fin.heuresPrevues)*100,100)}%`, background: hDepass ? '#ef4444' : '#3b82f6' }} />
                </div>
              </div>
            )}
            {fin.achatsPrevus > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Achats</span>
                  <span className={fin.achatsRealises > fin.achatsPrevus ? 'text-red-600 font-bold' : ''}>{fmt(fin.achatsRealises)} / {fmt(fin.achatsPrevus)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((fin.achatsRealises/fin.achatsPrevus)*100,100)}%`, background: fin.achatsRealises > fin.achatsPrevus ? '#ef4444' : '#f97316' }} />
                </div>
              </div>
            )}
          </div>
          {fin.commentaireExcel && (
            <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              📄 {fin.commentaireExcel}
            </div>
          )}
        </div>
      )}

      {/* Facturation envisagée */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Facturation envisagée ce mois</h4>
        {editFact ? (
          <div className="flex items-center gap-2">
            <input type="text" value={fact} onChange={e => setFact(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveFact(); if (e.key === 'Escape') setEditFact(false) }}
              className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm w-40 focus:outline-none focus:border-[#E31E24] font-mono"
              placeholder="Montant €" />
            {fin.aFacturerSM > 0 && (
              <button onClick={() => setFact(String(fin.aFacturerSM))}
                className="text-xs text-blue-500 border border-blue-200 px-2 py-1.5 rounded-lg hover:bg-blue-50">
                Suggéré : {fmt(fin.aFacturerSM)}
              </button>
            )}
            <button onClick={saveFact} className="px-3 py-2 text-xs font-bold text-white rounded-xl" style={{ background: '#E31E24' }}>✓</button>
            <button onClick={() => setEditFact(false)} className="text-xs text-slate-400 px-2">✕</button>
          </div>
        ) : (
          <button onClick={() => { setFact(gest.facturationEnvisagee != null ? String(gest.facturationEnvisagee) : ''); setEditFact(true) }}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
              gest.facturationEnvisagee != null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-dashed border-blue-200 text-blue-400 hover:bg-blue-50'
            }`}>
            {gest.facturationEnvisagee != null ? `💳 ${fmt(gest.facturationEnvisagee)}` : `+ Saisir${fin.aFacturerSM > 0 ? ` (suggéré : ${fmt(fin.aFacturerSM)})` : ''}`}
          </button>
        )}
      </div>

      {/* Commentaire */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Commentaire de gestion</h4>
        {editComment ? (
          <div className="space-y-2">
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} autoFocus
              placeholder="Points de gestion, décisions, actions…"
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E31E24] resize-none" />
            <div className="flex gap-2">
              <button onClick={saveComment} className="px-4 py-2 text-xs font-bold text-white rounded-xl" style={{ background: '#E31E24' }}>Enregistrer</button>
              <button onClick={() => { setComment(gest.commentaire || ''); setEditComment(false) }} className="px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setComment(gest.commentaire || ''); setEditComment(true) }}
            className={`w-full text-left text-sm px-4 py-3 rounded-xl border border-dashed transition-colors ${
              gest.commentaire ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-400 hover:border-[#E31E24]/40'
            }`}>
            {gest.commentaire || '+ Ajouter un commentaire'}
          </button>
        )}
      </div>

      {/* Historique */}
      {affaire._gestion && Object.keys(affaire._gestion).filter(m => m !== mois).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Historique des mois précédents</h4>
          <div className="space-y-2">
            {Object.entries(affaire._gestion)
              .filter(([m]) => m !== mois)
              .sort(([a],[b]) => b.localeCompare(a))
              .map(([m, g]) => (
                <div key={m} className="flex items-start gap-3 text-xs py-2 border-b border-slate-50 last:border-0">
                  <span className="font-semibold text-slate-500 shrink-0 w-16">{fmtMois(m)}</span>
                  <div className="flex-1 text-slate-500 space-y-0.5">
                    {g.facturationEnvisagee != null && <div>💳 {fmt(g.facturationEnvisagee)}</div>}
                    {g.commentaire && <div className="italic">{g.commentaire}</div>}
                    {!g.facturationEnvisagee && !g.commentaire && <div className="text-slate-300">—</div>}
                  </div>
                  {g.pointFait && <span className="text-green-500 shrink-0">✓</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
