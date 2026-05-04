// ISO 8601 week utilities

export function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  w1.setDate(w1.getDate() + 3 - (w1.getDay() + 6) % 7);
  return 1 + Math.round((d - w1) / 604800000);
}

export function getISOYear(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  return d.getFullYear();
}

// Monday of a given ISO week
export function getMondayOfWeek(isoYear, isoWeek) {
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // Mon=0
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Day + (isoWeek - 1) * 7);
  return monday;
}

// 5 working days (Mon–Fri) of a given ISO week
export function getWorkDays(isoYear, isoWeek) {
  const monday = getMondayOfWeek(isoYear, isoWeek);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const HOLIDAYS = {
  '2025-01-01': "Jour de l'An",
  '2025-04-21': 'Lundi de Pâques',
  '2025-05-01': 'Fête du Travail',
  '2025-05-08': 'Victoire 1945',
  '2025-05-29': 'Ascension',
  '2025-06-09': 'Lundi de Pentecôte',
  '2025-07-14': 'Fête Nationale',
  '2025-08-15': 'Assomption',
  '2025-11-01': 'Toussaint',
  '2025-11-11': 'Armistice',
  '2025-12-25': 'Noël',
  '2026-01-01': "Jour de l'An",
  '2026-04-06': 'Lundi de Pâques',
  '2026-05-01': 'Fête du Travail',
  '2026-05-08': 'Victoire 1945',
  '2026-05-14': 'Ascension',
  '2026-05-25': 'Lundi de Pentecôte',
  '2026-07-14': 'Fête Nationale',
  '2026-08-15': 'Assomption',
  '2026-11-01': 'Toussaint',
  '2026-11-11': 'Armistice',
  '2026-12-25': 'Noël',
  '2027-01-01': "Jour de l'An",
};

export const isHoliday = (date) => HOLIDAYS[toDateKey(date)] || null;

export function isToday(date) {
  return toDateKey(date) === toDateKey(new Date());
}

export function planningKey(personId, isoYear, isoWeek, dayIndex) {
  return `${personId}_${isoYear}-W${String(isoWeek).padStart(2, '0')}_${dayIndex}`;
}

// All 7 days of a given ISO week (Mon → Sun)
export function getWeekDays(isoYear, isoWeek) {
  const monday = getMondayOfWeek(isoYear, isoWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const MONTHS_FR = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
const DAYS_FR   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const formatShortDate = (date) => {
  const d = new Date(date);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
};

export const formatDayShort = (date) => {
  const d = new Date(date);
  return DAYS_FR[(d.getDay() + 6) % 7];
};

export function formatWeekRange(isoYear, startWeek, count = 6) {
  const firstDay = getMondayOfWeek(isoYear, startWeek);
  let endWeek = startWeek + count - 1;
  let endYear = isoYear;
  if (endWeek > 52) { endWeek -= 52; endYear++; }
  const lastMon = getMondayOfWeek(endYear, endWeek);
  const lastFri = new Date(lastMon);
  lastFri.setDate(lastMon.getDate() + 4);
  return `${formatShortDate(firstDay)} – ${formatShortDate(lastFri)} ${lastFri.getFullYear()}`;
}

export function getCurrentWeekInfo() {
  const today = new Date();
  return { week: getISOWeek(today), year: getISOYear(today) };
}

// Advance by delta weeks, crossing year boundary
export function addWeeks(isoYear, isoWeek, delta) {
  let w = isoWeek + delta;
  let y = isoYear;
  while (w > 52) { w -= 52; y++; }
  while (w < 1)  { w += 52; y--; }
  return { year: y, week: w };
}
