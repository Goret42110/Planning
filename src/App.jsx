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

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

const TABS_RESPONSABLE = ['planning', 'personnel', 'affaires', 'charge', 'recap', 'recapheures']
const TABS_CA          = ['planning', 'affaires', 'charge', 'recap', 'recapheures']

export default function App() {
  const appData = useAppData()
  const { session } = useAuth()

  const isCA = session?.role === 'ca'

  const [activeTab, setActiveTab] = useState('planning')
  const [selectedCA, setSelectedCA] = useState(isCA ? session.id : null)
  const [personTypeFilter, setPersonTypeFilter] = useState('all')

  const allowedTabs = isCA ? TABS_CA : TABS_RESPONSABLE

  function handleSetActiveTab(tab) {
    if (allowedTabs.includes(tab)) setActiveTab(tab)
  }

  return (
    <AppContext.Provider value={{
      ...appData,
      selectedCA,
      setSelectedCA: isCA ? () => {} : setSelectedCA,
      personTypeFilter,
      setPersonTypeFilter,
    }}>
      <div className="flex flex-col h-screen bg-slate-50">
        <Header />
        <TabNav activeTab={activeTab} setActiveTab={handleSetActiveTab} allowedTabs={allowedTabs} />
        <div className="flex-1 overflow-hidden">
          {activeTab === 'planning'     && <PlanningGrid />}
          {activeTab === 'personnel'    && !isCA && <PersonnelList />}
          {activeTab === 'affaires'     && <AffaireList />}
          {activeTab === 'charge'       && <ChargeGlobale />}
          {activeTab === 'recap'        && <RecapDashboard />}
          {activeTab === 'recapheures'  && <RecapHeures />}
        </div>
      </div>
    </AppContext.Provider>
  )
}
