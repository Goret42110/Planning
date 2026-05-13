import { useState, useRef, useCallback, useEffect } from 'react'
import { useApp } from '../App'
import { useAuth } from '../context/AuthContext'
import { getCurrentWeekInfo, getWorkDays, planningKey, isHoliday } from '../utils/weeks'
import { getCellSlots, slotJH } from '../utils/slots'
import { getAffaireColor } from '../utils/colors'

// ── Persistance de l'ordre des widgets ────────────────────────────────────────
const STORAGE_KEY = 'els_dashboard_widgets'

const DEFAULT_WIDGETS = [
  { id: 'bienvenue',   title: 'Bienvenue',           visible: true },
  { id: 'kpi_affaires',title: 'Affaires actives',    visible: true },
  { id: 'kpi_semaine', title: 'Semaine en cours',    visible: true },
  { id: 'kpi_charge',  title: 'Charge équipe',       visible: true },
  { id: 'affaires_top',title: 'Top affaires',        visible: true },
  { id: 'planning_semaine', title: 'Équipe cette semaine', visible: true },
]

function loadWidgets() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      const saved = JSON.parse(s)
      // Fusionner avec défauts (pour nouveaux widgets)
      return DEFAULT_WIDGETS.map(d => {
        const found = saved.find(w => w.id === d.id)
        return found ? { ...d, ...found } : d
      })
    }
  } catch {}
  return DEFAULT_WIDGETS
}

function saveWidgets(widgets) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets)) } catch {}
}

// ── Widgets individuels ───────────────────────────────────────────────────────

function WidgetBienvenue({ session, setActiveTab }) {
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Tableau de bord</div>
        <div className="text-slate-900 font-bold text-xl leading-tight">
          {greet}, {session?.prenom} 👋
        </div>
        <div className="text-slate-400 text-sm mt-1 capitalize">{session?.role}</div>
      </div>
      <div className="flex gap-2 mt-4 flex-wrap">
        <button onClick={() => setActiveTab('planning')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: '#E31E24' }}>
          📅 Planning
        </button>
        <button onClick={() => setActiveTab('affaires')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
          📁 Affaires
        </button>
      </div>
    </div>
  )
}

function WidgetKpiAffaires({ affaires, caIdEffectif }) {
  const filtered = affaires.filter(a => !caIdEffectif || a.caId === caIdEffectif)
  const actives   = filtered.filter(a => a.statut === 'active').length
  const attente   = filtered.filter(a => a.statut === 'en attente').length
  const terminées = filtered.filter(a => a.statut === 'terminée').length

  const caValide = filtered
    .filter(a => parseFloat(a.probabilite) === 100)
    .reduce((s, a) => s + (parseFloat(a.montantHT) || 0), 0)

  function fmt(v) {
    if (!v) return '—'
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + ' M€'
    if (v >= 1000) return Math.round(v / 1000) + ' k€'
    return Math.round(v) + ' €'
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full content-start">
      <Kpi label="Actives"   value={actives}   color="text-green-600" />
      <Kpi label="En attente" value={attente}  color="text-amber-600" />
      <Kpi label="Terminées" value={terminées} color="text-slate-400" />
      <Kpi label="CA validé"  value={fmt(caValide)} color="text-[#E31E24]" />
    </div>
  )
}

function Kpi({ label, value, color = 'text-slate-900' }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`font-bold text-lg ${color}`}>{value}</div>
    </div>
  )
}

