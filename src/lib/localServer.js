/**
 * Client pour le serveur local NAS (localhost:3001).
 * Toutes les données sensibles transitent par ici.
 * Si le serveur est injoignable → l'app bloque l'accès.
 */

const BASE    = 'http://localhost:3001'
const TIMEOUT = 3000 // ms

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id))
}

/** Vérifie si le serveur local est joignable */
export async function pingLocalServer() {
  try {
    const r = await fetchWithTimeout(`${BASE}/ping`, { cache: 'no-store' })
    const d = await r.json()
    return d.ok === true
  } catch {
    return false
  }
}

/** Lire une valeur */
export async function localGetItem(key) {
  try {
    const r = await fetchWithTimeout(`${BASE}/api/${encodeURIComponent(key)}`, { cache: 'no-store' })
    if (!r.ok) return null
    const { value } = await r.json()
    return value ?? null
  } catch (e) {
    console.error('[local] getItem error:', e.message)
    return null
  }
}

/** Écrire une valeur */
export async function localSetItem(key, value) {
  try {
    const r = await fetchWithTimeout(`${BASE}/api/${encodeURIComponent(key)}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ value }),
    })
    if (!r.ok) console.error('[local] setItem HTTP', r.status)
  } catch (e) {
    console.error('[local] setItem error:', e.message)
  }
}

/** Polling de synchronisation (remplace WebSocket) */
export function localSubscribe(key, callback) {
  let last    = undefined
  let stopped = false

  async function poll() {
    if (stopped) return
    const value = await localGetItem(key)
    const s = JSON.stringify(value)
    if (s !== JSON.stringify(last)) {
      last = value
      if (last !== undefined) callback(value)
    }
    if (!stopped) setTimeout(poll, 5000)
  }

  poll()
  return () => { stopped = true }
}
