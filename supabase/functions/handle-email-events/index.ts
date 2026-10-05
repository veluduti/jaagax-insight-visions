import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.3.1'
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Notification-only record keeping; Lovable enforces suppression at send time.
async function record(
  recipient: string,
  reason: 'bounce' | 'complaint' | 'unsubscribe',
  logStatus: 'bounced' | 'complained' | 'suppressed',
  message: string,
  eventId: string,
) {
  const email = recipient.toLowerCase()
  const { error: supErr } = await admin
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (supErr) {
    console.error('suppressed_emails upsert failed', { code: supErr.code, message: supErr.message, event_id: eventId })
    throw new Error('suppressed_emails upsert failed')
  }
  const { error: logErr } = await admin.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: email,
    status: logStatus,
    error_message: message,
  })
  if (logErr) {
    console.error('email_send_log insert failed', { code: logErr.code, message: logErr.message, event_id: eventId })
    throw new Error('email_send_log insert failed')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record(event.data.recipient, 'bounce', 'bounced', 'Email bounced', event.event_id)
    },
    'email.complaint': async (event) => {
      await record(event.data.recipient, 'complaint', 'complained', 'Spam complaint received', event.event_id)
    },
    'email.unsubscribed': async (event) => {
      await record(event.data.recipient, 'unsubscribe', 'suppressed', 'Recipient unsubscribed', event.event_id)
    },
  },
})

Deno.serve((req) => handler(req))
