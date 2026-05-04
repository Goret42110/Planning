import { useState, useMemo, useCallback } from 'react'
import { useAppData } from './hooks/useAppData'
import { SPECIAL_CODES, getAffaireColor } from './utils/colors'
import { getCellSlots, packSlots } from './utils/slots'
import {
  getWorkDays, getCurrentWeekInfo, getMondayOfWeek, addWeeks,
  planningKey, toDateKey, isHoliday, formatShortDate, getISOWeek, getISOYear,
} from './utils/weeks'

// ─── Shared constants ────────────────────────────────────────────────────────
const DAYS_LONG  = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi']
const DAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven']
const MONTHS_FR  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const SPECIAL_OPTIONS = Object.entries(SPECIAL_CODES).map(([code, info]) => ({ code, label: info.label }))

function toMin(s) {
  if (!s) return null
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

// Returns true if any two timed entries overlap
function hasOverlap(entries) {
  const timed = entries.filter(e => !e.isSpecial && e.from && e.to)
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const aS = toMin(timed[i].from), aE = toMin(timed[i].to)
      const bS = toMin(timed[j].from), bE = toMin(timed[j].to)
      if (aS < bE && bS < aE) return true
    }
  }
  return false
}
function calcH(from, to) {
  const f = toMin(from), t = toMin(to)
  if (f == null || t == null) return null
  const d = t - f
  return d > 0 ? +(d / 60).toFixed(2) : null
}
function fmtDate(d) {
  return `${DAYS_LONG[(d.getDay()+6)%7]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}
function fmtShort(d) {
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`
}

// Build initial entries for a day from the planning value
function initEntries(planVal, affaires) {
  return getCellSlots(planVal).map(slot => {
    const aff = affaires.find(a => a.id === slot.id)
    const sp  = SPECIAL_CODES[slot.id]
    return {
      id:        slot.id,
      label:     aff ? `${aff.numero} – ${aff.intitule}` : (sp ? sp.label : slot.id),
      isSpecial: !!sp,
      from:      slot.from || (sp ? '' : '08:00'),
      to:        slot.to   || (sp ? '' : '17:00'),
      location:  '',
      comment:   '',
    }
  })
}

// ─── Zone déplacement — Convention collective du Bâtiment ───────────────────
// Distance routière depuis le siège ELS (Andrezieux-Boutheon) jusqu'au chantier
const ZONES_BATIMENT = [
  { max: 10,       zone: 1,    label: 'Zone 1',             color: 'bg-green-100 text-green-700 border-green-300' },
  { max: 20,       zone: 2,    label: 'Zone 2',             color: 'bg-lime-100 text-lime-700 border-lime-300' },
  { max: 30,       zone: 3,    label: 'Zone 3',             color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { max: 40,       zone: 4,    label: 'Zone 4',             color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { max: 50,       zone: 5,    label: 'Zone 5',             color: 'bg-red-100 text-red-700 border-red-300' },
  { max: Infinity, zone: 'GD', label: 'Grand déplacement',  color: 'bg-purple-100 text-purple-700 border-purple-300' },
]

// Siège ELS — coordonnées hardcodées (Andrezieux-Boutheon, Loire)
// Vérifiées sur Nominatim : 150 rue colonel lemaire 42160
const COMPANY_COORDS = { lat: 45.5225, lon: 4.2667 }

// Haversine straight-line distance (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = x => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Tente OSRM pour la distance routière réelle, sinon Haversine × 1.3 (facteur de détour standard France)
async function computeZoneFromCoords(lat, lon) {
  // 1. Essai OSRM routage réel
  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 5000)
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${COMPANY_COORDS.lon},${COMPANY_COORDS.lat};${lon},${lat}?overview=false`
    const res  = await fetch(url, { signal: ctrl.signal })
    const data = await res.json()
    if (data.routes?.[0]) {
      const km = data.routes[0].distance / 1000
      const z  = ZONES_BATIMENT.find(z => km < z.max)
      return { km: Math.round(km * 10) / 10, routiere: true, ...z }
    }
  } catch {}

  // 2. Fallback Haversine × 1.3 (approximation routière standard)
  const crow = haversineKm(COMPANY_COORDS.lat, COMPANY_COORDS.lon, lat, lon)
  const km   = Math.round(crow * 1.3 * 10) / 10
  const z    = ZONES_BATIMENT.find(z => km < z.max)
  return { km, routiere: false, ...z }
}

async function geocodeAddress(address) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=fr`,
      { headers: { 'Accept-Language': 'fr' } }
    )
    const data = await res.json()
    if (data[0]) return { lat: +data[0].lat, lon: +data[0].lon }
  } catch {}
  return null
}

