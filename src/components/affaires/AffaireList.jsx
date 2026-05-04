import { useState } from 'react'
import { useApp } from '../../App'
import { getAffaireColor } from '../../utils/colors'
import AffaireForm from './AffaireForm'

const STATUT_CLS = {
  'active':     'bg-green-100 text-green-700 border border-green-300',
  'en attente': 'bg-amber-100 text-amber-700 border border-amber-300',
  'terminée':   'bg-slate-100 text-slate-500 border border-slate-300',
  'perdue':     'bg-red-100 text-red-600 border border-red-300',
}

const FILTRES = [
  { key: 'all',        label: 'Toutes' },
  { key: 'active',     label: 'Actives' },
  { key: 'en attente', label: 'En attente' },
  { key: 'terminée',   label: 'Terminées' },
  { key: 'perdue',     label: 'Perdues' },
]

export default function AffaireList() {
  const { affaires, personnel, deleteAffaire, selectedCA } = useApp()
  const [search, setSearch]     = useState('')
  const [filtre, setFiltre]     = useState('all')
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)

  const filtered = affaires.filter(a => {
    if (selectedCA && a.caId !== selectedCA) return false
    if (filtre !== 'all' && a.statut !== filtre) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.numero.toLowerCase().includes(q) || a.intitule.toLowerCase().includes(q) || (a.client || '').toLowerCase().includes(q)
  })

  const getCAName = (caId) => {
    const ca = personnel.find(p => p.id === caId)
    return ca ? `${ca.prenom} ${ca.nom}` : '—'
  }

  const countByStatut = (s) => affaires.filter(a => (!selectedCA || a.caId === selectedCA) && a.statut === s).length

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-slate-900 font-semibold text-lg">
          Affaires <span className="text-slate-400 font-normal text-sm ml-2">{filtered.length}</span>
        </h2>
        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…" className="input-dark text-sm w-52" />
          <button onClick={() => setCreating(true)} className="btn-primary">+ Nouvelle affaire</button>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {FILTRES.map(f => (
          <button key={f.key} onClick={() => setFiltre(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtre === f.key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}>
            {f.label}
            {f.key !== 'all' && <span className="ml-1.5 opacity-60">{countByStatut(f.key)}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(a => {
          const c = getAffaireColor(a.colorIndex)
          return (
            <div key={a.id}
              className="bg-white rounded-xl px-5 py-3.5 flex items-center gap-4 border border-slate-200 hover:border-slate-300 transition-colors"
              style={{ borderLeft: `4px solid ${c.border}` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-slate-900">{a.numero}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUT_CLS[a.statut]}`}>{a.statut}</span>
                </div>
                <div className="text-slate-700 text-sm mt-0.5 font-medium">{a.intitule}</div>
                <div className="text-slate-400 text-xs mt-0.5">{a.client}{a.adresse ? ` — ${a.adresse}` : ''}</div>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <div className="text-amber-600 text-sm font-medium">{getCAName(a.caId)}</div>
                {a.montantHT > 0 && <div className="text-slate-700 text-xs font-semibold">{Number(a.montantHT).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</div>}
                {a.probabilite != null && (
                  <div className={`text-xs font-bold px-1.5 py-0.5 rounded inline-block ${a.probabilite === 100 ? 'bg-green-100 text-green-700' : a.probabilite >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                    {a.probabilite}%
                  </div>
                )}
                {a.heuresPrevues && <div className="text-slate-400 text-xs">{a.heuresPrevues}h prévues</div>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(a)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-sm">✏️</button>
                <button onClick={() => { if (confirm(`Supprimer ${a.numero} ?`)) deleteAffaire(a.id) }}
                  className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors text-sm">🗑️</button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center text-slate-400 py-16">Aucune affaire.</div>
        )}
      </div>

      {creating && <AffaireForm onClose={() => setCreating(false)} />}
      {editing  && <AffaireForm affaire={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
