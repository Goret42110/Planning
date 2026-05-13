import { useState, useMemo, useRef, useEffect } from 'react'
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
        const mois = moisImportOverride || detectMoisFichier(file.name)
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

// ── Détection mois depuis nom de fichier ──────────────────────────────────────
// Extrait tous les groupes de chiffres et cherche une paire valide MM + AA(AA)
function detectMoisFichier(filename) {
  const name = filename.replace(/\.[^.]+$/, '') // sans extension
  // Extraire tous les groupes de chiffres consécutifs
  const groups = [...name.matchAll(/\d+/g)].map(m => m[0])

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    // Chercher MMAAAA sur 6 chiffres consécutifs
    if (g.length >= 6) {
      const mm = g.slice(0, 2), yy = g.slice(2, 6)
      if (parseInt(mm) >= 1 && parseInt(mm) <= 12 && yy.startsWith('20')) {
        return `${yy}-${mm}`
      }
    }
    // Chercher MMAA sur 4 chiffres consécutifs
    if (g.length === 4) {
      const mm = g.slice(0, 2), yy = g.slice(2, 4)
      if (parseInt(mm) >= 1 && parseInt(mm) <= 12) {
        return `20${yy}-${mm}`
      }
    }
    // Chercher MM (2 chiffres) suivi du prochain groupe AA ou AAAA
    if (g.length === 2) {
      const mm = parseInt(g)
      if (mm >= 1 && mm <= 12 && groups[i + 1]) {
        const next = groups[i + 1]
        if (next.length === 4 && next.startsWith('20')) return `${next}-${g.padStart(2,'0')}`
        if (next.length === 2) return `20${next}-${g.padStart(2,'0')}`
      }
    }
  }
  // Fallback : mois précédent
  const d = new Date(); d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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

  const [moisActif, setMoisActif] = useState(() => {
    // Défaut : mois précédent (sera remplacé dès que les données chargent)
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtreCA,    setFiltreCA]    = useState(caIdEffectif || '')
  const [search,      setSearch]      = useState('')
  const [importing,          setImporting]          = useState(false)
  const [importMsg,          setImportMsg]          = useState('')
  const [moisImportOverride, setMoisImportOverride] = useState('')
  const [netKeyInput,        setNetKeyInput]        = useState('')
  const [netKeyErr,          setNetKeyErr]          = useState(false)
  const [selectedId,         setSelectedId]         = useState(null)
  const inputRef = useRef()

  // Pré-détecter le mois dès la sélection des fichiers
  function onFilesSelected(fileList) {
    if (fileList.length > 0) {
      const detected = detectMoisFichier(fileList[0].name)
      setMoisImportOverride(detected)
    }
    handleFiles(fileList)
  }

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
          // Snapshot financier à conserver par mois pour les deltas
          const snap = {
            montantCommande:  fin.montantCommande,
            montantFacture:   fin.montantFacture,
            heuresRealisees:  fin.heuresRealisees,
            heuresPrevues:    fin.heuresPrevues,
            marge:            fin.marge,
            resteAFacturer:   fin.resteAFacturer,
          }
          if (existing) {
            const prevGestion = existing._gestion || {}
            updateAffaire(existing.id, {
              client:        fin.client        || existing.client,
              intitule:      fin.intitule      || existing.intitule,
              montantHT:     fin.montantCommande || existing.montantHT,
              heuresPrevues: fin.heuresPrevues || existing.heuresPrevues,
              _finance: { ...fin, importedMois: mois, importedAt: new Date().toISOString() },
              _gestion: {
                ...prevGestion,
                [mois]: {
                  facturationEnvisagee: prevGestion[mois]?.facturationEnvisagee ?? null,
                  commentaire:          prevGestion[mois]?.commentaire          ?? '',
                  pointFait:            prevGestion[mois]?.pointFait            ?? false,
                  _snap: snap,
                },
              },
            })
            updated++
          } else {
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
                [mois]: { facturationEnvisagee: null, commentaire: '', pointFait: false, _snap: snap },
              },
            })
            created++
          }
        }
        setMoisActif(mois)
      }
      const moisImportes = [...new Set(Array.from(fileList).map(f =>
        fmtMois(moisImportOverride || detectMoisFichier(f.name))
      ))].join(', ')
      setImportMsg(`✅ ${total} affaires traitées — ${created} créées, ${updated} mises à jour · Mois : ${moisImportes}`)
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

  // ── Collecte des mois disponibles (uniquement les mois avec données réelles) ──
  const moisDisponibles = useMemo(() => {
    const s = new Set()
    for (const a of affaires) {
      if (a._finance?.importedMois) s.add(a._finance.importedMois)
      if (a._gestion) Object.keys(a._gestion).forEach(m => s.add(m))
    }
    return [...s].sort((a, b) => b.localeCompare(a))
  }, [affaires])

  // ── Caler le mois actif sur le dernier import réel dès que dispo ────────────
  useEffect(() => {
    if (moisDisponibles.length > 0 && !moisDisponibles.includes(moisActif)) {
      setMoisActif(moisDisponibles[0])
    }
  }, [moisDisponibles])

  // ── Mois précédent (pour les deltas) ─────────────────────────────────────────
  const moisPrecedent = useMemo(() => {
    const sorted = [...moisDisponibles].sort((a, b) => a.localeCompare(b))
    const idx = sorted.indexOf(moisActif)
    return idx > 0 ? sorted[idx - 1] : null
  }, [moisDisponibles, moisActif])

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
      <div className="w-[480px] shrink-0 border-r border-slate-200 bg-white flex flex-col">

        {/* Contrôles */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          {/* Sélecteur mois actif */}
          <select value={moisActif} onChange={e => setMoisActif(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#E31E24]">
            {moisDisponibles.length === 0 && <option value={moisActif}>{fmtMois(moisActif)}</option>}
            {moisDisponibles.map(m => <option key={m} value={m}>{fmtMois(m)}</option>)}
          </select>

          {/* Import + mois override */}
          <div className="flex gap-2 items-center">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="text-xs text-slate-400">Mois d'import</div>
              <select value={moisImportOverride} onChange={e => setMoisImportOverride(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#E31E24]"
                style={moisImportOverride ? {} : { color: '#94a3b8' }}>
                <option value="">— Auto-détecté —</option>
                {(() => {
                  const opts = []
                  const now = new Date()
                  // De jan 2024 jusqu'au mois courant
                  const start = new Date(2024, 0, 1)
                  const end   = new Date(now.getFullYear(), now.getMonth(), 1)
                  const cur   = new Date(start)
                  while (cur <= end) {
                    const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`
                    opts.push(<option key={k} value={k}>{fmtMois(k)}</option>)
                    cur.setMonth(cur.getMonth() + 1)
                  }
                  return opts.reverse() // plus récent en premier
                })()}
              </select>
            </div>
            <button onClick={() => inputRef.current?.click()}
              className="px-3 py-2 text-xs font-semibold text-white rounded-lg whitespace-nowrap self-end"
              style={{ background: '#E31E24' }}>
              {importing ? '…' : '+ Import'}
            </button>
            <input ref={inputRef} type="file" multiple accept=".xlsx,.xlsm" className="hidden"
              onChange={e => onFilesSelected(e.target.files)} />
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
        <div className="flex-1 overflow-y-auto">
          <AffaireListeGroupee
            affaires={affairesFiltrees}
            caList={caList}
            moisActif={moisActif}
            moisPrecedent={moisPrecedent}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            groupByCA={isResponsable && !filtreCA}
          />
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

// ── Helpers delta ─────────────────────────────────────────────────────────────
function fmtK(v, sign = false) {
  if (v == null) return null
  const n = parseFloat(v); if (isNaN(n)) return null
  const abs = Math.abs(n)
  const str = abs >= 1_000_000 ? `${(n/1_000_000).toFixed(2)}M€`
            : abs >= 1000      ? `${(n/1000).toFixed(0)}k€`
            : `${Math.round(n)}€`
  return sign && n > 0 ? `+${str}` : str
}

function Delta({ label, curr, prev, inverse = false }) {
  if (curr == null || prev == null) return null
  const diff = curr - prev
  if (Math.abs(diff) < 1) return null
  const isPos = diff > 0
  // "inverse" = positif est mauvais (ex: heures dépassées)
  const isGood = inverse ? !isPos : isPos
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
      isGood ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
    }`}>
      {isPos ? '▲' : '▼'} {fmtK(Math.abs(diff))}
      {label && <span className="font-normal opacity-70 ml-0.5">{label}</span>}
    </span>
  )
}

// ── Ligne d'une affaire dans la liste ────────────────────────────────────────
function AffaireLigne({ a, moisActif, moisPrecedent, selectedId, setSelectedId }) {
  const gest  = a._gestion?.[moisActif]    || {}
  const gestP = a._gestion?.[moisPrecedent] || {}
  // Données financières : snapshot du mois sélectionné, sinon _finance (dernier import)
  const snapC = gest._snap  || null
  const snapP = gestP._snap || null
  const fin   = snapC || a._finance || {}

  const alerteMarge  = fin.marge != null && fin.marge < -1000
  const alerteHeures = fin.heuresRealisees > 0 && fin.heuresPrevues > 0
                    && fin.heuresRealisees > fin.heuresPrevues * 1.1
  const alerte = alerteMarge || alerteHeures
  const isSelected = selectedId === a.id

  // Détecter si quelque chose a évolué depuis le mois précédent
  const hasEvol = snapC && snapP && (
    Math.abs((snapC.montantFacture  || 0) - (snapP.montantFacture  || 0)) > 100 ||
    Math.abs((snapC.heuresRealisees || 0) - (snapP.heuresRealisees || 0)) > 0.5 ||
    Math.abs((snapC.marge          || 0) - (snapP.marge          || 0)) > 100
  )

  const hPct = fin.heuresPrevues > 0
    ? Math.min((fin.heuresRealisees / fin.heuresPrevues) * 100, 120) : null

  return (
    <div className={`mx-2 my-1.5 rounded-xl border transition-all cursor-pointer ${
      isSelected
        ? 'border-[#E31E24] bg-red-50 shadow-sm'
        : hasEvol
        ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300 hover:shadow-sm'
        : alerte
        ? 'border-red-200 bg-red-50/20 hover:border-red-300 hover:shadow-sm'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
    }`}
      onClick={() => setSelectedId(a.id)}>

      {/* ── En-tête de la card ── */}
      <div className={`flex items-center justify-between px-3 pt-2.5 pb-1 rounded-t-xl border-b ${
        isSelected ? 'border-[#E31E24]/20' : 'border-slate-100'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-mono font-bold text-xs shrink-0 ${isSelected ? 'text-[#E31E24]' : 'text-slate-700'}`}>
            {a.numero}
          </span>
          {alerte  && <span className="text-xs" title="Alerte dépassement">⚠️</span>}
          {gest.pointFait && <span className="text-green-600 text-xs font-bold">✓</span>}
          {hasEvol && !isSelected && (
            <span className="text-xs text-blue-500 font-semibold" title="Évolution vs mois précédent">↗</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {gest.facturationEnvisagee != null && (
            <span className="text-xs text-blue-700 font-semibold bg-blue-100 px-1.5 py-0.5 rounded">
              💳 {fmtK(gest.facturationEnvisagee)}
            </span>
          )}
          {fin.marge != null && fin.marge !== 0 && (
            <span className={`text-xs font-bold ${fin.marge < 0 ? 'text-red-500' : 'text-green-600'}`}>
              {fmtK(fin.marge)}
            </span>
          )}
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="px-3 pt-1.5 pb-2 space-y-1.5">
        {/* Intitulé + client */}
        <div>
          <div className="text-xs font-semibold text-slate-800 leading-snug truncate">{a.intitule || '—'}</div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-xs text-slate-400 truncate">{a.client || '—'}</span>
            {fin.montantCommande > 0 && (
              <span className="text-xs text-slate-500 font-medium shrink-0">{fmtK(fin.montantCommande)}</span>
            )}
          </div>
        </div>

        {/* Barre heures */}
        {hPct !== null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                style={{ width: `${Math.min(hPct,100)}%`, background: alerteHeures ? '#ef4444' : '#3b82f6' }} />
            </div>
            <span className={`text-xs shrink-0 font-medium ${alerteHeures ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
              {fin.heuresRealisees}h / {fin.heuresPrevues}h
            </span>
          </div>
        )}

        {/* Deltas vs mois précédent */}
        {snapC && snapP && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            <Delta curr={snapC.montantFacture}   prev={snapP.montantFacture}   label="fact." />
            <Delta curr={snapC.heuresRealisees}  prev={snapP.heuresRealisees}  label="h"  inverse={true} />
            <Delta curr={snapC.marge}            prev={snapP.marge}            label="marge" />
            <Delta curr={snapC.resteAFacturer}   prev={snapP.resteAFacturer}   label="RAF" inverse={true} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Liste groupée (par CA ou plate) ──────────────────────────────────────────
function AffaireListeGroupee({ affaires, caList, moisActif, moisPrecedent, selectedId, setSelectedId, groupByCA }) {
  if (!groupByCA) {
    return (
      <div className="py-1">
        {affaires.map(a => (
          <AffaireLigne key={a.id} a={a} moisActif={moisActif} moisPrecedent={moisPrecedent} selectedId={selectedId} setSelectedId={setSelectedId} />
        ))}
      </div>
    )
  }

  // Grouper par caId
  const groups = {}
  for (const a of affaires) {
    const key = a.caId || '__aucun__'
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }

  // Ordre : CA actifs d'abord, triés par nom
  const orderedKeys = Object.keys(groups).sort((ka, kb) => {
    const ca = caList.find(c => c.id === ka)
    const cb = caList.find(c => c.id === kb)
    if (!ca && !cb) return 0
    if (!ca) return 1
    if (!cb) return -1
    return ca.nom.localeCompare(cb.nom)
  })

  return (
    <div>
      {orderedKeys.map(key => {
        const ca = caList.find(c => c.id === key)
        const label = ca ? `${ca.prenom} ${ca.nom}` : 'Sans CA'
        const list  = groups[key]
        const nbVus = list.filter(a => a._gestion?.[moisActif]?.pointFait).length
        const nbAlerte = list.filter(a => {
          const fin = a._gestion?.[moisActif]?._snap || a._finance || {}
          return fin.marge < -1000 || (fin.heuresRealisees > 0 && fin.heuresPrevues > 0 && fin.heuresRealisees > fin.heuresPrevues * 1.1)
        }).length
        return (
          <div key={key}>
            {/* En-tête groupe CA */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-slate-100 border-y border-slate-200">
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-700 truncate">{label}</span>
                <span className="ml-2 text-xs text-slate-400">{list.length} affaire{list.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {nbAlerte > 0 && <span className="text-xs text-red-500 font-semibold">⚠️ {nbAlerte}</span>}
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  nbVus === list.length ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
                }`}>{nbVus}/{list.length}</span>
              </div>
            </div>
            <div className="py-1">
              {list.map(a => (
                <AffaireLigne key={a.id} a={a} moisActif={moisActif} moisPrecedent={moisPrecedent} selectedId={selectedId} setSelectedId={setSelectedId} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Détail d'une affaire ──────────────────────────────────────────────────────
function AffaireDetail({ affaire, mois, onUpdate, caList }) {
  const gest    = affaire._gestion?.[mois] || {}
  // Données financières : snapshot du mois sélectionné > dernier import
  const snap    = gest._snap || null
  const finBase = affaire._finance || {}         // toujours là (aFacturerSM, achats, commentaire…)
  const fin     = snap ? { ...finBase, ...snap } : finBase
  const dataSource = snap ? `données ${fmtMois(mois)}` : `dernier import (${fmtMois(finBase.importedMois) || '?'})`
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
              <span className={`text-xs px-2 py-0.5 rounded-lg border ${snap ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                📅 {dataSource}
              </span>
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