function WidgetKpiSemaine({ planning, personnel, affaires }) {
  const { week, year } = getCurrentWeekInfo()
  const days = getWorkDays(year, week)
  const actifs = personnel.filter(p => p.actif && p.role !== 'CA' && p.role !== 'RS')

  let totalJH = 0
  let assigned = 0

  for (const p of actifs) {
    for (let di = 0; di < 5; di++) {
      const d = days[di]
      if (!d || isHoliday(d)) continue
      const k = planningKey(p.id, year, week, di)
      const slots = getCellSlots(planning[k])
      const jh = slots.reduce((s, sl) => s + slotJH(sl), 0)
      totalJH += 1
      if (jh > 0) assigned += 1
    }
  }

  const taux = totalJH ? Math.round((assigned / totalJH) * 100) : 0

  return (
    <div className="flex flex-col gap-3 h-full content-start">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">Semaine {week}</span>
        <span className="text-slate-900 font-bold text-lg">{taux}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${taux}%`, background: taux > 80 ? '#22c55e' : taux > 50 ? '#f59e0b' : '#E31E24' }} />
      </div>
      <div className="text-xs text-slate-400">{assigned} / {totalJH} créneaux affectés</div>
      <div className="text-xs text-slate-500">{actifs.length} techniciens actifs</div>
    </div>
  )
}

function WidgetKpiCharge({ planning, personnel, affaires }) {
  const { week, year } = getCurrentWeekInfo()
  const actifs = personnel.filter(p => p.actif && p.role !== 'CA' && p.role !== 'RS')

  // Charge par affaire sur les 4 prochaines semaines
  const chargeMap = {}
  for (let wi = 0; wi < 4; wi++) {
    const ww = ((week - 1 + wi) % 52) + 1
    const yy = year + Math.floor((week - 1 + wi) / 52)
    const days = getWorkDays(yy, ww)
    for (const p of actifs) {
      for (let di = 0; di < 5; di++) {
        const d = days[di]
        if (!d || isHoliday(d)) continue
        const k = planningKey(p.id, yy, ww, di)
        const slots = getCellSlots(planning[k])
        for (const sl of slots) {
          if (!sl.id || sl.id.startsWith('_')) continue
          chargeMap[sl.id] = (chargeMap[sl.id] || 0) + slotJH(sl)
        }
      }
    }
  }

  const top = Object.entries(chargeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, jh]) => {
      const a = affaires.find(x => x.id === id)
      return { label: a ? (a.numero || a.intitule) : id, jh: Math.round(jh * 10) / 10, color: a ? getAffaireColor(a.colorIndex).border : '#94a3b8' }
    })

  if (!top.length) return <div className="text-slate-300 text-sm">Aucune charge planifiée</div>

  const max = top[0].jh || 1

  return (
    <div className="space-y-2.5">
      {top.map(({ label, jh, color }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600 font-medium truncate max-w-[140px]">{label}</span>
            <span className="text-xs text-slate-400 shrink-0 ml-2">{jh} j</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(jh / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
      <div className="text-xs text-slate-400 pt-1">4 prochaines semaines</div>
    </div>
  )
}

function WidgetAffairesTop({ affaires, caIdEffectif, setActiveTab }) {
  const list = affaires
    .filter(a => a.statut === 'active' && (!caIdEffectif || a.caId === caIdEffectif))
    .sort((a, b) => (parseFloat(b.montantHT) || 0) - (parseFloat(a.montantHT) || 0))
    .slice(0, 5)

  function fmt(v) {
    if (!v) return '—'
    const n = parseFloat(v)
    if (isNaN(n) || n === 0) return '—'
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' M€'
    if (n >= 1000) return Math.round(n / 1000) + ' k€'
    return Math.round(n) + ' €'
  }

  if (!list.length) return <div className="text-slate-300 text-sm">Aucune affaire active</div>

  return (
    <div className="space-y-1.5">
      {list.map(a => {
        const c = getAffaireColor(a.colorIndex)
        return (
          <div key={a.id} className="flex items-center gap-2.5 py-1 hover:bg-slate-50 rounded-lg px-1 transition-colors cursor-pointer"
            onClick={() => setActiveTab('affaires')}>
            <div className="w-1.5 h-7 rounded-full shrink-0" style={{ background: c.border }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">{a.intitule || a.numero}</div>
              <div className="text-xs text-slate-400 truncate">{a.client || '—'}</div>
            </div>
            <div className="text-xs font-bold text-slate-600 shrink-0">{fmt(a.montantHT)}</div>
          </div>
        )
      })}
    </div>
  )
}

function WidgetPlanningSemaine({ planning, personnel, affaires }) {
  const { week, year } = getCurrentWeekInfo()
  const days = getWorkDays(year, week)
  const actifs = personnel.filter(p => p.actif && p.role !== 'CA' && p.role !== 'RS').slice(0, 6)

  const DAY_LABELS = ['L', 'M', 'M', 'J', 'V']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-slate-400 font-medium pb-2 pr-2">Technicien</th>
            {DAY_LABELS.map((d, i) => (
              <th key={i} className="text-center text-slate-400 font-medium pb-2 px-1 w-8">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {actifs.map(p => (
            <tr key={p.id}>
              <td className="py-1 pr-2 text-slate-600 font-medium whitespace-nowrap truncate max-w-[90px]">
                {p.prenom?.[0]}. {p.nom}
              </td>
              {Array.from({ length: 5 }, (_, di) => {
                const d = days[di]
                const holiday = d && isHoliday(d)
                const k = planningKey(p.id, year, week, di)
                const slots = getCellSlots(planning[k]).filter(s => s.id && !s.id.startsWith('_'))
                const firstAffaire = slots[0] ? affaires.find(a => a.id === slots[0].id) : null
                const color = firstAffaire ? getAffaireColor(firstAffaire.colorIndex).border : null
                return (
                  <td key={di} className="py-1 px-0.5 text-center">
                    <div className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center text-white text-xs font-bold ${holiday ? 'bg-slate-100' : ''}`}
                      style={color ? { background: color } : !holiday ? { background: '#f1f5f9' } : {}}>
                      {slots.length > 0 ? slots.length : holiday ? '' : ''}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {actifs.length === 0 && <div className="text-slate-300 text-sm">Aucun technicien</div>}
    </div>
  )
}

