import { useState, useMemo, useCallback } from 'react'
import { useApp } from '../../App'
import { SPECIAL_CODES, getAffaireColor } from '../../utils/colors'
import { getCellSlots, slotJH } from '../../utils/slots'
import { getWorkDays, getISOWeek, getISOYear, getMondayOfWeek, addWeeks, planningKey, toDateKey, isHoliday, getCurrentWeekInfo } from '../../utils/weeks'

const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

function formatDate(date) {
  const d = new Date(date)
  return `${DAYS_FR[(d.getDay()+6)%7]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

function toMin(s) {
  if (!s) return null
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

function calcHeures(from, to) {
  const f = toMin(from), t = toMin(to)
  if (f == null || t == null) return null
  const diff = t - f
  return diff > 0 ? +(diff / 60).toFixed(2) : null
}

// Build initial entries for a day from planning
function buildInitialEntries(planningValue, affaires) {
  const slots = getCellSlots(planningValue)
  return slots.map(slot => {
    const aff = affaires.find(a => a.id === slot.id)
    const sp = SPECIAL_CODES[slot.id]
    return {
      id: slot.id,
      label: aff ? `${aff.numero} – ${aff.intitule}` : (sp ? sp.label : slot.id),
      isSpecial: !!sp,
      from: slot.from || (sp ? '' : '08:00'),
      to: slot.to || (sp ? '' : '17:00'),
      location: '',
      comment: '',
    }
  })
}

function EntryRow({ entry, onChange, onRemove, affaires }) {
  const aff = affaires.find(a => a.id === entry.id)
  const sp = SPECIAL_CODES[entry.id]
  const color = aff ? getAffaireColor(aff.colorIndex).border : (sp?.border ?? '#94a3b8')
  const heures = calcHeures(entry.from, entry.to)

  async function fetchGPS() {
    if (!navigator.geolocation) { alert('Géolocalisation non disponible'); return }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          { headers: { 'Accept-Language': 'fr' } }
        )
        const data = await res.json()
        const addr = data.address
        const parts = [addr.road, addr.city || addr.town || addr.village, addr.postcode].filter(Boolean)
        onChange('location', parts.join(', ') || data.display_name)
      } catch {
        onChange('location', `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
      }
    }, () => alert('Impossible d\'obtenir la position'))
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-medium text-slate-800 flex-1 truncate">{entry.label}</span>
        <button onClick={onRemove} className="text-slate-300 hover:text-red-400 text-xs px-1">✕</button>
      </div>

      {!entry.isSpecial && (
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 w-10">Début</span>
            <input type="time" value={entry.from} onChange={e => onChange('from', e.target.value)}
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-400 bg-white" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 w-6">Fin</span>
            <input type="time" value={entry.to} onChange={e => onChange('to', e.target.value)}
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-400 bg-white" />
          </div>
          {heures != null && (
            <span className="text-xs font-semibold text-blue-600 self-center">{heures}h</span>
          )}
        </div>
      )}

      <div className="flex gap-1 mb-2">
        <input
          type="text"
          value={entry.location}
          onChange={e => onChange('location', e.target.value)}
          placeholder="Lieu (adresse du chantier…)"
          className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-400 placeholder-slate-300 bg-white"
        />
        <button onClick={fetchGPS} title="Localisation GPS"
          className="px-2 py-1 border border-slate-200 rounded text-xs hover:bg-blue-50 hover:border-blue-400 text-slate-500 hover:text-blue-600 transition-colors">
          📍
        </button>
      </div>

      <textarea
        value={entry.comment}
        onChange={e => onChange('comment', e.target.value)}
        placeholder="Commentaire…"
        rows={1}
        className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 placeholder-slate-300 bg-yellow-50 resize-none"
      />
    </div>
  )
}

