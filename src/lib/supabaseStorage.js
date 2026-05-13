/**
 * Couche de stockage — passe par /api/storage (proxy serveur sécurisé).
 * La clé Supabase service_role ne transite jamais dans le navigateur.
 */

const BASE = '/api/storage'

export async function getItem(key) {
  try {
    const r = await fetch(`${BASE}?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
    if (!r.ok) { console.error('[storage] getItem HTTP', r.status); return null }
    const { value } = await r.json()
    return value ?? null
  } catch (e) { console.error('[storage] getItem error:', e); return null }
}

export async function setItem(key, value) {
  try {
    const r = await fetch(BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, value }),
    })
    if (!r.ok) console.error('[storage] setItem HTTP', r.status)
    else console.log('[storage] setItem OK:', key)
  } catch (e) { console.error('[storage] setItem error:', e) }
}

/**
 * Remplacement du WebSocket Supabase par du polling.
 * Intervalle : 8 secondes (sync multi-utilisateurs en quasi-temps-réel).
 */
export function subscribeToKey(key, callback) {
  let lastValue = undefined
  let stopped   = false

  async function poll() {
    if (stopped) return
    const value = await getItem(key)
    // Ne notifier que si la valeur a changé
    const serialized = JSON.stringify(value)
    if (serialized !== JSON.stringify(lastValue)) {
      lastValue = value
      if (lastValue !== undefined) callback(value)
    }
    if (!stopped) setTimeout(poll, 8000)
  }

  // Premier appel immédiat puis polling
  poll()
  return () => { stopped = true }
}
