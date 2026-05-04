import { useEffect, useRef, useState, useMemo } from 'react'
import { useApp } from '../../App'
import { useAuth } from '../../context/AuthContext'
import { SPECIAL_CODES, getAffaireColor } from '../../utils/colors'
import { getCellSlots, packSlots, isSpecialId } from '../../utils/slots'

const CODES = Object.entries(SPECIAL_CODES).map(([code, info]) => ({ code, ...info }))

export default function CellEditor({ value, position, onClose, onSelect, commentKey, comment, onCommentChange }) {
  const { affaires, selectedCA } = useApp()
  const { session } = useAuth()
  const ref = useRef(null)
  const [search, setSearch] = useState('')
  const [splitMode, setSplitMode] = useState(false)
  const [t1from, setT1from] = useState('08:00')
  const [t1to,   setT1to]   = useState('12:00')
  const [t2from, setT2from] = useState('13:00')
  const [t2to,   setT2to]   = useState('17:00')

  const slots = getCellSlots(value)
  const affaireSlot = slots.find(s => !isSpecialId(s.id))
  const canSplit = slots.length === 1 && !!affaireSlot && !splitMode

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  const activeAffaires = affaires.filter(a => {
    if (a.statut !== 'active') return false
    if (selectedCA && a.caId !== selectedCA) return false
    if (session?.role === 'ca' && a.caId !== session.id) return false
    return true
  })

  const filteredAffaires = useMemo(() => {
    if (!search.trim()) return activeAffaires
    const q = search.toLowerCase()
    return activeAffaires.filter(a =>
      a.numero.toLowerCase().includes(q) ||
      a.intitule.toLowerCase().includes(q) ||
      (a.client || '').toLowerCase().includes(q)
    )
  }, [activeAffaires, search])

  // Position: open above if not enough space below
  const POPUP_H = 460
  const spaceBelow = window.innerHeight - position.y - 8
  const top = spaceBelow >= POPUP_H
    ? position.y
    : Math.max(8, window.innerHeight - POPUP_H - 8)
  const left = Math.min(position.x, window.innerWidth - 300)

  function handleSelect(id) {
    if (id === null) { onSelect(null); return }
    if (splitMode && affaireSlot) {
      onSelect([
        { id: affaireSlot.id, from: t1from, to: t1to },
        { id, from: t2from, to: t2to },
      ])
      return
    }
    onSelect(id)
  }

  function handleRemoveSlot(idx) {
    if (slots.length <= 1) { onSelect(null); return }
    const remaining = slots.filter((_, i) => i !== idx)
    onSelect(packSlots(remaining.map(s => ({ ...s, from: undefined, to: undefined }))))
  }

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 1000, width: 296 }}
      className="bg-white border border-slate-200 rounded-xl shadow-xl text-sm overflow-hidden flex flex-col"
    >
      {/* ── Slots actuels (si rempli) ── */}
      {slots.length > 0 && (
        <div className="px-2.5 pt-2.5 pb-1.5 border-b border-slate-100">
          {slots.map((slot, i) => {
            const aff = affaires.find(a => a.id === slot.id)
            const sp  = SPECIAL_CODES[slot.id]
            const color = aff ? getAffaireColor(aff.colorIndex).border : sp?.border ?? '#94a3b8'
            const label = aff ? aff.numero : (sp ? slot.id : slot.id)
            const sub   = aff ? aff.intitule : sp?.label ?? ''
            return (
              <div key={i} className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-800">{label}</span>
                  {sub && <span className="text-xs text-slate-400 ml-1 truncate">{sub}</span>}
                </div>
                <button onClick={() => handleRemoveSlot(i)}
                  className="text-slate-300 hover:text-red-400 text-xs w-4 h-4 flex items-center justify-center rounded shrink-0">✕</button>
              </div>
            )
          })}
          {canSplit && (
            <button onClick={() => setSplitMode(true)}
              className="w-full text-left text-xs text-blue-600 hover:text-blue-800 py-0.5 flex items-center gap-1">
              <span>⊕</span> Partager la journée (2 missions)
            </button>
          )}
          {splitMode && (
            <div className="mt-1 p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs">
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-blue-700 w-14 shrink-0">Mission 1</span>
                <input type="time" value={t1from} onChange={e => setT1from(e.target.value)} className="border border-blue-300 rounded px-1 py-0.5 w-18 bg-white focus:outline-none text-slate-700" />
                <span className="text-slate-400">–</span>
                <input type="time" value={t1to} onChange={e => setT1to(e.target.value)} className="border border-blue-300 rounded px-1 py-0.5 w-18 bg-white focus:outline-none text-slate-700" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-700 w-14 shrink-0">Mission 2</span>
                <input type="time" value={t2from} onChange={e => setT2from(e.target.value)} className="border border-blue-300 rounded px-1 py-0.5 w-18 bg-white focus:outline-none text-slate-700" />
                <span className="text-slate-400">–</span>
                <input type="time" value={t2to} onChange={e => setT2to(e.target.value)} className="border border-blue-300 rounded px-1 py-0.5 w-18 bg-white focus:outline-none text-slate-700" />
              </div>
              <div className="text-blue-500 mt-1.5">↓ Choisir l'affaire 2 ci-dessous</div>
            </div>
          )}
        </div>
      )}

      {/* ── Recherche (toujours en haut) ── */}
      <div className="px-2.5 pt-2 pb-1.5 border-b border-slate-100">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="N° affaire, intitulé, client…"
          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 text-slate-800 placeholder-slate-400 bg-slate-50"
        />
        {search && (
          <div className="text-xs text-slate-400 mt-1 px-0.5">{filteredAffaires.length} résultat{filteredAffaires.length !== 1 ? 's' : ''}</div>
        )}
      </div>

      {/* ── Commentaire ── */}
      {commentKey && (
        <div className="px-2.5 pt-2 pb-1.5 border-b border-slate-100">
          <label className="block text-xs text-slate-400 mb-1">💬 Commentaire</label>
          <textarea
            value={comment || ''}
            onChange={e => onCommentChange && onCommentChange(e.target.value)}
            placeholder="Ex: Accès chantier par portail nord, livraison 8h…"
            rows={2}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400 text-slate-800 placeholder-slate-300 bg-yellow-50 resize-none leading-relaxed"
          />
        </div>
      )}

      {/* ── Liste scrollable : affaires d'abord, puis codes ── */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 320 }}>

        {/* Affaires */}
        {!splitMode && (
          <div className="px-1.5 pb-1">
            {filteredAffaires.length === 0 && search && (
              <p className="text-slate-400 text-xs px-2 py-2">Aucun résultat</p>
            )}
            {filteredAffaires.map(a => {
              if (splitMode && affaireSlot && a.id === affaireSlot.id) return null
              const c = getAffaireColor(a.colorIndex)
              return (
                <button key={a.id} onClick={() => handleSelect(a.id)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.border }} />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold" style={{ color: c.text !== '#FCD34D' ? c.text : '#92400E' }}>{a.numero.replace('ELS','')}</span>
                    <span className="text-slate-600 text-xs ml-1.5 truncate">{a.intitule}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Affaires pour le split (slot 2 uniquement) */}
        {splitMode && (
          <div className="px-1.5 pb-1">
            {activeAffaires.filter(a => !affaireSlot || a.id !== affaireSlot.id).map(a => {
              const c = getAffaireColor(a.colorIndex)
              return (
                <button key={a.id} onClick={() => handleSelect(a.id)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.border }} />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold" style={{ color: c.text !== '#FCD34D' ? c.text : '#92400E' }}>{a.numero.replace('ELS','')}</span>
                    <span className="text-slate-600 text-xs ml-1.5 truncate">{a.intitule}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Séparateur + Codes (seulement si pas en split) */}
        {!splitMode && !search && (
          <>
            <div className="mx-2.5 border-t border-slate-100 my-1" />
            <div className="px-1.5 pb-1">
              <p className="text-slate-400 text-xs px-2 mb-1 uppercase tracking-wider">Codes absence</p>
              {CODES.map(({ code, label, border }) => (
                <button key={code} onClick={() => handleSelect(code)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: border }} />
                  <span className="font-semibold text-xs text-slate-700 w-20 shrink-0">{code}</span>
                  <span className="text-slate-400 text-xs truncate">{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Effacer ── */}
      <div className="border-t border-slate-100 px-2.5 py-1.5">
        <button onClick={() => handleSelect(null)}
          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center gap-2 transition-colors text-xs">
          <span className="w-2 h-2 rounded-full border border-slate-300 shrink-0" />
          Effacer la cellule
        </button>
      </div>
    </div>
  )
}
