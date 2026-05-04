import { useRef } from 'react'
import { useApp } from '../../App'
import { getCurrentWeekInfo, getWorkDays, planningKey, isHoliday, toDateKey } from '../../utils/weeks'
import { getAffaireColor } from '../../utils/colors'
import { getCellSlots, slotJH } from '../../utils/slots'

function KpiCard({ label, value, sub, color = 'text-slate-900', alert = false }) {
  return (
    <div className={`bg-white rounded-xl p-5 border ${alert ? 'border-red-300' : 'border-slate-200'} shadow-sm`}>
      <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
    </div>
  )
}

function ProgressBar({ jhPasses, jhPlanifies, jhBudget, color }) {
  if (!jhBudget) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: '100%', background: color, opacity: 0.3 }} />
        </div>
        <span className="text-slate-400 text-xs w-20 text-right shrink-0">Pas de budget</span>
      </div>
    )
  }

  const total = jhPasses + jhPlanifies
  const pctPasses    = Math.min(100, (jhPasses   / jhBudget) * 100)
  const pctPlanifies = Math.min(100 - pctPasses, (jhPlanifies / jhBudget) * 100)
  const overflow     = total > jhBudget

  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
        <div className="h-full transition-all rounded-l-full" style={{ width: `${pctPasses}%`, background: color }} title={`Réalisé : ${jhPasses} JH`} />
        <div className="h-full transition-all" style={{
          width: `${pctPlanifies}%`, background: color, opacity: 0.35,
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 5px)`,
        }} title={`Planifié : ${jhPlanifies} JH`} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right shrink-0 ${overflow ? 'text-red-500' : 'text-slate-500'}`}>
        {Math.round(((jhPasses + jhPlanifies) / jhBudget) * 100)}%
      </span>
    </div>
  )
}

