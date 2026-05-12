import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'

function fmt(v) {
  if (!v) return '0'
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2).replace('.', ',') + 'M'
  return Math.round(v / 1000) + 'k'
}

function CustomTooltip({ active, payload, label, data }) {
  if (!active || !payload?.length) return null
  const idx = data?.findIndex(d => d.label === label) ?? -1
  let cumulValide = 0, cumulPrev = 0
  if (idx >= 0 && data) {
    for (let i = 0; i <= idx; i++) {
      cumulValide += data[i]?.caValide || 0
      cumulPrev   += (data[i]?.caValide || 0) + (data[i]?.caPondere || 0)
    }
  }
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-3 text-xs min-w-44">
      <div className="font-semibold text-slate-700 mb-2">{label}</div>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: e.color }} />
            <span className="text-slate-500">{e.name}</span>
          </span>
          <span className="font-semibold text-slate-800">{fmt(e.value)} €</span>
        </div>
      ))}
      {idx >= 0 && data && (
        <div className="border-t border-slate-100 mt-2 pt-2 space-y-0.5">
          <div className="flex justify-between text-slate-400">
            <span>Cumul validé</span>
            <span className="font-semibold text-green-600">{fmt(cumulValide)} €</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Cumul prévis.</span>
            <span className="font-semibold text-blue-600">{fmt(cumulPrev)} €</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CourbeCA({ data, data2, objectifMensuelCA, showComparison, label2 }) {
  const seuil = objectifMensuelCA > 0 ? objectifMensuelCA : null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Chiffre d'affaires mensuel</h3>
          <p className="text-xs text-slate-400 mt-0.5">Validé + prévisionnel pondéré</p>
        </div>
        {seuil > 0 && (
          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            Objectif : {fmt(seuil)} k€ / mois
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} width={46}
            tickFormatter={v => `${fmt(v)}€`} />
          <Tooltip content={<CustomTooltip data={data} />} />
          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Poppins', paddingTop: 8 }} />
          {seuil > 0 && (
            <ReferenceLine y={seuil} stroke="#E31E24" strokeDasharray="5 3"
              label={{ value: `Obj. ${fmt(seuil)}€`, position: 'insideTopRight', fontSize: 10, fill: '#E31E24', fontFamily: 'Poppins' }} />
          )}
          <Bar dataKey="caValide"   name="CA validé"           fill="#22c55e" stackId="ca" radius={[0,0,0,0]} maxBarSize={32} />
          <Bar dataKey="caPondere"  name="CA prévis. (hors 100%)" fill="#86efac" stackId="ca" radius={[3,3,0,0]} maxBarSize={32} />
          {showComparison && data2 && (
            <Line type="monotone" data={data2} dataKey="caPondere" name={`CA prévis. (${label2})`}
              stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
