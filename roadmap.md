# Roadmap — Agent Profile page rebuild

- [x] Migration: `agent_meeting_requests`, `agent_inquiries`, `agent_faqs` (grants + RLS)
- [x] `src/lib/agentProfile.ts` derivation helpers + tests (chips, trust items, stats, slots)
- [x] Rebuild `src/pages/AgentDetail.tsx` to reference layout (hero, stats, tabs, sidebar, properties, meeting dialog, contact gating)
- [x] Agent dashboard panel: meeting requests + inquiries + FAQ management
- [x] Verify: typecheck, tests (154 passed), build OK, Playwright (tabs, meeting dialog, no page errors)

## Separate HyperGuest page
- [x] Add connector-backed property listing and a link from Hotels, keeping test inventory separate.
- [ ] Verify loaded property, search, detail navigation and mobile layout.
