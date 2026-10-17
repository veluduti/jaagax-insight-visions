export class OtpSmsError extends Error {
  constructor(public readonly reason: string, message: string) {
    super(message);
    this.name = 'OtpSmsError';
  }
}

export function smsFailure(code: number): OtpSmsError {
  switch (code) {
    case 20003: case 20005:
      return new OtpSmsError('credentials', 'SMS service credentials need updating. Please contact JAAGA X support.');
    case 21608:
      return new OtpSmsError('trial_recipient', 'The SMS service is in trial mode and cannot send to this number yet. JAAGA X must verify the recipient in Twilio or upgrade its SMS account.');
    case 21408:
      return new OtpSmsError('geo_permission', 'SMS delivery is not enabled for this country. Please contact JAAGA X support.');
    case 21212: case 21606: case 21659:
      return new OtpSmsError('sender', 'The configured sender cannot send verification SMS. Please contact JAAGA X support.');
    case 21211: case 21614:
      return new OtpSmsError('recipient', 'This number cannot receive SMS. Check the country and mobile number, then try again.');
    case 21610:
      return new OtpSmsError('recipient', 'This number has opted out of messages. Re-enable messages from the sender before requesting an OTP.');
    case 20006: case 21611: case 30002:
      return new OtpSmsError('billing', 'The SMS account has an account or spending restriction. Please contact JAAGA X support.');
    case 20429:
      return new OtpSmsError('rate_limit', 'The SMS service is busy. Please wait a minute and try again.');
    default:
      return new OtpSmsError('delivery', 'The SMS provider could not send your code. Please try again later or contact JAAGA X support.');
  }
}

/** Never log credentials, recipients or OTP bodies. */
export async function sendOtpSms(to: string, body: string, config: { sid?: string; token?: string; from?: string }): Promise<void> {
  const { sid, token, from } = config;
  if (!sid || !token || !from) throw new OtpSmsError('configuration', 'SMS verification is not configured. Please contact JAAGA X support.');
  if (!/^\+[1-9]\d{7,14}$/.test(from.trim())) throw new OtpSmsError('sender', 'The configured sender is not a valid SMS number. Please contact JAAGA X support.');
  let response: Response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from.trim(), Body: body }),
    });
  } catch {
    throw new OtpSmsError('delivery', 'The SMS service could not be reached. Please try again later.');
  }
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    const code = Number(failure?.code) || 0;
    const error = smsFailure(code);
    console.error('OTP SMS rejected', { status: response.status, code, reason: error.reason });
    throw error;
  }
  const result = await response.json().catch(() => null);
  if (!result?.sid || ['failed', 'undelivered', 'canceled'].includes(result.status)) throw smsFailure(Number(result?.error_code) || 0);
}
