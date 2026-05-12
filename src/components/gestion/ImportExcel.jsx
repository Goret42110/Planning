import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

// Colonnes attendues dans "Synthese TN" (index 0-based, ligne 1 = headers)
const COL = {
  numero:          0,
  client:          2,
  intitule:        3,
  caInitiales:     5,
  montantCommande: 7,
  montantFacture:  8,
  heuresPrevues:   9,
  heuresRealisees: 10,
  achatsPrevus:    11,
  achatsRealises:  12,
  prixRevient:     13,
  marge:           14,
  resteAFacturer:  16,
  aFacturer:       18,
  aFacturerSM:     20,
  pctAFacturer:    21,
  commentaireExcel:22,
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
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets['Synthese TN'] || wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Détecter ligne d'en-têtes (cherche "N Chantier" ou "N° Chantier")
        let headerRow = 1
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          if (String(rows[i][0]).toLowerCase().includes('chantier')) { headerRow = i; break }
        }

        const affaires = {}
        let caInitiales = ''

        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i]
          const numero = String(row[COL.numero] || '').trim()
          if (!numero || !numero.toUpperCase().startsWith('ELS')) continue

          const ca = String(row[COL.caInitiales] || '').trim()
          if (ca) caInitiales = ca

          affaires[numero] = {
            client:          String(row[COL.client]   || '').trim(),
            intitule:        String(row[COL.intitule] || '').trim(),
            montantCommande: num(row[COL.montantCommande]),
            montantFacture:  num(row[COL.montantFacture]),
            heuresPrevues:   num(row[COL.heuresPrevues]),
            heuresRealisees: num(row[COL.heuresRealisees]),
            achatsPrevus:    num(row[COL.achatsPrevus]),
            achatsRealises:  num(row[COL.achatsRealises]),
            prixRevient:     num(row[COL.prixRevient]),
            marge:           num(row[COL.marge]),
            resteAFacturer:  num(row[COL.resteAFacturer]),
            aFacturer:       num(row[COL.aFacturer]),
            aFacturerSM:     num(row[COL.aFacturerSM]),
            pctAFacturer:    num(row[COL.pctAFacturer]),
            commentaireExcel:String(row[COL.commentaireExcel] || '').trim(),
          }
        }

        resolve({ affaires, caInitiales, count: Object.keys(affaires).length })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// Détecter mois depuis le nom du fichier ex: "Facturation FB 0426.xlsm" → "2026-04"
