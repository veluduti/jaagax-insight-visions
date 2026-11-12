# HyperGuest production integration safeguards

## What will change
- Keep the existing imported hotels, JaagaX screens, supplier mappings and certified connector.
- Correct children’s search format and verify availability for every requested room, not just one matching rate.
- Show the same customer price throughout search, room selection, checkout and voucher; respect the supplier’s minimum public price and distinguish supplier settlement amounts.
- Preserve nationality and search context; exclude private/package-only rates from ordinary public hotel checkout.
- Recheck current supplier room/rate conditions before reservation creation rather than trusting browser-supplied amounts.
- Show pending, rejected and partial room confirmation accurately; repair reservation lookup and follow-up after uncertain responses.
- Use supplier cancellation simulation for charge previews, verify actual cancellation, and display deadlines in the hotel’s local timezone.
- Include hotel-payable fees and selected rate remarks in checkout and printable confirmations.
- Add incremental content synchronization, bounded rate-limit retries and scheduled follow-up using supported managed scheduling.

## Payment boundary
The existing supplier flow forwards a card as a reservation guarantee. It does not currently verify collection of the JaagaX customer total. Correct misleading payment labels and explicitly enforce supported supplier payment conditions. Do not enable supplier card charging, invent a settlement arrangement, or collect prepaid customer money without an approved reconciliation/refund flow. If supplier agent-paid rates require an account arrangement that cannot be verified, mark this as a named production blocker rather than claiming those rates are payment-ready.

## Technical details
- Extract shared, tested supplier pricing/occupancy/status/policy helpers used by the current function and frontend.
- Keep server-side authorization, input validation, idempotent references and sanitized supplier logging.
- Reuse current import tables and sync logs; add only necessary persisted quote/snapshot state if required for secure checkout.
- Preserve the supported `/2.0/` certified request formats; no blanket API-version migration.

## Verification
- Add concrete tests for child-age encoding, room counts, BAR limits, metadata/nationality continuity, statuses, cancellation deadlines and lookup response shapes.
- Check authenticated live hotel availability, room selection, checkout totals, disclosures and mobile layout.
- Do not create, charge or cancel real reservations during development. Actual paid booking certification remains unverified without an authorized transaction.