import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'

function fmtH(v) { return Math.round(v) + ' h' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-3 text-xs min-w-40">
      <div className="font-semibold text-slate-700 mb-2">{label}</div>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: e.color }} />
            <span className="text-slate-500">{e.name}</span>
          </span>
          <span className="font-semibold text-slate-800">{fmtH(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CourbeCharge({ data, data2, objectifMensuelHeures, showComparison, label2 }) {
  const seuil = objectifMensuelHeures > 0 ? objectifMensuelHeures : null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Charge prévisionnelle</h3>
          <p className="text-xs text-slate-400 mt-0.5">Heures issues des affaires pondérées par probabilité</p>
        </div>
        {seuil > 0 && (
          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            Cible : {fmtH(seuil)} / mois
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Poppins' }} axisLine={false} tickLine={false} width={46} tickFormatter={v => `${Math.round(v)}h`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Poppins', paddingTop: 8 }} />
          {seuil > 0 && (
            <ReferenceLine y={seuil} stroke="#E31E24" strokeDasharray="5 3"
              label={{ value: `Cible ${fmtH(seuil)}`, position: 'insideTopRight', fontSize: 10, fill: '#E31E24', fontFamily: 'Poppins' }} />
          )}
          <Bar dataKey="heuresValides" name="Heures validées" fill="#1d4ed8" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="heuresPondees" name="Heures pondérées" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={28} />
          {showComparison && data2 && (
            <Line type="monotone" data={data2} dataKey="heuresPondees" name={`Pondérées (${label2})`}
              stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
