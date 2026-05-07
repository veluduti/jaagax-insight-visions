import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OTP_TTL_MIN = 5
const RESEND_COOLDOWN_SEC = 30
const MAX_ATTEMPTS = 5

function generateOtp(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % 1000000).toString().padStart(6, '0')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-()]/g, '')
  if (trimmed.startsWith('+')) return trimmed
  const digits = trimmed.replace(/\D/g, '')
  // Default to India +91 if 10 digits
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return `+${digits}`
}

async function sendSms(toPhone: string, code: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')
  if (!sid || !token || !from) throw new Error('Twilio not configured')

  const body = new URLSearchParams({
    To: toPhone,
    From: from,
    Body: `Your JAAGA X verification code is ${code}. It expires in 5 minutes. Do not share this code.`,
  })

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Twilio error', data)
    throw new Error(data?.message || `Twilio failed (${res.status})`)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json()
    const action = String(body.action || '').toLowerCase()
    const email = String(body.email || '').toLowerCase().trim()
    if (!email) return json({ error: 'Email required' }, 400)

    if (action === 'init' || action === 'resend') {
      const { data: existing } = await supabase
        .from('signup_email_otps')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      // Cooldown check (anti-spam)
      if (existing?.last_sent_at) {
        const elapsed = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000
        if (elapsed < RESEND_COOLDOWN_SEC) {
          return json({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - elapsed)}s before requesting a new code` }, 429)
        }
      }

      let phone: string
      let password: string | null = null
      let metadata: any = existing?.metadata ?? {}

      if (action === 'init') {
        const rawPhone = String(body.phone || '').trim()
        if (!rawPhone) return json({ error: 'Phone number required' }, 400)
        phone = normalizePhone(rawPhone)
        if (!/^\+\d{10,15}$/.test(phone)) return json({ error: 'Invalid phone number' }, 400)

        password = body.password ? String(body.password) : null
        if (!password) return json({ error: 'Password required' }, 400)

        // Check if email already registered
        const { data: list } = await supabase.auth.admin.listUsers()
        const taken = list?.users?.some((u: any) => u.email?.toLowerCase() === email && u.email_confirmed_at)
        if (taken) return json({ error: 'This email is already registered. Please log in instead.' }, 409)

        metadata = {
          selectedRole: body.selectedRole ?? null,
          selectedRoles: body.selectedRoles ?? [],
          city: body.city ?? null,
          name: body.name ?? null,
          phone,
        }
      } else {
        // resend
        if (!existing) return json({ error: 'No pending verification. Please sign up again.' }, 404)
        phone = existing.phone || normalizePhone(metadata?.phone || '')
        if (!phone) return json({ error: 'Phone missing — please sign up again.' }, 400)
      }

      const code = generateOtp()
      const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString()

      const upsertPayload: any = {
        email,
        phone,
        otp_code: code,
        expires_at: expiresAt,
        last_sent_at: new Date().toISOString(),
        attempt_count: 0,
        verified_at: null,
        consumed_at: null,
        metadata,
      }
      if (action === 'init' && password) upsertPayload.password = password

      const { error: upsertErr } = await supabase
        .from('signup_email_otps')
        .upsert(upsertPayload, { onConflict: 'email' })

      if (upsertErr) return json({ error: upsertErr.message }, 500)

      try {
        await sendSms(phone, code)
      } catch (e: any) {
        return json({ error: `Could not send SMS: ${e.message}` }, 502)
      }
      return json({ success: true, phoneMasked: phone.replace(/.(?=.{4})/g, '*'), expiresInMinutes: OTP_TTL_MIN })
    }

    if (action === 'verify') {
      const otp = String(body.otp || '').trim()
      if (!/^\d{6}$/.test(otp)) return json({ error: 'Invalid OTP' }, 400)

      const { data: rec } = await supabase
        .from('signup_email_otps')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (!rec) return json({ error: 'No pending verification found. Please sign up again.' }, 404)
      if (rec.consumed_at) return json({ error: 'This code was already used.' }, 400)
      if (new Date(rec.expires_at).getTime() < Date.now()) return json({ error: 'Code expired. Please request a new one.' }, 400)
      if ((rec.attempt_count ?? 0) >= MAX_ATTEMPTS) return json({ error: 'Too many attempts. Please request a new code.' }, 429)

      if (rec.otp_code !== otp) {
        await supabase
          .from('signup_email_otps')
          .update({ attempt_count: (rec.attempt_count ?? 0) + 1 })
          .eq('id', rec.id)
        return json({ error: 'Invalid OTP' }, 400)
      }

      const meta = (rec.metadata ?? {}) as any
      const { error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: rec.password,
        email_confirm: true,
        phone: rec.phone ?? meta.phone ?? undefined,
        user_metadata: {
          name: meta.name ?? null,
          phone: rec.phone ?? meta.phone ?? null,
          city: meta.city ?? null,
          selected_role: meta.selectedRole ?? null,
          selected_roles: meta.selectedRoles ?? [],
        },
      })

      if (createErr) {
        const msg = createErr.message || 'Failed to create account'
        if (!/already (registered|exists)/i.test(msg)) {
          return json({ error: msg }, 500)
        }
      }

      await supabase
        .from('signup_email_otps')
        .update({
          verified_at: new Date().toISOString(),
          consumed_at: new Date().toISOString(),
          password: null,
        })
        .eq('id', rec.id)

      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err: any) {
    console.error('signup-otp error', err)
    return json({ error: err?.message ?? 'Server error' }, 500)
  }
})
