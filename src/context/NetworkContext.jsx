import { createContext, useContext, useState, useEffect } from 'react'
import { pingLocalServer } from '../lib/localServer'

const NetworkContext = createContext({ isOnNetwork: false, checking: true })

export function NetworkProvider({ children }) {
  const [isOnNetwork, setIsOnNetwork] = useState(false)
  const [checking,    setChecking]    = useState(true)

  useEffect(() => {
    pingLocalServer().then(ok => {
      setIsOnNetwork(ok)
      setChecking(false)
    })
  }, [])

  return (
    <NetworkContext.Provider value={{ isOnNetwork, checking }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}
