import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

// ── Détection automatique du format ──────────────────────────────────────────
// Format ELS AND : ligne 0 vide, headers ligne 1, colonne "Client" en index 2
// Format SNF/TN  : headers ligne 0, pas de colonne "Client"

function detectFormat(rows) {
  // Cherche la ligne d'en-têtes (contient "N Chantier" ou "N° Chantier")
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    if (row.some(c => String(c).toLowerCase().includes('chantier'))) {
      const hasClient = row.some(c => String(c).toLowerCase() === 'client')
      return { headerRow: i, hasClient }
    }
  }
  return { headerRow: 1, hasClient: false }
}

function buildColMap(headerRow, hasClient) {
  // Colonnes communes (sans Client)
  const base = {
    numero:          0,
    intitule:        hasClient ? 3 : 2,
    client:          hasClient ? 2 : -1,
    caInitiales:     hasClient ? 5 : 4,
    montantCommande: hasClient ? 7 : 6,
    montantFacture:  hasClient ? 8 : 7,
    heuresPrevues:   hasClient ? 9 : 8,
    heuresRealisees: hasClient ? 10 : 9,
    achatsPrevus:    hasClient ? 11 : 10,
    achatsRealises:  hasClient ? 12 : 11,
    prixRevient:     hasClient ? 13 : 12,
    marge:           hasClient ? 14 : 13,
    resteAFacturer:  hasClient ? 16 : 15,
    aFacturer:       hasClient ? 18 : 17,
    aFacturerSM:     hasClient ? 20 : 19,
    pctAFacturer:    hasClient ? 21 : 20,
    commentaireExcel:hasClient ? 22 : 21,
    interlocuteur:   hasClient ? 23 : 22,
  }
  return base
}

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets['Synthese TN'] || wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        const { headerRow, hasClient } = detectFormat(rows)
        const COL = buildColMap(headerRow, hasClient)

        const affaires     = {}
        let   caInitiales  = ''

        for (let i = headerRow + 1; i < rows.length; i++) {
          const row    = rows[i]
          const numero = String(row[COL.numero] || '').trim()
          if (!numero || !numero.toUpperCase().startsWith('ELS')) continue

          const ca = String(row[COL.caInitiales] || '').trim()
          if (ca) caInitiales = ca

          // Interlocuteur = qui gère réellement l'affaire dans ce fichier
          const interlocuteur = String(row[COL.interlocuteur] || '').trim()

          affaires[numero] = {
            client:           COL.client >= 0 ? String(row[COL.client]   || '').trim() : '',
            intitule:         String(row[COL.intitule] || '').trim(),
            montantCommande:  num(row[COL.montantCommande]),
            montantFacture:   num(row[COL.montantFacture]),
            heuresPrevues:    num(row[COL.heuresPrevues]),
            heuresRealisees:  num(row[COL.heuresRealisees]),
            achatsPrevus:     num(row[COL.achatsPrevus]),
            achatsRealises:   num(row[COL.achatsRealises]),
            prixRevient:      num(row[COL.prixRevient]),
            marge:            num(row[COL.marge]),
            resteAFacturer:   num(row[COL.resteAFacturer]),
            aFacturer:        num(row[COL.aFacturer]),
            aFacturerSM:      num(row[COL.aFacturerSM]),
            pctAFacturer:     num(row[COL.pctAFacturer]),
            commentaireExcel: String(row[COL.commentaireExcel] || '').trim(),
            interlocuteur,
            caSource:         ca,
          }
        }

        resolve({ affaires, caInitiales, hasClient, headerRow, count: Object.keys(affaires).length })
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ── Détection du mois depuis le nom de fichier ────────────────────────────────
function detectMonthFromFilename(filename) {
  // "0426" → Avril 2026, "TN0426" → Avril 2026
  const m = filename.match(/(\d{2})(\d{2})(?:[_.]|$)/)
  if (m) return `20${m[2]}-${m[1].padStart(2, '0')}`
  return new Date().toISOString().slice(0, 7)
}

