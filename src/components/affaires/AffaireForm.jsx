import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../App'
import { useAuth } from '../../context/AuthContext'
import { utilisateurs as BASE_USERS } from '../../data/utilisateurs'

const STATUTS = ['active', 'en attente', 'terminée', 'perdue']
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']

function getAuthUsers() {
  try { const s = localStorage.getItem('els_utilisateurs'); if (s) return JSON.parse(s) } catch {}
  return BASE_USERS
}

// Génère la liste des mois YYYY-MM entre deux dates
function getMoisRange(dateDebut, dateFin) {
  if (!dateDebut || !dateFin) return []
  // Extraire uniquement YYYY-MM des dates complètes (ex: "2026-01-15" → "2026-01")
  const start = new Date(dateDebut.slice(0, 7) + '-01')
  const end   = new Date(dateFin.slice(0, 7)   + '-01')
  if (isNaN(start) || isNaN(end) || start > end) return []
  const mois = []
  const cur = new Date(start)
  while (cur <= end) {
    mois.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return mois
}

// Répartition linéaire équitable
function repartitionLineaire(mois) {
  if (!mois.length) return {}
  const pct = Math.round(100 / mois.length)
  const rep = {}
  mois.forEach((m, i) => { rep[m] = i === mois.length - 1 ? 100 - pct * (mois.length - 1) : pct })
  return rep
}

function fmtMois(m) {
  const [y, mo] = m.split('-')
  return `${MONTHS_FR[parseInt(mo) - 1]} ${y.slice(2)}`
}

// ── Section répartition mensuelle ─────────────────────────────────────────────
function RepartitionMensuelle({ dateDebut, dateFin, value, onChange }) {
  const mois = useMemo(() => getMoisRange(dateDebut, dateFin), [dateDebut, dateFin])

  // Initialiser si mois change et valeur vide/invalide
  useEffect(() => {
    if (!mois.length) return
    const hasAll = mois.every(m => value?.[m] !== undefined)
    if (!hasAll) onChange(repartitionLineaire(mois))
  }, [mois.join(',')])

  if (!mois.length) return (
    <div className="text-xs text-slate-400 italic">Définissez les dates de début et fin pour saisir la répartition</div>
  )

  const total    = mois.reduce((s, m) => s + (parseFloat(value?.[m]) || 0), 0)
  const totalOk  = Math.abs(total - 100) < 0.5
  const totalErr = total > 100.5

  function setMois(m, v) {
    const n = Math.max(0, Math.min(100, parseFloat(v) || 0))
    onChange({ ...(value || {}), [m]: n })
  }

  function doLineaire() { onChange(repartitionLineaire(mois)) }

  function doReset0(m) { setMois(m, 0) }

  return (
    <div className="space-y-3">
      {/* En-tête + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${totalOk ? 'bg-green-100 text-green-700' : totalErr ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
            Total : {Math.round(total * 10) / 10} %
          </span>
          {!totalOk && <span className="text-xs text-slate-400">{totalOk ? '✓' : `(manque ${Math.round((100 - total) * 10) / 10} %)`}</span>}
        </div>
        <button type="button" onClick={doLineaire}
          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-colors">
          ↔ Répartition linéaire
        </button>
      </div>

      {/* Grille des mois */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(mois.length, 6)}, 1fr)` }}>
        {mois.map(m => {
          const v   = parseFloat(value?.[m]) || 0
          const off = v === 0
          return (
            <div key={m} className={`rounded-xl border p-2 text-center transition-colors ${off ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-semibold text-slate-500 mb-1.5">{fmtMois(m)}</div>
              {/* Barre visuelle */}
              <div className="h-16 bg-slate-100 rounded-lg relative mb-1.5 overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-200"
                  style={{ height: `${v}%`, background: off ? '#e2e8f0' : '#E31E24', opacity: off ? 0.4 : 0.8 }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold ${off ? 'text-slate-400' : 'text-slate-700'}`}>{v}%</span>
                </div>
              </div>
              {/* Input */}
              <input
                type="number" min="0" max="100" step="1"
                value={v === 0 ? '' : v}
                onChange={e => setMois(m, e.target.value)}
                placeholder="0"
                className="w-full text-center text-xs border border-slate-200 rounded-lg px-1 py-1 focus:outline-none focus:border-[#E31E24] bg-white"
              />
              {v > 0 && (
                <button type="button" onClick={() => doReset0(m)}
                  className="mt-1 text-xs text-slate-300 hover:text-red-400 transition-colors">✕ Arrêt</button>
              )}
            </div>
          )
        })}
      </div>

      {totalErr && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          ⚠️ Le total dépasse 100 %. Ajustez les valeurs.
        </div>
      )}
      {!totalOk && !totalErr && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Le total est de {Math.round(total * 10) / 10} % — ajustez pour atteindre 100 %.
        </div>
      )}
    </div>
  )
}

// ── Formulaire principal ──────────────────────────────────────────────────────
export default function AffaireForm({ affaire, onClose }) {
  const { personnel, addAffaire, updateAffaire } = useApp()
  const { session } = useAuth()
  const isCA    = session?.role === 'ca'
  const isAdmin = session?.role === 'responsable'

  const planningCA = personnel.filter(p => (p.role === 'CA' || p.role === 'RS') && p.actif)
  const authResp   = getAuthUsers()
    .filter(u => u.role === 'responsable' && !personnel.find(p => p.id === u.id))
    .map(u => ({ id: u.id, prenom: u.prenom, nom: u.nom }))
  const caList = [...planningCA, ...authResp]

  const [form, setForm] = useState({
    numero: '', intitule: '', client: '', adresse: '',
    heuresPrevues: '', montantHT: '', probabilite: 100,
    caId: isCA ? session.id : (caList[0]?.id || ''),
    statut: 'active', dateDebut: '', dateFin: '',
    repartitionMensuelle: null,
    ...(affaire || {}),
    ...(isCA ? { caId: session.id } : {}),
  })

  const [showRepartition, setShowRepartition] = useState(
    !!(affaire?.repartitionMensuelle || (affaire?.dateDebut && affaire?.dateFin))
  )

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.numero.trim() || !form.intitule.trim()) return
    const data = { ...form }
    // Nettoyer la répartition si pas de dates
    if (!data.dateDebut || !data.dateFin) data.repartitionMensuelle = null
    affaire ? updateAffaire(affaire.id, data) : addAffaire(data)
    onClose()
  }

  const hasDates = !!(form.dateDebut && form.dateFin)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl w-full border border-slate-200 shadow-2xl my-4 ${showRepartition && hasDates ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-slate-900 font-semibold">{affaire ? "Modifier l'affaire" : 'Nouvelle affaire'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">✕</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {/* Infos de base */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">N° Affaire *</label>
              <input className="input-dark w-full" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="ELS2412128" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Statut</label>
              <select className="input-dark w-full" value={form.statut} onChange={e => set('statut', e.target.value)}>
                {STATUTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1 font-medium">Intitulé *</label>
            <input className="input-dark w-full" value={form.intitule} onChange={e => set('intitule', e.target.value)} placeholder="STEP CLERMONT" required />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1 font-medium">Client</label>
            <input className="input-dark w-full" value={form.client} onChange={e => set('client', e.target.value)} placeholder="SUEZ" />
          </div>

          <div className={`grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {isAdmin && (
              <div>
                <label className="block text-xs text-slate-500 mb-1 font-medium">Montant HT (€)</label>
                <input type="number" className="input-dark w-full" value={form.montantHT} onChange={e => set('montantHT', e.target.value)} placeholder="50000" />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Heures prévues</label>
              <input type="number" className="input-dark w-full" value={form.heuresPrevues} onChange={e => set('heuresPrevues', e.target.value)} placeholder="500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Probabilité (%)</label>
              <select className="input-dark w-full" value={form.probabilite} onChange={e => set('probabilite', Number(e.target.value))}>
                {[10, 15, 20, 25, 30, 50, 75, 100].map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1 font-medium">Adresse</label>
            <input className="input-dark w-full" value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Clermont-Ferrand (63)" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Date début chantier</label>
              <input type="date" className="input-dark w-full" value={form.dateDebut}
                onChange={e => { set('dateDebut', e.target.value); set('repartitionMensuelle', null) }} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Date fin chantier</label>
              <input type="date" className="input-dark w-full" value={form.dateFin}
                onChange={e => { set('dateFin', e.target.value); set('repartitionMensuelle', null) }} />
            </div>
          </div>

          {/* Bouton répartition */}
          {hasDates && (
            <button type="button"
              onClick={() => setShowRepartition(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                showRepartition
                  ? 'bg-red-50 border-[#E31E24]/30 text-[#E31E24]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              <span>📊 Répartition mensuelle de la production</span>
              <span className="text-xs">
                {form.repartitionMensuelle
                  ? '✓ Personnalisée'
                  : 'Linéaire par défaut'
                } {showRepartition ? '▲' : '▼'}
              </span>
            </button>
          )}

          {/* Section répartition */}
          {showRepartition && hasDates && (
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
              <RepartitionMensuelle
                dateDebut={form.dateDebut}
                dateFin={form.dateFin}
                value={form.repartitionMensuelle}
                onChange={rep => set('repartitionMensuelle', rep)}
              />
            </div>
          )}

          {!isCA && (
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Chargé d'affaire</label>
              <select className="input-dark w-full" value={form.caId} onChange={e => set('caId', e.target.value)}>
                <option value="">— Aucun —</option>
                {caList.map(ca => <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}
