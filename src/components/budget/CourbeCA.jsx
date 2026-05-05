import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

function formatK(v) {
  if (v === 0) return '0'
  return Math.round(v / 1000) + 'k'
}

function CustomTooltip({ active, payload, label, data }) {
  if (!active || !payload?.length) return null

  // Calcul du cumul glissant
  const idx = data.findIndex(d => d.label === label)
  let cumul = 0
  for (let i = 0; i <= idx; i++) {
    cumul += (data[i]?.caValide || 0) + (data[i]?.caPondere || 0)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <div className="font-semibold text-slate-700 mb-1.5">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: entry.color }} />
            <span className="text-slate-500">{entry.name}</span>
          </span>
          <span className="font-medium text-slate-800">{formatK(entry.value)} k€</span>
        </div>
      ))}
      <div className="border-t border-slate-100 mt-1.5 pt-1.5 flex items-center justify-between">
        <span className="text-slate-400">Cumul (prévis.)</span>
        <span className="font-semibold text-slate-700">{formatK(cumul)} k€</span>
      </div>
    </div>
  )
}

export default function CourbeCA({ data, objectifMensuelCA }) {
  const seuil = objectifMensuelCA > 0 ? objectifMensuelCA : null

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">CA mensuel (€)</h3>
        {seuil > 0 && (
          <span className="text-xs text-slate-400">Objectif mensuel : {formatK(seuil)} k€</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={v => `${formatK(v)}k`}
          />
          <Tooltip content={<CustomTooltip data={data} />} />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          {seuil > 0 && (
            <ReferenceLine
              y={seuil}
              stroke="#6366f1"
              strokeDasharray="6 3"
              label={{ value: `Obj. ${formatK(seuil)}k€`, position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }}
            />
          )}
          <Bar dataKey="caValide" name="CA validé" fill="#22c55e" stackId="ca" radius={[0, 0, 0, 0]} maxBarSize={36} />
          <Bar dataKey="caPondere" name="CA prévis. (hors 100%)" fill="#fb923c" stackId="ca" radius={[3, 3, 0, 0]} maxBarSize={36} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