export default function RecapDashboard() {
  const { personnel, affaires, planning, exportData, importData, resetToInitial, selectedCA } = useApp()
  const fileRef = useRef()

  const { week, year } = getCurrentWeekInfo()
  const workDays = getWorkDays(year, week)
  const todayKey = toDateKey(new Date())

  const isPlannable = (p) => p.role !== 'CA' && p.role !== 'RS'

  const activePeople   = personnel.filter(p => p.actif && isPlannable(p))
  const activeAffaires = affaires.filter(a => {
    if (selectedCA && a.caId !== selectedCA) return false
    return a.statut === 'active'
  })

  const assignedThisWeek = activePeople.filter(p =>
    workDays.some((d, di) => {
      if (isHoliday(d)) return false
      return getCellSlots(planning[planningKey(p.id, year, week, di)]).length > 0
    })
  )
  const available = activePeople.filter(p => !assignedThisWeek.find(a => a.id === p.id))

  function jhStats(aId) {
    let passes = 0, planifies = 0
    Object.entries(planning).forEach(([k, v]) => {
      const lastUs = k.lastIndexOf('_')
      const dayIndex = parseInt(k.slice(lastUs + 1))
      const rest = k.slice(0, lastUs)
      const secondLastUs = rest.lastIndexOf('_')
      const weekPart = rest.slice(secondLastUs + 1)
      const [yearStr, wStr] = weekPart.split('-W')
      if (!wStr || isNaN(dayIndex)) return
      const days = getWorkDays(parseInt(yearStr), parseInt(wStr))
      const day = days[dayIndex]
      if (!day || isHoliday(day)) return
      const dk = toDateKey(day)
      const slots = getCellSlots(v).filter(s => s.id === aId)
      for (const slot of slots) {
        const jh = slotJH(slot)
        if (dk < todayKey) passes += jh
        else               planifies += jh
      }
    })
    return {
      passes:    Math.round(passes * 10) / 10,
      planifies: Math.round(planifies * 10) / 10,
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Personnes actives"      value={activePeople.length}      sub={`sur ${personnel.length} total`}  color="text-blue-600" />
        <KpiCard label="Affaires actives"        value={activeAffaires.length}    sub={`sur ${affaires.length} total`}   color="text-amber-600" />
        <KpiCard label="Affectés sem. courante"  value={assignedThisWeek.length}  sub={`S${week} — ${assignedThisWeek.length}/${activePeople.length} pers.`} color="text-green-600" />
        <KpiCard
          label="Disponibles (non affectés)"
          value={available.length}
          sub={available.length > 0 ? available.map(p => p.prenom).join(', ') : '✓ Tout le monde est affecté'}
          color={available.length > 3 ? 'text-red-600' : available.length > 0 ? 'text-amber-600' : 'text-green-600'}
          alert={available.length > 3}
        />
      </div>

      {/* ── Avancement affaires ───────────────────────────────────────── */}
      <div>
        <h3 className="text-slate-900 font-semibold mb-1">Avancement affaires</h3>
        <p className="text-slate-400 text-xs mb-4">
          <span className="inline-flex items-center gap-1 mr-4">
            <span className="inline-block w-8 h-2 rounded-sm" style={{ background: '#3b82f6' }} /> Réalisé
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-8 h-2 rounded-sm opacity-35" style={{ background: '#3b82f6' }} /> Planifié
          </span>
        </p>

        <div className="space-y-3">
          {activeAffaires.map(a => {
            const c = getAffaireColor(a.colorIndex)
            const { passes, planifies } = jhStats(a.id)
            const jhBudget = a.heuresPrevues ? Math.round(a.heuresPrevues / 8) : 0
            const total    = passes + planifies
            const overflow = jhBudget > 0 && total > jhBudget

            return (
              <div key={a.id} className={`bg-white rounded-xl p-4 border ${overflow ? 'border-red-300' : 'border-slate-200'} shadow-sm`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ background: c.border }} />
                    <div className="min-w-0">
                      <div>
                        <span className="font-mono text-slate-900 font-semibold text-sm">{a.numero}</span>
                        <span className="text-slate-600 text-sm ml-2">{a.intitule}</span>
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5">{a.client}{a.adresse ? ` — ${a.adresse}` : ''}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-xs space-y-0.5">
                    <div>
                      <span className="text-slate-900 font-bold">{passes} JH</span>
                      <span className="text-slate-400 ml-1">réalisés</span>
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: c.border }}>{planifies} JH</span>
                      <span className="text-slate-400 ml-1">planifiés</span>
                    </div>
                    {jhBudget > 0 && (
                      <div className="text-slate-400 border-t border-slate-200 pt-0.5 mt-0.5">
                        Budget : {jhBudget} JH ({a.heuresPrevues}h)
                      </div>
                    )}
                    {overflow && (
                      <div className="text-red-500 font-semibold">⚠ +{Math.round((total - jhBudget) * 10) / 10} JH</div>
                    )}
                  </div>
                </div>

                <ProgressBar jhPasses={passes} jhPlanifies={planifies} jhBudget={jhBudget} color={c.border} />

                {jhBudget > 0 && (
                  <div className="flex justify-between text-xs text-slate-300 mt-1">
                    <span>0</span>
                    <span>{Math.round(jhBudget / 2)} JH</span>
                    <span>{jhBudget} JH</span>
                  </div>
                )}
              </div>
            )
          })}
          {activeAffaires.length === 0 && <p className="text-slate-400">Aucune affaire active.</p>}
        </div>
      </div>

      {/* ── Personnel non affecté ─────────────────────────────────────── */}
      <div>
        <h3 className="text-slate-900 font-semibold mb-4">
          Personnel non affecté — S{week}
          {available.length === 0 && <span className="ml-2 text-green-600 text-sm font-normal">✓ Tout le monde est affecté</span>}
        </h3>
        {available.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {available.map(p => (
              <div key={p.id} className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2">
                <span>⚠️</span>
                <span className="text-slate-700 text-sm font-medium">{p.prenom} {p.nom}</span>
                <span className="text-slate-400 text-xs">{p.qualification}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-green-600 text-sm">Tout le monde est affecté cette semaine.</div>
        )}
      </div>

      {/* ── Sauvegarde ────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-slate-900 font-semibold mb-4">Sauvegarde</h3>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportData} className="btn-primary">⬇ Exporter JSON</button>
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-colors">
            ⬆ Importer JSON
          </button>
          <button onClick={resetToInitial}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors">
            ↺ Réinitialiser
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={e => { const f = e.target.files[0]; if (f) { importData(f); e.target.value = '' } }} />
        </div>
      </div>
    </div>
  )
}
