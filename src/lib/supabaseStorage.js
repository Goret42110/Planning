import { supabase } from './supabase'

export async function getItem(key) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('els_storage')
      .select('value')
      .eq('key', key)
      .single()
    if (error || !data) return null
    return data.value
  } catch { return null }
}

export async function setItem(key, value) {
  if (!supabase) return
  try {
    await supabase
      .from('els_storage')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch {}
}

export function subscribeToKey(key, callback) {
  if (!supabase) return () => {}
  try {
    const channel = supabase
      .channel(`storage_${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'els_storage', filter: `key=eq.${key}` },
        payload => { if (payload.new?.value) callback(payload.new.value) }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  } catch { return () => {} }
}
