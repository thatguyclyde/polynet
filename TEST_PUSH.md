Test Push
---------

1) Deploy your `send-push-notification` Edge Function and set secrets `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

2) Run the test script locally (requires Node 18+):

```bash
SEND_PUSH_URL="https://<project>.functions.supabase.co/send-push-notification" \
AUTH_BEARER="<service_role_key>" node tools/send_test_push.js
```

3) Observe response and check `push_subscriptions` in your Supabase DB. If the function returns `sent: 0`, verify subscriptions exist.