function detectMonthFromFilename(filename) {
  const m = filename.match(/(\d{2})(\d{2})/)
  if (m) {
    const month = m[1].padStart(2, '0')
    const year  = '20' + m[2]
    return `${year}-${month}`
  }
  return new Date().toISOString().slice(0, 7)
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function fmtMois(mois) {
  if (!mois) return ''
  const [y, m] = mois.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

export default function ImportExcel({ onImport, caList }) {
  const [step,        setStep]        = useState('upload') // upload | preview | done
  const [file,        setFile]        = useState(null)
  const [parsed,      setParsed]      = useState(null)
  const [mois,        setMois]        = useState('')
  const [caId,        setCaId]        = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const inputRef = useRef()

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setError('')
    setLoading(true)
    try {
      const result = await parseExcel(f)
      setParsed(result)
      setMois(detectMonthFromFilename(f.name))
      // Auto-match CA par initiales
      if (result.caInitiales && caList) {
        const found = caList.find(ca => {
          const initials = (ca.prenom[0] + ca.nom[0]).toUpperCase()
          return initials === result.caInitiales.toUpperCase()
        })
        if (found) setCaId(found.id)
      }
      setStep('preview')
    } catch (e) {
      setError('Erreur de lecture du fichier : ' + e.message)
    }
    setLoading(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleConfirm() {
    if (!parsed || !mois) return
    const ca = caList?.find(c => c.id === caId)
    const caInitiales = ca ? (ca.prenom[0] + ca.nom[0]).toUpperCase() : parsed.caInitiales
    onImport(mois, caInitiales, caId, parsed.affaires)
    setStep('done')
  }

  // Aperçu des 5 premières affaires
  const previewAffaires = parsed ? Object.entries(parsed.affaires).slice(0, 5) : []

  if (step === 'done') return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">✅</div>
      <div className="text-lg font-semibold text-slate-800">Import réussi</div>
      <div className="text-sm text-slate-500 mt-1">{parsed.count} affaires importées pour {fmtMois(mois)}</div>
      <button onClick={() => { setStep('upload'); setParsed(null); setFile(null) }}
        className="mt-6 px-5 py-2 text-sm font-semibold text-white rounded-xl"
        style={{ background: '#E31E24' }}>
        Importer un autre fichier
      </button>
    </div>
  )

  if (step === 'preview' && parsed) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('upload')} className="text-slate-400 hover:text-slate-600 text-sm">← Retour</button>
        <h3 className="text-base font-bold text-slate-800">Aperçu de l'import</h3>
      </div>

      {/* Infos détectées */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Affaires détectées</div>
          <div className="text-2xl font-bold text-slate-800">{parsed.count}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mois</div>
          <div className="flex gap-2 items-center">
            <input type="month" value={mois} onChange={e => setMois(e.target.value)}
              className="border-2 border-slate-100 rounded-xl px-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24]" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            CA <span className="text-slate-300 font-normal">(détecté : {parsed.caInitiales})</span>
          </div>
          <select value={caId} onChange={e => setCaId(e.target.value)}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24]">
            <option value="">— Sélectionner —</option>
            {caList?.map(ca => (
              <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom} ({(ca.prenom[0]+ca.nom[0]).toUpperCase()})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Aperçu table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Aperçu — 5 premières affaires
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                {['Numéro','Client','Cmd €','Facturé €','H prévu','H réal.','Mat. prévu','Mat. réal.','Marge €','Commentaire'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {previewAffaires.map(([num, a]) => (
                <tr key={num} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-[#E31E24]">{num}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-32 truncate">{a.client}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-700">{a.montantCommande.toLocaleString('fr-FR')} €</td>
                  <td className="px-3 py-2 text-right text-slate-600">{a.montantFacture ? a.montantFacture.toLocaleString('fr-FR') + ' €' : '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{a.heuresPrevues}h</td>
                  <td className={`px-3 py-2 text-right font-medium ${a.heuresRealisees > a.heuresPrevues ? 'text-red-600' : 'text-green-600'}`}>
                    {a.heuresRealisees}h
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{a.achatsPrevus.toLocaleString('fr-FR')} €</td>
                  <td className={`px-3 py-2 text-right font-medium ${a.achatsRealises > a.achatsPrevus ? 'text-red-600' : 'text-green-600'}`}>
                    {a.achatsRealises.toLocaleString('fr-FR')} €
                  </td>
                  <td className={`px-3 py-2 text-right font-bold ${a.marge < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {a.marge.toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-3 py-2 text-slate-400 max-w-40 truncate">{a.commentaireExcel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsed.count > 5 && (
          <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-100">
            + {parsed.count - 5} autres affaires…
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => setStep('upload')}
          className="px-5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
          Annuler
        </button>
        <button onClick={handleConfirm} disabled={!mois}
          className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm disabled:opacity-40"
          style={{ background: '#E31E24' }}>
          Confirmer l'import — {fmtMois(mois)}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-800">Import fichier Excel</h3>
      <p className="text-sm text-slate-500">Glissez le fichier mensuel de facturation (format : <code className="bg-slate-100 px-1 rounded">Facturation FB 0426.xlsm</code>)</p>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-[#E31E24]/50 hover:bg-red-50/30 transition-all">
        <div className="text-4xl mb-3">📂</div>
        <div className="text-sm font-semibold text-slate-600">Glissez votre fichier ici</div>
        <div className="text-xs text-slate-400 mt-1">ou cliquez pour sélectionner (.xlsm / .xlsx)</div>
        <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="w-4 h-4 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
          Analyse du fichier…
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
