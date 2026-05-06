import { useState, useMemo } from 'react'
import { useApp } from '../App'
import { useAuth } from '../context/AuthContext'
import { useObjectifs, getCurrentFiscalYear } from '../hooks/useObjectifs'
import { useBudgetPrevisionnel } from '../hooks/useBudgetPrevisionnel'
import FiltresBudget from '../components/budget/FiltresBudget'
import KpiCards from '../components/budget/KpiCards'
import CourbeCharge from '../components/budget/CourbeCharge'
import CourbeCA from '../components/budget/CourbeCA'
import JaugeCA from '../components/budget/JaugeCA'
import TableauMensuel from '../components/budget/TableauMensuel'
import PanneauObjectifs from '../components/budget/PanneauObjectifs'

export default function BudgetPrevisionnelPage() {
  const { personnel, affaires, planning } = useApp()
  const { session } = useAuth()

  const isResponsable = session?.role === 'responsable'
  const isCA = session?.role === 'ca'

  // Liste des CA/RS pour les filtres et la jauge
  const caList = useMemo(
    () => personnel.filter(p => p.role === 'CA' || p.role === 'RS'),
    [personnel]
  )

  // Exercice courant
  const currentFiscalYear = getCurrentFiscalYear()

  // État des filtres
  const [filtres, setFiltres] = useState({
    vue: 'total',
    exercice: 'current',
    filtreService: '',
    filtreCA: isCA ? (session?.id || '') : '',
    probMin: 0,
  })

  const [showObjectifs, setShowObjectifs] = useState(false)

  // Exercice sélectionné
  const fiscalYear = filtres.exercice === 'next' ? currentFiscalYear + 1 : currentFiscalYear
  const exerciceLabel = `${fiscalYear}-${fiscalYear + 1}`

  // Objectifs
  const { getExercice, setExercice } = useObjectifs()
  const objectif = getExercice(fiscalYear)

  // Pour un CA, forcer filtreCA = session.id
  const filtreCAEffectif = isCA ? (session?.id || '') : filtres.filtreCA

  // Calcul budget
  const { monthlyData, kpis, fiscalMonths } = useBudgetPrevisionnel({
    affaires,
    planning,
    personnel,
    objectifs: objectif,
    fiscalYear,
    filtreCA: filtreCAEffectif,
    filtreService: filtres.filtreService,
    probMin: filtres.probMin,
  })

  // Objectifs mensuels
  const objectifAnnuelCA = parseFloat(objectif?.global?.ca) || 0
  const objectifAnnuelHeures = parseFloat(objectif?.global?.heures) || 0
  const objectifMensuelCA = Math.round(objectifAnnuelCA / 12)
  const objectifMensuelHeures = Math.round((objectifAnnuelHeures / 12) * 10) / 10

  // Données par CA pour la jauge (vue 'ca')
  const caListData = useMemo(() => {
    if (filtres.vue !== 'ca') return []

    return caList
      .filter(ca => !filtres.filtreService || ca.serviceId === filtres.filtreService)
      .filter(ca => !filtreCAEffectif || ca.id === filtreCAEffectif)
      .map(ca => {
        const affairesCA = affaires.filter(a => {
          if (a.caId !== ca.id) return false
          const prob = parseFloat(a.probabilite) || 0
          if (prob < filtres.probMin) return false
          return true
        })
        const caValide = affairesCA
          .filter(a => parseFloat(a.probabilite) === 100)
          .reduce((s, a) => s + (parseFloat(a.montantHT) || 0), 0)
        const objectifCA = parseFloat(objectif?.ca?.[ca.id]?.ca) || 0

        return {
          id: ca.id,
          nom: `${ca.prenom} ${ca.nom}`,
          caValide: Math.round(caValide),
          objectif: objectifCA,
        }
      })
  }, [filtres.vue, filtres.filtreService, filtres.probMin, filtreCAEffectif, caList, affaires, objectif])

  // Gestion objectifs
  function handleSaveObjectifs(data) {
    setExercice(fiscalYear, data)
  }

  // Synchroniser filtreCA si rôle CA change
  function handleFiltresChange(next) {
    if (isCA) {
      setFiltres({ ...next, filtreCA: session?.id || '' })
    } else {
      setFiltres(next)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">

      {/* Barre de filtres */}
      <FiltresBudget
        filtres={{ ...filtres, filtreCA: filtreCAEffectif }}
        onChange={handleFiltresChange}
        caList={caList}
        isResponsable={isResponsable}
      />

      {/* Titre + bouton objectifs */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <div>
          <h2 className="text-slate-900 font-semibold text-lg">Budget Prévisionnel</h2>
          <p className="text-xs text-slate-400 mt-0.5">Exercice {exerciceLabel} (oct. → sept.)</p>
        </div>
        {isResponsable && (
          <button
            onClick={() => setShowObjectifs(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Définir objectifs
          </button>
        )}
      </div>

      {/* KPI cards */}
      <KpiCards kpis={kpis} objectifAnnuelCA={objectifAnnuelCA} />

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 pb-4">
        <CourbeCharge data={monthlyData} objectifMensuelHeures={objectifMensuelHeures} />
        <CourbeCA data={monthlyData} objectifMensuelCA={objectifMensuelCA} />
      </div>

      {/* Jauge CA */}
      {filtres.vue === 'ca' && caListData.length > 0 && (
        <JaugeCA caListData={caListData} objectifCA={objectifAnnuelCA} />
      )}

      {/* Tableau mensuel */}
      <TableauMensuel data={monthlyData} exerciceLabel={exerciceLabel} />

      {/* Panneau objectifs */}
      {isResponsable && (
        <PanneauObjectifs
          open={showObjectifs}
          onClose={() => setShowObjectifs(false)}
          fiscalYear={fiscalYear}
          objectif={objectif}
          onSave={handleSaveObjectifs}
          caList={caList}
        />
      )}
    </div>
  )
}
