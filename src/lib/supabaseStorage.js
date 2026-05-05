import { supabase } from './supabase'

export async function getItem(key) {
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
  try {
    await supabase
      .from('els_storage')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch {}
}

// Écoute les changements en temps réel sur une clé
// Retourne une fonction de désabonnement
export function subscribeToKey(key, callback) {
  const channel = supabase
    .channel(`storage_${key}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'els_storage', filter: `key=eq.${key}` },
      payload => { if (payload.new?.value) callback(payload.new.value) }
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
