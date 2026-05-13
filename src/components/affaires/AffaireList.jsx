import { useState, useMemo } from 'react'
import { useApp } from '../../App'
import { useAuth } from '../../context/AuthContext'
import { getAffaireColor } from '../../utils/colors'
import AffaireForm from './AffaireForm'
import { utilisateurs as BASE_USERS } from '../../data/utilisateurs'

function getAuthUsers() {
  try { const s = localStorage.getItem('els_utilisateurs'); if (s) return JSON.parse(s) } catch {}
  return BASE_USERS
}

const STATUT_CLS = {
  'active':     'bg-green-100 text-green-700',
  'en attente': 'bg-amber-100 text-amber-700',
  'terminée':   'bg-slate-100 text-slate-500',
  'perdue':     'bg-red-100 text-red-600',
}

const FILTRES = [
  { key: 'all',        label: 'Toutes' },
  { key: 'active',     label: 'Actives' },
  { key: 'en attente', label: 'En attente' },
  { key: 'terminée',   label: 'Terminées' },
  { key: 'perdue',     label: 'Perdues' },
]

function fmt(v) {
  if (!v && v !== 0) return '—'
  const n = parseFloat(v)
  if (isNaN(n) || n === 0) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + ' M€'
  if (Math.abs(n) >= 1000) return Math.round(n / 1000) + ' k€'
  return Math.round(n) + ' €'
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${String(dt.getFullYear()).slice(2)}`
}

function HBar({ done, total, color }) {
  if (!total) return <span className="text-slate-300">—</span>
  const pct  = Math.min((done / total) * 100, 120)
  const over = done > total
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct,100)}%`, background: over ? '#ef4444' : color }} />
      </div>
      <span className={`text-xs ${over ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{done}/{total}</span>
    </div>
  )
}

export default function AffaireList() {
  const { affaires, personnel, deleteAffaire, selectedCA, caIdEffectif } = useApp()
  const { session } = useAuth()
  const isAdmin = session?.role === 'responsable'

  const [search,   setSearch]   = useState('')
  const [filtre,   setFiltre]   = useState('active')
  const [sortCol,  setSortCol]  = useState('numero')
  const [sortDir,  setSortDir]  = useState('asc')
  const [editing,  setEditing]  = useState(null)
  const [creating, setCreating] = useState(false)

  const allUsers = useMemo(() => {
    const auth = getAuthUsers()
    return { byId: Object.fromEntries([...personnel, ...auth].map(p => [p.id, p])) }
  }, [personnel])

  const getCAName = (caId) => {
    const p = allUsers.byId[caId]
    return p ? `${p.prenom[0]}. ${p.nom}` : '—'
  }

  const filtered = useMemo(() => {
    let list = affaires.filter(a => {
      if (caIdEffectif && a.caId !== caIdEffectif) return false
      if (selectedCA   && a.caId !== selectedCA)   return false
      if (filtre !== 'all' && a.statut !== filtre)  return false
      if (!search) return true
      const q = search.toLowerCase()
      return a.numero.toLowerCase().includes(q)
        || (a.intitule || '').toLowerCase().includes(q)
        || (a.client   || '').toLowerCase().includes(q)
    })

    list = [...list].sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'numero':   va = a.numero;     vb = b.numero;     break
        case 'intitule': va = a.intitule;   vb = b.intitule;   break
        case 'client':   va = a.client||''; vb = b.client||''; break
        case 'montant':  va = parseFloat(a.montantHT)||0; vb = parseFloat(b.montantHT)||0; break
        case 'prob':     va = parseFloat(a.probabilite)||0; vb = parseFloat(b.probabilite)||0; break
        case 'debut':    va = a.dateDebut||''; vb = b.dateDebut||''; break
        default: va = a.numero; vb = b.numero
      }
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [affaires, caIdEffectif, selectedCA, filtre, search, sortCol, sortDir])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const countByStatut = s => affaires.filter(a =>
    (!selectedCA || a.caId === selectedCA) && (!caIdEffectif || a.caId === caIdEffectif) && a.statut === s
  ).length

  const Th = ({ col, label, align = 'left', className = '' }) => (
    <th onClick={() => toggleSort(col)}
      className={`px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
      {label}
      {sortCol === col && <span className="ml-1 text-[#E31E24]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Barre de contrôles */}
      <div className="px-5 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-slate-900 font-semibold text-base">Affaires</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length}</span>
          </div>
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-[#E31E24] w-48" />
            <button onClick={() => setCreating(true)}
              className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
              style={{ background: '#E31E24' }}>
              + Nouvelle
            </button>
          </div>
        </div>
        <div className="flex gap-1.5">
          {FILTRES.map(f => (
            <button key={f.key} onClick={() => setFiltre(f.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                filtre === f.key
                  ? 'text-white border-transparent'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
              style={filtre === f.key ? { background: '#1C1C2E' } : {}}>
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1 opacity-60">{countByStatut(f.key)}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 overflow-auto px-5 pb-4">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-y border-slate-200">
              <th className="w-1 px-0 py-0" /> {/* bande couleur */}
              <Th col="numero"   label="N° Affaire"   className="pl-3" />
              <Th col="intitule" label="Intitulé"     className="min-w-52" />
              <Th col="client"   label="Client"       className="min-w-32" />
              {!caIdEffectif && <th className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left whitespace-nowrap">CA</th>}
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left whitespace-nowrap">Statut</th>
              <Th col="prob"     label="Proba"        align="right" />
              {isAdmin && <Th col="montant" label="Montant HT"  align="right" />}
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Facturé</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left whitespace-nowrap">Heures</th>
              {isAdmin && <th className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Marge</th>}
              <Th col="debut"    label="Début"        align="right" />
              <th className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Fin</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(a => {
              const c    = getAffaireColor(a.colorIndex)
              const fin  = a._finance || {}
              const prob = parseFloat(a.probabilite)
              const probCls = !prob || prob === 100 ? 'text-green-600' : prob >= 50 ? 'text-amber-600' : 'text-red-500'

              return (
                <tr key={a.id}
                  className={`group hover:bg-slate-50 transition-colors ${a.statut === 'terminée' || a.statut === 'perdue' ? 'opacity-50' : ''}`}>
                  {/* Bande couleur */}
                  <td className="w-1 p-0">
                    <div className="w-1 h-full min-h-[36px]" style={{ background: c.border }} />
                  </td>

                  {/* N° */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-mono font-bold text-xs text-slate-800">{a.numero}</span>
                  </td>

                  {/* Intitulé */}
                  <td className="px-3 py-2 max-w-72">
                    <div className="font-medium text-slate-800 text-xs truncate">{a.intitule}</div>
                    {fin.commentaireExcel && (
                      <div className="text-xs text-amber-600 truncate mt-0.5">📄 {fin.commentaireExcel}</div>
                    )}
                  </td>

                  {/* Client */}
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-36 truncate whitespace-nowrap">
                    {a.client || '—'}
                  </td>

                  {/* CA */}
                  {!caIdEffectif && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {getCAName(a.caId)}
                      </span>
                    </td>
                  )}

                  {/* Statut */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_CLS[a.statut] || ''}`}>
                      {a.statut}
                    </span>
                  </td>

                  {/* Proba */}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {prob != null && !isNaN(prob)
                      ? <span className={`text-xs font-bold ${probCls}`}>{prob}%</span>
                      : <span className="text-slate-300">—</span>
                    }
                  </td>

                  {/* Montant HT (admin) */}
                  {isAdmin && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-700">
                        {fmt(fin.montantCommande || a.montantHT)}
                      </span>
                    </td>
                  )}

                  {/* Facturé */}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="text-xs text-slate-500">{fmt(fin.montantFacture)}</span>
                  </td>

                  {/* Heures */}
                  <td className="px-3 py-2">
                    <HBar
                      done={fin.heuresRealisees || 0}
                      total={parseFloat(fin.heuresPrevues || a.heuresPrevues) || 0}
                      color="#3b82f6"
                    />
                  </td>

                  {/* Marge (admin) */}
                  {isAdmin && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {fin.marge !== undefined
                        ? <span className={`text-xs font-bold ${fin.marge < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(fin.marge)}</span>
                        : <span className="text-slate-200">—</span>
                      }
                    </td>
                  )}

                  {/* Dates */}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="text-xs text-slate-400">{fmtDate(a.dateDebut)}</span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className="text-xs text-slate-400">{fmtDate(a.dateFin)}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(a)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xs">✏️</button>
                      <button onClick={() => { if (confirm(`Supprimer ${a.numero} ?`)) deleteAffaire(a.id) }}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors text-xs">🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={20} className="text-center py-16 text-slate-400 text-sm">
                  Aucune affaire{filtre !== 'all' ? ` (${filtre})` : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && <AffaireForm onClose={() => setCreating(false)} />}
      {editing  && <AffaireForm affaire={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
