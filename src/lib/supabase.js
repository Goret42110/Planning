import { createClient } from '@supabase/supabase-js'

export const supabase = (() => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (url && key && url.startsWith('http')) return createClient(url, key)
  } catch {}
  return null
})()
