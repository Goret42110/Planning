import { useState, useCallback, useEffect } from 'react'
import { getItem, setItem, subscribeToKey } from '../lib/supabaseStorage'

const STORAGE_KEY = 'objectifs_budget'

export function getCurrentFiscalYear() {
  const now = new Date()
  return now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1
}

export function useObjectifs() {
  const [objectifs, setObjectifs] = useState(() => {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
  })

  // Chargement initial depuis Supabase
  useEffect(() => {
    getItem(STORAGE_KEY).then(remote => {
      if (remote) {
        setObjectifs(remote)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)) } catch {}
      }
    })
  }, [])

  // Temps réel
  useEffect(() => {
    return subscribeToKey(STORAGE_KEY, remote => {
      if (remote) {
        setObjectifs(remote)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)) } catch {}
      }
    })
  }, [])

  const getExercice = useCallback((fiscalYear) => {
    const key = `${fiscalYear}-${fiscalYear + 1}`
    return objectifs[key] || {
      global:   { ca: 0, heures: 0 },
      secteurs: { energie: { ca: 0 }, petrole: { ca: 0 } },
      ca:       {},
    }
  }, [objectifs])

  const setExercice = useCallback((fiscalYear, data) => {
    const key = `${fiscalYear}-${fiscalYear + 1}`
    setObjectifs(prev => {
      const next = { ...prev, [key]: data }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { objectifs, getExercice, setExercice, getCurrentFiscalYear }
}
