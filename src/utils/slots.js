import { SPECIAL_CODES } from './colors'

// Normalize any cell value to an array of slot objects { id, from?, to? }
export function getCellSlots(v) {
  if (!v) return []
  if (Array.isArray(v)) return v.map(s => typeof s === 'string' ? { id: s } : s)
  return [{ id: v }]
}

export function isSpecialId(id) {
  return !!SPECIAL_CODES[id]
}

// Fraction of a work day (8h) that a slot represents
export function slotJH(slot) {
  if (!slot.from || !slot.to) return 1
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  return Math.max(0, (toMin(slot.to) - toMin(slot.from)) / 480)
}

// Serialize back to storage: single full-day → plain string, otherwise array
export function packSlots(slots) {
  if (!slots || slots.length === 0) return null
  if (slots.length === 1 && !slots[0].from && !slots[0].to) return slots[0].id
  return slots
}
