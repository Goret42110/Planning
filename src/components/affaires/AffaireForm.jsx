import { useState } from 'react'
import { useApp } from '../../App'
import { useAuth } from '../../context/AuthContext'

const STATUTS = ['active', 'en attente', 'terminée', 'perdue']

export default function AffaireForm({ affaire, onClose }) {
  const { personnel, addAffaire, updateAffaire } = useApp()
  const { session } = useAuth()
  const caList = personnel.filter(p => (p.role === 'CA' || p.role === 'RS') && p.actif)
  const isCA = session?.role === 'ca'

  const [form, setForm] = useState({
    numero: '', intitule: '', client: '', adresse: '',
    heuresPrevues: '', montantHT: '', probabilite: 100,
    caId: isCA ? session.id : (caList[0]?.id || ''),
    statut: 'active', dateDebut: '', dateFin: '',
    ...(affaire || {}),
    // CA ne peut pas changer le caId, même en édition
    ...(isCA ? { caId: session.id } : {}),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.numero.trim() || !form.intitule.trim()) return
    affaire ? updateAffaire(affaire.id, form) : addAffaire(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-slate-900 font-semibold">{affaire ? "Modifier l'affaire" : 'Nouvelle affaire'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">✕</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Montant HT (€)</label>
              <input type="number" className="input-dark w-full" value={form.montantHT} onChange={e => set('montantHT', e.target.value)} placeholder="50000" />
            </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Date début chantier</label>
              <input type="date" className="input-dark w-full" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Date fin chantier</label>
              <input type="date" className="input-dark w-full" value={form.dateFin} onChange={e => set('dateFin', e.target.value)} />
            </div>
          </div>
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
