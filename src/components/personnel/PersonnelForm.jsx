import { useState } from 'react'
import { useApp } from '../../App'

const QUALIFS_ELS  = ['RES','CA','ACA','CE','AP','EL','CDD','SGT','Stagiaire']
const QUALIFS_INT  = ['INT','EL','AP','CE','Stagiaire']
const QUALIFS_SST  = ['CE','AP','EL','SGT','Stagiaire']
const ROLES        = ['RS','CA','TECH']
const TYPES        = ['ELS','Intérimaire','Sous-traitant']

function getQualifs(type) {
  if (type === 'Intérimaire')   return QUALIFS_INT
  if (type === 'Sous-traitant') return QUALIFS_SST
  return QUALIFS_ELS
}

export default function PersonnelForm({ person, onClose }) {
  const { addPerson, updatePerson } = useApp()
  const [form, setForm] = useState({
    nom: '', prenom: '', type: 'ELS', qualification: 'EL', role: 'TECH', societe: '', actif: true,
    ...(person || {}),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTypeChange = (type) => {
    const qualifs = getQualifs(type)
    set('type', type)
    if (!qualifs.includes(form.qualification)) set('qualification', qualifs[0])
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.nom.trim()) return
    person ? updatePerson(person.id, form) : addPerson(form)
    onClose()
  }

  const qualifs = getQualifs(form.type)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-slate-900 font-semibold">{person ? 'Modifier' : 'Nouveau collaborateur'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">✕</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Prénom *</label>
              <input className="input-dark w-full" value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Yann" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Nom *</label>
              <input className="input-dark w-full" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="VICTORINO" required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Type</label>
              <select className="input-dark w-full" value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Qualification</label>
              <select className="input-dark w-full" value={form.qualification} onChange={e => set('qualification', e.target.value)}>
                {qualifs.map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Rôle</label>
              <select className="input-dark w-full" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {(form.type === 'Intérimaire' || form.type === 'Sous-traitant') && (
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Société / Agence</label>
              <input className="input-dark w-full" value={form.societe} onChange={e => set('societe', e.target.value)} placeholder="Manpower, ..." />
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-700">Actif</label>
            <button type="button" onClick={() => set('actif', !form.actif)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.actif ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}
