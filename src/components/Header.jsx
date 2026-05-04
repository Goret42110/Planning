import { useApp } from '../App'

export default function Header() {
  const { personnel, selectedCA, setSelectedCA } = useApp()
  const rs  = personnel.find(p => p.role === 'RS')
  const cas = personnel.filter(p => p.role === 'CA' && p.actif)

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-5 py-2.5 flex items-center justify-between shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 3L5 14h8l-2 7 9-11h-8l2-7z" fill="#1e3a5f" stroke="#1e3a5f" strokeWidth="0.5"/>
          </svg>
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-none">ELS Énergie</div>
          <div className="text-slate-400 text-xs">Electro Loire Services</div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* CA filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Vue CA :</span>
          <select
            value={selectedCA || ''}
            onChange={e => setSelectedCA(e.target.value || null)}
            className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option value="">Tous les CA</option>
            {cas.map(ca => (
              <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>
            ))}
          </select>
        </div>

        {/* RS badge */}
        {rs && (
          <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
            <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-bold">
              {rs.prenom[0]}{rs.nom[0]}
            </div>
            <span className="text-slate-200 text-sm font-medium">{rs.prenom} {rs.nom}</span>
            <span className="text-xs bg-rose-900 text-rose-300 border border-rose-700 px-1.5 py-0.5 rounded font-medium">RS</span>
          </div>
        )}
      </div>
    </header>
  )
}
