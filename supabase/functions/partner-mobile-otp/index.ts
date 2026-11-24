// Sends and verifies a mobile OTP for a signed-in partner during registration.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { OtpSmsError, sendOtpSms } from '../_shared/otpSms.ts'

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const sha = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map((b) => b.toString(16).padStart(2, '0')).join('')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return json({ error: 'Please sign in again to verify your mobile.' }, 401)
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')
    if (action === 'send') {
      const digits = String(body.phone || '').replace(/\D/g, '')
      if (!/^[6-9]\d{9}$/.test(digits)) return json({ error: 'Enter a valid 10-digit mobile number.' })
      const phone = '+91' + digits
      const { data: ex } = await admin.from('partner_mobile_otps').select('last_sent_at').eq('user_id', user.id).maybeSingle()
      if (ex && Date.now() - new Date(ex.last_sent_at).getTime() < 30_000) return json({ error: 'Please wait a few seconds before requesting a new code.' })
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
      await admin.from('partner_mobile_otps').upsert({ user_id: user.id, phone, otp_hash: await sha(code), attempts: 0, expires_at: new Date(Date.now() + 300_000).toISOString(), last_sent_at: new Date().toISOString(), verified_at: null })
      try {
        await sendOtpSms(phone, `Your JAAGA X partner verification code is ${code}. It expires in 5 minutes.`, { sid: Deno.env.get('TWILIO_ACCOUNT_SID'), token: Deno.env.get('TWILIO_AUTH_TOKEN'), from: Deno.env.get('TWILIO_PHONE_NUMBER') })
      } catch (e) {
        await admin.from('partner_mobile_otps').delete().eq('user_id', user.id)
        return json({ error: e instanceof OtpSmsError ? e.message : 'Could not send SMS. Please try again.' })
      }
      return json({ ok: true })
    }
    if (action === 'verify') {
      const otp = String(body.otp || '').trim()
      const { data: rec } = await admin.from('partner_mobile_otps').select('*').eq('user_id', user.id).maybeSingle()
      if (!rec) return json({ error: 'Request a code first.' })
      if (new Date(rec.expires_at).getTime() < Date.now()) return json({ error: 'This code has expired. Request a new one.' })
      if (rec.attempts >= 5) return json({ error: 'Too many attempts. Request a new code.' })
      if ((await sha(otp)) !== rec.otp_hash) {
        await admin.from('partner_mobile_otps').update({ attempts: rec.attempts + 1 }).eq('user_id', user.id)
        return json({ error: 'Incorrect code.' })
      }
      await admin.from('partner_mobile_otps').update({ verified_at: new Date().toISOString() }).eq('user_id', user.id)
      await admin.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, phone: rec.phone, phone_verified: true } })
      return json({ ok: true, phone: rec.phone })
    }
    return json({ error: 'Unknown action' }, 400)
  } catch { return json({ error: 'Something went wrong. Please try again.' }, 500) }
})
