import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'planning',    label: 'Planning',       icon: '📅', roles: null },
  { id: 'gantt',       label: 'Gantt',          icon: '📊', roles: null },
  { id: 'personnel',   label: 'Personnel',      icon: '👷', roles: null },
  { id: 'affaires',    label: 'Affaires',       icon: '📁', roles: null },
  { id: 'charge',      label: 'Charge',         icon: '⚖️', roles: null },
  { id: 'recap',       label: 'Récap',          icon: '📋', roles: null },
  { id: 'recapheures', label: 'Heures',         icon: '⏱', roles: null },
  { id: 'budget',      label: 'Budget',         icon: '💰', roles: ['responsable', 'ca'] },
]

export default function TabNav({ activeTab, setActiveTab }) {
  const { session } = useAuth()
  const role = session?.role
  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(role))

  return (
    <nav className="bg-white border-b border-slate-200 px-2 flex shrink-0 overflow-x-auto shadow-sm">
      {visibleTabs.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              isActive
                ? 'text-[#E31E24]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E31E24] rounded-t-full" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