// ─── GPS helper — renvoie texte + coords ──────────────────────────────────────
async function fetchLocation(cb) {
  if (!navigator.geolocation) { alert('Géolocalisation non disponible'); return }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lon } = pos.coords
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      const a    = data.address
      const text = [a.road, a.city || a.town || a.village, a.postcode].filter(Boolean).join(', ') || data.display_name
      cb({ text, lat, lon })
    } catch {
      cb({ text: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon })
    }
  }, () => alert("Impossible d'obtenir la position"))
}

// ─── AddEntryRow: inline form to pick a new affaire or code ──────────────────
function AddEntryRow({ affaires, onAdd, onCancel }) {
  const [selectedId, setSelectedId] = useState('')
  const [from, setFrom] = useState('08:00')
  const [to,   setTo]   = useState('17:00')
  const active = affaires.filter(a => a.statut === 'active')

  function confirm() {
    if (!selectedId) return
    const aff = affaires.find(a => a.id === selectedId)
    const sp  = SPECIAL_CODES[selectedId]
    onAdd({
      id:        selectedId,
      label:     aff ? `${aff.numero} – ${aff.intitule}` : (sp ? sp.label : selectedId),
      isSpecial: !!sp,
      from:      sp ? '' : from,
      to:        sp ? '' : to,
      location:  '',
      comment:   '',
    })
  }

  return (
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
      <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white text-slate-800 focus:outline-none focus:border-blue-400">
        <option value="">— Choisir une affaire ou un code —</option>
        <optgroup label="Affaires actives">
          {active.map(a => (
            <option key={a.id} value={a.id}>{a.numero} – {a.intitule}</option>
          ))}
        </optgroup>
        <optgroup label="Codes absence">
          {SPECIAL_OPTIONS.map(({ code, label }) => (
            <option key={code} value={code}>{code} – {label}</option>
          ))}
        </optgroup>
      </select>
      {selectedId && !SPECIAL_CODES[selectedId] && (
        <div className="flex gap-2 items-center">
          <input type="time" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none" />
          <span className="text-slate-400 text-xs">–</span>
          <input type="time" value={to} onChange={e => setTo(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none" />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={confirm} disabled={!selectedId}
          className="flex-1 py-1.5 bg-blue-600 disabled:bg-blue-200 text-white rounded text-xs font-medium">
          Ajouter
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-500 hover:bg-white">
          Annuler
        </button>
      </div>
    </div>
  )
}

// ─── DayCard (timesheet) ──────────────────────────────────────────────────────
function DayCard({ date, planVal, tsData, affaires, onSave, holidayName }) {
  const dateKey  = toDateKey(date)
  const todayKey = toDateKey(new Date())
  const isHol    = !!holidayName
  const isFuture = dateKey > todayKey

  const [entries, setEntries]   = useState(() => tsData?.entries ?? initEntries(planVal, affaires))
  const [panier,  setPanier]    = useState(tsData?.panier ?? false)
  const [adding,  setAdding]    = useState(false)
  const [dirty,   setDirty]     = useState(false)
  const [saved,   setSaved]     = useState(!!tsData?.entries)

  function save() {
    onSave(dateKey, { entries, panier })
    setSaved(true)
    setDirty(false)
  }

  function upd(i, field, val) {
    setEntries(p => p.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
    setSaved(false); setDirty(true)
  }
  function updMulti(i, patch) {
    setEntries(p => p.map((e, idx) => idx === i ? { ...e, ...patch } : e))
    setSaved(false); setDirty(true)
  }
  function remove(i) {
    setEntries(p => p.filter((_, idx) => idx !== i))
    setSaved(false); setDirty(true)
  }
  function addEntry(entry) {
    setEntries(p => [...p, entry])
    setAdding(false); setSaved(false); setDirty(true)
  }
  function togglePanier(v) {
    setPanier(v); setSaved(false); setDirty(true)
  }

  const totalH = entries.reduce((s, e) => {
    if (e.isSpecial) return s
    const h = calcH(e.from, e.to)
    return s + (h ?? 8)
  }, 0)

  return (
    <div className={`rounded-xl border overflow-hidden ${isHol ? 'border-slate-100' : 'border-slate-200'}`}>
      {/* Day header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${isHol ? 'bg-slate-100' : 'bg-white border-b border-slate-100'}`}>
        <div>
          <span className="text-sm font-semibold text-slate-800">{fmtDate(date)}</span>
          {holidayName && <span className="ml-2 text-xs text-slate-400 italic">{holidayName}</span>}
        </div>
        {!isHol && entries.length > 0 && (
          <span className="text-xs font-bold text-blue-600">{totalH.toFixed(1)}h</span>
        )}
      </div>

      {isHol ? (
        <div className="px-4 py-3 bg-slate-50 text-xs text-slate-400 italic">Jour férié</div>
      ) : isFuture ? (
        <div className="px-4 py-4 bg-slate-50 flex items-center gap-2 text-xs text-slate-400 italic">
          <span>🔒</span> La feuille d'heures ne peut pas être remplie à l'avance
        </div>
      ) : (
        <div className="p-3 bg-slate-50 space-y-2">
          {entries.length === 0 && !adding && (
            <p className="text-xs text-slate-400 italic py-1">Aucune activité — cliquez sur + pour ajouter</p>
          )}

          {entries.map((entry, i) => {
            const aff = affaires.find(a => a.id === entry.id)
            const sp  = SPECIAL_CODES[entry.id]
            const col = aff ? getAffaireColor(aff.colorIndex).border : (sp?.border ?? '#94a3b8')
            const h   = !entry.isSpecial ? calcH(entry.from, entry.to) : null

            return (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: col }} />
                  <span className="text-sm font-medium text-slate-800 flex-1 truncate">{entry.label}</span>
                  {h != null && <span className="text-xs font-bold text-blue-600 shrink-0">{h}h</span>}
                  <button onClick={() => remove(i)} className="text-slate-300 hover:text-red-400 text-xs w-5 h-5 flex items-center justify-center shrink-0">✕</button>
                </div>

                {!entry.isSpecial && (
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 w-10">Début</span>
                      <input type="time" value={entry.from} onChange={e => upd(i,'from',e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-400 bg-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 w-6">Fin</span>
                      <input type="time" value={entry.to} onChange={e => upd(i,'to',e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-400 bg-white" />
                    </div>
                  </div>
                )}

                <div className="flex gap-1">
                  <input type="text" value={entry.location}
                    onChange={e => updMulti(i, { location: e.target.value, zone: undefined })}
                    placeholder="Lieu / adresse du chantier…"
                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-400 placeholder-slate-300 bg-white" />
                  {/* GPS → adresse + zone automatique */}
                  <button title="Localisation GPS"
                    className="px-2 border border-slate-200 rounded text-xs hover:bg-blue-50 hover:border-blue-400 text-slate-500 hover:text-blue-600"
                    onClick={() => fetchLocation(async ({ text, lat, lon }) => {
                      const zone = await computeZoneFromCoords(lat, lon)
                      updMulti(i, { location: text, zone })
                    })}>
                    📍
                  </button>
                  {/* Calcul zone depuis adresse tapée */}
                  {entry.location && !entry.zone && (
                    <button title="Calculer la zone de déplacement"
                      className="px-2 border border-slate-200 rounded text-xs hover:bg-purple-50 hover:border-purple-400 text-slate-400 hover:text-purple-600"
                      onClick={async () => {
                        const coords = await geocodeAddress(entry.location)
                        if (coords) {
                          const zone = await computeZoneFromCoords(coords.lat, coords.lon)
                          updMulti(i, { zone })
                        } else {
                          alert('Adresse introuvable. Essayez une formulation plus précise.')
                        }
                      }}>
                      📐
                    </button>
                  )}
                </div>

                {/* Zone de déplacement */}
                {entry.zone && (
                  <div className={`flex items-center gap-2 px-2 py-1 rounded border text-xs font-medium ${entry.zone.color}`}>
                    <span>{entry.zone.label} — {entry.zone.km} km</span>
                    <span className="font-normal opacity-60">
                      {entry.zone.routiere ? 'distance routière' : 'estimée (×1.3)'}
                    </span>
                    <button onClick={() => upd(i, 'zone', undefined)}
                      className="ml-auto opacity-50 hover:opacity-100 text-xs">✕</button>
                  </div>
                )}

                <textarea value={entry.comment} onChange={e => upd(i,'comment',e.target.value)}
                  placeholder="Commentaire…" rows={1}
                  className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 placeholder-slate-300 bg-yellow-50 resize-none" />
              </div>
            )
          })}

          {adding && (
            <AddEntryRow affaires={affaires} onAdd={addEntry} onCancel={() => setAdding(false)} />
          )}

          {/* Overlap warning */}
          {hasOverlap(entries) && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
              <span className="shrink-0">⚠️</span>
              <span>Deux activités se chevauchent sur la même plage horaire. Corrigez les horaires avant d'enregistrer.</span>
            </div>
          )}

          {/* Panier + actions */}
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={panier} onChange={e => togglePanier(e.target.checked)}
                className="w-4 h-4 accent-orange-500 cursor-pointer" />
              <span className="text-xs font-medium text-slate-600">🍽 Panier repas</span>
            </label>

            {!adding && (
              <button onClick={() => setAdding(true)}
                className="flex items-center gap-1 px-2 py-1 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                + Ajouter une ligne
              </button>
            )}

            <button onClick={save} disabled={hasOverlap(entries)}
              className={`ml-auto px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                hasOverlap(entries) ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : saved && !dirty ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {saved && !dirty ? '✓ Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── WeekTimesheetTab ─────────────────────────────────────────────────────────
function WeekTimesheetTab({ person, affaires, planning, timesheets, setTimesheetDay, setPlanningCell, year, week, days }) {
  function handleSave(dateKey, dayData, di) {
    setTimesheetDay(person.id, dateKey, dayData)
    // Sync entries back to the shared planning grid
    const key   = planningKey(person.id, year, week, di)
    const slots = dayData.entries.map(e => ({
      id: e.id,
      ...(e.from && e.to ? { from: e.from, to: e.to } : {}),
    }))
    setPlanningCell(key, packSlots(slots))
  }

  return (
    <div className="space-y-3">
      {days.map((date, di) => {
        const dateKey = toDateKey(date)
        const hol     = isHoliday(date)
        const key     = planningKey(person.id, year, week, di)
        const planVal = planning[key]
        const tsData  = timesheets[`${person.id}_${dateKey}`]
        return (
          <DayCard
            key={dateKey}
            date={date}
            planVal={planVal}
            tsData={tsData}
            affaires={affaires}
            onSave={(dk, dd) => handleSave(dk, dd, di)}
            holidayName={hol}
          />
        )
      })}
    </div>
  )
}

// ─── WeekPlanningTab ──────────────────────────────────────────────────────────
function WeekPlanningTab({ person, affaires, planning, comments, setComment, year, week, days }) {
  const todayKey = toDateKey(new Date())

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-5 gap-2">
        {days.map((date, di) => {
          const dateKey = toDateKey(date)
          const hol     = isHoliday(date)
          const key     = planningKey(person.id, year, week, di)
          const slots   = getCellSlots(planning[key])
          const cmt     = comments[key]
          const isT     = dateKey === todayKey

          return (
            <div key={di}
              className={`rounded-xl border overflow-hidden ${hol ? 'border-slate-100 bg-slate-50' : isT ? 'border-blue-300 bg-white' : 'border-slate-200 bg-white'}`}>
              {/* Day label */}
              <div className={`px-3 py-2 border-b ${hol ? 'bg-slate-100 border-slate-100' : isT ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-xs font-bold ${isT ? 'text-blue-700' : 'text-slate-500'}`}>{DAYS_SHORT[di]}</p>
                <p className={`text-sm font-semibold ${isT ? 'text-blue-800' : 'text-slate-700'}`}>{date.getDate()} {MONTHS_FR[date.getMonth()].slice(0,3)}.</p>
              </div>

              <div className="p-2.5 space-y-1.5">
                {hol && <p className="text-xs text-slate-300 italic">{hol}</p>}

                {!hol && slots.length === 0 && (
                  <p className="text-xs text-slate-300 italic">Non planifié</p>
                )}

                {!hol && slots.map((slot, si) => {
                  const aff = affaires.find(a => a.id === slot.id)
                  const sp  = SPECIAL_CODES[slot.id]
                  if (sp) return (
                    <div key={si} className="rounded px-2 py-1 text-xs font-semibold"
                      style={{ background: sp.bg, borderLeft: `3px solid ${sp.border}`, color: sp.text }}>
                      {slot.id}
                      {slot.from && <span className="font-normal opacity-75 ml-1">{slot.from}–{slot.to}</span>}
                      <div className="font-normal opacity-75 text-xs">{sp.label}</div>
                    </div>
                  )
                  if (aff) {
                    const c = getAffaireColor(aff.colorIndex)
                    return (
                      <div key={si} className="rounded px-2 py-1 text-xs"
                        style={{ background: c.bg, borderLeft: `3px solid ${c.border}` }}>
                        <div className="font-bold" style={{ color: c.text }}>{aff.numero.replace('ELS','')}</div>
                        <div className="truncate" style={{ color: c.text, opacity: 0.8 }}>{aff.intitule}</div>
                        <div className="truncate" style={{ color: c.text, opacity: 0.55 }}>{aff.client}</div>
                        {slot.from && (
                          <div className="font-medium text-xs mt-0.5" style={{ color: c.text, opacity: 0.7 }}>{slot.from}–{slot.to}</div>
                        )}
                      </div>
                    )
                  }
                  return null
                })}

                {/* Comment display */}
                {cmt && !hol && (
                  <div className="px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 italic leading-snug">
                    💬 {cmt}
                  </div>
                )}

                {/* Technician can add/edit comment */}
                {!hol && (
                  <CommentField value={cmt || ''} onChange={v => setComment(key, v)} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CommentField({ value, onChange }) {
  const [open,  setOpen]  = useState(false)
  const [draft, setDraft] = useState(value)

  if (!open) return (
    <button onClick={() => { setDraft(value); setOpen(true) }}
      className={`w-full text-left text-xs px-1.5 py-1 rounded border border-dashed transition-colors ${
        value ? 'border-amber-300 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-300 hover:border-blue-300 hover:text-blue-400'
      }`}>
      {value ? `✎ ${value.slice(0,40)}${value.length>40?'…':''}` : '+ Ajouter un commentaire'}
    </button>
  )

  return (
    <div className="space-y-1">
      <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} autoFocus
        className="w-full border border-yellow-300 rounded px-2 py-1 text-xs bg-yellow-50 focus:outline-none resize-none text-slate-800 placeholder-slate-300"
        placeholder="Votre commentaire…" />
      <div className="flex gap-1">
        <button onClick={() => { onChange(draft); setOpen(false) }}
          className="flex-1 py-1 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600">
          OK
        </button>
        <button onClick={() => setOpen(false)}
          className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-400 hover:bg-white">
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Print timesheet ──────────────────────────────────────────────────────────
function printTimesheet(person, year, week, days, planning, timesheets, affaires) {
  const monday = getMondayOfWeek(year, week)
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)
  const fmt = d => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
  const weekRange = `${fmt(monday)} – ${fmt(friday)}`

  let totalWeek = 0
  const dayRows = days.map((date, di) => {
    const dateKey = toDateKey(date)
    const hol     = isHoliday(date)
    const key     = planningKey(person.id, year, week, di)
    const tsData  = timesheets[`${person.id}_${dateKey}`]
    const entries = tsData?.entries ?? initEntries(planning[key], affaires)
    const panier  = tsData?.panier ?? false
    const dayLabel = `${DAYS_LONG[di]}<br><small style="font-weight:400;color:#64748b">${date.getDate()} ${MONTHS_FR[date.getMonth()]}</small>`

    if (hol) return `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600">${dayLabel}</td><td colspan="6" style="padding:6px 8px;border:1px solid #e2e8f0;color:#94a3b8;font-style:italic">${hol}</td></tr>`

    const dayTotal = entries.reduce((s, e) => { if (e.isSpecial) return s; const h = calcH(e.from, e.to); return s + (h ?? 8) }, 0)
    totalWeek += dayTotal

    const firstRow = `<tr>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;white-space:nowrap;vertical-align:middle" rowspan="${entries.length || 1}">${dayLabel}</td>
      ${entries.length === 0
        ? `<td colspan="4" style="padding:6px 8px;border:1px solid #e2e8f0;color:#94a3b8;font-style:italic">Aucune activité</td>
           <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center">–</td>`
        : (() => {
            const e = entries[0]
            const h = !e.isSpecial ? (calcH(e.from, e.to) ?? 8) : null
            const zoneTxt = e.zone ? `${e.zone.label} (${e.zone.km} km)` : ''
            return `
              <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px">${e.label}</td>
              <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center">${e.from||'–'}</td>
              <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center">${e.to||'–'}</td>
              <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px">${e.location||''}</td>
              <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:9px;color:#7c3aed">${zoneTxt}</td>
              <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center;font-weight:bold;color:#1d4ed8">${h != null ? h+'h' : '–'}</td>`
          })()
      }
    </tr>`

    const extraRows = entries.slice(1).map(e => {
      const h = !e.isSpecial ? (calcH(e.from, e.to) ?? 8) : null
      const zoneTxt = e.zone ? `${e.zone.label} (${e.zone.km} km)` : ''
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px">${e.label}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center">${e.from||'–'}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center">${e.to||'–'}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px">${e.location||''}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#7c3aed">${zoneTxt}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center;font-weight:bold;color:#1d4ed8">${h != null ? h+'h' : '–'}</td>
      </tr>`
    }).join('')

    const commentRows = entries.filter(e => e.comment).map(e =>
      `<tr><td colspan="7" style="padding:2px 8px 4px;border:1px solid #e2e8f0;font-size:9px;color:#92400e;background:#fef9c3">💬 ${e.label}: ${e.comment}</td></tr>`
    ).join('')

    const panierRow = panier
      ? `<tr><td colspan="7" style="padding:2px 8px 4px;border:1px solid #e2e8f0;font-size:9px;color:#c2410c;background:#fff7ed">🍽 Panier repas</td></tr>`
      : ''

    return firstRow + extraRows + commentRows + panierRow
  }).join('')

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Feuille d'heures – ${person.prenom} ${person.nom} – S${week}/${year}</title>
<style>
  @page { size: A4 portrait; margin: 1.5cm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
  h2 { margin: 0 0 4px 0; font-size: 16px; }
  .sub { color: #64748b; margin: 0 0 16px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .footer { margin-top: 24px; display: flex; justify-content: space-between; }
  .sig { border-top: 1px solid #cbd5e1; width: 200px; padding-top: 4px; color: #94a3b8; font-size: 10px; text-align: center; }
</style></head><body>
<h2>Feuille d'heures — ${person.prenom} ${person.nom}</h2>
<p class="sub">${person.qualification} · Semaine ${week}/${year} · ${weekRange}</p>
<table>
  <thead><tr>
    <th style="width:100px">Jour</th>
    <th>Mission / Code</th>
    <th style="width:52px;text-align:center">Début</th>
    <th style="width:52px;text-align:center">Fin</th>
    <th style="width:120px">Lieu</th>
    <th style="width:90px">Zone dépl.</th>
    <th style="width:46px;text-align:center">Durée</th>
  </tr></thead>
  <tbody>${dayRows}
  <tr style="background:#f1f5f9">
    <td colspan="6" style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;text-align:right">Total semaine</td>
    <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;text-align:center;color:#1d4ed8">${totalWeek.toFixed(1)}h</td>
  </tr></tbody>
</table>
<div class="footer">
  <div class="sig">Signature du technicien</div>
  <div class="sig">Visa responsable</div>
</div>
</body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.onload = () => { w.focus(); w.print() }
}

// ─── Main TechnicienApp ───────────────────────────────────────────────────────
export default function TechnicienApp({ forcedPersonId }) {
  const appData = useAppData()
  const { personnel, affaires, planning, comments, timesheets, setComment, setTimesheetDay, setPlanningCell } = appData

  const [personId, setPersonId] = useState(() => forcedPersonId || sessionStorage.getItem('tech_id') || '')
  const [tab,      setTab]      = useState('planning')

  const { week: curWeek, year: curYear } = getCurrentWeekInfo()
  const [year, setYear] = useState(curYear)
  const [week, setWeek] = useState(curWeek)

  const person = personnel.find(p => p.id === personId)
  const days   = useMemo(() => getWorkDays(year, week), [year, week])

  const monday = getMondayOfWeek(year, week)
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)

  function login(id) {
    setPersonId(id)
    sessionStorage.setItem('tech_id', id)
    setTab('planning')
    setYear(curYear)
    setWeek(curWeek)
  }
  function logout() {
    setPersonId('')
    sessionStorage.removeItem('tech_id')
  }
  function prevWeek() { const r = addWeeks(year, week, -1); setYear(r.year); setWeek(r.week) }
  function nextWeek() { const r = addWeeks(year, week,  1); setYear(r.year); setWeek(r.week) }
  function goToday()  { setYear(curYear); setWeek(curWeek) }

  // ── Login screen — uniquement pour accès direct via technicien.html ─────────
  if (!person && !forcedPersonId) {
    const plannable = personnel.filter(p => p.actif !== false && p.role !== 'CA' && p.role !== 'RS')
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">ELS Énergie</div>
          <div className="text-slate-500 text-sm">Espace technicien — Identification</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Qui êtes-vous ?</h2>
          <div className="space-y-2">
            {plannable.map(p => (
              <button key={p.id} onClick={() => login(p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-left transition-colors group">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 group-hover:bg-blue-200">
                  {p.prenom[0]}{p.nom[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.prenom} {p.nom}</p>
                  <p className="text-xs text-slate-400">{p.qualification}</p>
                </div>
              </button>
            ))}
          </div>
          {plannable.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">
              Aucun technicien configuré. Demandez à votre responsable d'ajouter du personnel.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Accès admin : <a href="/" className="underline hover:text-blue-500">Planning ELS</a>
        </p>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        Chargement…
      </div>
    )
  }

  // ── Connected view ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold shrink-0">
          {person.prenom[0]}{person.nom[0]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-none">Bonjour, {person.prenom} 👋</p>
          <p className="text-xs text-slate-400 mt-0.5">{person.qualification} · ELS Énergie</p>
        </div>
        <button onClick={logout}
          className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
          Changer
        </button>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-slate-200 px-4 flex shrink-0">
        {[
          { id: 'planning',   label: '📅 Mon planning' },
          { id: 'timesheet',  label: '📋 Feuille d\'heures' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Week nav */}
      <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={prevWeek} className="px-2 py-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 text-sm">‹</button>
        <span className="text-sm font-medium text-slate-700">
          Semaine {week} · {fmtShort(monday)} – {fmtShort(friday)}
        </span>
        <button onClick={nextWeek} className="px-2 py-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 text-sm">›</button>
        <button onClick={goToday} className="px-2.5 py-1 border border-slate-200 rounded text-xs text-slate-500 hover:bg-slate-50">Auj.</button>

        {tab === 'timesheet' && (
          <button onClick={() => printTimesheet(person, year, week, days, planning, timesheets, affaires)}
            className="ml-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-colors">
            🖨 Imprimer
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-5">
          {tab === 'planning' && (
            <WeekPlanningTab
              person={person} affaires={affaires} planning={planning}
              comments={comments} setComment={setComment}
              year={year} week={week} days={days}
            />
          )}
          {tab === 'timesheet' && (
            <WeekTimesheetTab
              person={person} affaires={affaires} planning={planning}
              timesheets={timesheets} setTimesheetDay={setTimesheetDay} setPlanningCell={setPlanningCell}
              year={year} week={week} days={days}
            />
          )}
        </div>
      </div>
    </div>
  )
}
