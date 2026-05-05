import { useState, useEffect } from 'react'

function NumInput({ label, value, onChange, unit = '€' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label className="text-xs text-slate-600 shrink-0">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          step="1000"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-28 text-right text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="0"
        />
        <span className="text-xs text-slate-400 w-8">{unit}</span>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-5 mb-2 pb-1 border-b border-slate-100">
      {children}
    </div>
  )
}

export default function PanneauObjectifs({ open, onClose, fiscalYear, objectif, onSave, caList }) {
  const [local, setLocal] = useState(null)

  useEffect(() => {
    if (open && objectif) {
      setLocal(JSON.parse(JSON.stringify(objectif)))
    }
  }, [open, objectif])

  if (!open || !local) return null

  function setGlobal(key, val) {
    setLocal(prev => ({ ...prev, global: { ...prev.global, [key]: val } }))
  }

  function setSecteur(secteurId, key, val) {
    setLocal(prev => ({
      ...prev,
      secteurs: {
        ...prev.secteurs,
        [secteurId]: { ...(prev.secteurs?.[secteurId] || {}), [key]: val },
      },
    }))
  }

  function setCA(caId, key, val) {
    setLocal(prev => ({
      ...prev,
      ca: {
        ...prev.ca,
        [caId]: { ...(prev.ca?.[caId] || {}), [key]: val },
      },
    }))
  }

  function handleSave() {
    onSave(local)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Objectifs</div>
            <div className="font-semibold text-sm mt-0.5">
              Exercice {fiscalYear}—{fiscalYear + 1}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Objectifs globaux */}
          <SectionTitle>Objectifs globaux</SectionTitle>
          <NumInput
            label="CA annuel"
            value={local.global?.ca}
            onChange={v => setGlobal('ca', v)}
            unit="€"
          />
          <NumInput
            label="Heures annuelles"
            value={local.global?.heures}
            onChange={v => setGlobal('heures', v)}
            unit="h"
          />

          {/* Par secteur */}
          <SectionTitle>Par secteur</SectionTitle>
          <NumInput
            label="CA Energie"
            value={local.secteurs?.energie?.ca}
            onChange={v => setSecteur('energie', 'ca', v)}
            unit="€"
          />
          <NumInput
            label="CA Pétrole"
            value={local.secteurs?.petrole?.ca}
            onChange={v => setSecteur('petrole', 'ca', v)}
            unit="€"
          />

          {/* Par CA */}
          {caList && caList.length > 0 && (
            <>
              <SectionTitle>Par chargé d'affaires</SectionTitle>
              {caList.map(ca => (
                <NumInput
                  key={ca.id}
                  label={`${ca.prenom} ${ca.nom}`}
                  value={local.ca?.[ca.id]?.ca}
                  onChange={v => setCA(ca.id, 'ca', v)}
                  unit="€"
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Enregistrer
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  )
}
