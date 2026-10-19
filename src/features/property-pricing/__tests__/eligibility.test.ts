import {describe, it, expect} from 'vitest';
import {canAddPropertyPricing} from '../eligibility';

describe('Property approval before adding pricing', () => {
  it('does not allow pricing immediately after posting', () => {
    expect(canAddPropertyPricing({lifecycle_status: 'pending_admin_review', verification_status: 'pending', is_live: false})).toBe(false);
  });
  it('does not treat intermediate verification as final admin approval', () => {
    expect(canAddPropertyPricing({lifecycle_status: 'pending_final_approval', verification_status: 'approved', is_live: false})).toBe(false);
  });
  it('allows pricing after the property is approved and live', () => {
    expect(canAddPropertyPricing({lifecycle_status: 'live_verified', verification_status: 'approved', is_live: true})).toBe(true);
    expect(canAddPropertyPricing({lifecycle_status: 'live', verification_status: 'approved', is_live: true})).toBe(true);
  });
  it('does not allow draft, rejected, sold or expired properties', () => {
    expect(canAddPropertyPricing({is_live: true, verification_status: 'approved', is_draft: true})).toBe(false);
    expect(canAddPropertyPricing({is_live: false, verification_status: 'rejected'})).toBe(false);
    expect(canAddPropertyPricing({is_live: true, verification_status: 'approved', is_sold: true})).toBe(false);
    expect(canAddPropertyPricing({is_live: true, verification_status: 'approved', expiry_date: '2026-10-18T00:00:00Z'}, Date.parse('2026-10-19T00:00:00Z'))).toBe(false);
  });
});