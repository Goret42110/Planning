function formatMontant(val) {
  if (val === null || val === undefined) return '—'
  const abs = Math.abs(val)
  if (abs >= 1_000_000) {
    return (val / 1_000_000).toFixed(2).replace('.', ',') + ' M€'
  }
  return Math.round(val / 1000) + ' k€'
}

function KpiCard({ label, value, icon, colorClass, bgClass, sub }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${bgClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-2xl font-bold leading-tight ${colorClass}`}>{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function KpiCards({ kpis, objectifAnnuelCA }) {
  const { caValide, caPrevisionnel, chargePrevue, atteinte } = kpis

  let atteinteColor = 'text-slate-500'
  let atteinteLabel = '—'
  if (atteinte !== null && atteinte !== undefined) {
    atteinteLabel = `${atteinte} %`
    if (atteinte >= 100) atteinteColor = 'text-green-600'
    else if (atteinte >= 70) atteinteColor = 'text-amber-500'
    else atteinteColor = 'text-red-500'
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
      <KpiCard
        label="CA validé"
        value={formatMontant(caValide)}
        icon="✅"
        colorClass="text-green-600"
        bgClass="bg-green-50"
        sub={objectifAnnuelCA > 0 ? `obj. ${formatMontant(objectifAnnuelCA)}` : undefined}
      />
      <KpiCard
        label="CA prévisionnel"
        value={formatMontant(caPrevisionnel)}
        icon="📈"
        colorClass="text-blue-600"
        bgClass="bg-blue-50"
        sub="pondéré par probabilité"
      />
      <KpiCard
        label="Charge prévis."
        value={`${Math.round(chargePrevue)} h`}
        icon="⚙️"
        colorClass="text-violet-600"
        bgClass="bg-violet-50"
        sub="heures pondérées"
      />
      <KpiCard
        label="Atteinte objectif"
        value={atteinteLabel}
        icon="🎯"
        colorClass={atteinteColor}
        bgClass="bg-slate-50"
        sub="CA validé / objectif annuel"
      />
    </div>
  )
}
