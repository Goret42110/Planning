import { useState, useMemo } from 'react'
import { useApp } from '../../App'
import { useAuth } from '../../context/AuthContext'
import { useNotes } from '../../hooks/useNotes'

const TYPES = [
  { id: 'rdv',    label: 'RDV',       icon: '📅', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'appel',  label: 'Appel',     icon: '📞', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'email',  label: 'E-mail',    icon: '✉️',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'note',   label: 'Note',      icon: '📝', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'alerte', label: 'Alerte',    icon: '⚠️',  color: 'bg-red-100 text-red-700 border-red-200' },
]

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate().toString().padStart(2,'0')} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

function monthKey(dateStr) {
  if (!dateStr) return ''
  return dateStr.slice(0, 7) // "2026-05"
}

function monthLabel(mk) {
  const [y, m] = mk.split('-')
  return `${MONTHS_FR[parseInt(m) - 1]} ${y}`
}

// ── Formulaire ajout/édition note ─────────────────────────────────────────────
function NoteForm({ initial, onSave, onCancel, auteur }) {
  const today = new Date().toISOString().slice(0, 10)
  const [type,        setType]        = useState(initial?.type        || 'rdv')
  const [date,        setDate]        = useState(initial?.date        || today)
  const [contenu,     setContenu]     = useState(initial?.contenu     || '')
  const [prochainRdv, setProchainRdv] = useState(initial?.prochainRdv || '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!contenu.trim()) return
    onSave({ type, date, contenu: contenu.trim(), prochainRdv: prochainRdv || null, auteur })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">{initial ? 'Modifier la note' : 'Nouvelle note'}</h4>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
      </div>

      {/* Type */}
      <div className="flex gap-2 flex-wrap">
        {TYPES.map(t => (
          <button type="button" key={t.id}
            onClick={() => setType(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              type === t.id ? t.color + ' ring-2 ring-offset-1 ring-current/30' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Date + Prochain RDV */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prochain RDV</label>
          <input type="date" value={prochainRdv} onChange={e => setProchainRdv(e.target.value)}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24]" />
        </div>
      </div>

      {/* Contenu */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Compte-rendu</label>
        <textarea value={contenu} onChange={e => setContenu(e.target.value)} required
          rows={4} placeholder="Notes, décisions, points d'action…"
          className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24] resize-none placeholder-slate-300" />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium">
          Annuler
        </button>
        <button type="submit"
          className="px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all"
          style={{ background: '#E31E24' }}>
          {initial ? 'Mettre à jour' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

// ── Carte note ────────────────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete }) {
  const typeInfo = TYPES.find(t => t.id === note.type) || TYPES[3]
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${typeInfo.color}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
          <span className="text-xs text-slate-500 font-medium">{fmtDate(note.date)}</span>
          {note.auteur && (
            <span className="text-xs text-slate-400">par {note.auteur}</span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(note)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xs">✏️</button>
          {confirm
            ? <button onClick={() => onDelete(note.id)}
                className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-200">Confirmer</button>
            : <button onClick={() => setConfirm(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors text-xs">🗑️</button>
          }
        </div>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.contenu}</p>

      {note.prochainRdv && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
          <span>📅</span>
          <span>Prochain RDV : <strong>{fmtDate(note.prochainRdv)}</strong></span>
        </div>
      )}
    </div>
  )
}

// ── Panneau notes d'une affaire ───────────────────────────────────────────────
function PanneauNotes({ affaire, personnel, notes, onAdd, onUpdate, onDelete, auteur }) {
  const [adding,  setAdding]  = useState(false)
  const [editing, setEditing] = useState(null)

  const ca = personnel.find(p => p.id === affaire.caId)

  // Grouper par mois
  const grouped = useMemo(() => {
    if (!notes.length) return []
    const byMonth = {}
    for (const n of notes) {
      const mk = monthKey(n.date)
      if (!byMonth[mk]) byMonth[mk] = []
      byMonth[mk].push(n)
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mk, ns]) => ({ mk, label: monthLabel(mk), notes: ns }))
  }, [notes])

  function handleAdd(data) {
    onAdd(affaire.id, data)
    setAdding(false)
  }

  function handleUpdate(data) {
    onUpdate(affaire.id, editing.id, data)
    setEditing(null)
  }

  // Prochain RDV global
  const prochainRdv = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return notes
      .filter(n => n.prochainRdv && n.prochainRdv >= today)
      .sort((a, b) => a.prochainRdv.localeCompare(b.prochainRdv))[0]?.prochainRdv
  }, [notes])

  return (
    <div className="flex flex-col h-full">
      {/* En-tête affaire */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#E31E24] bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                {affaire.numero}
              </span>
              {affaire.probabilite && affaire.probabilite < 100 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                  {affaire.probabilite}%
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 text-sm leading-snug">{affaire.intitule}</h3>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
              {affaire.client && <span>🏢 {affaire.client}</span>}
              {ca && <span>👤 {ca.prenom} {ca.nom}</span>}
              {affaire.montantHT && <span>💰 {Math.round(affaire.montantHT / 1000)}k€</span>}
            </div>
          </div>
          {prochainRdv && (
            <div className="shrink-0 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 text-right">
              <div className="font-semibold">Prochain RDV</div>
              <div className="font-bold text-sm">{fmtDate(prochainRdv)}</div>
            </div>
          )}
        </div>
        <div className="mt-3">
          {!adding && !editing && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all"
              style={{ background: '#E31E24' }}>
              + Ajouter une note / RDV
            </button>
          )}
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Formulaire ajout */}
        {adding && (
          <NoteForm auteur={auteur} onSave={handleAdd} onCancel={() => setAdding(false)} />
        )}

        {/* Formulaire édition */}
        {editing && (
          <NoteForm initial={editing} auteur={auteur} onSave={handleUpdate} onCancel={() => setEditing(null)} />
        )}

        {/* Notes groupées par mois */}
        {grouped.length === 0 && !adding && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm font-medium">Aucune note pour cette affaire</div>
            <div className="text-xs mt-1">Cliquez sur "+ Ajouter une note / RDV" pour commencer</div>
          </div>
        )}

        {grouped.map(({ mk, label, notes: groupNotes }) => (
          <div key={mk}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
              <div className="flex-1 border-t border-slate-100" />
              <span className="text-xs text-slate-300">{groupNotes.length} note{groupNotes.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-3">
              {groupNotes.map(note => (
                editing?.id === note.id ? null : (
                  <NoteCard key={note.id} note={note}
                    onEdit={n => { setEditing(n); setAdding(false) }}
                    onDelete={id => onDelete(affaire.id, id)} />
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function SuiviAffaires() {
  const { affaires, personnel } = useApp()
  const { session } = useAuth()
  const { getNotesAffaire, addNote, updateNote, deleteNote } = useNotes()

  const [search,        setSearch]        = useState('')
  const [filtreStatut,  setFiltreStatut]  = useState('all')
  const [filtreCA,      setFiltreCA]      = useState('')
  const [selectedId,    setSelectedId]    = useState(null)

  const auteur = session ? `${session.prenom} ${session.nom}` : 'Inconnu'
  const caList = useMemo(() => personnel.filter(p => p.role === 'CA' || p.role === 'RS'), [personnel])

  const filtered = useMemo(() => {
    return affaires
      .filter(a => a.statut !== 'terminée' && a.statut !== 'perdue')
      .filter(a => {
        if (filtreCA && a.caId !== filtreCA) return false
        if (filtreStatut !== 'all' && a.statut !== filtreStatut) return false
        if (!search) return true
        const q = search.toLowerCase()
        return a.numero.toLowerCase().includes(q)
          || a.intitule.toLowerCase().includes(q)
          || (a.client || '').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        // Affaires avec notes récentes en premier
        const aN = getNotesAffaire(a.id)
        const bN = getNotesAffaire(b.id)
        const aLast = aN[0]?.date || ''
        const bLast = bN[0]?.date || ''
        return bLast.localeCompare(aLast)
      })
  }, [affaires, filtreCA, filtreStatut, search, getNotesAffaire])

  const selectedAffaire = affaires.find(a => a.id === selectedId)

  const STATUTS = [
    { key: 'all',       label: 'Toutes'     },
    { key: 'active',    label: 'Actives'    },
    { key: 'en attente',label: 'En attente' },
  ]

  const STATUT_CLS = {
    'active':     'bg-green-100 text-green-700',
    'en attente': 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#F4F5F7' }}>

      {/* ── Colonne gauche : liste affaires ────────────────────────────────── */}
      <div className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col">

        {/* Filtres */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une affaire…"
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-[#E31E24]" />

          <div className="flex gap-1.5 flex-wrap">
            {STATUTS.map(s => (
              <button key={s.key} onClick={() => setFiltreStatut(s.key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filtreStatut === s.key
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                style={filtreStatut === s.key ? { background: '#E31E24' } : {}}>
                {s.label}
              </button>
            ))}
          </div>

          {caList.length > 0 && (
            <select value={filtreCA} onChange={e => setFiltreCA(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:border-red-400">
              <option value="">Tous les CA</option>
              {caList.map(ca => (
                <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>
              ))}
            </select>
          )}
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filtered.map(a => {
            const notes  = getNotesAffaire(a.id)
            const today  = new Date().toISOString().slice(0, 10)
            const nextRdv = notes.filter(n => n.prochainRdv && n.prochainRdv >= today)
              .sort((x, y) => x.prochainRdv.localeCompare(y.prochainRdv))[0]?.prochainRdv
            const lastNote = notes[0]
            const isSelected = selectedId === a.id

            return (
              <button key={a.id} onClick={() => setSelectedId(a.id)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-red-50 border-l-2 border-[#E31E24]' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs font-bold ${isSelected ? 'text-[#E31E24]' : 'text-slate-600'}`}>
                        {a.numero}
                      </span>
                      {a.statut && (
                        <span className={`text-xs px-1.5 py-px rounded font-medium ${STATUT_CLS[a.statut] || 'bg-slate-100 text-slate-500'}`}>
                          {a.statut}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 font-medium truncate">{a.intitule}</div>
                    {a.client && <div className="text-xs text-slate-400 truncate">{a.client}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    {notes.length > 0 && (
                      <div className="text-xs font-bold text-slate-500 bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                        {notes.length}
                      </div>
                    )}
                  </div>
                </div>
                {nextRdv && (
                  <div className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                    <span>📅</span> <span>{fmtDate(nextRdv)}</span>
                  </div>
                )}
                {lastNote && !nextRdv && (
                  <div className="mt-1 text-xs text-slate-400 truncate">
                    {lastNote.contenu.slice(0, 50)}{lastNote.contenu.length > 50 ? '…' : ''}
                  </div>
                )}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">Aucune affaire trouvée</div>
          )}
        </div>
      </div>

      {/* ── Panneau droit : notes ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {selectedAffaire ? (
          <PanneauNotes
            affaire={selectedAffaire}
            personnel={personnel}
            notes={getNotesAffaire(selectedAffaire.id)}
            onAdd={addNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
            auteur={auteur}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <div className="text-5xl mb-4">📁</div>
            <div className="text-base font-semibold text-slate-600">Sélectionnez une affaire</div>
            <div className="text-sm mt-1">pour voir et ajouter des notes de suivi</div>
          </div>
        )}
      </div>
    </div>
  )
}
