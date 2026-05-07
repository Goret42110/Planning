import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { getAffaireColor } from '../utils/colors'
import { getMondayOfWeek } from '../utils/weeks'
import { getCellSlots, isSpecialId } from '../utils/slots'

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function addMonths(date, n) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  d.setDate(1)
  return d
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

function parsePlanningKey(key) {
  const m = key.match(/^(.+)_(\d{4})-W(\d{2})_(\d)$/)
  if (!m) return null
  return { personId: m[1], isoYear: parseInt(m[2]), isoWeek: parseInt(m[3]), dayIndex: parseInt(m[4]) }
}

// Nombre de jours calendaires entre deux dates
function calendarDays(start, end) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
}

// Jours de chevauchement entre [s,e] et le mois m
function overlapDaysMonth(s, e, monthDate) {
  const ms = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const me = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const os = s > ms ? s : ms
  const oe = e < me ? e : me
  if (os > oe) return 0
  return Math.round((oe.getTime() - os.getTime()) / 86400000) + 1
}

// Effectif théorique moyen par semaine = heuresPrevues / (durée en semaines * 40h/sem)
function theoreticalFTE(heuresPrevues, dateDebut, dateFin) {
  const h = parseFloat(heuresPrevues)
  if (!h || !dateDebut || !dateFin) return null
  const days = calendarDays(new Date(dateDebut), new Date(dateFin))
  const weeks = days / 7
  return Math.round((h / (weeks * 40)) * 10) / 10
}

function getStaffingByWeek(affaireId, planning) {
  const byWeek = {}
  for (const [key, val] of Object.entries(planning)) {
    const slots = getCellSlots(val)
    if (!slots.some(s => s.id === affaireId && !isSpecialId(s.id))) continue
    const parsed = parsePlanningKey(key)
    if (!parsed) continue
    const wk = `${parsed.isoYear}-W${String(parsed.isoWeek).padStart(2, '0')}`
    byWeek[wk] = (byWeek[wk] || 0) + 1
  }
  return byWeek
}

function StaffingBars({ affaire, planning, viewStart, totalMs, color, fte }) {
  const byWeek = useMemo(() => getStaffingByWeek(affaire.id, planning), [affaire.id, planning])

  const entries = Object.entries(byWeek).map(([wk, count]) => {
    const [yr, wn] = wk.split('-W').map(Number)
    const monday = getMondayOfWeek(yr, wn)
    const midMs = monday.getTime() + 3 * 24 * 3600 * 1000
    const pct = ((midMs - viewStart.getTime()) / totalMs) * 100
    return { pct, count }
  }).filter(e => e.pct >= 0 && e.pct <= 100)

  const maxScale = Math.max(...entries.map(e => e.count), fte ?? 1, 1)

  // Ligne de référence théorique (en % de hauteur)
  const refPct = fte ? Math.min((fte / maxScale) * 80, 92) : null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Barres effectif réel */}
      {entries.map((e, i) => (
        <div key={i} title={`${e.count} pers. planifiées`}
          className="absolute bottom-0.5 w-2 rounded-sm"
          style={{
            left: `${e.pct}%`,
            height: `${Math.max(15, (e.count / maxScale) * 80)}%`,
            background: color.border,
            opacity: 0.55,
            transform: 'translateX(-50%)',
          }}
        />
      ))}
      {/* Ligne théorique en pointillés */}
      {refPct !== null && (
        <div className="absolute left-0 right-0"
          style={{
            bottom: `calc(${refPct}% + 2px)`,
            borderTop: `1.5px dashed ${color.border}`,
            opacity: 0.9,
          }}
        />
      )}
    </div>
  )
}

