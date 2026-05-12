import { useState, useEffect, useCallback } from 'react'
import { getItem, setItem, subscribeToKey } from '../lib/supabaseStorage'

const STORAGE_KEY = 'els_gestion_imports'

function loadLocal() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : {} } catch { return {} }
}

/**
 * Structure :
 * {
 *   "2026-04": {                        // mois YYYY-MM
 *     "FB": {                           // initiales CA
 *       importedAt: "ISO",
 *       importedBy: "prénom nom",
 *       affaires: {
 *         "ELS2301119": {
 *           client, intitule,
 *           montantCommande, montantFacture,
 *           heuresPrevues, heuresRealisees,
 *           achatsPrevus, achatsRealises,
 *           prixRevient, marge,
 *           resteAFacturer, aFacturer, aFacturerSM,
 *           pctAFacturer, commentaireExcel,
 *           commentaireGestion,  // commentaire saisi lors du point
 *           pointFait: false,    // coché lors du point mensuel
 *         }
 *       }
 *     }
 *   }
 * }
 */

export function useGestion() {
  const [data, setData] = useState(loadLocal)

  useEffect(() => {
    getItem(STORAGE_KEY).then(remote => {
      if (remote) {
        setData(remote)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)) } catch {}
      }
    })
  }, [])

  useEffect(() => {
    return subscribeToKey(STORAGE_KEY, remote => {
      if (remote) {
        setData(remote)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)) } catch {}
      }
    })
  }, [])

  function save(next) {
    setData(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
    setItem(STORAGE_KEY, next)
  }

  // Importer un fichier Excel pour un mois/CA
  const importData = useCallback((mois, caInitiales, affaires, importedBy) => {
    const next = {
      ...data,
      [mois]: {
        ...(data[mois] || {}),
        [caInitiales]: {
          importedAt: new Date().toISOString(),
          importedBy,
          affaires,
        },
      },
    }
    save(next)
  }, [data])

  // Mettre à jour une affaire (commentaire, pointFait…)
  const updateAffaire = useCallback((mois, caInitiales, numero, patch) => {
    const prev = data[mois]?.[caInitiales]?.affaires?.[numero] || {}
    const next = {
      ...data,
      [mois]: {
        ...data[mois],
        [caInitiales]: {
          ...data[mois]?.[caInitiales],
          affaires: {
            ...data[mois]?.[caInitiales]?.affaires,
            [numero]: { ...prev, ...patch },
          },
        },
      },
    }
    save(next)
  }, [data])

  // Récupérer les données d'un mois/CA
  const getMoisCA = useCallback((mois, caInitiales) => {
    return data[mois]?.[caInitiales] || null
  }, [data])

  // Liste des mois disponibles (trié desc)
  const moisDisponibles = Object.keys(data).sort((a, b) => b.localeCompare(a))

  // Historique d'une affaire sur tous les mois
  const getHistoriqueAffaire = useCallback((numero) => {
    const hist = []
    for (const mois of Object.keys(data).sort((a, b) => a.localeCompare(b))) {
      for (const ca of Object.keys(data[mois])) {
        const aff = data[mois][ca]?.affaires?.[numero]
        if (aff) hist.push({ mois, ca, ...aff })
      }
    }
    return hist
  }, [data])

  return { data, importData, updateAffaire, getMoisCA, moisDisponibles, getHistoriqueAffaire }
}
