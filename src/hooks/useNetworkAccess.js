import { useState, useEffect } from 'react'

/**
 * Vérifie côté serveur si l'IP cliente est autorisée.
 * Retourne : 'checking' | 'allowed' | 'blocked' | 'not_configured'
 */
export function useNetworkAccess() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false
    fetch('/api/network-check', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.reason === 'not_configured') setStatus('not_configured')
        else setStatus(data.allowed ? 'allowed' : 'blocked')
      })
      .catch(() => {
        if (!cancelled) setStatus('blocked')
      })
    return () => { cancelled = true }
  }, [])

  return status
}
