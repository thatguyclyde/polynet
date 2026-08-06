import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bfbzgnmrhxnbukwbmeyy.supabase.co'
const supabaseAnonKey = 'sb_publishable_OPV6RzKHsKdoAkpXAXYZ1g_3L8o_G2x'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Mobile/backgrounded browsers throttle timers, so the scheduled token
// refresh can get missed while the app is in the background — leaving an
// expired JWT sitting around until the next request fails with 401. This
// explicitly resumes the refresh cycle the moment the tab becomes visible
// again, instead of relying only on the (possibly-missed) background timer.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}