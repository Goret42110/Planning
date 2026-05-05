import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useApp } from '../../App'
import {
  getCurrentWeekInfo, getWorkDays, getWeekDays, isHoliday, isToday,
  planningKey, formatShortDate, formatDayShort, formatWeekRange, addWeeks,
} from '../../utils/weeks'
import { getAffaireColor, PERSON_TYPE_COLORS, QUALIF_CLASS } from '../../utils/colors'
import { getCellSlots } from '../../utils/slots'
import PlanningCell from './PlanningCell'
import CellEditor from './CellEditor'
import TaskPlanner from './TaskPlanner'

const WEEK_COUNT = 6
const PERSON_COL_W = 195

function AffaireFilter({ affaires, selected, onChange }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch('') } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  const q = search.trim().toLowerCase()
  const visible = q
    ? affaires.filter(a =>
        a.numero.toLowerCase().includes(q) ||
        a.intitule.toLowerCase().includes(q) ||
        (a.client || '').toLowerCase().includes(q)
      )
    : affaires

  const label = selected.length === 0
    ? 'Filtrer par affaire'
    : selected.length === 1
      ? (affaires.find(a => a.id === selected[0])?.numero ?? '1 affaire')
      : `${selected.length} affaires`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
          selected.length > 0
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span className="text-slate-400">🔍</span>
        <span>{label}</span>
        {selected.length > 0 && (
          <span onClick={e => { e.stopPropagation(); onChange([]) }}
            className="ml-1 text-blue-400 hover:text-blue-700 font-bold">✕</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl w-72 flex flex-col" style={{ maxHeight: 400 }}>
          {/* Barre de recherche */}
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="N° affaire, intitulé, client…"
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 bg-slate-50"
            />
            {selected.length > 0 && (
              <button onClick={() => onChange([])} className="mt-1.5 text-xs text-slate-400 hover:text-red-500">
                Effacer la sélection ({selected.length})
              </button>
            )}
          </div>

          {/* Liste scrollable */}
          <div className="overflow-y-auto py-1">
            {visible.length === 0 && (
              <p className="text-xs text-slate-400 px-4 py-3 italic">Aucun résultat</p>
            )}
            {visible.map(a => {
              const c = getAffaireColor(a.colorIndex)
              const checked = selected.includes(a.id)
              return (
                <button key={a.id} onClick={() => toggle(a.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 transition-colors text-left">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'border-blue-500 bg-blue-600' : 'border-slate-200'}`}>
                    {checked && <span className="text-white text-xs leading-none">✓</span>}
                  </span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.border }} />
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-slate-800">{a.numero}</div>
                    <div className="text-slate-400 text-xs truncate">{a.intitule}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlanningGrid() {
  const { personnel, affaires, planning, comments, setComment, selectedCA, personTypeFilter, setPersonTypeFilter, setPlanningCell } = useApp()

  const cur = getCurrentWeekInfo()
  const [nav, setNav]               = useState({ week: cur.week, year: cur.year })
  const [editor, setEditor]         = useState(null)
  const [affaireFilter, setAffaireFilter] = useState([])
  const [showPlanner, setShowPlanner]     = useState(false)

  const weeks = []
  for (let i = 0; i < WEEK_COUNT; i++) {
    const { year, week } = addWeeks(nav.year, nav.week, i)
    weeks.push({ year, week })
  }

  const columns = []
  weeks.forEach(({ year, week }, wi) => {
    getWeekDays(year, week).forEach((date, di) => {
      const isWeekend = di >= 5
      columns.push({ year, week, dayIndex: di, date, wi, isWeekend })
    })
  })

  const isPlannable = (p) => p.role !== 'CA' && p.role !== 'RS'

  const filteredPersonnel = personnel.filter(p => {
    if (!p.actif) return false
    if (!isPlannable(p)) return false
    if (personTypeFilter !== 'all' && p.type !== personTypeFilter) return false
    if (selectedCA && p.role !== 'RS') {
      const caAffaireIds = affaires.filter(a => a.caId === selectedCA).map(a => a.id)
      if (p.id === selectedCA) return true
      const hasAny = Object.entries(planning).some(
        ([k, v]) => k.startsWith(`${p.id}_`) && caAffaireIds.includes(v)
      )
      if (!hasAny) return false
    }
    if (affaireFilter.length > 0) {
      const hasAny = columns.some(col => {
        const k = planningKey(p.id, col.year, col.week, col.dayIndex)
        return getCellSlots(planning[k]).some(s => affaireFilter.includes(s.id))
      })
      if (!hasAny) return false
    }
    return true
  })

  const groups = [
    { label: 'ELS',           type: 'ELS',            persons: filteredPersonnel.filter(p => p.type === 'ELS') },
    { label: 'Intérimaires',  type: 'Intérimaire',    persons: filteredPersonnel.filter(p => p.type === 'Intérimaire') },
    { label: 'Sous-traitants',type: 'Sous-traitant',  persons: filteredPersonnel.filter(p => p.type === 'Sous-traitant') },
  ].filter(g => g.persons.length > 0)

  const navigate = useCallback((delta) => {
    if (delta === 0) { setNav({ week: cur.week, year: cur.year }); return }
    setNav(prev => addWeeks(prev.year, prev.week, delta))
  }, [cur.week, cur.year])

  const handleCellClick = useCallback((key, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setEditor({ key, position: { x: rect.left, y: rect.bottom + 6 } })
  }, [])

  const handleSelect = useCallback((value) => {
    if (editor) { setPlanningCell(editor.key, value); setEditor(null) }
  }, [editor, setPlanningCell])

  const totals = columns.map(col => {
    if (isHoliday(col.date)) return null
    return filteredPersonnel.reduce((n, p) => {
      const k = planningKey(p.id, col.year, col.week, col.dayIndex)
      return getCellSlots(planning[k]).length > 0 ? n + 1 : n
    }, 0)
  })

  const isCurrentView = nav.week === cur.week && nav.year === cur.year
  const rangeLabel = formatWeekRange(nav.year, nav.week, WEEK_COUNT)

  const DAY_W = 108
  const DAY_W_WE = 62   // weekend columns narrower
  const totalW = PERSON_COL_W + columns.reduce((s, c) => s + (c.isWeekend ? DAY_W_WE : DAY_W), 0)

  // Light theme inline style constants
  const S = {
    headerBg:   '#f8fafc',
    rowBg1:     '#ffffff',
    rowBg2:     '#f8fafc',
    footerBg:   '#f1f5f9',
    border:     '#e2e8f0',
    borderWeek: '#475569',   // dark slate — week separator
    weekBg:     ['#ffffff', '#f0f4ff'],  // alternating week tint (even/odd)
    groupBg:    '#f1f5f9',
    textPrimary:'#1e293b',
    textMuted:  '#94a3b8',
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-2 bg-white border-b border-slate-200">

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}
            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center text-xs transition-colors">◀</button>
          <span className="text-slate-800 text-sm font-medium min-w-[260px] text-center">{rangeLabel}</span>
          <button onClick={() => navigate(1)}
            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center text-xs transition-colors">▶</button>
          <span className="text-slate-400 text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded ml-1">S{nav.week}</span>
          {!isCurrentView && (
            <button onClick={() => navigate(0)}
              className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors ml-1">
              Aujourd'hui
            </button>
          )}
        </div>

        {/* Center: type filter + planner button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[
              { v: 'all',           l: 'Tous' },
              { v: 'ELS',           l: 'ELS' },
              { v: 'Intérimaire',   l: 'Intérimaires' },
              { v: 'Sous-traitant', l: 'Sous-traitants' },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setPersonTypeFilter(v)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  personTypeFilter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {l}
              </button>
            ))}
          </div>

          <button onClick={() => setShowPlanner(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors">
            <span>📅</span> Planifier une période
          </button>
        </div>

        {/* Affaire filter */}
        <AffaireFilter
          affaires={affaires.filter(a => a.statut === 'active' && (!selectedCA || a.caId === selectedCA))}
          selected={affaireFilter}
          onChange={setAffaireFilter}
        />
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        <table style={{ tableLayout: 'fixed', width: totalW, borderCollapse: 'collapse', minWidth: totalW }}>
          <colgroup>
            <col style={{ width: PERSON_COL_W }} />
            {columns.map((_, i) => <col key={i} style={{ width: DAY_W }} />)}
          </colgroup>

          {/* ── HEAD ─────────────────────────────────────────────── */}
          <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
            {/* Row 1 : week labels */}
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 30, background: S.headerBg, borderBottom: `1px solid ${S.border}`, borderRight: `1px solid ${S.border}` }} />
              {weeks.map(({ year, week }, wi) => {
                const days = getWorkDays(year, week)
                const isCur = week === cur.week && year === cur.year
                return (
                  <th key={wi} colSpan={7}
                    className="text-xs font-semibold text-center py-1.5"
                    style={{
                      background: S.weekBg[wi % 2],
                      borderBottom: `1px solid ${S.border}`,
                      borderLeft: wi > 0 ? `3px solid ${S.borderWeek}` : `1px solid ${S.border}`,
                      color: isCur ? '#2563eb' : '#475569',
                    }}>
                    <span className="mr-1" style={{ color: isCur ? '#93c5fd' : S.textMuted }}>S{week}</span>
                    {formatShortDate(days[0])}
                  </th>
                )
              })}
            </tr>
            {/* Row 2 : day labels */}
            <tr>
              <th
                style={{ position: 'sticky', left: 0, zIndex: 30, background: S.headerBg, borderBottom: `1px solid ${S.border}`, borderRight: `1px solid ${S.border}` }}
                className="text-xs font-normal text-left px-3 py-2"
              >
                <span style={{ color: S.textMuted }}>Collaborateur</span>
              </th>
              {columns.map((col, ci) => {
                const holiday = isHoliday(col.date)
                const today   = isToday(col.date)
                const newWeek = col.dayIndex === 0 && ci > 0
                const colW    = col.isWeekend ? DAY_W_WE : DAY_W
                const weBg    = col.isWeekend ? '#f0f0f0' : S.weekBg[col.wi % 2]
                return (
                  <th key={ci} className="py-1.5 text-center"
                    style={{
                      width: colW, minWidth: colW,
                      background: weBg,
                      borderBottom: `1px solid ${S.border}`,
                      borderLeft: newWeek ? `3px solid ${S.borderWeek}` : `1px solid ${S.border}`,
                    }}
                    title={holiday || undefined}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {today ? (
                        <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs leading-none">
                          {col.date.getDate()}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: holiday ? S.textMuted : '#475569', textDecoration: holiday ? 'line-through' : 'none' }}>
                          {col.date.getDate()}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: S.textMuted }}>{formatDayShort(col.date)}</span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* ── BODY ─────────────────────────────────────────────── */}
          <tbody>
            {groups.map((group, gi) => (
              <React.Fragment key={gi}>
                <tr>
                  <td colSpan={1 + columns.length}
                    style={{ position: 'sticky', left: 0, background: S.groupBg, zIndex: 5, padding: '4px 16px 4px', borderBottom: `1px solid ${S.border}`, color: '#94a3b8' }}
                    className="text-xs font-semibold uppercase tracking-widest"
                  >
                    {group.label}
                  </td>
                </tr>

                {group.persons.map((person, pi) => {
                  const tc = PERSON_TYPE_COLORS[person.type] || { bg: '#94a3b8', text: '#fff' }
                  const initials = `${person.prenom[0]}${person.nom[0]}`
                  const rowBg = pi % 2 === 0 ? S.rowBg1 : S.rowBg2
                  return (
                    <tr key={person.id}>
                      <td style={{ position: 'sticky', left: 0, zIndex: 10, background: rowBg, borderBottom: `1px solid ${S.border}`, borderRight: `1px solid ${S.border}`, height: 80, width: PERSON_COL_W }}>
                        <div className="flex items-center gap-2 h-full px-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                            style={{ background: tc.bg, color: tc.text }}>
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0 gap-0.5">
                            <span className="text-xs font-semibold leading-none" style={{ color: S.textPrimary }}>{person.prenom}</span>
                            <span className="text-xs leading-none text-slate-500">{person.nom}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block w-fit leading-none ${QUALIF_CLASS[person.qualification] || 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                              {person.qualification}
                            </span>
                          </div>
                        </div>
                      </td>

                      {columns.map((col, ci) => {
                        const key     = planningKey(person.id, col.year, col.week, col.dayIndex)
                        const value   = planning[key]
                        const holiday = isHoliday(col.date)
                        const newWeek = col.dayIndex === 0 && ci > 0
                        // Blend row alternation with week tint
                        const weekTint = col.wi % 2 === 1 ? '#eef2ff' : (pi % 2 === 0 ? '#ffffff' : '#f8fafc')
                        return (
                          <td key={ci}
                            style={{
                              height: 80,
                              borderBottom: `1px solid ${S.border}`,
                              borderLeft: newWeek ? `3px solid ${S.borderWeek}` : `1px solid ${S.border}`,
                              padding: 3,
                              background: weekTint,
                            }}
                          >
                            <PlanningCell
                              value={value}
                              affaires={affaires}
                              person={person}
                              isHoliday={!!holiday}
                              holidayName={holiday}
                              onClick={(e) => !holiday && handleCellClick(key, e)}
                              comment={comments[key]}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>

          {/* ── FOOTER – Totals ───────────────────────────────────── */}
          <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 20 }}>
            <tr>
              <td
                style={{ position: 'sticky', left: 0, zIndex: 30, background: S.footerBg, borderTop: `2px solid ${S.borderWeek}`, color: '#475569' }}
                className="px-3 py-2 text-xs font-semibold"
              >
                Jours affectés
              </td>
              {columns.map((col, ci) => {
                const total  = totals[ci]
                const newWeek = col.dayIndex === 0 && ci > 0
                const max    = filteredPersonnel.length
                const clr    = total === null ? S.textMuted
                             : total === 0 ? '#ef4444'
                             : total < max ? '#f59e0b'
                             : '#22c55e'
                return (
                  <td key={ci}
                    className="py-2 text-center text-xs font-bold"
                    style={{
                      background: S.footerBg,
                      borderTop: `2px solid ${S.borderWeek}`,
                      borderLeft: newWeek ? `3px solid ${S.borderWeek}` : `1px solid ${S.border}`,
                      color: clr,
                    }}
                  >
                    {total === null ? '—' : total === 0 ? '0' : `${total}p`}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Cell editor popover ──────────────────────────────────── */}
      {editor && (
        <CellEditor
          value={planning[editor.key]}
          position={editor.position}
          onClose={() => setEditor(null)}
          onSelect={handleSelect}
          commentKey={editor.key}
          comment={comments[editor.key] || ''}
          onCommentChange={(text) => setComment(editor.key, text)}
        />
      )}

      {/* ── Task planner modal ───────────────────────────────────── */}
      {showPlanner && <TaskPlanner onClose={() => setShowPlanner(false)} />}
    </div>
  )
}
