// Supabase Edge Function: purge-old-feed-images
//
// Deletes the photo attached to any feed post older than RETENTION_DAYS,
// and clears that post's image_url. The post itself (text, likes,
// comments) is left alone — only the image file is reclaimed. This is
// what keeps the 1GB storage bucket bounded no matter how many posts
// accumulate over time: old feed photos age out on a rolling window
// instead of piling up forever.
//
// Deploy:
//   supabase functions deploy purge-old-feed-images
//
// Schedule it with the SQL in 02_schedule_cleanup.sql (pg_cron + pg_net),
// or call it manually / via an external cron hitting its URL with the
// service role key as a Bearer token.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RETENTION_DAYS = 75
const BUCKET = 'post-images'

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: oldPosts, error: fetchErr } = await supabase
      .from('feed_posts')
      .select('id, image_url')
      .not('image_url', 'is', null)
      .lt('created_at', cutoff)

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
    }
    if (!oldPosts || oldPosts.length === 0) {
      return new Response(JSON.stringify({ purged: 0 }), { status: 200 })
    }

    const paths = oldPosts
      .map(p => extractStoragePath(p.image_url as string, BUCKET))
      .filter((p): p is string => !!p)

    if (paths.length > 0) {
      const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths)
      if (removeErr) {
        console.error('Error removing storage objects:', removeErr.message)
      }
    }

    const ids = oldPosts.map(p => p.id)
    const { error: updateErr } = await supabase
      .from('feed_posts')
      .update({ image_url: null })
      .in('id', ids)

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ purged: ids.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
