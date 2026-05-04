import { SPECIAL_CODES, getAffaireColor } from '../../utils/colors'
import { getCellSlots } from '../../utils/slots'

function SlotBlock({ slot, affaires, person, compact }) {
  const specialInfo = SPECIAL_CODES[slot.id]

  if (specialInfo) {
    return (
      <div
        className={`flex items-center justify-center rounded-sm overflow-hidden ${compact ? 'flex-1' : 'w-full h-full'}`}
        style={{ background: specialInfo.bg, borderLeft: `${compact ? 2 : 3}px solid ${specialInfo.border}` }}
        title={specialInfo.label}
      >
        <div className="text-center px-1">
          <div className="font-bold text-xs tracking-wide" style={{ color: specialInfo.text }}>{slot.id}</div>
          {slot.from && <div className="text-xs leading-none mt-0.5" style={{ color: specialInfo.text, opacity: 0.75 }}>{slot.from}–{slot.to}</div>}
        </div>
      </div>
    )
  }

  const affaire = affaires.find(a => a.id === slot.id)
  if (!affaire) return null

  const c = getAffaireColor(affaire.colorIndex)
  const shortNum = affaire.numero.replace('ELS', '')

  if (compact) {
    return (
      <div
        className="flex-1 flex flex-col justify-center px-2 rounded-sm overflow-hidden min-h-0"
        style={{ background: c.bg, borderLeft: `2px solid ${c.border}` }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-xs truncate leading-none" style={{ color: c.text }}>{shortNum}</span>
          {slot.from && (
            <span className="text-xs shrink-0 leading-none" style={{ color: c.text, opacity: 0.75 }}>
              {slot.from.slice(0, 5)}–{slot.to.slice(0, 5)}
            </span>
          )}
        </div>
        <div className="text-xs truncate leading-none mt-0.5 opacity-70" style={{ color: c.text }}>
          {affaire.intitule}
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full h-full flex flex-col justify-center rounded-sm overflow-hidden"
      style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, padding: '4px 6px' }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-xs leading-none truncate" style={{ color: c.text }}>{shortNum}</span>
        {slot.from
          ? <span className="text-xs shrink-0" style={{ color: c.text, opacity: 0.75 }}>{slot.from}–{slot.to}</span>
          : <span className="text-xs opacity-60 shrink-0" style={{ color: c.text }}>9h</span>
        }
      </div>
      <div className="text-xs leading-none truncate mt-0.5" style={{ color: c.text, opacity: 0.85 }}>
        {affaire.intitule}
      </div>
      <div className="text-xs leading-none truncate mt-0.5" style={{ color: c.text, opacity: 0.55 }}>
        {person.qualification} · {affaire.client}
      </div>
    </div>
  )
}

export default function PlanningCell({ value, affaires, person, isHoliday, holidayName, onClick, comment }) {
  if (isHoliday) {
    return (
      <div
        className="w-full h-full flex items-center justify-center select-none"
        style={{
          background: 'repeating-linear-gradient(45deg,#e2e8f0 0px,#e2e8f0 4px,#f1f5f9 4px,#f1f5f9 8px)',
          cursor: 'not-allowed',
        }}
        title={holidayName}
      >
        <span className="text-slate-300 text-xs">✦</span>
      </div>
    )
  }

  const slots = getCellSlots(value)

  const commentDot = comment ? (
    <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-400 border border-amber-500 z-10 shrink-0"
      title={comment} />
  ) : null

  if (slots.length === 0) {
    return (
      <div onClick={onClick} className="relative w-full h-full cursor-pointer hover:bg-blue-50 transition-colors rounded-sm">
        {commentDot}
      </div>
    )
  }

  if (slots.length === 1) {
    return (
      <div onClick={onClick} className="relative w-full h-full cursor-pointer select-none">
        <SlotBlock slot={slots[0]} affaires={affaires} person={person} compact={false} />
        {commentDot}
      </div>
    )
  }

  return (
    <div onClick={onClick} className="relative w-full h-full flex flex-col gap-0.5 cursor-pointer select-none">
      <SlotBlock slot={slots[0]} affaires={affaires} person={person} compact={true} />
      <SlotBlock slot={slots[1]} affaires={affaires} person={person} compact={true} />
      {commentDot}
    </div>
  )
}
