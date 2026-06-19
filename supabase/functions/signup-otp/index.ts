import { createClient } from 'npm:@supabase/supabase-js@2'

const SENDER_DOMAIN = 'notify.jaagax.com'
const FROM_EMAIL = `JAAGA X <noreply@${SENDER_DOMAIN}>`

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

function otpHtml(code: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#ffffff;padding:32px;color:#0f172a">
    <div style="max-width:480px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:32px">
      <h2 style="margin:0 0 8px;color:#0f172a">Verify your email</h2>
      <p style="color:#475569;margin:0 0 24px">Use this 6-digit code to finish signing up for JAAGA X. It expires in ${OTP_TTL_MIN} minutes.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#f1f5f9;border-radius:8px;padding:16px 0;color:#0f172a">${code}</div>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
    </div></body></html>`
}

async function enqueueOtpEmail(
  supabase: ReturnType<typeof createClient>,
  toEmail: string,
  code: string,
) {
  const messageId = crypto.randomUUID()
  const html = otpHtml(code)
  const text = `Your JAAGA X verification code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`

  // Log pending BEFORE enqueue so we have a record even if enqueue crashes
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'signup-otp',
    recipient_email: toEmail,
    status: 'pending',
  })

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'auth_emails',
    payload: {
      message_id: messageId,
      to: toEmail,
      from: FROM_EMAIL,
      sender_domain: SENDER_DOMAIN,
      subject: `Your JAAGA X verification code: ${code}`,
      html,
      text,
      purpose: 'auth',
      label: 'signup-otp',
      idempotency_key: messageId,
      queued_at: new Date().toISOString(),
    },
  })


  if (error) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'signup-otp',
      recipient_email: toEmail,
      status: 'failed',
      error_message: error.message ?? 'enqueue failed',
    })
    throw new Error(error.message || 'Failed to queue verification email')
  }
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

      if (existing?.last_sent_at) {
        const elapsed = (Date.now() - new Date(existing.last_sent_at as string).getTime()) / 1000
        if (elapsed < RESEND_COOLDOWN_SEC) {
          return json({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - elapsed)}s before requesting a new code` }, 429)
        }
      }

      let password: string | null = null
      let metadata: any = (existing as any)?.metadata ?? {}
      let phone: string = ((existing as any)?.phone as string) ?? metadata?.phone ?? ''

      if (action === 'init') {
        password = body.password ? String(body.password) : null
        if (!password) return json({ error: 'Password required' }, 400)

        // Capture phone for profile only — NOT verified via OTP
        phone = String(body.phone || '').trim()

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
      } else if (!existing) {
        return json({ error: 'No pending verification. Please sign up again.' }, 404)
      }

      const code = generateOtp()
      const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString()

      const upsertPayload: any = {
        email,
        phone: phone || null,
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
        await enqueueOtpEmail(supabase, email, code)
      } catch (err: any) {
        console.error('Email OTP enqueue failed:', err)
        return json({ error: err?.message || 'Could not deliver OTP email' }, 502)
      }

      return json({
        success: true,
        emailSent: true,
        expiresInMinutes: OTP_TTL_MIN,
      })
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
      if ((rec as any).consumed_at) return json({ error: 'This code was already used.' }, 400)
      if (new Date((rec as any).expires_at).getTime() < Date.now()) return json({ error: 'Code expired. Please request a new one.' }, 400)
      if (((rec as any).attempt_count ?? 0) >= MAX_ATTEMPTS) return json({ error: 'Too many attempts. Please request a new code.' }, 429)

      if ((rec as any).otp_code !== otp) {
        await supabase
          .from('signup_email_otps')
          .update({ attempt_count: ((rec as any).attempt_count ?? 0) + 1 })
          .eq('id', (rec as any).id)
        return json({ error: 'Invalid OTP' }, 400)
      }

      const meta = ((rec as any).metadata ?? {}) as any
      const { error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: (rec as any).password,
        email_confirm: true,
        user_metadata: {
          name: meta.name ?? null,
          phone: (rec as any).phone ?? meta.phone ?? null,
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
        .eq('id', (rec as any).id)

      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err: any) {
    console.error('signup-otp error', err)
    return json({ error: err?.message ?? 'Server error' }, 500)
  }
})
