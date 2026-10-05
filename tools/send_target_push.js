#!/usr/bin/env node
// Lookup profile id by email and call send-push-notification with user_id
// Usage: set AUTH_BEARER and SEND_PUSH_URL in env then run

const fetch = globalThis.fetch || require('node-fetch')

const SERVICE_ROLE = process.env.AUTH_BEARER
const ANON = 'sb_publishable_OPV6RzKHsKdoAkpXAXYZ1g_3L8o_G2x'
const BASE = 'https://bfbzgnmrhxnbukwbmeyy.supabase.co'
const SEND_URL = process.env.SEND_PUSH_URL || `${BASE}/functions/v1/send-push-notification`
const email = 'polynetzim@gmail.com'

if (!SERVICE_ROLE) {
  console.error('AUTH_BEARER not set')
  process.exit(1)
}

async function run() {
  try {
    const profRes = await fetch(`${BASE}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`, {
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    })
    const profTxt = await profRes.text()
    if (!profRes.ok) {
      console.error('Profile lookup failed', profRes.status, profTxt)
      return
    }
    const prof = JSON.parse(profTxt)
    if (!prof || prof.length === 0) {
      console.error('No profile found for', email)
      return
    }
    const userId = prof[0].id
    console.log('Found user id:', userId)

    const payload = { title: 'Test Push — PolyNet', body: 'Targeted test push', user_id: userId }
    const pushRes = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify(payload),
    })
    const pushTxt = await pushRes.text()
    console.log('Function status:', pushRes.status)
    console.log('Function response:', pushTxt)
  } catch (e) {
    console.error('Error', e)
  }
}

run()
