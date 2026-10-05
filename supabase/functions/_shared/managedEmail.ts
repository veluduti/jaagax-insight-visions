// Direct send through Lovable's managed email API for senders that build their
// own HTML at send time. Writes the same email_send_log rows the old queue did.
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.3.1'

const SENDER_DOMAIN = 'notify.jaagax.com'
const FROM_DOMAIN = 'jaagax.com'
const DEFAULT_FROM = `JAAGA X <noreply@${FROM_DOMAIN}>`

// deno-lint-ignore no-explicit-any
type Admin = { from: (t: string) => any }

export interface ManagedSendInput {
  to: string
  subject: string
  html: string
  text: string
  label: string
  idempotencyKey: string
  from?: string
}

export type ManagedSendResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

async function log(admin: Admin, row: Record<string, unknown>) {
  try {
    const { error } = await admin.from('email_send_log').insert(row)
    if (error) console.error('email_send_log insert failed', { code: error.code, message: error.message })
  } catch (e) {
    console.error('email_send_log insert threw', (e as Error).message)
  }
}

/** Throws on failure (after logging a 'failed' row). */
export async function sendManagedEmail(admin: Admin, input: ManagedSendInput): Promise<ManagedSendResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const base = { message_id: null, template_name: input.label, recipient_email: input.to }
  try {
    if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured')
    await sendLovableEmail(
      {
        to: input.to,
        from: input.from || DEFAULT_FROM,
        sender_domain: SENDER_DOMAIN,
        subject: input.subject,
        html: input.html,
        text: input.text,
        purpose: 'transactional',
        label: input.label,
        idempotency_key: input.idempotencyKey,
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await log(admin, { ...base, status: 'suppressed' })
      return { sent: false, reason: 'recipient_suppressed' }
    }
    await log(admin, { ...base, status: 'failed', error_message: (error as Error)?.message ?? 'send failed' })
    throw error
  }
  await log(admin, { ...base, status: 'sent' })
  return { sent: true }
}
