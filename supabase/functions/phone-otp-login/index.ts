// Phone + OTP login: request and verify a 6-digit code over Twilio SMS.
// Returns a token_hash on successful verification so the client can create
// a Supabase session via supabase.auth.verifyOtp({ type: 'magiclink' }).

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OTP_TTL_MIN = 5
const RESEND_COOLDOWN_SEC = 30
const MAX_ATTEMPTS = 5

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function generateOtp(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % 1000000).toString().padStart(6, '0')
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Normalize phone to E.164 (+91 default for 10-digit Indian numbers).
function normalizePhone(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[\s\-\(\)]/g, '').replace(/^whatsapp:/, '')
  if (cleaned.startsWith('+')) return cleaned
  if (/^91\d{10}$/.test(cleaned)) return '+' + cleaned
  if (/^\d{10}$/.test(cleaned)) return '+91' + cleaned
  return cleaned ? (cleaned.startsWith('+') ? cleaned : '+' + cleaned) : null
}

// Last 10 digits — used to find a user no matter how they typed their phone.
function last10(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

async function findUserByPhone(supabase: ReturnType<typeof createClient>, phone: string) {
  const tail = last10(phone)
  if (tail.length < 10) return null

  // Try signup_requests (has phone + user_id + email).
  const { data: reqs } = await supabase
    .from('signup_requests')
    .select('user_id, email, phone')
    .not('phone', 'is', null)
  const match = (reqs ?? []).find((r: any) => last10(String(r.phone || '')) === tail)
  if (match) return { user_id: match.user_id, email: match.email }

  // Fallback: scan auth.users metadata.phone (slower).
  let page = 1
  while (page <= 5) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    const u = data.users.find((u: any) => {
      const p = u.phone || u.user_metadata?.phone
      return p && last10(String(p)) === tail
    })
    if (u) return { user_id: u.id as string, email: (u.email ?? '') as string }
    if (data.users.length < 1000) break
    page += 1
  }
  return null
}

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')
  if (!sid || !token || !from) throw new Error('SMS service not configured')

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Twilio error', res.status, err)
    throw new Error('Failed to send SMS')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action, phone, otp } = await req.json()
    const normPhone = normalizePhone(phone || '')
    if (!normPhone) return json({ error: 'Invalid phone number' }, 400)

    if (action === 'request') {
      const user = await findUserByPhone(supabase, normPhone)
      if (!user) {
        return json({
          error: 'This mobile number is not registered. Please sign up before logging in.',
          notRegistered: true,
        }, 404)
      }

      // Rate limit (resend cooldown).
      const { data: existing } = await supabase
        .from('phone_login_otps')
        .select('last_sent_at')
        .eq('phone', normPhone)
        .maybeSingle()
      if (existing?.last_sent_at) {
        const elapsed = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000
        if (elapsed < RESEND_COOLDOWN_SEC) {
          return json({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - elapsed)}s before requesting a new OTP.` }, 429)
        }
      }

      const code = generateOtp()
      const hash = await sha256(code)
      const expires = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString()

      const { error: upErr } = await supabase
        .from('phone_login_otps')
        .upsert({
          phone: normPhone,
          otp_hash: hash,
          user_id: user.user_id,
          email: user.email,
          attempts: 0,
          expires_at: expires,
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'phone' })
      if (upErr) {
        console.error('OTP upsert error', upErr)
        return json({ error: 'Failed to prepare OTP' }, 500)
      }

      await sendSms(normPhone, `Your JAAGA X login OTP is ${code}. It expires in ${OTP_TTL_MIN} minutes.`)
      return json({ success: true, message: 'OTP sent' })
    }

    if (action === 'verify') {
      // Return 200 for user-correctable errors so supabase.functions.invoke
      // surfaces our message instead of "non-2xx status code".
      if (!otp || !/^\d{6}$/.test(String(otp))) return json({ error: 'Invalid OTP. Please try again.' })

      const { data: rec } = await supabase
        .from('phone_login_otps')
        .select('*')
        .eq('phone', normPhone)
        .maybeSingle()
      if (!rec) return json({ error: 'No OTP found. Please request a new OTP.' })

      if (new Date(rec.expires_at).getTime() < Date.now()) {
        await supabase.from('phone_login_otps').delete().eq('phone', normPhone)
        return json({ error: 'OTP has expired. Please request a new OTP.' })
      }
      if (rec.attempts >= MAX_ATTEMPTS) {
        await supabase.from('phone_login_otps').delete().eq('phone', normPhone)
        return json({ error: 'Too many attempts. Please request a new OTP.' })
      }

      const hash = await sha256(String(otp))
      if (hash !== rec.otp_hash) {
        await supabase
          .from('phone_login_otps')
          .update({ attempts: rec.attempts + 1, updated_at: new Date().toISOString() })
          .eq('phone', normPhone)
        return json({ error: 'Invalid OTP. Please try again.' })
      }

      // OTP verified — generate a magic-link token_hash for the client to consume.
      const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: rec.email,
      })
      if (linkErr || !link?.properties?.hashed_token) {
        console.error('generateLink error', linkErr)
        return json({ error: 'Could not create session. Please try again.' }, 500)
      }

      await supabase.from('phone_login_otps').delete().eq('phone', normPhone)

      return json({
        success: true,
        email: rec.email,
        token_hash: link.properties.hashed_token,
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e: any) {
    console.error('phone-otp-login error', e)
    return json({ error: e?.message || 'Server error' }, 500)
  }
})
