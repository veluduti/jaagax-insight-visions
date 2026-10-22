import { describe, expect, it } from 'vitest';
import { chargeWithGst, requiredWalletTopUp } from '../platformCharges';

describe('Posting and monthly agent charges', () => {
  it('charges ₹300 plus 18% GST for a paid property post', () => {
    expect(chargeWithGst(300, 18)).toEqual({ gst: 54, total: 354 });
  });
  it('charges ₹1999 plus 18% GST for the monthly agent subscription', () => {
    expect(chargeWithGst(1999, 18)).toEqual({ gst: 359.82, total: 2358.82 });
  });
  it('preserves subscription paise at payment without rounding to ₹2359', () => {
    expect(requiredWalletTopUp(chargeWithGst(1999, 18).total)).toBe(2358.82);
    expect(requiredWalletTopUp(2358.82, 100)).toBe(2258.82);
    expect(requiredWalletTopUp(2358.82, 2358.82)).toBe(0);
  });
});