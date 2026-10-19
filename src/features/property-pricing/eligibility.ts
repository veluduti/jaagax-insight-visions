export interface PricingEligibility {
  verification_status?: string | null;
  lifecycle_status?: string | null;
  is_live?: boolean | null;
  is_draft?: boolean | null;
  is_sold?: boolean | null;
  expiry_date?: string | null;
}

export function canAddPropertyPricing(property: PricingEligibility, now = Date.now()): boolean {
  return property.is_live === true && property.is_draft !== true && property.is_sold !== true
    && (property.verification_status === 'approved' || ['live', 'live_verified'].includes(property.lifecycle_status ?? ''))
    && (!property.expiry_date || Date.parse(property.expiry_date) > now);
}