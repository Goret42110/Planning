/**
 * Couche de stockage unifiée.
 *
 * Priorité :
 *   1. Serveur local NAS (localhost:3001)  → données sensibles sécurisées
 *   2. Proxy Vercel (/api/storage)         → fallback Supabase (planning non-sensible)
 *
 * Si le serveur local est injoignable → les données sensibles sont bloquées.
 */

import { localGetItem, localSetItem, localSubscribe, pingLocalServer } from './localServer'

// Clés stockées UNIQUEMENT sur le serveur local NAS
const LOCAL_KEYS = new Set([
  'els_planning_data',   // affaires + planning + personnel (avec données financières)
  'els_utilisateurs',    // comptes utilisateurs
  'els_network_key',     // clé réseau
  'objectifs_budget',    // objectifs financiers
  'els_suivi_notes',     // notes de suivi
])

function isLocalKey(key) {
  if (LOCAL_KEYS.has(key)) return true
  // Clés dynamiques de gestion
  if (key.startsWith('els_gestion_')) return true
  return false
}

// ── Proxy Vercel (Supabase via serveur) ──────────────────────────────────────
async function remoteGet(key) {
  try {
    const r = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
    if (!r.ok) return null
    const { value } = await r.json()
    return value ?? null
  } catch (e) { console.error('[storage] remoteGet error:', e); return null }
}

async function remoteSet(key, value) {
  try {
    const r = await fetch('/api/storage', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, value }),
    })
    if (!r.ok) console.error('[storage] remoteSet HTTP', r.status)
  } catch (e) { console.error('[storage] remoteSet error:', e) }
}

// ── API publique ─────────────────────────────────────────────────────────────
export async function getItem(key) {
  if (isLocalKey(key)) return localGetItem(key)
  return remoteGet(key)
}

export async function setItem(key, value) {
  if (isLocalKey(key)) return localSetItem(key, value)
  return remoteSet(key, value)
}

export function subscribeToKey(key, callback) {
  if (isLocalKey(key)) return localSubscribe(key, callback)

  // Polling Supabase via proxy
  let last    = undefined
  let stopped = false
  async function poll() {
    if (stopped) return
    const value = await remoteGet(key)
    const s = JSON.stringify(value)
    if (s !== JSON.stringify(last)) { last = value; if (last !== undefined) callback(value) }
    if (!stopped) setTimeout(poll, 8000)
  }
  poll()
  return () => { stopped = true }
}

// Exporter pour NetworkGuard
export { pingLocalServer }
