import { useMemo } from 'react'
import { getMondayOfWeek } from '../utils/weeks'
import { getCellSlots, slotJH, isSpecialId } from '../utils/slots'

/**
 * Retourne les 12 mois de l'exercice fiscal.
 * index 0 = Octobre (fiscalYear)
 * index 1 = Novembre (fiscalYear)
 * index 2 = Décembre (fiscalYear)
 * index 3 = Janvier  (fiscalYear+1)
 * ...
 * index 11 = Septembre (fiscalYear+1)
 */
function getFiscalMonths(fiscalYear) {
  const months = []
  const LABELS = ['Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep']
  // indices de mois JS (0-based) dans l'ordre fiscal
  const MONTH_INDICES = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8]

  for (let i = 0; i < 12; i++) {
    const monthIndex = MONTH_INDICES[i]
    const year = monthIndex >= 9 ? fiscalYear : fiscalYear + 1
    const mm = String(monthIndex + 1).padStart(2, '0')
    months.push({
      label: LABELS[i],
      key: `${year}-${mm}`,
      year,
      month: monthIndex, // 0-based JS month
    })
  }
  return months
}

/**
 * Nombre de jours dans un mois donné (année, mois 0-based)
 */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Nombre de jours de chevauchement entre [start, end] et le mois (year, month)
 */
function overlapDays(start, end, year, month) {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0) // dernier jour du mois

  const overlapStart = start > monthStart ? start : monthStart
  const overlapEnd = end < monthEnd ? end : monthEnd

  if (overlapStart > overlapEnd) return 0
  const ms = overlapEnd.getTime() - overlapStart.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Répartit les valeurs d'une affaire linéairement par jours sur les mois qui se chevauchent
 * avec [dateDebut, dateFin].
 * Retourne { [monthKey]: { heures, ca, heuresPondees, caPondere, caValide, heuresValides } }
 */
function distributeAffaire(affaire, fiscalMonths) {
  const { dateDebut, dateFin, heuresPrevues, montantHT, probabilite } = affaire

  if (!dateDebut || !dateFin) return {}

  const start = new Date(dateDebut)
  const end = new Date(dateFin)

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return {}

  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (totalDays <= 0) return {}

  const heures = parseFloat(heuresPrevues) || 0
  const ca = parseFloat(montantHT) || 0
  const prob = parseFloat(probabilite) || 0
  const isValide = prob === 100

  const result = {}

  for (const fm of fiscalMonths) {
    const days = overlapDays(start, end, fm.year, fm.month)
    if (days <= 0) continue

    const ratio = days / totalDays
    const heuresMois = heures * ratio
    const caMois = ca * ratio

    result[fm.key] = {
      heures: heuresMois,
      ca: caMois,
      heuresPondees: heuresMois * (prob / 100),
      caPondere: caMois * (prob / 100),
      caValide: isValide ? caMois : 0,
      heuresValides: isValide ? heuresMois : 0,
    }
  }

  return result
}

/**
 * Parse une clé planning "{personId}_{isoYear}-W{isoWeek}_{dayIndex}"
 */
function parsePlanningKey(key) {
  const m = key.match(/^(.+)_(\d{4})-W(\d{2})_(\d)$/)
  if (!m) return null
  return { personId: m[1], isoYear: parseInt(m[2]), isoWeek: parseInt(m[3]), dayIndex: parseInt(m[4]) }
}

/**
 * Calcule les jours personnel (validés et pondérés) par mois depuis le planning.
 * Retourne { [monthKey]: { joursValides, joursPonderes } }
 */
function getPersonnelMonthlyData(planning, affairesMap, filtreCA, filtreService, personnel, probMin) {
  const result = {}

  for (const [key, cellValue] of Object.entries(planning)) {
    const parsed = parsePlanningKey(key)
    if (!parsed) continue

    const slots = getCellSlots(cellValue)
    if (!slots.length) continue

    // Calculer la date calendaire de la cellule
    const monday = getMondayOfWeek(parsed.isoYear, parsed.isoWeek)
    const date = new Date(monday)
    date.setDate(date.getDate() + parsed.dayIndex)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    for (const slot of slots) {
      if (isSpecialId(slot.id)) continue
      const affaire = affairesMap[slot.id]
      if (!affaire) continue

      // Appliquer les filtres
      if (filtreCA && affaire.caId !== filtreCA) continue
      if (filtreService && affaire.serviceId && affaire.serviceId !== filtreService) continue
      const prob = parseFloat(affaire.probabilite) || 0
      if (prob < (probMin || 0)) continue

      const jh = slotJH(slot)
      if (!result[monthKey]) result[monthKey] = { joursValides: 0, joursPonderes: 0 }
      if (prob === 100) result[monthKey].joursValides += jh
      result[monthKey].joursPonderes += jh * (prob / 100)
    }
  }

  // Arrondir
  for (const mk of Object.keys(result)) {
    result[mk].joursValides  = Math.round(result[mk].joursValides  * 10) / 10
    result[mk].joursPonderes = Math.round(result[mk].joursPonderes * 10) / 10
  }

  return result
}