function GanttBar({ affaire, planning, viewStart, viewEnd, totalMs }) {
  const color = getAffaireColor(affaire.colorIndex)
  if (!affaire.dateDebut || !affaire.dateFin) return null

  const start = new Date(affaire.dateDebut)
  const end   = new Date(affaire.dateFin)
  if (isNaN(start) || isNaN(end) || start > viewEnd || end < viewStart) return null

  const clampedStart = start < viewStart ? viewStart : start
  const clampedEnd   = end   > viewEnd   ? viewEnd   : end

  const left  = ((clampedStart.getTime() - viewStart.getTime()) / totalMs) * 100
  const width = ((clampedEnd.getTime()   - clampedStart.getTime()) / totalMs) * 100
  const prob  = parseFloat(affaire.probabilite) || 100
  const opacity = 0.35 + (prob / 100) * 0.65
  const fte   = theoreticalFTE(affaire.heuresPrevues, affaire.dateDebut, affaire.dateFin)

  return (
    <div
      className="absolute top-1 rounded border cursor-default select-none overflow-hidden"
      style={{
        left: `${left}%`,
        width: `${Math.max(width, 0.3)}%`,
        bottom: '4px',
        background: color.bg,
        borderColor: color.border,
        opacity,
      }}
      title={[
        `${affaire.numero} — ${affaire.intitule}`,
        `${affaire.dateDebut} → ${affaire.dateFin}`,
        fte ? `Effectif théorique : ${fte} pers./sem.` : '',
        prob < 100 ? `Probabilité : ${prob}%` : '',
      ].filter(Boolean).join('\n')}
    >
      <StaffingBars
        affaire={affaire}
        planning={planning}
        viewStart={viewStart}
        totalMs={totalMs}
        color={color}
        fte={fte}
      />
      {/* Label + badge FTE */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 overflow-hidden gap-1">
        <span className="text-xs font-medium truncate whitespace-nowrap" style={{ color: color.text }}>
          {affaire.numero}
        </span>
        {fte !== null && width > 4 && (
          <span className="shrink-0 text-xs font-bold px-1 rounded"
            style={{ color: color.border, background: 'rgba(255,255,255,0.7)' }}>
            {fte}p
          </span>
        )}
      </div>
    </div>
  )
}

// Cumul théorique par mois
function useMensuelTheoriqueData(affaires, months) {
  return useMemo(() => {
    return months.map(m => {
      let total = 0
      const mDays = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()

      for (const a of affaires) {
        if (!a.dateDebut || !a.dateFin || !a.heuresPrevues) continue
        const h = parseFloat(a.heuresPrevues)
        if (!h) continue
        const start = new Date(a.dateDebut)
        const end   = new Date(a.dateFin)
        if (isNaN(start) || isNaN(end)) continue

        const totalDays = calendarDays(start, end)
        const overlap   = overlapDaysMonth(start, end, m)
        if (!overlap) continue

        // Heures proratisées sur ce mois × prob
        const prob = (parseFloat(a.probabilite) || 100) / 100
        const hMois = h * (overlap / totalDays)
        // FTE = heures / (jours ouvrés du mois * 8h) — approx jours ouvrés = overlap * 5/7
        const joursOuvres = overlap * 5 / 7
        total += (hMois / (joursOuvres * 8)) * prob
      }

      return Math.round(total * 10) / 10
    })
  }, [affaires, months])
}

export default function GanttPage() {
  const { affaires, personnel, planning } = useApp()

  const today = new Date()
  const [viewMonths,    setViewMonths]    = useState(6)
  const [viewStart,     setViewStart]     = useState(() => startOfMonth(today))
  const [filtreCA,      setFiltreCA]      = useState('')
  const [filtreSvc,     setFiltreSvc]     = useState('')
  const [showSansDates, setShowSansDates] = useState(false)

  const caList  = useMemo(() => personnel.filter(p => p.role === 'CA' || p.role === 'RS'), [personnel])
  const viewEnd = useMemo(() => endOfMonth(addMonths(viewStart, viewMonths - 1)), [viewStart, viewMonths])
  const totalMs = viewEnd.getTime() - viewStart.getTime()

  const months = useMemo(() => {
    const arr = []
    for (let i = 0; i < viewMonths; i++) arr.push(addMonths(viewStart, i))
    return arr
  }, [viewStart, viewMonths])

  const affairesFiltrees = useMemo(() => affaires.filter(a => {
    if (a.statut === 'terminee') return false
    if (filtreCA  && a.caId      !== filtreCA)  return false
    if (filtreSvc && a.serviceId !== filtreSvc) return false
    return true
  }), [affaires, filtreCA, filtreSvc])

  const { avecDates, sansDates } = useMemo(() => ({
    avecDates:  affairesFiltrees.filter(a => a.dateDebut && a.dateFin),
    sansDates:  affairesFiltrees.filter(a => !a.dateDebut || !a.dateFin),
  }), [affairesFiltrees])

  const mensuelTheorique = useMensuelTheoriqueData(avecDates, months)
  const maxTheo = Math.max(...mensuelTheorique, 1)

  const todayPct = useMemo(() => {
    const pct = ((today.getTime() - viewStart.getTime()) / totalMs) * 100
    return pct >= 0 && pct <= 100 ? pct : null
  }, [viewStart, totalMs])

  const ROW_H     = 40
  const FOOTER_H  = 64

  function nav(delta) {
    setViewStart(s => addMonths(s, delta * Math.ceil(viewMonths / 2)))
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">

      {/* Barre de contrôles */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 flex-wrap">
        <span className="text-sm font-semibold text-slate-700">Gantt Affaires</span>

        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden text-xs">
          {[3, 6, 12].map(n => (
            <button key={n} onClick={() => setViewMonths(n)}
              className={`px-2.5 py-1.5 font-medium transition-colors ${viewMonths === n ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {n} mois
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => nav(-1)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">◀</button>
          <button onClick={() => setViewStart(startOfMonth(today))} className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">Auj.</button>
          <button onClick={() => nav(1)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">▶</button>
        </div>

        <select value={filtreSvc} onChange={e => setFiltreSvc(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400">
          <option value="">Tous les services</option>
          <option value="energie">Énergie</option>
          <option value="petrole">Pétrole</option>
        </select>

        <select value={filtreCA} onChange={e => setFiltreCA(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400">
          <option value="">Tous les CA</option>
          {caList.map(ca => <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-auto">
          <input type="checkbox" checked={showSansDates} onChange={e => setShowSansDates(e.target.checked)} className="rounded" />
          Sans dates ({sansDates.length})
        </label>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: 900 }}>

          {/* Colonne labels */}
          <div className="shrink-0 w-64 border-r border-slate-200 bg-white sticky left-0 z-30">
            <div className="h-8 border-b border-slate-200 bg-slate-50 px-3 flex items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Affaire</span>
            </div>
            {avecDates.map(a => {
              const color = getAffaireColor(a.colorIndex)
              const prob  = parseFloat(a.probabilite) || 100
              const fte   = theoreticalFTE(a.heuresPrevues, a.dateDebut, a.dateFin)
              return (
                <div key={a.id} className="flex items-center gap-2 px-3 border-b border-slate-100 hover:bg-slate-50"
                  style={{ height: ROW_H }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color.border, opacity: 0.4 + (prob/100)*0.6 }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-700 truncate">{a.numero}</div>
                    <div className="text-xs text-slate-400 truncate">{a.client || a.intitule}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    {fte !== null && (
                      <div className="text-xs font-bold" style={{ color: color.border }}>{fte}p</div>
                    )}
                    {prob < 100 && (
                      <div className="text-xs text-amber-500">{prob}%</div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Ligne cumul */}
            <div className="border-t-2 border-slate-300 bg-slate-50 flex items-center px-3 gap-2" style={{ height: FOOTER_H }}>
              <div>
                <div className="text-xs font-bold text-slate-700">Cumul théorique</div>
                <div className="text-xs text-slate-400">pondéré par probabilité</div>
              </div>
            </div>

            {showSansDates && sansDates.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-200 border-t">
                  Sans dates
                </div>
                {sansDates.map(a => {
                  const color = getAffaireColor(a.colorIndex)
                  return (
                    <div key={a.id} className="flex items-center gap-2 px-3 border-b border-slate-100 opacity-50"
                      style={{ height: ROW_H }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color.border }} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-700 truncate">{a.numero}</div>
                        <div className="text-xs text-slate-400 truncate">{a.client || a.intitule}</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Grille timeline */}
          <div className="flex-1 relative">
            {/* En-tête mois */}
            <div className="flex h-8 border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
              {months.map((m, i) => (
                <div key={i} className="flex-1 flex items-center justify-center text-xs font-medium text-slate-500 border-r border-slate-200 last:border-r-0">
                  {MONTHS[m.getMonth()]} {m.getFullYear()}
                </div>
              ))}
            </div>

            {/* Ligne aujourd'hui */}
            {todayPct !== null && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
                style={{ left: `${todayPct}%` }}>
                <div className="absolute top-8 -translate-x-1/2 bg-red-400 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                  Auj.
                </div>
              </div>
            )}

            {/* Séparateurs mois */}
            <div className="absolute inset-0 flex pointer-events-none z-0">
              {months.map((_, i) => (
                <div key={i} className="flex-1 border-r border-slate-100 last:border-r-0" />
              ))}
            </div>

            {/* Barres affaires */}
            {avecDates.map(a => (
              <div key={a.id} className="relative border-b border-slate-100"
                style={{ height: ROW_H }}>
                <GanttBar
                  affaire={a}
                  planning={planning}
                  viewStart={viewStart}
                  viewEnd={viewEnd}
                  totalMs={totalMs}
                />
              </div>
            ))}

            {/* Ligne cumul théorique par mois */}
            <div className="flex border-t-2 border-slate-300 bg-slate-50" style={{ height: FOOTER_H }}>
              {months.map((m, i) => {
                const val = mensuelTheorique[i]
                const pct = maxTheo > 0 ? (val / maxTheo) * 70 : 0
                const danger = val > 10
                const warn   = val > 7
                const barColor = danger ? '#ef4444' : warn ? '#f97316' : '#3b82f6'
                return (
                  <div key={i} className="flex-1 border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-end pb-1 gap-0.5">
                    <span className="text-xs font-bold" style={{ color: barColor }}>{val > 0 ? val : '—'}</span>
                    <div className="w-3/4 rounded-t transition-all"
                      style={{
                        height: `${pct}%`,
                        minHeight: val > 0 ? 4 : 0,
                        background: barColor,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Lignes vides pour affaires sans dates */}
            {showSansDates && sansDates.length > 0 && (
              <>
                <div className="h-8 bg-slate-50 border-b border-slate-200 border-t" />
                {sansDates.map(a => (
                  <div key={a.id} className="relative border-b border-slate-100 flex items-center px-3"
                    style={{ height: ROW_H }}>
                    <span className="text-xs text-slate-300 italic">dates non renseignées</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Légende */}
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center gap-6 text-xs text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-4 rounded bg-blue-500 opacity-60" />
            <span>Effectif réel planifié (barres internes)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 border-t-2 border-dashed border-blue-500" />
            <span>Ligne théorique nécessaire</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span>Xp</span>
            <span className="font-normal text-slate-400">= pers. théoriques moy./semaine</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500 opacity-70"/><span>Cumul normal</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-500 opacity-70"/><span>&gt; 7 pers.</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500 opacity-70"/><span>&gt; 10 pers.</span></div>
            <div className="flex items-center gap-1.5"><div className="w-px h-4 bg-red-400"/><span>Aujourd'hui</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
