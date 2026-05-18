import { createContext, useContext, useState, useEffect } from 'react'
import { getItem } from '../lib/supabaseStorage'

const LOCAL_KEY = 'els_net_access'
const STORAGE_KEY = 'els_network_key'

const NetworkContext = createContext({
  isOnNetwork: false,
  checking: true,
  networkKey: null,
  tryKey: () => {},
})

export function NetworkProvider({ children }) {
  const [networkKey,  setNetworkKey]  = useState(null)
  const [localKey,    setLocalKey]    = useState(() => {
    try { return localStorage.getItem(LOCAL_KEY) || '' } catch { return '' }
  })
  const [loading, setLoading] = useState(true)

  // Charger la clé admin depuis Supabase
  useEffect(() => {
    getItem(STORAGE_KEY).then(val => {
      setNetworkKey(val || null)
      setLoading(false)
    })
  }, [])

  const isOnNetwork = !loading && !!networkKey && localKey === networkKey

  // Saisie du mot de passe par l'utilisateur
  function tryKey(input) {
    const k = input.trim()
    setLocalKey(k)
    try { localStorage.setItem(LOCAL_KEY, k) } catch {}
  }

  return (
    <NetworkContext.Provider value={{ isOnNetwork, checking: loading, networkKey, tryKey }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}
