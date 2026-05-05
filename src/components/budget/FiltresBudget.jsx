export default function FiltresBudget({ filtres, onChange, caList, isResponsable }) {
  function set(key, value) {
    onChange({ ...filtres, [key]: value })
  }

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-4 shrink-0">

      {/* Vue */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Vue</span>
        <select
          value={filtres.vue}
          onChange={e => set('vue', e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="total">Total</option>
          <option value="secteur">Par secteur</option>
          <option value="ca">Par CA</option>
        </select>
      </div>

      {/* Exercice */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Exercice</span>
        <select
          value={filtres.exercice}
          onChange={e => set('exercice', e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="current">En cours</option>
          <option value="next">Prochain</option>
        </select>
      </div>

      {/* Proba min */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Proba min.</span>
        <select
          value={String(filtres.probMin)}
          onChange={e => set('probMin', Number(e.target.value))}
          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="0">Toutes</option>
          <option value="25">&ge; 25 %</option>
          <option value="50">&ge; 50 %</option>
          <option value="75">&ge; 75 %</option>
          <option value="100">100 % seulement</option>
        </select>
      </div>

      {/* Filtres réservés au responsable */}
      {isResponsable && (
        <>
          {/* Service */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Service</span>
            <select
              value={filtres.filtreService}
              onChange={e => set('filtreService', e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Tous</option>
              <option value="energie">Energie</option>
              <option value="petrole">Pétrole</option>
            </select>
          </div>

          {/* CA */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">CA</span>
            <select
              value={filtres.filtreCA}
              onChange={e => set('filtreCA', e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">Tous</option>
              {caList.map(ca => (
                <option key={ca.id} value={ca.id}>
                  {ca.prenom} {ca.nom}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  )
}
