import { useState, useEffect, useCallback } from 'react'
import { getItem, setItem } from '../lib/supabaseStorage'

const STORAGE_KEY = 'els_network_key'
const LOCAL_KEY   = 'els_net_access'

/**
 * Gestion de la clé réseau.
 * - L'admin définit une clé dans Supabase (els_network_key)
 * - L'utilisateur saisit cette clé une fois → stockée en localStorage
 * - Si la clé locale correspond à la clé Supabase → accès autorisé
 */
export function useNetworkKey() {
  const [networkKey,  setNetworkKey]  = useState(null)  // clé définie par l'admin dans Supabase
  const [localKey,    setLocalKey]    = useState(() => {
    try { return localStorage.getItem(LOCAL_KEY) || '' } catch { return '' }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getItem(STORAGE_KEY).then(val => {
      setNetworkKey(val || null)
      setLoading(false)
    })
  }, [])

  const isGranted = !loading && networkKey && localKey === networkKey

  const enterKey = useCallback((key) => {
    const k = key.trim()
    setLocalKey(k)
    try { localStorage.setItem(LOCAL_KEY, k) } catch {}
  }, [])

  const clearKey = useCallback(() => {
    setLocalKey('')
    try { localStorage.removeItem(LOCAL_KEY) } catch {}
  }, [])

  // Réservé à l'admin : définir ou changer la clé réseau
  const setAdminKey = useCallback((newKey) => {
    const k = newKey.trim()
    setNetworkKey(k)
    setItem(STORAGE_KEY, k)
  }, [])

  return { isGranted, loading, networkKey, localKey, enterKey, clearKey, setAdminKey }
}
