# Roadmap — Agent Profile page rebuild

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