// ── Matching initiales → CA ───────────────────────────────────────────────────
// Gère 2 lettres (FB, YV, CC, RB) et 3 lettres (YCO)
function matchCaByInitiales(initiales, caList) {
  if (!initiales || !caList) return null
  const up = initiales.toUpperCase()
  return caList.find(ca => {
    const p = ca.prenom.toUpperCase()
    const n = ca.nom.toUpperCase().replace(/\s/g, '')
    // 2 lettres : P[0] + N[0]
    if (up.length === 2) return p[0] + n[0] === up
    // 3 lettres : P[0] + N[0..1]
    if (up.length === 3) return p[0] + n.slice(0, 2) === up
    return false
  }) || null
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
function fmtMois(mois) {
  if (!mois) return ''
  const [y, m] = mois.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function ImportExcel({ onImport, caList, forcedCaId }) {
  const [files,    setFiles]    = useState([]) // liste des fichiers à importer
  const [parsed,   setParsed]   = useState([]) // résultats parsés
  const [step,     setStep]     = useState('upload')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const inputRef = useRef()

  async function handleFiles(fileList) {
    const arr = Array.from(fileList)
    if (!arr.length) return
    setError('')
    setLoading(true)
    try {
      const results = await Promise.all(arr.map(async f => {
        const p    = await parseExcel(f)
        const mois = detectMonthFromFilename(f.name)
        const ca   = forcedCaId
          ? caList?.find(c => c.id === forcedCaId)
          : matchCaByInitiales(p.caInitiales, caList)
        return { file: f, ...p, mois, caId: ca?.id || '', caDetected: p.caInitiales }
      }))
      setParsed(results)
      setStep('preview')
    } catch (e) {
      setError('Erreur : ' + e.message)
    }
    setLoading(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  function updateParsed(idx, patch) {
    setParsed(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  function handleConfirm() {
    // Grouper par mois+CA et fusionner les affaires
    const groups = {}
    for (const p of parsed) {
      const ca  = caList?.find(c => c.id === p.caId)
      const ini = ca ? (p.caDetected || (ca.prenom[0] + ca.nom[0]).toUpperCase()) : p.caDetected
      const key = `${p.mois}__${ini}__${p.caId}`
      if (!groups[key]) groups[key] = { mois: p.mois, caInitiales: ini, caId: p.caId, affaires: {} }
      Object.assign(groups[key].affaires, p.affaires)
    }
    for (const g of Object.values(groups)) {
      onImport(g.mois, g.caInitiales, g.caId, g.affaires)
    }
    setStep('done')
  }

  // ── Écran résultat ────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">✅</div>
      <div className="text-lg font-semibold text-slate-800">Import réussi</div>
      <div className="text-sm text-slate-500 mt-2 space-y-1">
        {parsed.map((p, i) => {
          const ca = caList?.find(c => c.id === p.caId)
          return (
            <div key={i}>{p.file.name} → <strong>{ca ? ca.prenom + ' ' + ca.nom : p.caDetected}</strong> / {fmtMois(p.mois)} ({p.count} affaires)</div>
          )
        })}
      </div>
      <button onClick={() => { setStep('upload'); setParsed([]); setFiles([]) }}
        className="mt-6 px-5 py-2 text-sm font-bold text-white rounded-xl"
        style={{ background: '#E31E24' }}>
        Importer d'autres fichiers
      </button>
    </div>
  )

  // ── Prévisualisation ──────────────────────────────────────────────────────
  if (step === 'preview' && parsed.length) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('upload')} className="text-slate-400 hover:text-slate-600 text-sm">← Retour</button>
        <h3 className="text-base font-bold text-slate-800">{parsed.length} fichier{parsed.length > 1 ? 's' : ''} détecté{parsed.length > 1 ? 's' : ''}</h3>
      </div>

      {parsed.map((p, idx) => {
        const ca = caList?.find(c => c.id === p.caId)
        return (
          <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header fichier */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">📄 {p.file.name}</span>
              <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-500">{p.count} affaires</span>
              <span className="text-xs text-slate-400">Initiales détectées : <strong>{p.caDetected}</strong></span>
            </div>

            <div className="p-5 grid grid-cols-3 gap-4">
              {/* Mois */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Mois</label>
                <input type="month" value={p.mois} onChange={e => updateParsed(idx, { mois: e.target.value })}
                  className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24]" />
              </div>

              {/* CA */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Chargé d'affaires</label>
                {forcedCaId ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-sm text-slate-700 font-medium">
                    <span className="w-6 h-6 rounded-full bg-[#E31E24] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {ca?.prenom?.[0]}{ca?.nom?.[0]}
                    </span>
                    {ca?.prenom} {ca?.nom} <span className="ml-auto text-xs text-slate-400">🔒</span>
                  </div>
                ) : (
                  <select value={p.caId} onChange={e => updateParsed(idx, { caId: e.target.value })}
                    className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24]">
                    <option value="">— Sélectionner —</option>
                    {caList?.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}{!c.actif ? ' (ancien)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Aperçu 3 premières affaires */}
            <div className="border-t border-slate-100 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {['Numéro','Intitulé','Cmd €','Facturé €','H prévu','H réal.','Marge €','Commentaire'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.entries(p.affaires).slice(0, 3).map(([num, a]) => (
                    <tr key={num}>
                      <td className="px-3 py-2 font-bold text-[#E31E24] whitespace-nowrap">{num}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-48 truncate">{a.intitule}</td>
                      <td className="px-3 py-2 text-right text-slate-700 font-medium whitespace-nowrap">{a.montantCommande ? a.montantCommande.toLocaleString('fr-FR') + ' €' : '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">{a.montantFacture ? a.montantFacture.toLocaleString('fr-FR') + ' €' : '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{a.heuresPrevues || '—'}</td>
                      <td className={`px-3 py-2 text-right font-medium ${a.heuresRealisees > a.heuresPrevues && a.heuresPrevues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {a.heuresRealisees || '—'}
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${a.marge < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {a.marge ? a.marge.toLocaleString('fr-FR') + ' €' : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 max-w-36 truncate">{a.commentaireExcel || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {p.count > 3 && (
                <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-100">
                  + {p.count - 3} autres affaires…
                </div>
              )}
            </div>
          </div>
        )
      })}

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={() => setStep('upload')}
          className="px-5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
          Annuler
        </button>
        <button onClick={handleConfirm} disabled={parsed.some(p => !p.caId || !p.mois)}
          className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm disabled:opacity-40 transition-all"
          style={{ background: '#E31E24' }}>
          Confirmer l'import ({parsed.reduce((s, p) => s + p.count, 0)} affaires)
        </button>
      </div>
    </div>
  )

  // ── Upload ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-800">Import fichiers Excel</h3>
        <p className="text-sm text-slate-400 mt-1">
          Glissez un ou plusieurs fichiers en même temps — formats ELS AND et SNF/TN acceptés.
          <br />
          Pour un même CA avec plusieurs fichiers (ex: CC), importez-les ensemble : les affaires seront fusionnées.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-[#E31E24]/50 hover:bg-red-50/30 transition-all">
        <div className="text-4xl mb-3">📂</div>
        <div className="text-sm font-semibold text-slate-600">Glissez vos fichiers ici</div>
        <div className="text-xs text-slate-400 mt-1">ou cliquez pour sélectionner (.xlsm / .xlsx) — sélection multiple possible</div>
        <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="w-4 h-4 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
          Analyse des fichiers…
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">⚠️ {error}</div>
      )}
    </div>
  )
}
