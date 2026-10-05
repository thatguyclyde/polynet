import { supabase } from './supabase'

export async function createNotification({
  user_id,
  type,
  content,
  source_user_id = null,
  source_type = null,
  source_id = null,
  metadata = {},
}) {
  if (!user_id) return { data: null, error: null }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id,
      type,
      content,
      read: false,
      source_user_id,
      source_type,
      source_id,
      metadata,
    })
    .select()
    .single()

  return { data, error }
}

export async function fetchNotifications(userId, limit = 20) {
  if (!userId) return { data: [], error: null }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: data || [], error }
}

export async function markNotificationsRead(userId) {
  if (!userId) return { error: null }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  return { error }
}
