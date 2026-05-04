import { useState, useMemo } from 'react'
import { useApp } from '../../App'
import { SPECIAL_CODES, getAffaireColor } from '../../utils/colors'
import { getCellSlots } from '../../utils/slots'
import {
  getWorkDays, getCurrentWeekInfo, getMondayOfWeek, addWeeks,
  planningKey, toDateKey, isHoliday, getISOWeek, getISOYear,
} from '../../utils/weeks'

const DAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven']
const MONTHS_FR  = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']

function fmtD(d) { return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}` }
function fmtShort(d) { return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}` }

function toMin(s) {
  if (!s) return null
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
function calcH(from, to) {
  const f = toMin(from), t = toMin(to)
  if (f == null || t == null) return null
  const d = t - f; return d > 0 ? d / 60 : null
}

// Get resolved entries for one person/day — timesheet first, planning as fallback
function getDayData(personId, date, di, year, week, planning, timesheets) {
  const dateKey = toDateKey(date)
  const ts = timesheets[`${personId}_${dateKey}`]
  if (ts?.entries?.length > 0) {
    return { entries: ts.entries, panier: ts.panier ?? false, confirmed: true }
  }
  const planVal = planning[planningKey(personId, year, week, di)]
  if (planVal) {
    const slots = getCellSlots(planVal)
    return {
      entries: slots.map(s => ({ id: s.id, from: s.from, to: s.to, isSpecial: !!SPECIAL_CODES[s.id] })),
      panier: false,
      confirmed: false,
    }
  }
  return null
}

function entryHours(e) {
  if (e.isSpecial) return 0
  return calcH(e.from, e.to) ?? 8
}

function dayHours(data) {
  if (!data) return 0
  return data.entries.reduce((s, e) => s + entryHours(e), 0)
}

// ─── Cell badge for "par technicien" table ────────────────────────────────────
function DayCell({ data, affaires }) {
  if (!data) return <td className="border border-slate-100 text-center text-slate-200 text-xs py-2 px-1">–</td>

  const { entries, panier, confirmed } = data
  const total = dayHours(data)

  const dots = entries.slice(0, 2).map((e, i) => {
    const aff = affaires.find(a => a.id === e.id)
    const sp  = SPECIAL_CODES[e.id]
    const col = aff ? getAffaireColor(aff.colorIndex).border : (sp?.border ?? '#94a3b8')
    const lbl = aff ? aff.numero.replace('ELS','') : (sp ? e.id : e.id)
    return (
      <span key={i} className="inline-flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col }} />
        <span className="text-xs" style={{ color: col }}>{lbl}</span>
      </span>
    )
  })

  return (
    <td className={`border border-slate-100 text-center py-1.5 px-1 align-top ${confirmed ? 'bg-white' : 'bg-slate-50'}`}>
      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-xs font-bold ${confirmed ? 'text-slate-800' : 'text-slate-400'}`}>
          {total > 0 ? `${total % 1 === 0 ? total : total.toFixed(1)}h` : ''}
        </span>
        <div className="flex flex-wrap gap-0.5 justify-center">{dots}</div>
        {panier && <span className="text-xs" title="Panier repas">🍽</span>}
        {!confirmed && total > 0 && (
          <span className="text-xs text-slate-300" title="Données du planning (non confirmé)">◌</span>
        )}
      </div>
    </td>
  )
}

// ─── Par technicien view ──────────────────────────────────────────────────────
function ViewParTechnicien({ personnel, affaires, planning, timesheets, year, week, days }) {
  const plannable = personnel.filter(p => p.actif !== false && p.role !== 'CA' && p.role !== 'RS')

  const rows = plannable.map(person => {
    const dayData = days.map((date, di) => {
      const hol = isHoliday(date)
      return hol ? null : getDayData(person.id, date, di, year, week, planning, timesheets)
    })
    const totalH       = dayData.reduce((s, d) => s + dayHours(d), 0)
    const confirmedH   = dayData.reduce((s, d) => d?.confirmed ? s + dayHours(d) : s, 0)
    const panierCount  = dayData.filter(d => d?.panier).length
    const filledDays   = dayData.filter(d => d?.confirmed).length

    return { person, dayData, totalH, confirmedH, panierCount, filledDays }
  })

  const colTotals = days.map((_, di) => {
    return rows.reduce((s, r) => s + dayHours(r.dayData[di]), 0)
  })
  const grandTotal = colTotals.reduce((a, b) => a + b, 0)
  const totalPaniers = rows.reduce((s, r) => s + r.panierCount, 0)

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border border-slate-200 rounded inline-block" /> Confirmé (feuille d'heures)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-100 rounded inline-block" /><span className="text-slate-400">◌</span> Planifié (non confirmé)</span>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 w-40">Technicien</th>
            {days.map((date, di) => {
              const hol = isHoliday(date)
              return (
                <th key={di} className={`border border-slate-200 px-2 py-2 text-center text-xs font-semibold ${hol ? 'text-slate-300' : 'text-slate-600'} min-w-[80px]`}>
                  <div>{DAYS_SHORT[di]}</div>
                  <div className="font-normal text-slate-400">{fmtD(date)}</div>
                  {hol && <div className="font-normal text-slate-300 text-xs italic truncate max-w-[70px]">{hol}</div>}
                </th>
              )
            })}
            <th className="border border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-600 w-16">Total</th>
            <th className="border border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-600 w-12" title="Paniers repas">🍽</th>
            <th className="border border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-600 w-20">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ person, dayData, totalH, confirmedH, panierCount, filledDays }) => (
            <tr key={person.id} className="hover:bg-blue-50/30 transition-colors">
              <td className="border border-slate-100 px-3 py-2">
                <div className="font-medium text-slate-800 text-sm">{person.prenom} {person.nom}</div>
                <div className="text-xs text-slate-400">{person.qualification}</div>
              </td>
              {dayData.map((d, di) => {
                if (isHoliday(days[di])) {
                  return <td key={di} className="border border-slate-100 bg-slate-50" />
                }
                return <DayCell key={di} data={d} affaires={affaires} />
              })}
              <td className="border border-slate-100 text-center font-bold text-sm text-slate-800 py-2 px-2">
                {totalH > 0 ? `${totalH % 1 === 0 ? totalH : totalH.toFixed(1)}h` : '–'}
                {confirmedH < totalH && totalH > 0 && (
                  <div className="text-xs font-normal text-slate-400">{confirmedH > 0 ? `${confirmedH.toFixed(0)}h conf.` : 'non conf.'}</div>
                )}
              </td>
              <td className="border border-slate-100 text-center text-sm py-2">
                {panierCount > 0 ? <span className="font-semibold text-orange-600">{panierCount}</span> : <span className="text-slate-200">–</span>}
              </td>
              <td className="border border-slate-100 text-center py-2 px-1">
                {filledDays === 0
                  ? <span className="text-xs text-red-400 font-medium">Non remplie</span>
                  : filledDays < 5
                    ? <span className="text-xs text-amber-500 font-medium">{filledDays}/5 jours</span>
                    : <span className="text-xs text-green-600 font-medium">Complète ✓</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold">
            <td className="border border-slate-200 px-3 py-2 text-xs text-slate-500 uppercase tracking-wide">Total</td>
            {colTotals.map((h, di) => (
              <td key={di} className="border border-slate-200 text-center text-sm py-2 text-slate-700">
                {isHoliday(days[di]) ? '' : h > 0 ? `${h % 1 === 0 ? h : h.toFixed(1)}h` : '–'}
              </td>
            ))}
            <td className="border border-slate-200 text-center text-sm py-2 text-blue-700 font-bold">
              {grandTotal % 1 === 0 ? grandTotal : grandTotal.toFixed(1)}h
            </td>
            <td className="border border-slate-200 text-center text-sm py-2 text-orange-600 font-bold">
              {totalPaniers > 0 ? totalPaniers : '–'}
            </td>
            <td className="border border-slate-200" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Par affaire view ─────────────────────────────────────────────────────────
function ViewParAffaire({ personnel, affaires, planning, timesheets, year, week, days }) {
  const plannable = personnel.filter(p => p.actif !== false && p.role !== 'CA' && p.role !== 'RS')
  const [expanded, setExpanded] = useState(null)

  // For each affaire, compute hours from all people
  const affaireStats = useMemo(() => {
    const stats = {} // affaireId → { confirmed, planned, people: {personId → {confirmed, planned}} }

    plannable.forEach(person => {
      days.forEach((date, di) => {
        if (isHoliday(date)) return
        const d = getDayData(person.id, date, di, year, week, planning, timesheets)
        if (!d) return
        d.entries.forEach(e => {
          if (e.isSpecial) return
          const h = entryHours(e)
          if (!stats[e.id]) stats[e.id] = { confirmed: 0, planned: 0, people: {} }
          if (!stats[e.id].people[person.id]) stats[e.id].people[person.id] = { confirmed: 0, planned: 0 }
          if (d.confirmed) {
            stats[e.id].confirmed += h
            stats[e.id].people[person.id].confirmed += h
          } else {
            stats[e.id].planned += h
            stats[e.id].people[person.id].planned += h
          }
        })
      })
    })
    return stats
  }, [plannable, days, year, week, planning, timesheets])

  const affaireList = affaires
    .filter(a => affaireStats[a.id])
    .sort((a, b) => {
      const ta = (affaireStats[a.id]?.confirmed ?? 0) + (affaireStats[a.id]?.planned ?? 0)
      const tb = (affaireStats[b.id]?.confirmed ?? 0) + (affaireStats[b.id]?.planned ?? 0)
      return tb - ta
    })

  if (affaireList.length === 0) {
    return <p className="text-sm text-slate-400 italic py-8 text-center">Aucune heure planifiée cette semaine.</p>
  }

  return (
    <div className="space-y-2">
      {affaireList.map(aff => {
        const stat = affaireStats[aff.id]
        const total = stat.confirmed + stat.planned
        const c = getAffaireColor(aff.colorIndex)
        const isOpen = expanded === aff.id
        const peopleList = Object.entries(stat.people)
          .map(([pid, h]) => ({ person: personnel.find(p => p.id === pid), ...h }))
          .filter(x => x.person)
          .sort((a, b) => (b.confirmed + b.planned) - (a.confirmed + a.planned))

        return (
          <div key={aff.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => setExpanded(isOpen ? null : aff.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.border }} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-slate-800">{aff.numero}</span>
                <span className="text-slate-500 text-sm ml-2 truncate">{aff.intitule}</span>
                <span className="text-xs text-slate-400 ml-2">{aff.client}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {stat.confirmed > 0 && (
                  <span className="text-sm font-bold text-slate-800">
                    {stat.confirmed % 1 === 0 ? stat.confirmed : stat.confirmed.toFixed(1)}h
                    <span className="text-xs font-normal text-green-600 ml-1">confirmées</span>
                  </span>
                )}
                {stat.planned > 0 && (
                  <span className="text-sm text-slate-400">
                    +{stat.planned % 1 === 0 ? stat.planned : stat.planned.toFixed(1)}h
                    <span className="text-xs ml-1">planifiées</span>
                  </span>
                )}
                <span className="text-blue-600 font-bold text-sm">
                  {total % 1 === 0 ? total : total.toFixed(1)}h total
                </span>
                <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase tracking-wide">
                      <th className="text-left pb-2 font-medium">Technicien</th>
                      <th className="text-right pb-2 font-medium">Confirmé</th>
                      <th className="text-right pb-2 font-medium">Planifié</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peopleList.map(({ person, confirmed, planned }) => (
                      <tr key={person.id} className="border-t border-slate-100">
                        <td className="py-1.5">
                          <span className="font-medium text-slate-700">{person.prenom} {person.nom}</span>
                          <span className="text-xs text-slate-400 ml-2">{person.qualification}</span>
                        </td>
                        <td className="py-1.5 text-right font-semibold text-slate-800">
                          {confirmed > 0 ? `${confirmed % 1 === 0 ? confirmed : confirmed.toFixed(1)}h` : '–'}
                        </td>
                        <td className="py-1.5 text-right text-slate-400">
                          {planned > 0 ? `${planned % 1 === 0 ? planned : planned.toFixed(1)}h` : '–'}
                        </td>
                        <td className="py-1.5 text-right font-bold text-blue-700">
                          {(confirmed + planned) % 1 === 0 ? (confirmed + planned) : (confirmed + planned).toFixed(1)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Progress bar: confirmed vs planned */}
                {total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Taux de confirmation</span>
                      <span>{Math.round((stat.confirmed / total) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(stat.confirmed / total) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RecapHeures() {
  const { personnel, affaires, planning, timesheets } = useApp()
  const { week: curWeek, year: curYear } = getCurrentWeekInfo()
  const [year, setYear] = useState(curYear)
  const [week, setWeek] = useState(curWeek)
  const [view, setView] = useState('technicien') // 'technicien' | 'affaire'

  const days   = useMemo(() => getWorkDays(year, week), [year, week])
  const monday = getMondayOfWeek(year, week)
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)

  function prev() { const r = addWeeks(year, week, -1); setYear(r.year); setWeek(r.week) }
  function next() { const r = addWeeks(year, week,  1); setYear(r.year); setWeek(r.week) }
  function today(){ setYear(curYear); setWeek(curWeek) }

  const isCurrent = year === curYear && week === curWeek

  // Quick stats for header
  const plannable = personnel.filter(p => p.actif !== false && p.role !== 'CA' && p.role !== 'RS')
  const confirmedCount = plannable.filter(person =>
    days.some((date, di) => {
      if (isHoliday(date)) return false
      return !!timesheets[`${person.id}_${toDateKey(date)}`]
    })
  ).length

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mr-2">Récap feuilles d'heures</h2>

          {/* Week nav */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white overflow-hidden">
            <button onClick={prev} className="px-3 py-2 hover:bg-slate-50 text-slate-500 text-sm">‹</button>
            <span className="px-3 py-2 text-sm font-medium text-slate-700 border-x border-slate-200">
              S{week} · {fmtShort(monday)} – {fmtShort(friday)} {year}
            </span>
            <button onClick={next} className="px-3 py-2 hover:bg-slate-50 text-slate-500 text-sm">›</button>
          </div>
          {!isCurrent && (
            <button onClick={today} className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 hover:bg-white bg-slate-50">
              Semaine courante
            </button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex border border-slate-200 rounded-lg overflow-hidden bg-white">
            <button onClick={() => setView('technicien')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'technicien' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Par technicien
            </button>
            <button onClick={() => setView('affaire')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'affaire' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              Par affaire
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div className="text-xs text-slate-400 mb-0.5">Techniciens actifs</div>
            <div className="text-2xl font-bold text-slate-800">{plannable.length}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div className="text-xs text-slate-400 mb-0.5">Feuilles remplies</div>
            <div className="text-2xl font-bold text-slate-800">
              {confirmedCount}
              <span className="text-sm font-normal text-slate-400 ml-1">/ {plannable.length}</span>
            </div>
          </div>
          <div className={`border rounded-xl px-4 py-3 ${confirmedCount === plannable.length ? 'bg-green-50 border-green-200' : confirmedCount === 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="text-xs text-slate-400 mb-0.5">Statut semaine</div>
            <div className={`text-sm font-bold ${confirmedCount === plannable.length ? 'text-green-700' : confirmedCount === 0 ? 'text-red-600' : 'text-amber-700'}`}>
              {confirmedCount === plannable.length
                ? '✓ Toutes confirmées'
                : confirmedCount === 0
                  ? 'Aucune remplie'
                  : `${plannable.length - confirmedCount} en attente`}
            </div>
          </div>
        </div>

        {/* Main view */}
        {view === 'technicien' && (
          <ViewParTechnicien
            personnel={personnel} affaires={affaires}
            planning={planning} timesheets={timesheets}
            year={year} week={week} days={days}
          />
        )}
        {view === 'affaire' && (
          <ViewParAffaire
            personnel={personnel} affaires={affaires}
            planning={planning} timesheets={timesheets}
            year={year} week={week} days={days}
          />
        )}
      </div>
    </div>
  )
}
