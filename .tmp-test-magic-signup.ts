import { createClient } from '@supabase/supabase-js'
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrY2dudHhnamx0c3pzZ3ZlbXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDM1NjIsImV4cCI6MjA4OTIxOTU2Mn0.dJKqDjABrQ9BhWbWnPXbMqaf1HpnRLbuh96xUUCtd7g'
const supabase = createClient('https://ukcgntxgjltszsgvemxi.supabase.co', anon)
const email = `otpalt_${crypto.randomUUID().slice(0,8)}@example.test`
const { data, error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    data: { role: 'customer' }
  }
})
console.log(JSON.stringify({ email, data, error: error?.message ?? null }, null, 2))
