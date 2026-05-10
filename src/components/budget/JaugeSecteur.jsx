function fmt(v) {
  if (!v) return '0 €'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2).replace('.', ',') + ' M€'
  return Math.round(v / 1000) + ' k€'
}

function GaugeBar({ label, caValide, caPrevisionnel, objectif, color }) {
  const pctValide = objectif > 0 ? Math.min((caValide / objectif) * 100, 100) : 0
  const pctPrev   = objectif > 0 ? Math.min((caPrevisionnel / objectif) * 100, 100) : 0
  const atteinte  = objectif > 0 ? Math.round((caValide / objectif) * 100) : null
  const prevision = objectif > 0 ? Math.round((caPrevisionnel / objectif) * 100) : null

  const statusColor = atteinte === null ? 'text-slate-400'
    : atteinte >= 100 ? 'text-green-600'
    : atteinte >= 70  ? 'text-amber-500'
    : 'text-red-500'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex-1 min-w-64">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">{label}</div>
          {objectif > 0 && (
            <div className="text-xs text-slate-400 mt-0.5">Objectif : {fmt(objectif)}</div>
          )}
        </div>
        {atteinte !== null && (
          <div className={`text-2xl font-bold ${statusColor}`}>{atteinte}%</div>
        )}
      </div>

      {/* Barre principale */}
      <div className="space-y-2">
        {/* CA prévisionnel (fond) */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>CA prévisionnel</span>
            <span className="font-medium text-slate-600">{fmt(caPrevisionnel)}{prevision !== null ? ` (${prevision}%)` : ''}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pctPrev}%`, background: color, opacity: 0.35 }} />
          </div>
        </div>

        {/* CA validé (premier plan) */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>CA validé</span>
            <span className={`font-bold ${statusColor}`}>{fmt(caValide)}</span>
          </div>
          <div className="h-5 bg-slate-100 rounded-full overflow-hidden relative">
            {/* Fond prévisionnel */}
            <div className="absolute inset-0 rounded-full"
              style={{ width: `${pctPrev}%`, background: color, opacity: 0.2 }} />
            {/* Validé */}
            <div className="absolute inset-0 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${pctValide}%`, background: color }}>
              {pctValide > 15 && (
                <span className="text-white text-xs font-bold">{atteinte}%</span>
              )}
            </div>
            {/* Marqueur objectif */}
            {objectif > 0 && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                style={{ left: '100%', transform: 'translateX(-1px)' }} />
            )}
          </div>
        </div>
      </div>

      {/* Indicateur statut */}
      {objectif > 0 && (
        <div className={`mt-3 text-xs font-medium flex items-center gap-1.5 ${statusColor}`}>
          <span>{atteinte >= 100 ? '✅' : atteinte >= 70 ? '⚠️' : '🔴'}</span>
          <span>
            {atteinte >= 100 ? 'Objectif atteint'
              : atteinte >= 70 ? `Il manque ${fmt(objectif - caValide)}`
              : `Il manque ${fmt(objectif - caValide)}`}
          </span>
          {caPrevisionnel > caValide && (
            <span className="text-slate-400 font-normal ml-1">
              · {fmt(caPrevisionnel - caValide)} en cours
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function JaugeSecteur({ secteursData }) {
  if (!secteursData?.length) return null

  return (
    <div className="px-6 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Avancement par secteur</h3>
      <div className="flex gap-4 flex-wrap">
        {secteursData.map(s => (
          <GaugeBar key={s.id}
            label={s.label}
            caValide={s.caValide}
            caPrevisionnel={s.caPrevisionnel}
            objectif={s.objectif}
            color={s.color}
          />
        ))}
      </div>
    </div>
  )
}
