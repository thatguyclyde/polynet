import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bfbzgnmrhxnbukwbmeyy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmYnpnbm1yaHhuYnVrd2JtZXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Njc1OTcsImV4cCI6MjA5NzI0MzU5N30.ewyhse6uNeNLOt6TN06yvHUegSWDMiO9yLZLb5TphsY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)