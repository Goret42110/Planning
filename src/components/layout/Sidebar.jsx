import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export const NAV = [
  {
    id: 'accueil', label: 'Accueil', icon: '🏠',
  },
  {
    id: 'planning', label: 'Planning', icon: '📅',
    children: [
      { id: 'planning',  label: 'Grille semaine' },
      { id: 'gantt',     label: 'Gantt affaires' },
    ],
  },
  {
    id: 'affaires-section', label: 'Affaires', icon: '📁',
    children: [
      { id: 'affaires', label: 'Liste affaires' },
      { id: 'gestion',  label: 'Gestion mensuelle', roles: ['responsable', 'ca'] },
    ],
  },
  {
    id: 'equipe', label: 'Équipe', icon: '👷',
    children: [
      { id: 'personnel',   label: 'Personnel' },
      { id: 'activite',    label: 'Activité & Charge' },
      { id: 'recapheures', label: 'Récap heures' },
    ],
  },
  {
    id: 'finances', label: 'Finances', icon: '💰',
    roles: ['responsable', 'ca'],
    children: [
      { id: 'budget', label: 'Budget prévisionnel' },
    ],
  },
]

export default function Sidebar({ activeTab, setActiveTab }) {
  const { session, logout } = useAuth()
  const [collapsed,    setCollapsed]    = useState(false)
  const [openSections, setOpenSections] = useState(() => {
    // Ouvre la section contenant le tab actif
    const s = new Set()
    for (const n of NAV) {
      if (n.children?.some(c => c.id === activeTab)) s.add(n.id)
    }
    if (!s.size) s.add('planning')
    return s
  })

  const role = session?.role

  function toggleSection(id) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function canSee(item) {
    if (!item.roles) return true
    return item.roles.includes(role)
  }

  const visibleNav = NAV.filter(canSee)

  return (
    <aside className={`flex flex-col shrink-0 transition-all duration-200 border-r border-white/10 ${collapsed ? 'w-14' : 'w-52'}`}
      style={{ background: '#1C1C2E' }}>

      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-3 py-3.5 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#E31E24' }}>
          <span className="text-white font-bold text-xs">e</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="leading-none">
              <span className="text-[#E31E24] font-bold text-sm">els</span>
              <span className="text-white font-light text-sm"> planning</span>
            </div>
            <div className="text-white/30 text-xs leading-none mt-0.5" style={{ fontSize: 9 }}>by Genesienne</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5">
        {visibleNav.map(item => {
          const hasChildren = item.children?.filter(canSee).length > 0
          const isOpen      = openSections.has(item.id)
          const isActive    = item.id === activeTab || item.children?.some(c => c.id === activeTab)

          if (!hasChildren) {
            // Item simple (Accueil)
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                } ${collapsed ? 'justify-center' : ''}`}
                style={activeTab === item.id ? { background: '#E31E24' } : {}}>
                <span className="text-base shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          }

          return (
            <div key={item.id}>
              {/* Section header */}
              <button onClick={() => { if (collapsed) setCollapsed(false); toggleSection(item.id) }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'text-white bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                } ${collapsed ? 'justify-center' : ''}`}>
                <span className="text-base shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''} text-white/30`}>›</span>
                  </>
                )}
              </button>

              {/* Sous-items */}
              {!collapsed && isOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {item.children.filter(canSee).map(child => (
                    <button key={child.id} onClick={() => setActiveTab(child.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeTab === child.id
                          ? 'text-white bg-[#E31E24]/80'
                          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                      }`}>
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 p-2 space-y-1 shrink-0`}>
        {/* Admin */}
        {role === 'responsable' && (
          <Link to="/admin"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}>
            <span className="text-sm shrink-0">⚙️</span>
            {!collapsed && <span>Administration</span>}
          </Link>
        )}

        {/* User */}
        <div className={`flex items-center gap-2 px-2 py-1.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: '#E31E24' }}>
            {session?.prenom?.[0]}{session?.nom?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{session?.prenom} {session?.nom}</div>
              <div className="text-white/30 text-xs truncate capitalize">{session?.role}</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(v => !v)}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}>
          <span>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </aside>
  )
}
