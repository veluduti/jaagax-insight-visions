// JAAGA X registration with mandatory mobile OTP verification.
// The account is created ONLY after the OTP is verified.
// Supports two providers: 'email' (full manual signup) and 'google' (name+email come from Google).

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
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null
  const cleaned = String(raw).replace(/[\s\-()]/g, '')
  if (cleaned.startsWith('+')) return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null
  if (/^\d{10}$/.test(cleaned)) return '+91' + cleaned
  if (/^\d{11,15}$/.test(cleaned)) return '+' + cleaned
  return null
}

function last10(phone: string) {
  return phone.replace(/\D/g, '').slice(-10)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function findAuthUserByEmail(supabase: any, email: string) {
  const target = email.toLowerCase().trim()
  let page = 1
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const found = data.users.find((u: any) => u.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < 1000) break
    page += 1
  }
  return null
}

async function phoneTaken(supabase: any, phone: string, ignoreUserId?: string | null) {
  const tail = last10(phone)
  if (tail.length < 10) return false
  const { data: reqs } = await supabase.from('signup_requests').select('user_id, phone').not('phone', 'is', null)
  const hit = (reqs ?? []).find(
    (r: any) => last10(String(r.phone || '')) === tail && r.user_id !== ignoreUserId,
  )
  return !!hit
}

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')
  if (!sid || !token || !from) throw new Error('SMS service is not configured. Please contact support.')

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
    throw new Error('Could not send the OTP to that number. Please check it and try again.')
  }
}