function DayCard({ date, planningValue, tsData, onSave, affaires, holidayName }) {
  const dateKey = toDateKey(date)
  const isHol = !!holidayName

  const [entries, setEntries] = useState(() => {
    if (tsData?.entries) return tsData.entries
    if (planningValue) return buildInitialEntries(planningValue, affaires)
    return []
  })
  const [saved, setSaved] = useState(!!tsData?.entries)

  function save() {
    onSave(dateKey, { entries })
    setSaved(true)
  }

  function updateEntry(i, field, val) {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
    setSaved(false)
  }

  function removeEntry(i) {
    setEntries(prev => prev.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  const totalH = entries.reduce((sum, e) => {
    if (e.isSpecial) return sum
    const h = calcHeures(e.from, e.to)
    return sum + (h ?? 8)
  }, 0)

  return (
    <div className={`rounded-xl border ${isHol ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-slate-50'} overflow-hidden`}>
      <div className={`px-4 py-2 flex items-center justify-between ${isHol ? 'bg-slate-100' : 'bg-white border-b border-slate-100'}`}>
        <div>
          <span className="text-sm font-semibold text-slate-800">{formatDate(date)}</span>
          {holidayName && <span className="ml-2 text-xs text-slate-400 italic">{holidayName}</span>}
        </div>
        {!isHol && entries.length > 0 && (
          <span className="text-xs font-bold text-blue-600">{totalH.toFixed(1)}h</span>
        )}
      </div>

      {isHol ? (
        <div className="px-4 py-3 text-xs text-slate-400 italic">Jour férié</div>
      ) : (
        <div className="p-3 space-y-2">
          {entries.length === 0 && (
            <p className="text-xs text-slate-400 italic py-1">Aucune activité planifiée</p>
          )}
          {entries.map((entry, i) => (
            <EntryRow
              key={i}
              entry={entry}
              affaires={affaires}
              onChange={(field, val) => updateEntry(i, field, val)}
              onRemove={() => removeEntry(i)}
            />
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                saved
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function buildPrintHTML(person, year, week, days, planning, timesheets, affaires) {
  const monday = getMondayOfWeek(year, week)
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)
  const fmt = d => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
  const weekRange = `${fmt(monday)} – ${fmt(friday)}`

  const dayRows = days.map((date, di) => {
    const dateKey = toDateKey(date)
    const hol = isHoliday(date)
    const key = planningKey(person.id, year, week, di)
    const tsData = timesheets[`${person.id}_${dateKey}`]
    const entries = tsData?.entries ?? buildInitialEntries(planning[key], affaires)
    const dayName = DAYS_FR[di]
    const dateStr = `${date.getDate()} ${MONTHS_FR[date.getMonth()]}`

    if (hol) return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;white-space:nowrap">${dayName}<br><small style="font-weight:400;color:#64748b">${dateStr}</small></td>
        <td colspan="5" style="padding:6px 8px;border:1px solid #e2e8f0;color:#94a3b8;font-style:italic">${hol}</td>
      </tr>`

    const entryRows = entries.map(e => {
      const h = !e.isSpecial ? (calcHeures(e.from, e.to) ?? 8) : null
      return `<tr>
        <td></td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px">${e.label}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center">${e.from || '–'}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center">${e.to || '–'}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center">${h != null ? h+'h' : '–'}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#64748b">${e.location || ''}</td>
      </tr>
      ${e.comment ? `<tr><td></td><td colspan="5" style="padding:2px 8px 4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#92400e;background:#fef9c3">💬 ${e.comment}</td></tr>` : ''}`
    }).join('')

    const dayTotal = entries.reduce((s, e) => { if (e.isSpecial) return s; const h = calcHeures(e.from, e.to); return s + (h ?? 8) }, 0)

    return `<tr>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;white-space:nowrap;vertical-align:top">${dayName}<br><small style="font-weight:400;color:#64748b">${dateStr}</small></td>
        <td colspan="4" style="padding:0;border:0"></td>
        <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;text-align:center;color:#1d4ed8">${entries.length ? dayTotal.toFixed(1)+'h' : ''}</td>
      </tr>
      ${entryRows}`
  }).join('')

  const totalWeek = days.reduce((sum, date, di) => {
    const dateKey = toDateKey(date)
    if (isHoliday(date)) return sum
    const key = planningKey(person.id, year, week, di)
    const tsData = timesheets[`${person.id}_${dateKey}`]
    const entries = tsData?.entries ?? buildInitialEntries(planning[key], affaires)
    return sum + entries.reduce((s, e) => { if (e.isSpecial) return s; const h = calcHeures(e.from, e.to); return s + (h ?? 8) }, 0)
  }, 0)

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Feuille d'heures – ${person.prenom} ${person.nom} – S${week}/${year}</title>
<style>
  @page { size: A4 portrait; margin: 1.5cm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
  h2 { margin: 0 0 4px 0; font-size: 16px; }
  .subtitle { color: #64748b; margin: 0 0 16px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .footer { margin-top: 24px; display: flex; justify-content: space-between; }
  .sig-box { border-top: 1px solid #cbd5e1; width: 200px; padding-top: 4px; color: #94a3b8; font-size: 10px; text-align: center; }
</style></head><body>
<h2>Feuille d'heures — ${person.prenom} ${person.nom}</h2>
<p class="subtitle">${person.qualification} · Semaine ${week} / ${year} · ${weekRange}</p>
<table>
  <thead><tr>
    <th style="width:110px">Jour</th>
    <th>Mission / Code</th>
    <th style="width:60px;text-align:center">Début</th>
    <th style="width:60px;text-align:center">Fin</th>
    <th style="width:50px;text-align:center">Durée</th>
    <th>Lieu</th>
  </tr></thead>
  <tbody>${dayRows}
  <tr style="background:#f1f5f9">
    <td colspan="4" style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;text-align:right">Total semaine</td>
    <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;text-align:center;color:#1d4ed8">${totalWeek.toFixed(1)}h</td>
    <td style="border:1px solid #e2e8f0"></td>
  </tr></tbody>
</table>
<div class="footer">
  <div class="sig-box">Signature du technicien</div>
  <div class="sig-box">Visa responsable</div>
</div>
</body></html>`
}

export default function TimesheetView() {
  const { personnel, affaires, planning, timesheets, setTimesheetDay } = useApp()
  const { week: curWeek, year: curYear } = getCurrentWeekInfo()
  const [personId, setPersonId] = useState('')
  const [year, setYear] = useState(curYear)
  const [week, setWeek] = useState(curWeek)

  const person = personnel.find(p => p.id === personId)
  const days = useMemo(() => getWorkDays(year, week), [year, week])
  const monday = getMondayOfWeek(year, week)
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)
  const fmtShort = d => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`

  function handleSave(dateKey, dayData) {
    if (person) setTimesheetDay(person.id, dateKey, dayData)
  }

  function handlePrev() { const r = addWeeks(year, week, -1); setYear(r.year); setWeek(r.week) }
  function handleNext() { const r = addWeeks(year, week, 1); setYear(r.year); setWeek(r.week) }

  function handlePrint() {
    if (!person) return
    const html = buildPrintHTML(person, year, week, days, planning, timesheets, affaires)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.onload = () => { w.focus(); w.print() }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={personId}
            onChange={e => setPersonId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:border-blue-400"
          >
            <option value="">— Choisir un technicien —</option>
            {personnel.map(p => (
              <option key={p.id} value={p.id}>{p.prenom} {p.nom} · {p.qualification}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white overflow-hidden">
            <button onClick={handlePrev} className="px-3 py-2 hover:bg-slate-50 text-slate-500 text-sm transition-colors">‹</button>
            <span className="px-3 py-2 text-sm font-medium text-slate-700 border-x border-slate-200">
              S{week} · {fmtShort(monday)}–{fmtShort(friday)}
            </span>
            <button onClick={handleNext} className="px-3 py-2 hover:bg-slate-50 text-slate-500 text-sm transition-colors">›</button>
          </div>

          {person && (
            <button onClick={handlePrint}
              className="ml-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-2">
              🖨 Imprimer
            </button>
          )}
        </div>

        {!person ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">Sélectionnez un technicien pour accéder à sa feuille d'heures</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                {person.prenom[0]}{person.nom[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{person.prenom} {person.nom}</p>
                <p className="text-xs text-slate-400">{person.qualification}</p>
              </div>
            </div>

            <div className="space-y-3">
              {days.map((date, di) => {
                const dateKey = toDateKey(date)
                const hol = isHoliday(date)
                const key = planningKey(person.id, year, week, di)
                const planVal = planning[key]
                const tsData = timesheets[`${person.id}_${dateKey}`]
                return (
                  <DayCard
                    key={dateKey}
                    date={date}
                    planningValue={planVal}
                    tsData={tsData}
                    onSave={handleSave}
                    affaires={affaires}
                    holidayName={hol}
                  />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
