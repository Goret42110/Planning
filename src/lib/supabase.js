import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si les variables ne sont pas configurées, supabase = null
// L'app fonctionne en mode localStorage uniquement
export const supabase = (url && key) ? createClient(url, key) : null
