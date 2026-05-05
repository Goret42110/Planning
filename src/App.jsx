import { useState, createContext, useContext } from 'react'
import { useAppData } from './hooks/useAppData'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import TabNav from './components/TabNav'
import PlanningGrid from './components/planning/PlanningGrid'
import PersonnelList from './components/personnel/PersonnelList'
import AffaireList from './components/affaires/AffaireList'
import ChargeGlobale from './components/charge/ChargeGlobale'
import RecapDashboard from './components/recap/RecapDashboard'
import RecapHeures from './components/recap/RecapHeures'
import BudgetPrevisionnelPage from './pages/BudgetPrevisionnelPage'

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export default function App() {
  const appData = useAppData()
  const { session } = useAuth()

  const [activeTab, setActiveTab] = useState('planning')
  const [selectedCA, setSelectedCA] = useState(null)
  const [personTypeFilter, setPersonTypeFilter] = useState('all')

  if (appData.syncing) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Chargement des données…</p>
      </div>
    </div>
  )

  return (
    <AppContext.Provider value={{
      ...appData,
      selectedCA,
      setSelectedCA,
      personTypeFilter,
      setPersonTypeFilter,
    }}>
      <div className="flex flex-col h-screen bg-slate-50">
        <Header />
        <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 overflow-hidden">
          {activeTab === 'planning'    && <PlanningGrid />}
          {activeTab === 'personnel'   && <PersonnelList />}
          {activeTab === 'affaires'    && <AffaireList />}
          {activeTab === 'charge'      && <ChargeGlobale />}
          {activeTab === 'recap'       && <RecapDashboard />}
          {activeTab === 'recapheures' && <RecapHeures />}
          {activeTab === 'budget'      && <BudgetPrevisionnelPage />}
        </div>
      </div>
    </AppContext.Provider>
  )
}
