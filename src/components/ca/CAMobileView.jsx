import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../App'
import {
  getWorkDays, getCurrentWeekInfo, getMondayOfWeek, addWeeks,
  planningKey, isHoliday,
} from '../../utils/weeks'
import { getAffaireColor, SPECIAL_CODES } from '../../utils/colors'
import { getCellSlots } from '../../utils/slots'

const DAYS  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const MONTHS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']

const STATUT_CLS = {
  'active':     'bg-green-100 text-green-700',
  'en attente': 'bg-amber-100 text-amber-700',
  'terminée':   'bg-slate-100 text-slate-500',
  'perdue':     'bg-red-100 text-red-600',
}

function fmtDate(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// ── Vue principale ────────────────────────────────────────────────────────────
export default function CAMobileView() {
  const { session, logout } = useAuth()
  const { personnel, affaires, planning } = useApp()
  const navigate = useNavigate()

  const cur = getCurrentWeekInfo()
  const [year, setYear] = useState(cur.year)
  const [week, setWeek] = useState(cur.week)
  const [tab,  setTab]  = useState('equipe')

  const days   = getWorkDays(year, week)
  const monday = getMondayOfWeek(year, week)
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4)

  function prevWeek() { const r = addWeeks(year, week, -1); setYear(r.year); setWeek(r.week) }
  function nextWeek() { const r = addWeeks(year, week,  1); setYear(r.year); setWeek(r.week) }
  function goToday()  { setYear(cur.year); setWeek(cur.week) }

  const myAffaires   = affaires.filter(a => a.caId === session.id)
  const myAffaireIds = myAffaires.map(a => a.id)

  const team = useMemo(() => personnel.filter(p => {
    if (!p.actif || p.role === 'CA' || p.role === 'RS') return false
    return days.some((_, di) => {
      const k = planningKey(p.id, year, week, di)
      return getCellSlots(planning[k]).some(s => myAffaireIds.includes(s.id))
    })
  }), [personnel, planning, year, week, myAffaireIds, days])

  const isCurrentWeek = week === cur.week && year === cur.year

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-sm shrink-0">
          {session.prenom[0]}{session.nom[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-none">Bonjour, {session.prenom} 👋</p>
          <p className="text-xs text-slate-400 mt-0.5">Chargé d'affaires · ELS Énergie</p>
        </div>
        <button onClick={() => navigate('/planning')}
          className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
          🖥 Bureau
        </button>
        <button onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
          Quitter
        </button>
      </header>

      {/* ── Onglets ────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 px-2 flex shrink-0">
        {[
          { id: 'equipe',   label: '👥 Mon équipe' },
          { id: 'affaires', label: `📋 Affaires (${myAffaires.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Navigation semaine ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-2 shrink-0">
        <button onClick={prevWeek}
          className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-500 hover:bg-slate-50 text-sm shrink-0">‹</button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-slate-700">Semaine {week}</span>
          <span className="text-slate-400 text-xs ml-2">{fmtDate(monday)} – {fmtDate(friday)}</span>
        </div>
        <button onClick={nextWeek}
          className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-500 hover:bg-slate-50 text-sm shrink-0">›</button>
        {!isCurrentWeek && (
          <button onClick={goToday}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg shrink-0">
            Auj.
          </button>
        )}
      </div>

      {/* ── Contenu ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">

        {/* Onglet Équipe */}
        {tab === 'equipe' && (
          team.length === 0
            ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-sm italic">Aucun technicien planifié cette semaine</p>
                <p className="text-slate-300 text-xs mt-2">Les techniciens apparaissent ici une fois planifiés depuis la vue bureau.</p>
              </div>
            )
            : team.map(person => (
              <PersonCard key={person.id}
                person={person} days={days} year={year} week={week}
                planning={planning} affaires={affaires}
              />
            ))
        )}

        {/* Onglet Affaires */}
        {tab === 'affaires' && (
          myAffaires.length === 0
            ? <p className="text-center text-slate-400 py-16 text-sm italic">Aucune affaire</p>
            : myAffaires.map(a => <AffaireCard key={a.id} affaire={a} />)
        )}
      </div>
    </div>
  )
}

// ── Carte personne ────────────────────────────────────────────────────────────
function PersonCard({ person, days, year, week, planning, affaires }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* En-tête personne */}
      <div className="px-4 py-2.5 flex items-center gap-3 bg-slate-50 border-b border-slate-100">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
          {person.prenom[0]}{person.nom[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{person.prenom} {person.nom}</p>
        </div>
        {person.qualification && (
          <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
            {person.qualification}
          </span>
        )}
      </div>

      {/* Grille 5 jours */}
      <div className="grid grid-cols-5 divide-x divide-slate-100">
        {days.map((date, di) => {
          const k     = planningKey(person.id, year, week, di)
          const slots = getCellSlots(planning[k])
          const hol   = isHoliday(date)
          return (
            <DayCell key={di} label={DAYS[di]} date={date} slots={slots}
              affaires={affaires} isHoliday={!!hol} holidayName={hol} />
          )
        })}
      </div>
    </div>
  )
}

// ── Cellule jour ──────────────────────────────────────────────────────────────
function DayCell({ label, date, slots, affaires, isHoliday, holidayName }) {
  return (
    <div className="flex flex-col items-center py-2 px-1 min-h-[72px]">
      <span className="text-xs text-slate-400 font-medium mb-1">{label}</span>
      <span className="text-xs text-slate-500 mb-1.5">{date.getDate()}</span>

      {isHoliday ? (
        <div className="w-full text-center rounded py-1 bg-slate-100 text-slate-400" title={holidayName}>
          <span className="text-xs">🏛</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="w-full flex-1 rounded border border-dashed border-slate-200" />
      ) : (
        <div className="w-full space-y-0.5">
          {slots.map((slot, i) => {
            const aff = affaires.find(a => a.id === slot.id)
            const sp  = SPECIAL_CODES[slot.id]
            if (sp) return (
              <div key={i} className="w-full text-center rounded py-0.5 text-xs font-semibold leading-tight"
                style={{ background: sp.bg, color: sp.text }}>
                {slot.id}
              </div>
            )
            if (aff) {
              const c = getAffaireColor(aff.colorIndex)
              return (
                <div key={i} className="w-full text-center rounded py-0.5 text-xs font-bold leading-tight truncate px-0.5"
                  title={aff.intitule}
                  style={{ background: c.bg, color: c.text !== '#FCD34D' ? c.text : '#92400E' }}>
                  {aff.numero.replace('ELS', '')}
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

// ── Carte affaire ─────────────────────────────────────────────────────────────
function AffaireCard({ affaire }) {
  const c = getAffaireColor(affaire.colorIndex)
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
      style={{ borderLeft: `4px solid ${c.border}` }}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="font-mono text-xs font-bold text-slate-800">{affaire.numero}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUT_CLS[affaire.statut] || ''}`}>
          {affaire.statut}
        </span>
        {affaire.probabilite != null && affaire.probabilite < 100 && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
            affaire.probabilite >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
          }`}>{affaire.probabilite}%</span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-700 leading-snug">{affaire.intitule}</p>
      {affaire.client && <p className="text-xs text-slate-400 mt-0.5">{affaire.client}</p>}
      {(affaire.dateDebut || affaire.dateFin) && (
        <p className="text-xs text-slate-400 mt-0.5">
          {affaire.dateDebut && `Du ${affaire.dateDebut}`}
          {affaire.dateFin && ` au ${affaire.dateFin}`}
        </p>
      )}
    </div>
  )
}
