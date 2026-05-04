const TABS = [
  { id: 'planning',  label: 'Planning' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'affaires',  label: 'Affaires' },
  { id: 'charge',    label: 'Charge globale' },
  { id: 'recap',     label: 'Récap' },
  { id: 'recapheures', label: '⏱ Heures' },
]

export default function TabNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bg-white border-b border-slate-200 px-4 flex shrink-0 shadow-sm">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
