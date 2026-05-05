import { useState, useCallback } from 'react'

const STORAGE_KEY = 'objectifs_budget'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

/**
 * getCurrentFiscalYear()
 * L'exercice fiscal va du 1er octobre au 30 septembre.
 * On retourne l'année de début de l'exercice.
 * Exemples :
 *   mai 2026  (month=4, < 9) → exercice 2025-2026 → retourne 2025
 *   oct 2026  (month=9, >= 9) → exercice 2026-2027 → retourne 2026
 */
export function getCurrentFiscalYear() {
  const now = new Date()
  const month = now.getMonth() // 0-based : 0=jan, 9=oct
  const year = now.getFullYear()
  return month >= 9 ? year : year - 1
}

export function useObjectifs() {
  const [objectifs, setObjectifs] = useState(() => load())

  const getExercice = useCallback((fiscalYear) => {
    const key = `${fiscalYear}-${fiscalYear + 1}`
    return objectifs[key] || {
      global: { ca: 0, heures: 0 },
      secteurs: {
        energie: { ca: 0 },
        petrole: { ca: 0 },
      },
      ca: {},
    }
  }, [objectifs])

  const setExercice = useCallback((fiscalYear, data) => {
    const key = `${fiscalYear}-${fiscalYear + 1}`
    setObjectifs(prev => {
      const next = { ...prev, [key]: data }
      save(next)
      return next
    })
  }, [])

  return { objectifs, getExercice, setExercice, getCurrentFiscalYear }
}
