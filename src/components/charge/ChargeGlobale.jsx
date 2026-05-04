import { useState } from 'react'
import { useApp } from '../../App'
import { getCurrentWeekInfo, getWorkDays, planningKey, isHoliday, addWeeks, getMondayOfWeek, formatShortDate } from '../../utils/weeks'
import { getAffaireColor } from '../../utils/colors'
import { getCellSlots } from '../../utils/slots'

const PAGE_WEEKS = 10

export default function ChargeGlobale() {
  const { personnel, affaires, planning, selectedCA } = useApp()
  const cur = getCurrentWeekInfo()
  const [nav, setNav] = useState({ week: cur.week, year: cur.year })

  const weeks = []
  for (let i = 0; i < PAGE_WEEKS; i++) {
    weeks.push(addWeeks(nav.year, nav.week, i))
  }

  const filteredAffaires = affaires.filter(a => {
    if (selectedCA && a.caId !== selectedCA) return false
    return a.statut !== 'terminée'
  })

  function countForAffaire(affaireId, year, week) {
    return personnel.filter(p => p.actif && p.role !== 'CA' && p.role !== 'RS').reduce((n, p) => {
      const days = getWorkDays(year, week)
      const assigned = days.some((d, di) => {
        if (isHoliday(d)) return false
        const k = planningKey(p.id, year, week, di)
        return getCellSlots(planning[k]).some(s => s.id === affaireId)
      })
      return assigned ? n + 1 : n
    }, 0)
  }

  function totalForWeek(year, week) {
    const affaireIds = new Set(affaires.map(a => a.id))
    return personnel.filter(p => p.actif && p.role !== 'CA' && p.role !== 'RS').reduce((n, p) => {
      const days = getWorkDays(year, week)
      const assigned = days.some((d, di) => {
        if (isHoliday(d)) return false
        const k = planningKey(p.id, year, week, di)
        return getCellSlots(planning[k]).some(s => affaireIds.has(s.id))
      })
      return assigned ? n + 1 : n
    }, 0)
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-slate-900 font-semibold text-lg">Charge globale</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setNav(prev => addWeeks(prev.year, prev.week, -PAGE_WEEKS))}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded text-sm transition-colors">◀ Préc.</button>
          <button onClick={() => setNav({ week: cur.week, year: cur.year })}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors">Aujourd'hui</button>
          <button onClick={() => setNav(prev => addWeeks(prev.year, prev.week, PAGE_WEEKS))}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded text-sm transition-colors">Suiv. ▶</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-50 text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-2 border-b border-slate-200 border-r border-slate-200 min-w-[260px]">
                Affaire
              </th>
              {weeks.map(({ year, week }, i) => {
                const mon = getMondayOfWeek(year, week)
                const isCur = week === cur.week && year === cur.year
                return (
                  <th key={i} className={`text-xs font-medium px-3 py-2 border-b border-slate-200 text-center min-w-[80px] ${isCur ? 'text-blue-600' : 'text-slate-500'}`}>
                    <div>S{week}</div>
                    <div className="text-slate-400 font-normal">{formatShortDate(mon)}</div>
                  </th>
                )
              })}
            </tr>
            {/* Total row */}
            <tr className="bg-slate-100">
              <td className="sticky left-0 bg-slate-100 text-xs font-bold text-slate-700 px-4 py-2 border-b border-slate-300 border-r border-slate-200">
                TOTAL personnes affectées
              </td>
              {weeks.map(({ year, week }, i) => {
                const total = totalForWeek(year, week)
                const clr = total === 0 ? 'text-slate-400' : total < 10 ? 'text-green-600' : total < 20 ? 'text-amber-600' : 'text-red-600'
                return (
                  <td key={i} className={`text-center text-sm font-bold py-2 border-b border-slate-300 ${clr}`}>
                    {total || '—'}
                  </td>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredAffaires.map((a, ai) => {
              const c = getAffaireColor(a.colorIndex)
              return (
                <tr key={a.id} className={ai % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="sticky left-0 px-4 py-2.5 border-b border-slate-100 border-r border-slate-200"
                    style={{ background: ai % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.border }} />
                      <div>
                        <div className="font-mono text-slate-900 text-sm font-semibold">{a.numero}</div>
                        <div className="text-slate-400 text-xs">{a.client}</div>
                      </div>
                    </div>
                  </td>
                  {weeks.map(({ year, week }, i) => {
                    const count = countForAffaire(a.id, year, week)
                    return (
                      <td key={i} className="text-center py-2.5 border-b border-slate-100">
                        {count > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ background: c.bg, color: c.text }}>
                            {count}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {filteredAffaires.length === 0 && (
              <tr>
                <td colSpan={1 + weeks.length} className="text-center text-slate-400 py-12">Aucune affaire.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
