import { useState, useRef } from 'react'
import { useApp } from '../../App'
import {
  getCurrentWeekInfo, getWorkDays, planningKey, isHoliday,
  getMondayOfWeek, formatShortDate, formatDayShort, addWeeks, getISOWeek, getISOYear, toDateKey,
} from '../../utils/weeks'
import { getAffaireColor, SPECIAL_CODES, PERSON_TYPE_COLORS, QUALIF_CLASS } from '../../utils/colors'
import { getCellSlots } from '../../utils/slots'

function getMonthWeeks(year, month) {
  // Returns all ISO weeks that overlap with the given month (0-indexed)
  const weeks = []
  const seen = new Set()
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const w = getISOWeek(new Date(d))
    const y = getISOYear(new Date(d))
    const key = `${y}-W${w}`
    if (!seen.has(key)) { seen.add(key); weeks.push({ year: y, week: w }) }
  }
  return weeks
}

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAY_NAMES   = ['Lun','Mar','Mer','Jeu','Ven']

export default function PlanningIndividuel() {
  const { personnel, affaires, planning, comments } = useApp()
  const printRef = useRef(null)

  const cur = getCurrentWeekInfo()
  const [personId, setPersonId]     = useState('')
  const [mode, setMode]             = useState('week')  // 'week' | 'month'
  const [navWeek, setNavWeek]       = useState({ week: cur.week, year: cur.year })
  const [navMonth, setNavMonth]     = useState({ year: cur.year, month: new Date().getMonth() })

  const plannable = personnel.filter(p => p.actif && p.role !== 'CA' && p.role !== 'RS')
  const person = plannable.find(p => p.id === personId)

  // Weeks to display
  const displayWeeks = mode === 'week'
    ? [navWeek]
    : getMonthWeeks(navMonth.year, navMonth.month)

  function prevPeriod() {
    if (mode === 'week') setNavWeek(prev => addWeeks(prev.year, prev.week, -1))
    else setNavMonth(prev => {
      const m = prev.month - 1
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m }
    })
  }
  function nextPeriod() {
    if (mode === 'week') setNavWeek(prev => addWeeks(prev.year, prev.week, 1))
    else setNavMonth(prev => {
      const m = prev.month + 1
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m }
    })
  }
  function goToday() {
    setNavWeek({ week: cur.week, year: cur.year })
    setNavMonth({ year: cur.year, month: new Date().getMonth() })
  }

  const periodLabel = mode === 'week'
    ? `Semaine ${navWeek.week} — ${formatShortDate(getMondayOfWeek(navWeek.year, navWeek.week))}`
    : `${MONTH_NAMES[navMonth.month]} ${navMonth.year}`

  function buildDayCellHTML(year, week, di) {
    const days = getWorkDays(year, week)
    const date  = days[di]
    if (!date) return '<td style="border:1px solid #e2e8f0"></td>'

    const holiday = isHoliday(date)
    const isT     = toDateKey(date) === todayKey
    const dayNum  = date.getDate()
    const hdrBg   = isT ? '#dbeafe' : holiday ? '#f8fafc' : '#f1f5f9'
    const hdrClr  = isT ? '#1d4ed8' : '#475569'

    let content = ''
    if (holiday) {
      content = `<div style="font-size:7px;font-style:italic;color:#94a3b8;padding:3px">${holiday}</div>`
    } else {
      const key   = planningKey(person.id, year, week, di)
      const slots = getCellSlots(planning[key])
      const cmt   = comments[key]

      slots.forEach(slot => {
        const aff = affaires.find(a => a.id === slot.id)
        const sp  = SPECIAL_CODES[slot.id]
        if (sp) {
          content += `<div style="border-radius:2px;padding:2px 3px;margin-bottom:2px;border-left:3px solid ${sp.border};background:${sp.bg}">
            <div style="font-weight:bold;font-size:8px;color:${sp.text}">${slot.id}${slot.from ? ` ${slot.from}–${slot.to}` : ''}</div>
            <div style="font-size:7px;color:${sp.text};opacity:0.85">${sp.label}</div>
          </div>`
        } else if (aff) {
          const c = getAffaireColor(aff.colorIndex)
          content += `<div style="border-radius:2px;padding:2px 3px;margin-bottom:2px;border-left:3px solid ${c.border};background:${c.bg}">
            <div style="font-weight:bold;font-size:8px;color:${c.text}">${aff.numero.replace('ELS','')}${slot.from ? ` ${slot.from}–${slot.to}` : ''}</div>
            <div style="font-size:7.5px;color:${c.text};opacity:0.85">${aff.intitule}</div>
            <div style="font-size:7px;color:${c.text};opacity:0.65">${aff.client}</div>
          </div>`
        }
      })

      if (slots.length === 0) {
        content += `<div style="color:#cbd5e1;font-size:7px;font-style:italic;padding:2px 0">Non planifié</div>`
      }
      if (cmt) {
        content += `<div style="margin-top:2px;padding:2px 3px;background:#fef9c3;border-radius:2px;font-size:7.5px;color:#78350f;font-style:italic;line-height:1.35">💬 ${cmt}</div>`
      }
    }

    return `<td style="border:1px solid #e2e8f0;padding:0;vertical-align:top">
      <div style="background:${hdrBg};padding:2px 4px;font-weight:bold;font-size:8px;color:${hdrClr};border-bottom:1px solid #e2e8f0">${dayNum}</div>
      <div style="padding:3px">${content}</div>
    </td>`
  }

  function handlePrint() {
    if (!person) return
    const printWindow = window.open('', '_blank')

    const DAY_LABELS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi']
    const weekRows = displayWeeks.map(({ year, week }) => {
      const monday = getMondayOfWeek(year, week)
      const cells  = [0,1,2,3,4].map(di => buildDayCellHTML(year, week, di)).join('')
      return `<tr>
        <td style="width:44px;padding:3px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;font-size:8.5px;color:#475569;vertical-align:top;white-space:nowrap">
          S${week}<br><span style="font-weight:normal;font-size:7px">${formatShortDate(monday)}</span>
        </td>
        ${cells}
      </tr>`
    }).join('')

    const legendItems = affaires.filter(a => a.statut === 'active').map(a => {
      const c = getAffaireColor(a.colorIndex)
      return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:7.5px;color:#475569;margin-right:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${c.border};flex-shrink:0;display:inline-block"></span>
        ${a.numero} — ${a.intitule}
      </span>`
    }).join('')

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Planning ${person.prenom} ${person.nom} — ${periodLabel}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:9px;color:#1e293b;background:white;padding:0}
        @page{size:A4 landscape;margin:0.8cm}
      </style>
    </head><body>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
        <tr>
          <td style="vertical-align:top">
            <div style="font-size:15px;font-weight:bold;color:#0f172a">${person.prenom} ${person.nom}</div>
            <div style="font-size:9px;color:#64748b;margin-top:2px">${person.qualification} · ${person.type}${person.societe ? ' · ' + person.societe : ''}</div>
          </td>
          <td style="text-align:right;vertical-align:top">
            <div style="font-weight:bold;font-size:10px">ELS Énergie — Planning ${mode === 'week' ? 'hebdomadaire' : 'mensuel'}</div>
            <div style="font-size:9px;color:#64748b">${periodLabel}</div>
            <div style="font-size:8px;color:#94a3b8">Édité le ${new Date().toLocaleDateString('fr-FR')}</div>
          </td>
        </tr>
      </table>
      <div style="border-top:2px solid #1e293b;margin-bottom:6px"></div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <td style="width:44px;background:#e2e8f0;padding:2px 4px;border:1px solid #e2e8f0;font-size:8px;font-weight:bold;color:#475569"></td>
            ${DAY_LABELS.map(d => `<td style="background:#e2e8f0;padding:2px 4px;border:1px solid #e2e8f0;font-size:8.5px;font-weight:bold;color:#475569;text-align:center">${d}</td>`).join('')}
          </tr>
        </thead>
        <tbody>${weekRows}</tbody>
      </table>
      <div style="margin-top:6px;padding-top:5px;border-top:1px solid #e2e8f0;line-height:1.8">${legendItems}</div>
    </body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onload = () => { printWindow.print(); printWindow.close() }
    setTimeout(() => { try { printWindow.print(); printWindow.close() } catch {} }, 800)
  }

  // Build day slots for one person
  function getDayData(year, week, dayIndex) {
    if (!person) return null
    const days = getWorkDays(year, week)
    const date  = days[dayIndex]
    if (!date) return null
    const holiday = isHoliday(date)
    if (holiday) return { date, holiday }
    const key   = planningKey(person.id, year, week, dayIndex)
    const slots = getCellSlots(planning[key])
    return { date, slots }
  }

  const todayKey = toDateKey(new Date())

  return (
    <div className="h-full overflow-y-auto p-6">

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-xs text-slate-500 font-medium mb-1">Technicien</label>
          <select
            value={personId}
            onChange={e => setPersonId(e.target.value)}
            className="input-dark text-sm w-56"
          >
            <option value="">— Sélectionner —</option>
            {plannable.map(p => (
              <option key={p.id} value={p.id}>{p.prenom} {p.nom} ({p.qualification})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 font-medium mb-1">Période</label>
          <div className="flex gap-1">
            <button onClick={() => setMode('week')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${mode === 'week' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
              Semaine
            </button>
            <button onClick={() => setMode('month')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${mode === 'month' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
              Mois
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 font-medium mb-1">Navigation</label>
          <div className="flex items-center gap-2">
            <button onClick={prevPeriod} className="w-8 h-8 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded flex items-center justify-center text-xs transition-colors">◀</button>
            <span className="text-slate-800 text-sm font-medium min-w-[200px] text-center">{periodLabel}</span>
            <button onClick={nextPeriod} className="w-8 h-8 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded flex items-center justify-center text-xs transition-colors">▶</button>
            <button onClick={goToday} className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded text-xs transition-colors">Aujourd'hui</button>
          </div>
        </div>

        {person && (
          <div className="ml-auto">
            <label className="block text-xs text-slate-500 font-medium mb-1">Export</label>
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              🖨 Imprimer / PDF
            </button>
          </div>
        )}
      </div>

      {!person && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <div className="text-4xl mb-3">👤</div>
          <div className="text-lg font-medium text-slate-500">Sélectionnez un technicien</div>
          <div className="text-sm mt-1">pour visualiser et exporter son planning</div>
        </div>
      )}

      {/* ── Planning view ─────────────────────────────────────────── */}
      {person && (
        <div ref={printRef} id="print-area">

          {/* En-tête imprimable */}
          <div className="flex items-center justify-between mb-5 print-header">
            <div className="flex items-center gap-3">
              {(() => {
                const tc = PERSON_TYPE_COLORS[person.type] || { bg: '#94a3b8', text: '#fff' }
                return (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
                    style={{ background: tc.bg, color: tc.text }}>
                    {person.prenom[0]}{person.nom[0]}
                  </div>
                )
              })()}
              <div>
                <div className="text-xl font-bold text-slate-900">{person.prenom} {person.nom}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${QUALIF_CLASS[person.qualification] || 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                    {person.qualification}
                  </span>
                  <span className="text-slate-400 text-sm">{person.type}</span>
                  {person.societe && <span className="text-slate-400 text-sm">· {person.societe}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 text-sm">ELS Énergie — Planning {mode === 'week' ? 'hebdomadaire' : 'mensuel'}</div>
              <div className="text-slate-700 font-semibold">{periodLabel}</div>
              <div className="text-slate-400 text-xs mt-0.5">Édité le {new Date().toLocaleDateString('fr-FR')}</div>
            </div>
          </div>

          {/* Semaines */}
          <div className="space-y-4">
            {displayWeeks.map(({ year, week }) => {
              const monday = getMondayOfWeek(year, week)
              const isCurWeek = week === cur.week && year === cur.year
              const days = [0, 1, 2, 3, 4].map(di => getDayData(year, week, di))

              // Count assigned days this week
              const assignedCount = days.filter(d => d && !d.holiday && d.slots && d.slots.length > 0).length
              const holidayCount  = days.filter(d => d?.holiday).length
              const workable      = 5 - holidayCount

              return (
                <div key={`${year}-W${week}`}
                  className={`bg-white rounded-xl border ${isCurWeek ? 'border-blue-300' : 'border-slate-200'} overflow-hidden shadow-sm`}>
                  {/* Week header */}
                  <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isCurWeek ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm ${isCurWeek ? 'text-blue-700' : 'text-slate-700'}`}>
                        Semaine {week}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {formatShortDate(monday)} — {formatShortDate(new Date(monday.getTime() + 4 * 86400000))}
                      </span>
                      {isCurWeek && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Semaine courante</span>}
                    </div>
                    <span className="text-xs text-slate-400">
                      {assignedCount}/{workable} jour{workable > 1 ? 's' : ''} planifié{assignedCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-5 divide-x divide-slate-100">
                    {days.map((dayData, di) => {
                      if (!dayData) return <div key={di} className="p-3 min-h-[80px]" />
                      const { date, holiday, slots } = dayData
                      const isT = toDateKey(date) === todayKey
                      const isPast = toDateKey(date) < todayKey

                      return (
                        <div key={di} className={`p-2.5 min-h-[80px] ${holiday ? 'bg-slate-50' : isPast ? 'bg-white' : 'bg-white'}`}>
                          {/* Day header */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {isT ? (
                              <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {date.getDate()}
                              </span>
                            ) : (
                              <span className={`text-xs font-semibold ${holiday ? 'text-slate-300 line-through' : isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                                {date.getDate()}
                              </span>
                            )}
                            <span className={`text-xs ${holiday ? 'text-slate-300' : 'text-slate-400'}`}>
                              {DAY_NAMES[di]}
                            </span>
                          </div>

                          {holiday && (
                            <div className="text-xs text-slate-300 italic leading-tight">{holiday}</div>
                          )}

                          {!holiday && slots && slots.length > 0 && slots.map((slot, si) => {
                            const aff = affaires.find(a => a.id === slot.id)
                            const sp  = SPECIAL_CODES[slot.id]

                            if (sp) {
                              return (
                                <div key={si} className="mb-1 rounded px-2 py-1 text-xs font-semibold"
                                  style={{ background: sp.bg, borderLeft: `3px solid ${sp.border}`, color: sp.text }}>
                                  {slot.id}
                                  {slot.from && <span className="font-normal ml-1 opacity-75">{slot.from}–{slot.to}</span>}
                                  <div className="font-normal opacity-75">{sp.label}</div>
                                </div>
                              )
                            }

                            if (aff) {
                              const c = getAffaireColor(aff.colorIndex)
                              return (
                                <div key={si} className="mb-1 rounded px-2 py-1 text-xs"
                                  style={{ background: c.bg, borderLeft: `3px solid ${c.border}` }}>
                                  <div className="font-bold" style={{ color: c.text }}>{aff.numero.replace('ELS','')}</div>
                                  <div className="truncate" style={{ color: c.text, opacity: 0.8 }}>{aff.intitule}</div>
                                  <div className="truncate" style={{ color: c.text, opacity: 0.6 }}>{aff.client}</div>
                                  {slot.from && (
                                    <div className="font-medium mt-0.5" style={{ color: c.text, opacity: 0.75 }}>{slot.from}–{slot.to}</div>
                                  )}
                                </div>
                              )
                            }
                            return null
                          })}

                          {!holiday && (!slots || slots.length === 0) && (
                            <div className="text-xs text-slate-200 italic">Non planifié</div>
                          )}
                          {!holiday && comments[planningKey(person.id, year, week, di)] && (
                            <div className="mt-1 px-1.5 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 italic leading-snug">
                              💬 {comments[planningKey(person.id, year, week, di)]}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Légende */}
          <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap gap-3">
            {affaires.filter(a => a.statut === 'active').map(a => {
              const c = getAffaireColor(a.colorIndex)
              return (
                <div key={a.id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.border }} />
                  <span className="text-xs text-slate-600">{a.numero} — {a.intitule}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