// ── Widget container draggable ────────────────────────────────────────────────
function WidgetCard({ widget, index, onDragStart, onDragOver, onDrop, children }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index) }}
      onDrop={() => onDrop(index)}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md select-none"
      style={{ minHeight: 160 }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{widget.title}</span>
        <span className="text-slate-200 text-xs">⠿</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage({ setActiveTab }) {
  const { affaires, planning, personnel, caIdEffectif } = useApp()
  const { session } = useAuth()
  const [widgets, setWidgets] = useState(loadWidgets)
  const dragIdx = useRef(null)

  function handleDragStart(idx) { dragIdx.current = idx }
  function handleDragOver(idx) {}
  function handleDrop(idx) {
    if (dragIdx.current === null || dragIdx.current === idx) return
    const next = [...widgets]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(idx, 0, moved)
    dragIdx.current = null
    setWidgets(next)
    saveWidgets(next)
  }

  const visibleWidgets = widgets.filter(w => w.visible)

  function renderContent(id) {
    switch (id) {
      case 'bienvenue':
        return <WidgetBienvenue session={session} setActiveTab={setActiveTab} />
      case 'kpi_affaires':
        return <WidgetKpiAffaires affaires={affaires} caIdEffectif={caIdEffectif} />
      case 'kpi_semaine':
        return <WidgetKpiSemaine planning={planning} personnel={personnel} affaires={affaires} />
      case 'kpi_charge':
        return <WidgetKpiCharge planning={planning} personnel={personnel} affaires={affaires} />
      case 'affaires_top':
        return <WidgetAffairesTop affaires={affaires} caIdEffectif={caIdEffectif} setActiveTab={setActiveTab} />
      case 'planning_semaine':
        return <WidgetPlanningSemaine planning={planning} personnel={personnel} affaires={affaires} />
      default:
        return null
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-slate-900 font-bold text-xl">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-0.5">Glissez les widgets pour les réorganiser</p>
        </div>

        {/* Grille de widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleWidgets.map((widget, idx) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              index={idx}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}>
              {renderContent(widget.id)}
            </WidgetCard>
          ))}
        </div>

        {/* Raccourcis rapides */}
        <div className="mt-8">
          <h2 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Accès rapide</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'planning',    icon: '📅', label: 'Planning semaine' },
              { id: 'gantt',       icon: '📊', label: 'Gantt affaires' },
              { id: 'affaires',    icon: '📁', label: 'Liste affaires' },
              { id: 'activite',    icon: '⚡', label: 'Activité & Charge' },
            ].map(s => (
              <button key={s.id} onClick={() => setActiveTab(s.id)}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#E31E24]/40 hover:shadow-sm transition-all text-left">
                <span className="text-xl">{s.icon}</span>
                <span className="text-xs font-medium text-slate-700">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
