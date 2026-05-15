import { useState, useEffect } from 'react'
import { pingLocalServer } from '../lib/localServer'

/**
 * Vérifie si le serveur local NAS (localhost:3001) est joignable.
 * Retourne : 'checking' | 'allowed' | 'blocked'
 *
 * 'allowed' → serveur NAS accessible → réseau entreprise détecté
 * 'blocked' → serveur injoignable   → hors réseau entreprise
 */
export function useNetworkAccess() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false
    pingLocalServer().then(ok => {
      if (!cancelled) setStatus(ok ? 'allowed' : 'blocked')
    })
    return () => { cancelled = true }
  }, [])

  return status
}
