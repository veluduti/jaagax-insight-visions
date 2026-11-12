# Roadmap — Agent Profile page rebuild

## HyperGuest production safeguards
- [x] Correct child occupancy, customer pricing/BAR, rate eligibility and nationality/currency continuity.
- [x] Validate bookings against server-owned quotes and current supplier conditions; clarify card guarantees versus collection and block unconfigured prepaid settlement.
- [x] Repair recovery, per-room statuses, cancellation simulation/timezones, and persisted voucher disclosures; no actual cancellation performed.
- [x] Add incremental synchronization/retries and authenticated managed schedules; sync and reconcile callbacks returned HTTP 200.
- [x] 38 focused tests passed; deployed connector and authenticated live hotel availability-to-persisted-quote/payment screen verified; mobile has no overflow or page errors. No reservation made.
- [ ] Supplier prepaid settlement: requires confirmed commercial payment arrangement; never assume card forwarding collects the customer total.

## Reference Properties marketplace
- [x] Match the supplied property listing reference using existing search, details and posting workflows.
- [x] Connect dynamic filters, counts, sorting, views, pagination, saved-coordinate map and favorites without changing role permissions.
- [x] Verify real listings, authenticated favorites with reload/restore, combined filters, new-tab details, sign-in return and desktop/695px/390px layouts; no runtime errors. Role workflows reviewed, not re-executed.
- [ ] Actual property map markers: all four live listings lack saved coordinates; requires owners/agents to save actual locations, never fabricated pins.

## Strict hotel search and matching checkout
- [x] Show only hotels matching all selected filters and the requested available room count; no partial matches or guessed stock. Restore hotel room access by replacing the admin check's missing roles dependency with existing global admin scopes.
- [x] Match regular JaagaX guest/payment screens to HyperGuest presentation while preserving Razorpay and native booking confirmation.
- [x] Verified native one-room result, two-room empty result, missing Pool empty result, native and supplier authenticated guest-to-payment navigation, mobile no-overflow, 13 regression tests and SQL authorization checks. No payment or reservation made.

## Hotel search-to-booking continuity
- [x] Preserve search dates, guests and rooms in regular and supplier hotel details, including redirects and sign-in.
- [x] Align supplier hotel details and checkout with JaagaX presentation; automatically load rooms and make search changes optional.
- [x] Verify real availability, search-result links, supplier redirects, authenticated final-price/guest/payment navigation and mobile no-overflow; nine tests passed. No paid booking created.

## HyperGuest Marketplace import
- [x] Reuse existing static/search/pre-book/booking connector and inspect real supplier content.
- [x] Add unique property/room mapping, safe synchronization, admin controls and logs for the requested 17 hotels.
- [x] Integrate imported inventory with existing customer filters, maps, details and live availability.
- [x] Separate ordinary marketplace bookings from certification-only restrictions without changing supplier/payment handling.
- [x] Import actual data; verify authenticated admin management, customer results and final-price checkout, 22 regression tests and mobile no-overflow. All 17 imported plus 3 preserved live hotels, 61 room types, no local stock/prices.
- [ ] Chargeable booking/confirmation and published map verification: require user-authorized payment and an authorized map origin; no reservation created during development.

- [x] Migration: `agent_meeting_requests`, `agent_inquiries`, `agent_faqs` (grants + RLS)
- [x] `src/lib/agentProfile.ts` derivation helpers + tests (chips, trust items, stats, slots)
- [x] Rebuild `src/pages/AgentDetail.tsx` to reference layout (hero, stats, tabs, sidebar, properties, meeting dialog, contact gating)
- [x] Agent dashboard panel: meeting requests + inquiries + FAQ management
- [x] Verify: typecheck, tests (154 passed), build OK, Playwright (tabs, meeting dialog, no page errors)

## Separate HyperGuest page
- [x] Add connector-backed property listing and a link from Hotels, keeping test inventory separate.
- [x] Verify loaded property, search, detail navigation and mobile layout (live connector response, no page errors or mobile overflow; build OK).
