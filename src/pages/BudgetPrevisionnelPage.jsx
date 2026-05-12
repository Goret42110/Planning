import { useState, useMemo } from 'react'
import { useApp } from '../App'
import { useAuth } from '../context/AuthContext'
import { useObjectifs, getCurrentFiscalYear } from '../hooks/useObjectifs'
import { useBudgetPrevisionnel } from '../hooks/useBudgetPrevisionnel'
import KpiCards from '../components/budget/KpiCards'
import CourbeCharge from '../components/budget/CourbeCharge'
import CourbeCA from '../components/budget/CourbeCA'
import JaugeCA from '../components/budget/JaugeCA'
import JaugeSecteur from '../components/budget/JaugeSecteur'
import TableauMensuel from '../components/budget/TableauMensuel'
import PanneauObjectifs from '../components/budget/PanneauObjectifs'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']

function addMonthsToDate(date, n) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export default function BudgetPrevisionnelPage() {
  const { personnel, affaires, planning } = useApp()
  const { session } = useAuth()

  const isResponsable = session?.role === 'responsable'
  const isCA          = session?.role === 'ca'

  const caList = useMemo(
    () => personnel.filter(p => p.role === 'CA' || p.role === 'RS'),
    [personnel]
  )

  const currentFiscalYear = getCurrentFiscalYear()
  const { getExercice, setExercice } = useObjectifs()

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [fiscalYear,     setFiscalYear]     = useState(currentFiscalYear)
  const [probMin,        setProbMin]        = useState(0)
  const [filtreCA,       setFiltreCA]       = useState(isCA ? (session?.id || '') : '')
  const [filtreService,  setFiltreService]  = useState('')
  const [vue,            setVue]            = useState('total')
  const [showObjectifs,  setShowObjectifs]  = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [monthOffset,    setMonthOffset]    = useState(0) // décalage mois glissant

  const filtreCAEffectif = isCA ? (session?.id || '') : filtreCA
  const exerciceLabel    = `${fiscalYear}–${fiscalYear + 1}`
  const objectif         = getExercice(fiscalYear)
  const objectif2        = getExercice(fiscalYear + 1)

  // ── Calculs budget exercice courant ────────────────────────────────────────
  const budget = useBudgetPrevisionnel({
    affaires, planning, personnel,
    objectifs: objectif, fiscalYear,
    filtreCA: filtreCAEffectif, filtreService, probMin,
  })

  // ── Calculs budget exercice suivant (comparaison) ──────────────────────────
  const budget2 = useBudgetPrevisionnel({
    affaires, planning, personnel,
    objectifs: objectif2, fiscalYear: fiscalYear + 1,
    filtreCA: filtreCAEffectif, filtreService, probMin,
  })

  // ── Fenêtre glissante ──────────────────────────────────────────────────────
  // Par défaut : 12 mois de l'exercice. Avec offset : décale de N mois.
  const windowedData = useMemo(() => {
    if (monthOffset === 0) return budget.monthlyData
    // Fusionner les données des deux exercices et découper une fenêtre de 12 mois
    const all = [...budget.monthlyData, ...budget2.monthlyData]
    const start = monthOffset
    return all.slice(start, start + 12)
  }, [budget.monthlyData, budget2.monthlyData, monthOffset])

  // Label de la fenêtre courante
  const windowLabel = useMemo(() => {
    if (!windowedData.length) return exerciceLabel
    return `${windowedData[0]?.label} → ${windowedData[windowedData.length - 1]?.label}`
  }, [windowedData, exerciceLabel])

  const objectifAnnuelCA     = parseFloat(objectif?.global?.ca)     || 0
  const objectifAnnuelHeures = parseFloat(objectif?.global?.heures) || 0
  const objectifMensuelCA    = Math.round(objectifAnnuelCA / 12)
  const objectifMensuelH     = Math.round((objectifAnnuelHeures / 12) * 10) / 10

  // ── Données secteurs (responsable uniquement) ──────────────────────────────
  const secteursData = useMemo(() => {
    if (!isResponsable) return []
    return [
      { id: 'energie', label: 'Énergie', color: '#3b82f6' },
      { id: 'petrole', label: 'Pétrole', color: '#f97316' },
    ].map(s => {
      const caIds = personnel
        .filter(p => (p.serviceId || 'energie') === s.id && (p.role === 'CA' || p.role === 'RS'))
        .map(p => p.id)
      const aff = affaires.filter(a => {
        if (!caIds.includes(a.caId)) return false
        const prob = parseFloat(a.probabilite) || 0
        if (prob < probMin) return false
        return true
      })
      const caValide       = Math.round(aff.filter(a => (parseFloat(a.probabilite) || 0) === 100).reduce((s, a) => s + (parseFloat(a.montantHT) || 0), 0))
      const caPrevisionnel = Math.round(aff.reduce((s, a) => s + (parseFloat(a.montantHT) || 0) * ((parseFloat(a.probabilite) || 100) / 100), 0))
      const objectifSvc    = parseFloat(objectif?.secteurs?.[s.id]?.ca) || 0
      return { ...s, caValide, caPrevisionnel, objectif: objectifSvc }
    })
  }, [isResponsable, personnel, affaires, probMin, objectif])

  // ── Données par CA (vue CA) ────────────────────────────────────────────────
  const caListData = useMemo(() => {
    if (vue !== 'ca') return []
    return caList
      .filter(ca => !filtreService || ca.serviceId === filtreService)
      .filter(ca => !filtreCAEffectif || ca.id === filtreCAEffectif)
      .map(ca => {
        const aff = affaires.filter(a => {
          if (a.caId !== ca.id) return false
          const prob = parseFloat(a.probabilite) || 0
          return prob >= probMin
        })
        const caValide = aff.filter(a => (parseFloat(a.probabilite) || 0) === 100).reduce((s, a) => s + (parseFloat(a.montantHT) || 0), 0)
        return {
          id: ca.id,
          nom: `${ca.prenom} ${ca.nom}`,
          caValide: Math.round(caValide),
          objectif: parseFloat(objectif?.ca?.[ca.id]?.ca) || 0,
        }
      })
  }, [vue, filtreService, filtreCAEffectif, caList, affaires, probMin, objectif])

  // ── Jauge personnelle CA ───────────────────────────────────────────────────
  const jaugePersonnelle = useMemo(() => {
    if (!isCA) return null
    return [{
      id: session?.id,
      label: `${session?.prenom} ${session?.nom}`,
      caValide:       budget.kpis.caValide,
      caPrevisionnel: budget.kpis.caPrevisionnel,
      objectif:       parseFloat(objectif?.ca?.[session?.id]?.ca) || 0,
      color:          '#E31E24',
    }]
  }, [isCA, session, objectif, budget.kpis])

  function handleSaveObjectifs(data) { setExercice(fiscalYear, data) }

  // ── Contrôles navigation ───────────────────────────────────────────────────
  const canSlideBack    = monthOffset > -6
  const canSlideForward = monthOffset < 6

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#F4F5F7' }}>

      {/* ── Barre de contrôles ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-10 shadow-sm">

        {/* Titre */}
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-bold text-slate-800">Budget Prévisionnel</span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{exerciceLabel}</span>
        </div>

        {/* Navigation exercice */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          <button onClick={() => { setFiscalYear(y => y - 1); setMonthOffset(0) }}
            className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 text-xs">◀</button>
          <span className="px-2 py-1.5 text-xs font-medium text-slate-700 border-x border-slate-200">
            {fiscalYear}/{fiscalYear+1}
          </span>
          <button onClick={() => { setFiscalYear(y => y + 1); setMonthOffset(0) }}
            className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 text-xs">▶</button>
        </div>

        {/* Glissement mois */}
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset(o => Math.max(o - 1, -6))} disabled={!canSlideBack}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30">← Mois</button>
          {monthOffset !== 0 && (
            <button onClick={() => setMonthOffset(0)}
              className="px-2 py-1.5 border border-[#E31E24]/30 rounded-lg text-xs text-[#E31E24] hover:bg-red-50">
              Réinitialiser
            </button>
          )}
          <button onClick={() => setMonthOffset(o => Math.min(o + 1, 6))} disabled={!canSlideForward}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30">Mois →</button>
        </div>

        {/* Probabilité min */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Proba</span>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
            {[['0','Toutes'],['50','≥50%'],['75','≥75%'],['100','100%']].map(([v, l]) => (
              <button key={v} onClick={() => setProbMin(Number(v))}
                className={`px-2.5 py-1.5 font-medium transition-colors ${String(probMin) === v ? 'text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                style={String(probMin) === v ? { background: '#E31E24' } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres responsable */}
        {isResponsable && (
          <>
            <select value={filtreService} onChange={e => setFiltreService(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-red-400">
              <option value="">Tous services</option>
              <option value="energie">Énergie</option>
              <option value="petrole">Pétrole</option>
            </select>
            <select value={filtreCA} onChange={e => setFiltreCA(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-red-400">
              <option value="">Tous les CA</option>
              {caList.map(ca => <option key={ca.id} value={ca.id}>{ca.prenom} {ca.nom}</option>)}
            </select>
          </>
        )}

        {/* Comparaison 2 exercices */}
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-1">
          <input type="checkbox" checked={showComparison} onChange={e => setShowComparison(e.target.checked)}
            className="accent-red-500 w-3.5 h-3.5" />
          Comparer {fiscalYear + 1}/{fiscalYear + 2}
        </label>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Vue */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
            {[['total','Total'],['secteur','Secteurs'],['ca','Par CA']].map(([v,l]) => (
              <button key={v} onClick={() => setVue(v)}
                className={`px-3 py-1.5 font-medium transition-colors ${vue === v ? 'text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                style={vue === v ? { background: '#1C1C2E' } : {}}>
                {l}
              </button>
            ))}
          </div>

          {isResponsable && (
            <button onClick={() => setShowObjectifs(true)}
              className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              style={{ background: '#E31E24' }}>
              ⚙ Objectifs
            </button>
          )}
        </div>
      </div>

      {/* ── KPI ────────────────────────────────────────────────────────────── */}
      <KpiCards kpis={budget.kpis} objectifAnnuelCA={objectifAnnuelCA} />

      {/* ── Fenêtre active ─────────────────────────────────────────────────── */}
      {monthOffset !== 0 && (
        <div className="px-6 mb-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span>⚠️</span>
            <span>Fenêtre glissante active : <strong>{windowLabel}</strong> — les données croisent deux exercices</span>
          </div>
        </div>
      )}

      {/* ── Jauges secteur ou CA ───────────────────────────────────────────── */}
      {isResponsable && vue === 'secteur' && <JaugeSecteur secteursData={secteursData} />}
      {isResponsable && vue === 'ca' && caListData.length > 0 && (
        <JaugeCA caListData={caListData} objectifCA={objectifAnnuelCA} />
      )}
      {jaugePersonnelle && <JaugeSecteur secteursData={jaugePersonnelle} />}

      {/* ── Graphiques ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 px-6 pb-4">
        <CourbeCA
          data={windowedData}
          data2={budget2.monthlyData}
          objectifMensuelCA={objectifMensuelCA}
          showComparison={showComparison}
          label2={`${fiscalYear+1}/${fiscalYear+2}`}
        />
        <CourbeCharge
          data={windowedData}
          data2={budget2.monthlyData}
          objectifMensuelHeures={objectifMensuelH}
          showComparison={showComparison}
          label2={`${fiscalYear+1}/${fiscalYear+2}`}
        />
      </div>

      {/* ── Tableau mensuel ────────────────────────────────────────────────── */}
      <TableauMensuel data={windowedData} exerciceLabel={monthOffset !== 0 ? windowLabel : exerciceLabel} />

      {/* ── Panneau objectifs ──────────────────────────────────────────────── */}
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
