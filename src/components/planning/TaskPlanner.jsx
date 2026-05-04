import { useState, useMemo } from 'react'
import { useApp } from '../../App'
import { getISOWeek, getISOYear, getWorkDays, planningKey, isHoliday, toDateKey } from '../../utils/weeks'
import { getAffaireColor, PERSON_TYPE_COLORS } from '../../utils/colors'
import { getCellSlots, packSlots } from '../../utils/slots'

export default function TaskPlanner({ onClose }) {
  const { affaires, personnel, planning, setPlanningBatch, selectedCA } = useApp()

  const [affaireId, setAffaireId]   = useState('')
  const [personIds, setPersonIds]   = useState([])
  const [dateFrom,  setDateFrom]    = useState('')
  const [dateTo,    setDateTo]      = useState('')
  const [useFullDay, setUseFullDay] = useState(true)
  const [timeFrom,  setTimeFrom]    = useState('08:00')
  const [timeTo,    setTimeTo]      = useState('17:00')
  const [overwrite, setOverwrite]   = useState(true)

  const activeAffaires = affaires.filter(a =>
    a.statut === 'active' && (!selectedCA || a.caId === selectedCA)
  )
  const plannable = personnel.filter(p => p.actif && p.role !== 'CA' && p.role !== 'RS')

  const togglePerson = (id) =>
    setPersonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleAll = () =>
    setPersonIds(prev => prev.length === plannable.length ? [] : plannable.map(p => p.id))

  const workingDays = useMemo(() => {
    if (!dateFrom || !dateTo || dateTo < dateFrom) return []
    const days = []
    for (let d = new Date(dateFrom); d <= new Date(dateTo); d.setDate(d.getDate() + 1)) {
      const date = new Date(d)
      if (date.getDay() === 0 || date.getDay() === 6) continue
      if (isHoliday(date)) continue
      days.push(new Date(date))
    }
    return days
  }, [dateFrom, dateTo])

  const totalSlots = workingDays.length * personIds.length
  const canSubmit = affaireId && personIds.length > 0 && workingDays.length > 0

  function submit() {
    if (!canSubmit) return
    const updates = []

    for (const date of workingDays) {
      const year = getISOYear(date)
      const week = getISOWeek(date)
      const days = getWorkDays(year, week)
      const dayIndex = days.findIndex(wd => toDateKey(wd) === toDateKey(date))
      if (dayIndex === -1) continue

      for (const pid of personIds) {
        const key = planningKey(pid, year, week, dayIndex)
        const existingSlots = getCellSlots(planning[key])

        let newValue
        if (useFullDay) {
          if (!overwrite && existingSlots.length > 0) continue
          newValue = affaireId
        } else {
          const newSlot = { id: affaireId, from: timeFrom, to: timeTo }
          const filtered = existingSlots.filter(s => s.id !== affaireId)
          const combined = [...filtered, newSlot].slice(0, 2)
          newValue = packSlots(combined)
        }
        updates.push({ key, value: newValue })
      }
    }

    setPlanningBatch(updates)
    onClose()
  }

  const selectedAffaire = affaires.find(a => a.id === affaireId)
  const selectedColor = selectedAffaire ? getAffaireColor(selectedAffaire.colorIndex) : null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-slate-900 font-semibold text-base">Planifier une période</h2>
            <p className="text-slate-400 text-xs mt-0.5">Affectation automatique sur une plage de dates</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* Affaire */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Affaire *</label>
            <div className="relative">
              <select
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 appearance-none pr-8"
                value={affaireId}
                onChange={e => setAffaireId(e.target.value)}
              >
                <option value="">— Sélectionner une affaire —</option>
                {activeAffaires.map(a => (
                  <option key={a.id} value={a.id}>{a.numero} — {a.intitule} ({a.client})</option>
                ))}
              </select>
              <span className="absolute right-3 top-3 text-slate-400 pointer-events-none">▼</span>
            </div>
            {selectedAffaire && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: selectedColor.bg, borderLeft: `3px solid ${selectedColor.border}` }}>
                <span className="text-xs font-semibold" style={{ color: selectedColor.text }}>{selectedAffaire.numero}</span>
                <span className="text-xs" style={{ color: selectedColor.text }}>{selectedAffaire.intitule}</span>
                <span className="text-xs ml-auto" style={{ color: selectedColor.text, opacity: 0.7 }}>{selectedAffaire.client}</span>
              </div>
            )}
          </div>

          {/* Période */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Période *</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Du</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="text-slate-400 mt-5 text-lg">→</div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Au</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            {workingDays.length > 0 && (
              <p className="text-xs text-blue-600 mt-1.5 font-medium">
                {workingDays.length} jour{workingDays.length > 1 ? 's' : ''} ouvré{workingDays.length > 1 ? 's' : ''} (hors week-ends et jours fériés)
              </p>
            )}
            {dateFrom && dateTo && dateTo < dateFrom && (
              <p className="text-xs text-red-500 mt-1.5">La date de fin doit être après la date de début.</p>
            )}
          </div>

          {/* Horaires */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Horaires</label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button type="button" onClick={() => setUseFullDay(v => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${useFullDay ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useFullDay ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs text-slate-600">Journée entière</span>
              </label>
            </div>
            {!useFullDay && (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Début</label>
                  <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="text-slate-400 mt-5">—</div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Fin</label>
                  <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            )}
          </div>

          {/* Personnel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Personnel * <span className="text-blue-600 normal-case font-normal">({personIds.length}/{plannable.length})</span>
              </label>
              <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                {personIds.length === plannable.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {plannable.map((p, i) => {
                const checked = personIds.includes(p.id)
                const tc = PERSON_TYPE_COLORS[p.type] || { bg: '#94a3b8', text: '#fff' }
                return (
                  <button key={p.id} onClick={() => togglePerson(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left ${i > 0 ? 'border-t border-slate-100' : ''} ${checked ? 'bg-blue-50/50' : ''}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-blue-500 bg-blue-600' : 'border-slate-300'}`}>
                      {checked && <span className="text-white text-xs leading-none">✓</span>}
                    </span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: tc.bg, color: tc.text }}>
                      {p.prenom[0]}{p.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-800 text-sm font-medium">{p.prenom} {p.nom}</span>
                    </div>
                    <span className="text-slate-400 text-xs shrink-0">{p.qualification} · {p.type}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Options */}
          <div>
            <button type="button" onClick={() => setOverwrite(v => !v)}
              className="flex items-center gap-2.5 cursor-pointer select-none">
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${overwrite ? 'border-blue-500 bg-blue-600' : 'border-slate-300'}`}>
                {overwrite && <span className="text-white text-xs leading-none">✓</span>}
              </span>
              <span className="text-slate-600 text-sm">Remplacer les cellules déjà remplies</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 shrink-0">
          <div className="text-slate-400 text-xs">
            {canSubmit && `${totalSlots} créneaux à créer`}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-900 rounded-lg text-sm transition-colors">
              Annuler
            </button>
            <button onClick={submit} disabled={!canSubmit}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                canSubmit ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}>
              Planifier →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
