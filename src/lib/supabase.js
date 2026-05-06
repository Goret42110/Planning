import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('[Supabase] URL:', url ?? 'UNDEFINED')
console.log('[Supabase] KEY:', key ? key.slice(0, 20) + '...' : 'UNDEFINED')

export const supabase = (url && key)
  ? createClient(url, key)
  : null

if (!supabase) console.error('[Supabase] CLIENT NULL — variables env manquantes dans le build Vercel')
