// Colors adjusted for light theme backgrounds
export const AFFAIRE_PALETTE = [
  { bg: 'rgba(245,158,11,0.14)',  border: '#D97706', text: '#92400E' },
  { bg: 'rgba(59,130,246,0.14)',  border: '#3B82F6', text: '#1E40AF' },
  { bg: 'rgba(16,185,129,0.14)',  border: '#10B981', text: '#065F46' },
  { bg: 'rgba(239,68,68,0.14)',   border: '#EF4444', text: '#991B1B' },
  { bg: 'rgba(139,92,246,0.14)',  border: '#8B5CF6', text: '#4C1D95' },
  { bg: 'rgba(236,72,153,0.14)',  border: '#EC4899', text: '#831843' },
  { bg: 'rgba(249,115,22,0.14)',  border: '#F97316', text: '#7C2D12' },
  { bg: 'rgba(34,197,94,0.14)',   border: '#22C55E', text: '#14532D' },
  { bg: 'rgba(6,182,212,0.14)',   border: '#06B6D4', text: '#164E63' },
  { bg: 'rgba(244,63,94,0.14)',   border: '#F43F5E', text: '#881337' },
];

export const getAffaireColor = (idx) => AFFAIRE_PALETTE[(idx ?? 0) % AFFAIRE_PALETTE.length];

export const SPECIAL_CODES = {
  CP:        { label: 'Congés Payés',  bg: 'rgba(59,130,246,0.12)',   border: '#3B82F6', text: '#1E40AF' },
  AM:        { label: 'Arrêt Maladie', bg: 'rgba(239,68,68,0.12)',    border: '#EF4444', text: '#991B1B' },
  'ÉCOLE':   { label: 'École',          bg: 'rgba(16,185,129,0.12)',   border: '#10B981', text: '#065F46' },
  ABSENT:    { label: 'Absent',         bg: 'rgba(100,116,139,0.12)',  border: '#64748B', text: '#334155' },
  FORMATION: { label: 'Formation',      bg: 'rgba(139,92,246,0.12)',   border: '#8B5CF6', text: '#4C1D95' },
  BUREAU:    { label: 'Bureau',         bg: 'rgba(251,191,36,0.12)',   border: '#FBBF24', text: '#78350F' },
};

export const PERSON_TYPE_COLORS = {
  'ELS':            { bg: '#1D4ED8', text: '#fff' },
  'Intérimaire':    { bg: '#B45309', text: '#fff' },
  'Sous-traitant':  { bg: '#047857', text: '#fff' },
};

export const QUALIF_CLASS = {
  RES:       'bg-rose-100 text-rose-700 border border-rose-300',
  CA:        'bg-blue-100 text-blue-700 border border-blue-300',
  ACA:       'bg-indigo-100 text-indigo-700 border border-indigo-300',
  CE:        'bg-green-100 text-green-700 border border-green-300',
  AP:        'bg-yellow-100 text-yellow-700 border border-yellow-300',
  EL:        'bg-orange-100 text-orange-700 border border-orange-300',
  CDD:       'bg-slate-100 text-slate-600 border border-slate-300',
  INT:       'bg-amber-100 text-amber-700 border border-amber-300',
  SGT:       'bg-teal-100 text-teal-700 border border-teal-300',
  Stagiaire: 'bg-pink-100 text-pink-700 border border-pink-300',
};
