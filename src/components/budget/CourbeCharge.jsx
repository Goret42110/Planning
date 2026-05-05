import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

const H_PAR_PERSONNE = 176 // 22 jours × 8h

function hToPersonnes(h) { return h / H_PAR_PERSONNE }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-slate-700 mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          <span className="text-slate-600">{entry.name} :</span>
          <span className="font-medium text-slate-800">{entry.value.toFixed(1)} pers.</span>
        </div>
      ))}
    </div>
  )
}

function AlerteDot({ cx, cy, value, objectif }) {
  if (!objectif || value >= 0.7 * objectif) return null
  const today = new Date()
  // Pas de donnée de date ici, on marque tous les points sous seuil
  return <circle cx={cx} cy={cy} r={5} fill="#f97316" stroke="#fff" strokeWidth={1.5} />
}

export default function CourbeCharge({ data, objectifMensuelHeures }) {
  const seuilPersonnes = objectifMensuelHeures > 0 ? hToPersonnes(objectifMensuelHeures) : null

  const AlertDot = (props) => {
    const { cx, cy, value } = props
    if (!seuilPersonnes || value >= 0.7 * seuilPersonnes) return null
    return <circle cx={cx} cy={cy} r={5} fill="#f97316" stroke="#fff" strokeWidth={1.5} />
  }

  // Convertir les données heures → personnes
  const dataPersonnes = data.map(d => ({
    ...d,
    heuresPondees: parseFloat(hToPersonnes(d.heuresPondees).toFixed(2)),
    heuresValides: parseFloat(hToPersonnes(d.heuresValides).toFixed(2)),
  }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Charge prévisionnelle (personnes)</h3>
        {seuilPersonnes > 0 && (
          <span className="text-xs text-slate-400">Capacité cible : {seuilPersonnes.toFixed(1)} pers./mois</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={dataPersonnes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPondees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradValides" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.7} />
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50}
            tickFormatter={v => `${v} p.`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {seuilPersonnes > 0 && (
            <ReferenceLine
              y={seuilPersonnes}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{ value: `Capacité ${seuilPersonnes.toFixed(1)}`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
            />
          )}
          <Area type="monotone" dataKey="heuresPondees" name="Pers. pondérées"
            stroke="#93c5fd" strokeWidth={2} fill="url(#gradPondees)"
            dot={<AlertDot />} activeDot={{ r: 5 }} />
          <Area type="monotone" dataKey="heuresValides" name="Pers. validées"
            stroke="#1d4ed8" strokeWidth={2} fill="url(#gradValides)" activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
      {seuilPersonnes > 0 && (
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          <span>Mois sous 70 % de la capacité cible · Base : 1 pers. = 176h/mois</span>
        </div>
      )}
    </div>
  )
}
