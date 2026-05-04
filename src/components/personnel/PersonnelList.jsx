import { useState } from 'react'
import { useApp } from '../../App'
import { PERSON_TYPE_COLORS, QUALIF_CLASS } from '../../utils/colors'
import PersonnelForm from './PersonnelForm'

const SUBTABS = [
  { id: 'ELS',           label: 'ELS' },
  { id: 'Intérimaire',   label: 'Intérimaires' },
  { id: 'Sous-traitant', label: 'Sous-traitants' },
]

const ROLE_LABEL = { RS: 'RS', CA: 'CA', TECH: 'Technicien' }

function Avatar({ person }) {
  const tc = PERSON_TYPE_COLORS[person.type] || { bg: '#94a3b8', text: '#fff' }
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
      style={{ background: tc.bg, color: tc.text }}>
      {person.prenom[0]}{person.nom[0]}
    </div>
  )
}

export default function PersonnelList() {
  const { personnel, deletePerson, updatePerson } = useApp()
  const [subTab, setSubTab]   = useState('ELS')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const list = personnel.filter(p => p.type === subTab)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1">
          {SUBTABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                subTab === t.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {t.label}
              <span className="ml-1.5 text-xs opacity-60">{personnel.filter(p => p.type === t.id).length}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">+ Ajouter</button>
      </div>

      <div className="space-y-2">
        {list.map(p => (
          <div key={p.id}
            className={`bg-white rounded-xl px-4 py-3 flex items-center gap-4 border transition-colors ${
              p.actif ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 opacity-50'
            }`}
          >
            <Avatar person={p} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-900 font-semibold text-sm">{p.prenom} {p.nom}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${QUALIF_CLASS[p.qualification] || 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                  {p.qualification}
                </span>
                <span className="text-slate-400 text-xs">{ROLE_LABEL[p.role] || p.role}</span>
              </div>
              {p.societe && <div className="text-slate-400 text-xs mt-0.5">{p.societe}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => updatePerson(p.id, { actif: !p.actif })}
                className={`w-9 h-5 rounded-full transition-colors relative ${p.actif ? 'bg-blue-600' : 'bg-slate-300'}`}
                title={p.actif ? 'Désactiver' : 'Activer'}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.actif ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">✏️</button>
              <button onClick={() => { if (confirm(`Supprimer ${p.prenom} ${p.nom} ?`)) deletePerson(p.id) }}
                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-center text-slate-400 py-16">Aucun collaborateur dans cette catégorie.</div>
        )}
      </div>

      {creating && <PersonnelForm onClose={() => setCreating(false)} />}
      {editing  && <PersonnelForm person={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
