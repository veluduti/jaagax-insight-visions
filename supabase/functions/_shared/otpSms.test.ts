import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendOtpSms, smsFailure } from './otpSms';
const config = { sid: 'test-account', token: 'test-token', from: '+15005550006' };
afterEach(() => vi.restoreAllMocks());
describe('OTP SMS delivery failures', () => {
  it.each([[21608, 'trial_recipient'], [21408, 'geo_permission'], [20003, 'credentials'], [21606, 'sender'], [21211, 'recipient'], [21611, 'billing'], [20429, 'rate_limit']])('classifies provider code %s', (code, reason) => {
    expect(smsFailure(Number(code)).reason).toBe(reason);
  });
  it('rejects a WhatsApp sender without sending', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(sendOtpSms('+15005550009', 'test code', { ...config, from: 'whatsapp:+15005550006' })).rejects.toMatchObject({ reason: 'sender' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('returns trial restriction without logging provider personal data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 21608, message: 'private provider details' }), { status: 400 }));
    await expect(sendOtpSms('+15005550009', 'test code', config)).rejects.toMatchObject({ reason: 'trial_recipient' });
    expect(console.error).toHaveBeenCalledWith('OTP SMS rejected', { status: 400, code: 21608, reason: 'trial_recipient' });
  });
  it('does not treat a failed message as sent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ sid: 'test-message', status: 'failed', error_code: 21606 })));
    await expect(sendOtpSms('+15005550009', 'test code', config)).rejects.toMatchObject({ reason: 'sender' });
  });
  it('recognizes queued delivery', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ sid: 'test-message', status: 'queued' })));
    await expect(sendOtpSms('+15005550009', 'test code', config)).resolves.toBeUndefined();
    expect((fetchSpy.mock.calls[0]?.[1]?.body as URLSearchParams).get('To')).toBe('+15005550009');
  });
});