/** Creates the customer profile, role and signup record for a brand-new user. */
async function provisionCustomer(
  supabase: any,
  userId: string,
  rec: { email: string; full_name: string | null; country: string | null; phone: string; auth_provider: string },
) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'buyer')
    .maybeSingle()

  if (!existingProfile) {
    await supabase.from('profiles').insert({
      user_id: userId,
      type: 'buyer',
      status: 'active',
      country: rec.country,
    })
  } else if (rec.country) {
    await supabase.from('profiles').update({ country: rec.country }).eq('id', existingProfile.id)
  }

  await supabase.from('user_roles').upsert({ user_id: userId, role: 'customer' }, { onConflict: 'user_id,role' })

  const { data: existingReq } = await supabase
    .from('signup_requests')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  const reqPayload = {
    user_id: userId,
    email: rec.email,
    full_name: rec.full_name,
    phone: rec.phone,
    country: rec.country,
    requested_role: 'customer',
    status: 'approved',
  }
  if (existingReq) {
    await supabase.from('signup_requests').update(reqPayload).eq('id', existingReq.id)
  } else {
    await supabase.from('signup_requests').insert(reqPayload)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json()
    const action = String(body.action || '').toLowerCase()
    const provider = String(body.provider || 'email').toLowerCase() === 'google' ? 'google' : 'email'
    const phone = normalizePhone(String(body.phone || ''))

    // Resolve the signed-in Google user when provider === 'google'
    let googleUser: any = null
    if (provider === 'google') {
      const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
      const { data } = await supabase.auth.getUser(jwt)
      googleUser = data?.user ?? null
      if (!googleUser) return json({ error: 'Google session expired. Please sign in with Google again.' }, 401)
    }

    if (action === 'send' || action === 'resend') {
      if (!phone) return json({ error: 'Enter a valid phone number' }, 400)

      const email = String(provider === 'google' ? googleUser.email : body.email || '').toLowerCase().trim()
      const fullName = String(
        provider === 'google'
          ? googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || ''
          : body.fullName || '',
      ).trim()
      const country = String(body.country || '').trim()
      const password = provider === 'email' ? String(body.password || '') : ''

      if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email address' }, 400)
      if (!fullName) return json({ error: 'Full name is required' }, 400)
      if (!country) return json({ error: 'Country is required' }, 400)
      if (provider === 'email' && password.length < 8) {
        return json({ error: 'Password must be at least 8 characters' }, 400)
      }

      // Duplicate checks
      if (provider === 'email') {
        const existing = await findAuthUserByEmail(supabase, email)
        if (existing) return json({ error: 'This email is already registered. Please sign in instead.' }, 409)
      }
      if (await phoneTaken(supabase, phone, provider === 'google' ? googleUser.id : null)) {
        return json({ error: 'This mobile number is already registered. Please sign in instead.' }, 409)
      }

      // Resend cooldown
      const { data: existingPending } = await supabase
        .from('pending_registrations')
        .select('last_sent_at')
        .eq('phone', phone)
        .maybeSingle()
      if (existingPending?.last_sent_at) {
        const elapsed = (Date.now() - new Date(existingPending.last_sent_at).getTime()) / 1000
        if (elapsed < RESEND_COOLDOWN_SEC) {
          return json({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - elapsed)}s before requesting a new code.` }, 429)
        }
      }

      const code = generateOtp()
      const otpHash = await sha256(code)

      const { error: upErr } = await supabase.from('pending_registrations').upsert(
        {
          phone,
          email,
          full_name: fullName,
          country,
          password: provider === 'email' ? password : null,
          auth_provider: provider,
          google_user_id: provider === 'google' ? googleUser.id : null,
          otp_hash: otpHash,
          attempt_count: 0,
          expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
          last_sent_at: new Date().toISOString(),
          verified_at: null,
          consumed_at: null,
        },
        { onConflict: 'phone' },
      )
      if (upErr) return json({ error: upErr.message }, 500)

      await sendSms(phone, `${code} is your JAAGA X verification code. It expires in ${OTP_TTL_MIN} minutes.`)

      return json({ success: true, phone, expiresInMinutes: OTP_TTL_MIN })
    }

    if (action === 'verify') {
      if (!phone) return json({ error: 'Enter a valid phone number' }, 400)
      const otp = String(body.otp || '').trim()
      if (!/^\d{6}$/.test(otp)) return json({ error: 'Enter the 6-digit code' }, 400)

      const { data: rec } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('phone', phone)
        .maybeSingle()

      if (!rec) return json({ error: 'No pending registration found. Please start again.' }, 404)
      if (rec.consumed_at) return json({ error: 'This code was already used.' }, 400)
      if (new Date(rec.expires_at).getTime() < Date.now()) {
        return json({ error: 'Code expired. Please request a new one.' }, 400)
      }
      if ((rec.attempt_count ?? 0) >= MAX_ATTEMPTS) {
        return json({ error: 'Too many attempts. Please request a new code.' }, 429)
      }
      if (rec.otp_hash !== (await sha256(otp))) {
        await supabase
          .from('pending_registrations')
          .update({ attempt_count: (rec.attempt_count ?? 0) + 1 })
          .eq('id', rec.id)
        return json({ error: 'Incorrect code. Please try again.' }, 400)
      }

      let userId: string
      let tokenHash: string | null = null

      if (rec.auth_provider === 'google') {
        if (!googleUser || googleUser.id !== rec.google_user_id) {
          return json({ error: 'Google session expired. Please sign in with Google again.' }, 401)
        }
        userId = googleUser.id
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...(googleUser.user_metadata ?? {}),
            name: rec.full_name,
            phone: rec.phone,
            country: rec.country,
            phone_verified: true,
            auth_provider: 'google',
            role: 'customer',
          },
        })
      } else {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: rec.email,
          password: rec.password,
          email_confirm: true,
          user_metadata: {
            name: rec.full_name,
            phone: rec.phone,
            country: rec.country,
            phone_verified: true,
            auth_provider: 'email',
            role: 'customer',
          },
        })
        if (createErr || !created?.user) {
          const msg = createErr?.message || 'Failed to create your account'
          return json({ error: /already/i.test(msg) ? 'This email is already registered. Please sign in.' : msg }, 400)
        }
        userId = created.user.id

        // Mint a one-time link so the client can start a session immediately.
        const { data: link } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: rec.email,
        })
        tokenHash = (link?.properties as any)?.hashed_token ?? null
      }

      await provisionCustomer(supabase, userId, {
        email: rec.email,
        full_name: rec.full_name,
        country: rec.country,
        phone: rec.phone,
        auth_provider: rec.auth_provider,
      })

      await supabase
        .from('pending_registrations')
        .update({
          verified_at: new Date().toISOString(),
          consumed_at: new Date().toISOString(),
          password: null,
        })
        .eq('id', rec.id)

      return json({ success: true, email: rec.email, token_hash: tokenHash, role: 'customer' })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err: any) {
    console.error('register-otp error', err)
    return json({ error: err?.message ?? 'Something went wrong. Please try again.' }, 500)
  }
})
