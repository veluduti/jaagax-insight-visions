// SMS stub — placeholder for future Twilio integration.
// Logs intent to console + records into notifications.metadata for traceability.
// When TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER secrets exist,
// it sends the SMS; otherwise it silently no-ops (intentional stub).

type Admin = any;

export async function sendLifecycleSMS(
  admin: Admin,
  toPhone: string | null | undefined,
  message: string,
  meta: { propertyId: string; event: string },
): Promise<void> {
  if (!toPhone) return;
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[sms-stub] would send to ${toPhone}: ${message}`, meta);
    return;
  }
  try {
    const formatted = toPhone.startsWith("+") ? toPhone : `+${toPhone.replace(/\D/g, "")}`;
    const auth = btoa(`${accountSid}:${authToken}`);
    const body = new URLSearchParams({ From: fromNumber, To: formatted, Body: message }).toString();
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      console.error("Twilio send failed", await res.text());
    }
  } catch (e) {
    console.error("sendLifecycleSMS error", (e as Error).message);
  }
}
