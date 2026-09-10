#!/usr/bin/env node
// Simple test runner to POST a test push payload to your Supabase Edge
// Function `send-push-notification` (or any equivalent endpoint).
// Usage (example):
// SEND_PUSH_URL="https://<project>.functions.supabase.co/send-push-notification" \
// AUTH_BEARER="service_role_key_here" node tools/send_test_push.js

const url = process.env.SEND_PUSH_URL
const bearer = process.env.AUTH_BEARER

if (!url) {
  console.error('SEND_PUSH_URL is not set')
  process.exit(1)
}
if (!bearer) {
  console.error('AUTH_BEARER is not set')
  process.exit(1)
}

const payload = {
  title: 'Test Push — PolyNet',
  body: 'This is a test push sent from tools/send_test_push.js',
  url: '/',
}

async function run() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`,
      },
      body: JSON.stringify(payload),
    })
    const txt = await res.text()
    console.log('Status:', res.status)
    console.log('Response:', txt)
  } catch (err) {
    console.error('Error calling send-push endpoint:', err)
  }
}

run()
