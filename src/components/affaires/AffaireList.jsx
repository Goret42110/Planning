import { useState } from 'react'
import { useApp } from '../../App'
import { getAffaireColor } from '../../utils/colors'
import AffaireForm from './AffaireForm'

const STATUT_CLS = {
  'active':     'bg-green-100 text-green-700 border border-green-300',
  'en attente': 'bg-amber-100 text-amber-700 border border-amber-300',
  'terminée':   'bg-slate-100 text-slate-500 border border-slate-300',
}

export default function AffaireList() {
  const { affaires, personnel, deleteAffaire, selectedCA } = useApp()
  const [search, setSearch]     = useState('')
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)

  const filtered = affaires.filter(a => {
    if (selectedCA && a.caId !== selectedCA) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.numero.toLowerCase().includes(q) || a.intitule.toLowerCase().includes(q) || (a.client || '').toLowerCase().includes(q)
  })

  const getCAName = (caId) => {
    const ca = personnel.find(p => p.id === caId)
    return ca ? `${ca.prenom} ${ca.nom}` : '—'
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-slate-900 font-semibold text-lg">
          Affaires <span className="text-slate-400 font-normal text-sm ml-2">{filtered.length}</span>
        </h2>
        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…" className="input-dark text-sm w-52" />
          <button onClick={() => setCreating(true)} className="btn-primary">+ Nouvelle affaire</button>
        </div>
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
              <div className="text-right shrink-0">
                <div className="text-amber-600 text-sm font-medium">{getCAName(a.caId)}</div>
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
