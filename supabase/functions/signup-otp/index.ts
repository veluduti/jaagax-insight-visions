import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'JAAGA X'
const SENDER_DOMAIN = 'notify.jaagax.com'
const ROOT_DOMAIN = 'jaagax.com'
const FROM_DOMAIN = 'notify.jaagax.com'
const OTP_TTL_MIN = 5
const RESEND_COOLDOWN_SEC = 30

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

async function sendOtpEmail(supabase: any, email: string, code: string) {
  const html = await renderAsync(
    React.createElement(SignupEmail, {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient: email,
      confirmationUrl: `https://${ROOT_DOMAIN}`,
      token: code,
    }),
  )
  const text = await renderAsync(
    React.createElement(SignupEmail, {
      siteName: SITE_NAME,
      siteUrl: `https://${ROOT_DOMAIN}`,
      recipient: email,
      confirmationUrl: `https://${ROOT_DOMAIN}`,
      token: code,
    }),
    { plainText: true },
  )
  const messageId = crypto.randomUUID()
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'signup',
    recipient_email: email,
    status: 'pending',
  })
  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      run_id: crypto.randomUUID(),
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: `Your ${SITE_NAME} verification code: ${code}`,
      html,
      text,
      purpose: 'transactional',
      label: 'signup',
      queued_at: new Date().toISOString(),
    },
  })
  if (error) throw new Error(`enqueue failed: ${error.message}`)
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
      const password = body.password ? String(body.password) : null
      // For init we require password; for resend we look up existing record
      const { data: existing } = await supabase
        .from('signup_email_otps')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      // Cooldown check
      if (existing?.last_sent_at) {
        const elapsed = (Date.now() - new Date(existing.last_sent_at).getTime()) / 1000
        if (elapsed < RESEND_COOLDOWN_SEC) {
          return json({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - elapsed)}s before requesting a new code` }, 429)
        }
      }

      if (action === 'init') {
        if (!password) return json({ error: 'Password required' }, 400)
        // Check if email already registered in auth
        const { data: list } = await supabase.auth.admin.listUsers()
        const taken = list?.users?.some((u: any) => u.email?.toLowerCase() === email && u.email_confirmed_at)
        if (taken) return json({ error: 'This email is already registered. Please log in instead.' }, 409)
      }

      const code = generateOtp()
      const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString()

      const metadata = action === 'init' ? {
        selectedRole: body.selectedRole ?? null,
        selectedRoles: body.selectedRoles ?? [],
        city: body.city ?? null,
        name: body.name ?? null,
        phone: body.phone ?? null,
      } : (existing?.metadata ?? {})

      const upsertPayload: any = {
        email,
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

      await sendOtpEmail(supabase, email, code)
      return json({ success: true, expiresInMinutes: OTP_TTL_MIN })
    }

    if (action === 'verify') {
      const otp = String(body.otp || '').trim()
      if (!/^\d{6}$/.test(otp)) return json({ error: 'Enter the 6-digit code' }, 400)

      const { data: rec } = await supabase
        .from('signup_email_otps')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (!rec) return json({ error: 'No pending verification found. Please sign up again.' }, 404)
      if (rec.consumed_at) return json({ error: 'This code was already used.' }, 400)
      if (new Date(rec.expires_at).getTime() < Date.now()) return json({ error: 'Code expired. Please request a new one.' }, 400)
      if ((rec.attempt_count ?? 0) >= 5) return json({ error: 'Too many attempts. Please request a new code.' }, 429)

      if (rec.otp_code !== otp) {
        await supabase
          .from('signup_email_otps')
          .update({ attempt_count: (rec.attempt_count ?? 0) + 1 })
          .eq('id', rec.id)
        return json({ error: 'Incorrect code.' }, 400)
      }

      // Create the auth user with email confirmed
      const meta = (rec.metadata ?? {}) as any
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: rec.password,
        email_confirm: true,
        user_metadata: {
          name: meta.name ?? null,
          phone: meta.phone ?? null,
          city: meta.city ?? null,
          selected_role: meta.selectedRole ?? null,
          selected_roles: meta.selectedRoles ?? [],
        },
      })

      if (createErr || !created?.user) {
        // If user already exists, treat as success (idempotent)
        const msg = createErr?.message || 'Failed to create account'
        if (!/already (registered|exists)/i.test(msg)) {
          return json({ error: msg }, 500)
        }
      }

      await supabase
        .from('signup_email_otps')
        .update({
          verified_at: new Date().toISOString(),
          consumed_at: new Date().toISOString(),
          password: null, // wipe password after use
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
