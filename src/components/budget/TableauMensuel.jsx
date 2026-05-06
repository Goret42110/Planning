function formatK(v) {
  if (v === null || v === undefined) return '—'
  return Math.round(v / 1000) + ' k€'
}

function rowBg(row) {
  if (!row.objectifCA || row.objectifCA <= 0) return ''
  const pct = (row.caValide / row.objectifCA) * 100
  if (pct >= 100) return 'bg-green-50'
  if (pct >= 70) return 'bg-amber-50'
  return 'bg-red-50'
}

function exportCSV(data, exerciceLabel) {
  const headers = ['Mois', 'J. personnel validés', 'J. personnel pondérés', 'H. prévis.', 'H. validées', 'CA prévis. (€)', 'CA validé (€)', 'Nb aff.', 'Objectif CA (€)', 'Écart (€)']
  const rows = data.map(d => [
    d.label,
    d.joursPersonnelValides ?? 0,
    d.joursPersonnelPonderes ?? 0,
    d.heuresPondees,
    d.heuresValides,
    d.caPondere,
    d.caValide,
    d.nbAffaires,
    d.objectifCA,
    d.ecartCA,
  ])

  // Ligne total
  const totH = data.reduce((s, d) => s + d.heuresPondees, 0)
  const totHV = data.reduce((s, d) => s + d.heuresValides, 0)
  const totCA = data.reduce((s, d) => s + d.caPondere, 0)
  const totCAV = data.reduce((s, d) => s + d.caValide, 0)
  const totObj = data.reduce((s, d) => s + d.objectifCA, 0)
  const totEcart = data.reduce((s, d) => s + d.ecartCA, 0)
  rows.push(['TOTAL', Math.round(totH * 10) / 10, Math.round(totHV * 10) / 10, Math.round(totCA), Math.round(totCAV), '', Math.round(totObj), Math.round(totEcart)])

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${v}"`).join(';'))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budget_${exerciceLabel}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TableauMensuel({ data, exerciceLabel }) {
  if (!data?.length) return null

  const totJV  = data.reduce((s, d) => s + (d.joursPersonnelValides  ?? 0), 0)
  const totJP  = data.reduce((s, d) => s + (d.joursPersonnelPonderes ?? 0), 0)
  const totH   = data.reduce((s, d) => s + d.heuresPondees, 0)
  const totHV  = data.reduce((s, d) => s + d.heuresValides, 0)
  const totCA  = data.reduce((s, d) => s + d.caPondere, 0)
  const totCAV = data.reduce((s, d) => s + d.caValide, 0)
  const totNb  = data.reduce((s, d) => s + d.nbAffaires, 0)
  const totObj = data.reduce((s, d) => s + d.objectifCA, 0)
  const totEcart = data.reduce((s, d) => s + d.ecartCA, 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mx-6 mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">
          Tableau mensuel — Exercice {exerciceLabel}
        </h3>
        <button
          onClick={() => exportCSV(data, exerciceLabel)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors"
        >
          Exporter CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-slate-400 font-medium uppercase tracking-wider">Mois</th>
              <th className="text-right px-3 py-2.5 text-blue-400 font-medium uppercase tracking-wider" title="Jours planning sur affaires à 100%">J. pers. validés</th>
              <th className="text-right px-3 py-2.5 text-indigo-400 font-medium uppercase tracking-wider" title="Jours planning pondérés par probabilité">J. pers. pondérés</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-medium uppercase tracking-wider">H. prévis.</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-medium uppercase tracking-wider">H. validées</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-medium uppercase tracking-wider">CA prévis.</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-medium uppercase tracking-wider">CA validé</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-medium uppercase tracking-wider">Nb aff.</th>
              <th className="text-right px-3 py-2.5 text-slate-400 font-medium uppercase tracking-wider">Objectif CA</th>
              <th className="text-right px-4 py-2.5 text-slate-400 font-medium uppercase tracking-wider">Écart</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.key} className={`border-b border-slate-100 ${rowBg(row)}`}>
                <td className="px-4 py-2 font-medium text-slate-700">{row.label}</td>
                <td className="px-3 py-2 text-right text-blue-700 font-medium">{row.joursPersonnelValides > 0 ? row.joursPersonnelValides + ' j' : '—'}</td>
                <td className="px-3 py-2 text-right text-indigo-600">{row.joursPersonnelPonderes > 0 ? row.joursPersonnelPonderes + ' j' : '—'}</td>
                <td className="px-3 py-2 text-right text-slate-600">{row.heuresPondees} h</td>
                <td className="px-3 py-2 text-right text-slate-600">{row.heuresValides} h</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatK(row.caPondere)}</td>
                <td className="px-3 py-2 text-right font-medium text-slate-800">{formatK(row.caValide)}</td>
                <td className="px-3 py-2 text-right text-slate-500">{row.nbAffaires || '—'}</td>
                <td className="px-3 py-2 text-right text-slate-500">{row.objectifCA > 0 ? formatK(row.objectifCA) : '—'}</td>
                <td className={`px-4 py-2 text-right font-medium ${row.ecartCA >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {row.objectifCA > 0 ? (row.ecartCA >= 0 ? '+' : '') + formatK(row.ecartCA) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300">
              <td className="px-4 py-2.5 font-bold text-slate-800">TOTAL</td>
              <td className="px-3 py-2.5 text-right font-bold text-blue-700">{Math.round(totJV * 10) / 10} j</td>
              <td className="px-3 py-2.5 text-right font-bold text-indigo-600">{Math.round(totJP * 10) / 10} j</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-800">{Math.round(totH * 10) / 10} h</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-800">{Math.round(totHV * 10) / 10} h</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatK(totCA)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-800">{formatK(totCAV)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-500">—</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-800">{totObj > 0 ? formatK(totObj) : '—'}</td>
              <td className={`px-4 py-2.5 text-right font-bold ${totEcart >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {totObj > 0 ? (totEcart >= 0 ? '+' : '') + formatK(totEcart) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
