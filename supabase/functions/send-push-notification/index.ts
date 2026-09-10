// Supabase Edge Function: send-push-notification
//
// Sends a real push notification to every subscribed device. Called
// automatically by the database trigger on new news articles (see
// 05_push_notifications.sql), but also callable directly for other
// triggers later (a new marketplace message, etc.) — just POST it
// { title, body, url } and it fans out to everyone subscribed.
//
// Deploy:
//   supabase functions deploy send-push-notification
//
// Requires two secrets set on the function (Supabase Dashboard ->
// Edge Functions -> send-push-notification -> Secrets, or via CLI:
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
// — the same key pair from the VAPID setup, NOT your Supabase keys.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

Deno.serve(async (req) => {
  try {
    // Accept an optional `user_id` field to limit the push to a
    // particular user's subscriptions (used for notifying a message
    // recipient). If omitted, the function fans out to all subscriptions.
    const { title, body, url, user_id } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    webpush.setVapidDetails(
      'mailto:noreply@polynet.co.zw',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    let subsQuery = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')

    if (user_id) {
      subsQuery = subsQuery.eq('user_id', user_id)
    }

    const { data: subs, error } = await subsQuery

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const payload = JSON.stringify({
      title: title || 'PolyNet',
      body: body || '',
      url: url || '/',
    })

    let sent = 0
    const deadIds: string[] = []

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        sent++
      } catch (err) {
        // 404/410 means the subscription is dead (browser data cleared,
        // uninstalled, etc.) — safe to clean it up so it stops being
        // retried forever.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          deadIds.push(sub.id)
        } else {
          console.error('Push failed for', sub.id, err?.message)
        }
      }
    }))

    if (deadIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', deadIds)
    }

    return new Response(JSON.stringify({ sent, removed: deadIds.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})