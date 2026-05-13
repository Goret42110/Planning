import { useState, useMemo, createContext, useContext } from 'react'
import { useAppData } from './hooks/useAppData'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/layout/Sidebar'
import PlanningGrid from './components/planning/PlanningGrid'
import PersonnelList from './components/personnel/PersonnelList'
import AffaireList from './components/affaires/AffaireList'
import RecapHeures from './components/recap/RecapHeures'
import BudgetPrevisionnelPage from './pages/BudgetPrevisionnelPage'
import GanttPage from './pages/GanttPage'
import GestionTab from './components/gestion/GestionTab'
import DashboardPage from './pages/DashboardPage'
import ActivitePage from './pages/ActivitePage'

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  const appData = useAppData()
  const { session } = useAuth()
  const [selectedCA, setSelectedCA] = useState(null)
  const [personTypeFilter, setPersonTypeFilter] = useState('all')
  // caPersonnelViewAll : CA peut voir TOUS les techniciens dans le planning
  // mais caIdEffectif reste toujours son propre id → affaires jamais exposées
  const [caPersonnelViewAll, setCaPersonnelViewAll] = useState(false)

  // caIdEffectif : toujours = session.id pour CA (affaires strictement les siennes)
  const caIdEffectif = useMemo(() => {
    if (session?.role === 'ca')  return session.id
    if (session?.role === 'aca') return session.caId || null
    return null
  }, [session])

  if (appData.syncing) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Chargement des données…</p>
      </div>
    </div>
  )

  return (
    <AppContext.Provider value={{
      ...appData,
      caIdEffectif,
      selectedCA,
      setSelectedCA,
      personTypeFilter,
      setPersonTypeFilter,
      caPersonnelViewAll,
      setCaPersonnelViewAll,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('accueil')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F4F5F7' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {activeTab === 'accueil'     && <DashboardPage setActiveTab={setActiveTab} />}
        {activeTab === 'planning'    && <PlanningGrid />}
        {activeTab === 'gantt'       && <GanttPage />}
        {activeTab === 'personnel'   && <PersonnelList />}
        {activeTab === 'affaires'    && <AffaireList />}
        {activeTab === 'activite'    && <ActivitePage />}
        {activeTab === 'recapheures' && <RecapHeures />}
        {activeTab === 'budget'      && <BudgetPrevisionnelPage />}
        {activeTab === 'gestion'     && <GestionTab />}
      </main>
    </div>
  )
}
