import { useState } from 'react'
import ChargeGlobale from '../components/charge/ChargeGlobale'
import RecapDashboard from '../components/recap/RecapDashboard'

const TABS = [
  { id: 'charge', label: '📊 Charge & Planning' },
  { id: 'recap',  label: '📋 Récap affaires' },
]

export default function ActivitePage() {
  const [sub, setSub] = useState('charge')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sub-nav */}
      <div className="shrink-0 px-5 pt-4 pb-0 border-b border-slate-200 bg-white flex items-center gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              sub === t.id
                ? 'border-[#E31E24] text-[#E31E24]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {sub === 'charge' && <ChargeGlobale />}
        {sub === 'recap'  && <RecapDashboard />}
      </div>
    </div>
  )
}
