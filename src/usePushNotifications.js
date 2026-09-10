import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// Set this in your .env / Vercel project env vars as VITE_VAPID_PUBLIC_KEY
// — it's the public half of the VAPID key pair, safe to expose client-side
// (that's the whole point of a public/private key pair). The private key
// stays server-side only, as an Edge Function secret.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Web Push wants the VAPID key as a raw Uint8Array, not the base64url
// string it's stored/transmitted as.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(session) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const [subscribing, setSubscribing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription()
      setIsSubscribed(!!existing)
    })
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported || !session?.user?.id) return { ok: false, reason: 'unsupported' }
    if (!VAPID_PUBLIC_KEY) {
      console.error('VITE_VAPID_PUBLIC_KEY is not set')
      return { ok: false, reason: 'misconfigured' }
    }

    setSubscribing(true)
    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)
      if (permissionResult !== 'granted') {
        return { ok: false, reason: 'denied' }
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: session.user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: 'endpoint' }
      )

      if (error) {
        console.error('Error saving push subscription:', error.message)
        return { ok: false, reason: 'save_failed' }
      }

      setIsSubscribed(true)
      return { ok: true }
    } finally {
      setSubscribing(false)
    }
  }, [supported, session])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', existing.endpoint)
      await existing.unsubscribe()
    }
    setIsSubscribed(false)
  }, [supported])

  return { supported, permission, isSubscribed, subscribing, subscribe, unsubscribe }
}