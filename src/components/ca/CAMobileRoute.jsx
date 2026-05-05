import { createContext, useContext, useState } from 'react'
import { useAppData } from '../../hooks/useAppData'
import { AppContext } from '../../App'
import CAMobileView from './CAMobileView'

export default function CAMobileRoute() {
  const appData = useAppData()
  const [selectedCA, setSelectedCA] = useState(null)
  const [personTypeFilter, setPersonTypeFilter] = useState('all')

  return (
    <AppContext.Provider value={{ ...appData, selectedCA, setSelectedCA, personTypeFilter, setPersonTypeFilter }}>
      <CAMobileView />
    </AppContext.Provider>
  )
}
