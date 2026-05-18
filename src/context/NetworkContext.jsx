import { createContext, useContext } from 'react'
import { useNetworkKey } from '../hooks/useNetworkKey'

/**
 * Contexte d'accès aux données sensibles.
 * Basé sur une clé réseau (mot de passe) définie par l'admin.
 * Un seul appel Supabase au démarrage, partagé dans toute l'app.
 */
const NetworkContext = createContext({ isOnNetwork: false, checking: true })

export function NetworkProvider({ children }) {
  const { isGranted, loading } = useNetworkKey()

  return (
    <NetworkContext.Provider value={{ isOnNetwork: isGranted, checking: loading }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  return useContext(NetworkContext)
}
