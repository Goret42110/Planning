/**
 * Couche de stockage — proxy Vercel → Supabase (clé service côté serveur).
 * Toutes les données passent par /api/storage.
 */

async function remoteGet(key) {
  try {
    const r = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
    if (!r.ok) { console.error('[storage] GET HTTP', r.status); return null }
    const { value } = await r.json()
    return value ?? null
  } catch (e) { console.error('[storage] GET error:', e); return null }
}

async function remoteSet(key, value) {
  try {
    const r = await fetch('/api/storage', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, value }),
    })
    if (!r.ok) console.error('[storage] POST HTTP', r.status)
  } catch (e) { console.error('[storage] POST error:', e) }
}

export async function getItem(key) {
  return remoteGet(key)
}

export async function setItem(key, value) {
  return remoteSet(key, value)
}

/** Polling toutes les 8s (remplace WebSocket Supabase) */
export function subscribeToKey(key, callback) {
  let last    = undefined
  let stopped = false

  async function poll() {
    if (stopped) return
    const value = await remoteGet(key)
    const s = JSON.stringify(value)
    if (s !== JSON.stringify(last)) {
      last = value
      if (last !== undefined) callback(value)
    }
    if (!stopped) setTimeout(poll, 8000)
  }

  poll()
  return () => { stopped = true }
}