/**
 * Agrège toutes les affaires mois par mois
 */
function getMonthlyData(affairesFiltrees, fiscalMonths, objectifMensuelCA, objectifMensuelHeures) {
  // Pré-distribuer toutes les affaires
  const distributions = affairesFiltrees
    .filter(a => a.dateDebut && a.dateFin)
    .map(a => distributeAffaire(a, fiscalMonths))

  return fiscalMonths.map(fm => {
    let heuresPondees = 0
    let heuresValides = 0
    let caPondere = 0
    let caValide = 0
    let nbAffaires = 0

    for (const dist of distributions) {
      const m = dist[fm.key]
      if (!m) continue
      heuresPondees += m.heuresPondees
      heuresValides += m.heuresValides
      caPondere += m.caPondere
      caValide += m.caValide
      if (m.ca > 0 || m.heures > 0) nbAffaires++
    }

    const ecartCA = caValide - objectifMensuelCA

    return {
      label: fm.label,
      key: fm.key,
      heuresPondees: Math.round(heuresPondees * 10) / 10,
      heuresValides: Math.round(heuresValides * 10) / 10,
      caPondere: Math.round(caPondere),
      caValide: Math.round(caValide),
      nbAffaires,
      objectifCA: objectifMensuelCA,
      objectifHeures: objectifMensuelHeures,
      ecartCA: Math.round(ecartCA),
    }
  })
}

/**
 * Hook principal de calcul Budget Prévisionnel.
 * @param {Object} params
 * @param {Array}  params.affaires       - liste complète des affaires
 * @param {Object} params.objectifs      - objet retourné par getExercice(fiscalYear)
 * @param {number} params.fiscalYear     - année de début de l'exercice (ex: 2025)
 * @param {string} params.filtreCA       - id du CA à filtrer (ou '' pour tous)
 * @param {string} params.filtreService  - serviceId à filtrer (ou '' pour tous)
 * @param {number} params.probMin        - probabilité minimum (0, 25, 50, 75, 100)
 */
export function useBudgetPrevisionnel({ affaires, planning, personnel, objectifs, fiscalYear, filtreCA, filtreService, probMin }) {
  return useMemo(() => {
    const fiscalMonths = getFiscalMonths(fiscalYear)

    // ── Filtrage ──────────────────────────────────────────────────────────────
    const affairesFiltrees = affaires.filter(a => {
      if (filtreCA && a.caId !== filtreCA) return false
      if (filtreService && a.serviceId && a.serviceId !== filtreService) return false
      const prob = parseFloat(a.probabilite) || 0
      if (prob < (probMin || 0)) return false
      return true
    })

    // ── Objectifs ─────────────────────────────────────────────────────────────
    const objectifAnnuelCA = parseFloat(objectifs?.global?.ca) || 0
    const objectifAnnuelHeures = parseFloat(objectifs?.global?.heures) || 0
    const objectifMensuelCA = Math.round(objectifAnnuelCA / 12)
    const objectifMensuelHeures = Math.round(objectifAnnuelHeures / 12 * 10) / 10

    // ── Données mensuelles ────────────────────────────────────────────────────
    const monthlyData = getMonthlyData(affairesFiltrees, fiscalMonths, objectifMensuelCA, objectifMensuelHeures)

    // ── Personnel depuis le planning ──────────────────────────────────────────
    const affairesMap = Object.fromEntries(affaires.map(a => [a.id, a]))
    const personnelMonthly = getPersonnelMonthlyData(planning || {}, affairesMap, filtreCA, filtreService, personnel || [], probMin)
    for (const row of monthlyData) {
      const pm = personnelMonthly[row.key] || { joursValides: 0, joursPonderes: 0 }
      row.joursPersonnelValides  = pm.joursValides
      row.joursPersonnelPonderes = pm.joursPonderes
    }

    // ── KPIs globaux (incluent toutes les affaires filtrées, avec ou sans dates) ─
    let caValideTotal = 0
    let caPrevisionnelTotal = 0
    let chargePrevueTotal = 0

    for (const a of affairesFiltrees) {
      const ca = parseFloat(a.montantHT) || 0
      const prob = parseFloat(a.probabilite) || 0
      const heures = parseFloat(a.heuresPrevues) || 0

      if (prob === 100) caValideTotal += ca
      caPrevisionnelTotal += ca * (prob / 100)
      chargePrevueTotal += heures * (prob / 100)
    }

    const atteinte = objectifAnnuelCA > 0
      ? Math.round((caValideTotal / objectifAnnuelCA) * 100)
      : null

    const kpis = {
      caValide: Math.round(caValideTotal),
      caPrevisionnel: Math.round(caPrevisionnelTotal),
      chargePrevue: Math.round(chargePrevueTotal * 10) / 10,
      atteinte,
    }

    return { monthlyData, kpis, fiscalMonths }
  }, [affaires, objectifs, fiscalYear, filtreCA, filtreService, probMin])
}
