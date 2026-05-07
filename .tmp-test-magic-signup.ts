import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://ukcgntxgjltszsgvemxi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInR5cCI6IjI1NiIsInJlZiI6InVrY2dudHhnamx0c3pzZ3ZlbXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDM1NjIsImV4cCI6MjA4OTIxOTU2Mn0.dJKqDjABrQ9BhWbWnPXbMqaf1HpnRLbuh96xUUCtd7g')
const email = `otpalt_${crypto.randomUUID().slice(0,8)}@example.test`
const { data, error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    data: { role: 'customer' }
  }
})
console.log(JSON.stringify({ email, sent: !!data, error: error?.message ?? null }, null, 2))
