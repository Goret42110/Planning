import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

function formatK(v) {
  return Math.round(v / 1000) + ' k€'
}

function getBarColor(pct) {
  if (pct >= 100) return '#22c55e'
  if (pct >= 70) return '#f97316'
  return '#ef4444'
}

function CustomLabel(props) {
  const { x, y, width, height, value, index, data } = props
  const item = data[index]
  if (!item) return null
  const pct = item.objectif > 0 ? Math.round((item.caValide / item.objectif) * 100) : null
  const text = pct !== null
    ? `${formatK(item.caValide)} / ${formatK(item.objectif)} (${pct}%)`
    : `${formatK(item.caValide)}`

  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="middle"
      fontSize={10}
      fill="#64748b"
    >
      {text}
    </text>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const pct = d.objectif > 0 ? Math.round((d.caValide / d.objectif) * 100) : null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-slate-700 mb-1">{d.nom}</div>
      <div>CA validé : <span className="font-medium">{formatK(d.caValide)}</span></div>
      {d.objectif > 0 && <div>Objectif : <span className="font-medium">{formatK(d.objectif)}</span></div>}
      {pct !== null && <div>Atteinte : <span className="font-medium">{pct}%</span></div>}
    </div>
  )
}

export default function JaugeCA({ caListData }) {
  if (!caListData?.length) return null

  const chartHeight = Math.max(80, caListData.length * 52 + 20)

  // Enrichir avec pct pour la couleur
  const enriched = caListData.map(d => ({
    ...d,
    pct: d.objectif > 0 ? Math.round((d.caValide / d.objectif) * 100) : null,
  }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mx-6 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">CA par chargé d'affaires</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={enriched}
          layout="vertical"
          margin={{ top: 0, right: 160, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${Math.round(v / 1000)}k`}
          />
          <YAxis
            type="category"
            dataKey="nom"
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="caValide" name="CA validé" radius={[0, 3, 3, 0]} maxBarSize={22}>
            {enriched.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.pct ?? 0)} />
            ))}
            <LabelList content={<CustomLabel data={enriched} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
