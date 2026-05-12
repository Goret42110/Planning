function fmt(val) {
  if (val === null || val === undefined) return '—'
  const abs = Math.abs(val)
  if (abs >= 1_000_000) return (val / 1_000_000).toFixed(2).replace('.', ',') + ' M€'
  if (abs >= 1000) return Math.round(val / 1000) + ' k€'
  return val + ' €'
}

function fmtH(h) {
  if (!h) return '0 h'
  if (h >= 1000) return (h / 1000).toFixed(1) + ' kh'
  return Math.round(h) + ' h'
}

function KpiCard({ label, value, sub, icon, accent, progress }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold leading-tight" style={{ color: accent || '#1e293b' }}>{value}</div>
      {progress !== undefined && progress !== null && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
          <div className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: progress >= 100 ? '#22c55e' : progress >= 70 ? '#f97316' : '#E31E24',
            }} />
        </div>
      )}
      {sub && <div className="text-xs text-slate-400 leading-snug">{sub}</div>}
    </div>
  )
}

export default function KpiCards({ kpis, objectifAnnuelCA }) {
  const { caValide, caPrevisionnel, chargePrevue, atteinte } = kpis
  const hasObjectif = objectifAnnuelCA > 0

  const atteinteColor = !hasObjectif ? '#94a3b8'
    : atteinte >= 100 ? '#22c55e'
    : atteinte >= 70  ? '#f97316'
    : '#E31E24'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-4">
      <KpiCard
        label="CA validé"
        value={fmt(caValide)}
        icon="✅"
        accent="#22c55e"
        sub={hasObjectif ? `sur ${fmt(objectifAnnuelCA)} d'objectif` : 'Aucun objectif défini'}
        progress={hasObjectif ? Math.round((caValide / objectifAnnuelCA) * 100) : undefined}
      />
      <KpiCard
        label="CA prévisionnel"
        value={fmt(caPrevisionnel)}
        icon="📈"
        accent="#3b82f6"
        sub="pondéré par probabilité"
      />
      <KpiCard
        label="Charge prévue"
        value={fmtH(chargePrevue)}
        icon="⏱"
        accent="#8b5cf6"
        sub="heures pondérées (affaires × prob.)"
      />
      <KpiCard
        label="Atteinte objectif"
        value={hasObjectif ? `${atteinte ?? 0} %` : '—'}
        icon="🎯"
        accent={atteinteColor}
        sub={hasObjectif ? (atteinte >= 100 ? 'Objectif atteint ✓' : `Il manque ${fmt(objectifAnnuelCA - caValide)}`) : 'Définir un objectif →'}
        progress={hasObjectif ? (atteinte ?? 0) : undefined}
      />
    </div>
  )
}
