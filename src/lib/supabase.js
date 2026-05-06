import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const SUPABASE_URL = (typeof envUrl === 'string' && envUrl.startsWith('https://'))
  ? envUrl
  : 'https://wztsmvnwnqwmstvqpchb.supabase.co'

const SUPABASE_KEY = (typeof envKey === 'string' && envKey.startsWith('eyJ'))
  ? envKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dHNtdm53bnF3bXN0dnFwY2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDQzODIsImV4cCI6MjA5MzU4MDM4Mn0.TYYl4R2XIGlTBsne2Jv3Ra-HKEawvy8btHJR9HHlI4I'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
