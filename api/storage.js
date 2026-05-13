/**
 * Vercel Serverless Function — Proxy sécurisé pour Supabase
 *
 * La clé service (SUPABASE_SERVICE_KEY) reste côté serveur uniquement.
 * Le navigateur n'a plus accès direct à Supabase.
 *
 * Variables Vercel à configurer :
 *   SUPABASE_URL         = https://wztsmvnwnqwmstvqpchb.supabase.co
 *   SUPABASE_SERVICE_KEY = eyJ...  (clé service_role dans Supabase > Settings > API)
 */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wztsmvnwnqwmstvqpchb.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY

function headers() {
  return {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  }
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  })
  return res
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY not configured' })
  }

  // ── GET /api/storage?key=xxx ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { key } = req.query
    if (!key) return res.status(400).json({ error: 'key required' })

    const r = await sbFetch(
      `/els_storage?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    )
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data })
    return res.status(200).json({ value: data[0]?.value ?? null })
  }

  // ── POST /api/storage  { key, value } ──────────────────────────────────────
  if (req.method === 'POST') {
    const { key, value } = req.body || {}
    if (!key) return res.status(400).json({ error: 'key required' })

    const r = await sbFetch('/els_storage', {
      method:  'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body:    JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return res.status(r.status).json({ error: err })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
