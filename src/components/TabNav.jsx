import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'planning',    label: 'Planning',        roles: null },
  { id: 'gantt',       label: '📅 Gantt',        roles: null },
  { id: 'personnel',   label: 'Personnel',       roles: null },
  { id: 'affaires',    label: 'Affaires',        roles: null },
  { id: 'charge',      label: 'Charge globale',  roles: null },
  { id: 'recap',       label: 'Récap',           roles: null },
  { id: 'recapheures', label: '⏱ Heures',       roles: null },
  { id: 'budget',      label: '📊 Budget',       roles: ['responsable', 'ca'] },
]

export default function TabNav({ activeTab, setActiveTab }) {
  const { session } = useAuth()
  const role = session?.role

  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(role))

  return (
    <nav className="bg-white border-b border-slate-200 px-4 flex shrink-0 shadow-sm">
      {visibleTabs.map(tab => (
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
