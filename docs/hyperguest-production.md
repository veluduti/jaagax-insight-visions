# HyperGuest production readiness

## Implemented
- Static content remains in supplier-mapped partner hotels/rooms without local stock or prices.
- Exact occupancy allocation shares physical room stock across repeated search entries and rate plans.
- One retail selector uses supplier-converted sell/BAR amounts atomically; no unconverted foreign-price fallback.
- Public standalone checkout excludes private and package-only rates.
- Authenticated pre-book creates a server-owned 15-minute quote; booking reads that snapshot, checks exact occupancy and supplier conditions, and uses its supplier expected prices.
- Quotes have a unique booking association so retries cannot silently create another reservation.
- Reservation lookup accepts documented arrays and legacy content/bookings responses; room status controls confirmation and partial/pending display.
- Cancellation previews call supplier simulation; confirmation requires the reviewed charge/currency and an actual cancelled response.
- Deadlines interpret offset-free supplier windows using the property's IANA timezone. Unknown timing never becomes a fabricated refundable promise.
- Customer retail totals, rate remarks and hotel-payable charges persist with the reservation and appear in printable confirmations.
- New request/response logging recursively redacts card numbers/CVV/tokens. Existing historical payloads are not rewritten.
- Managed content job rotates through approved IDs hourly and skips unchanged catalog timestamps. Pending reconciliation runs every ten minutes, processing three oldest pending/partial reservations per run within a 30-day lookback. Neither job books or cancels reservations.

## Remaining production dependencies
- Supplier agent-paid rates are explicitly blocked: card forwarding does not prove retail collection or settlement. An approved supplier payment arrangement and a verified collection/settlement/refund sequence are required before enabling them.
- Raw-card collection is retained from the existing connector for supported card-guaranteed pay-at-hotel rates. Hosted/tokenized collection and PCI scope must be confirmed with the supplier/payment provider; these changes do not certify PCI compliance.
- No real reservation, payment, cancellation or supplier on-request/partial confirmation was created during verification. Recovery/cancellation structures have unit coverage; a user-authorized live transaction is required to certify the full lifecycle.
- Extras are optional and not bookable here. Private/package distribution requires a separate authorized sales context.
- Historical booking timestamps and historical raw logs are preserved, not silently corrected.

## Verification
Focused Vitest rules cover child encoding, exact stock, BAR, conversion, public eligibility, settlement gating, age continuity, list shapes, room statuses and timezone/DST deadlines. Authenticated live supplier availability and persisted checkout quotes were verified without submitting a booking. Managed sync and reconcile callbacks both returned HTTP 200.