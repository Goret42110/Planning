import { useState, createContext, useContext } from 'react'
import { useAppData } from './hooks/useAppData'
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

export default function App() {
  const appData = useAppData()
  const [activeTab, setActiveTab] = useState('planning')
  const [selectedCA, setSelectedCA] = useState(null)
  const [personTypeFilter, setPersonTypeFilter] = useState('all')

  return (
    <AppContext.Provider value={{ ...appData, selectedCA, setSelectedCA, personTypeFilter, setPersonTypeFilter }}>
      <div className="flex flex-col h-screen bg-slate-50">
        <Header />
        <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 overflow-hidden">
          {activeTab === 'planning'   && <PlanningGrid />}
          {activeTab === 'personnel'  && <PersonnelList />}
          {activeTab === 'affaires'   && <AffaireList />}
          {activeTab === 'charge'     && <ChargeGlobale />}
          {activeTab === 'recap'      && <RecapDashboard />}
          {activeTab === 'recapheures' && <RecapHeures />}
        </div>
      </div>
    </AppContext.Provider>
  )
}
