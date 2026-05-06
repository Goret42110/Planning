import { supabase } from './supabase'

export async function getItem(key) {
  if (!supabase) { console.warn('[Supabase] client null — vérifiez les variables env'); return null }
  try {
    const { data, error } = await supabase
      .from('els_storage')
      .select('value')
      .eq('key', key)
      .single()
    if (error) { console.error('[Supabase] getItem error:', error.message, error.details); return null }
    return data?.value ?? null
  } catch (e) { console.error('[Supabase] getItem exception:', e); return null }
}

export async function setItem(key, value) {
  if (!supabase) { console.warn('[Supabase] client null — vérifiez les variables env'); return }
  try {
    const { error } = await supabase
      .from('els_storage')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) console.error('[Supabase] setItem error:', error.message, error.details)
    else console.log('[Supabase] setItem OK:', key)
  } catch (e) { console.error('[Supabase] setItem exception:', e) }
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
