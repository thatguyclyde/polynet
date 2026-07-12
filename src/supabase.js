import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bfbzgnmrhxnbukwbmeyy.supabase.co'
const supabaseAnonKey = 'sb_publishable_OPV6RzKHsKdoAkpXAXYZ1g_3L8o_G2x'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)