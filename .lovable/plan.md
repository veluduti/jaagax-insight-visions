
# Service-Layer Refactor Plan

The codebase has 200+ components/pages with direct Supabase calls. A full one-shot refactor is risky — it would touch nearly every file, balloon the diff, and very likely break routing/auth/realtime in subtle ways. I'll do this **incrementally and safely** in clearly scoped phases. UI, design, and behavior stay identical.

## Target Architecture

```text
UI Component  ──▶  React Query hook (src/hooks/queries/*)
                        │
                        ▼
                Service (src/services/*)   ← all Supabase + business logic
                        │
                        ▼
                supabase client / edge functions
```

Rules going forward:
- Components: render + minimal UI state only. No `supabase.from(...)` calls.
- Hooks (`useXxxQuery`, `useXxxMutation`): wrap services with React Query.
- Services: pure async functions, return typed data, throw on error. No React.

## Phase 1 — Foundation (this PR)

Ship the scaffolding + 2 reference migrations so the pattern is locked in.

1. Create `src/services/` with:
   - `supabaseClient.ts` (re-export + helpers)
   - `types.ts` (shared DTOs)
   - `authService.ts` — sign in/up, OTP init/verify, sign out, role resolution
   - `propertyService.ts` — list, getById/slug, search nearby, partial/featured filters
   - `bookingService.ts` — visit + hotel bookings
   - `dashboardService.ts` — buyer/agent/builder/admin aggregations
   - `searchService.ts` — text + filter search, autocomplete
   - `aiService.ts` — edge-function wrappers (advisor, decision, suggest, etc.)
   - `notificationService.ts` — list, mark read, subscribe
2. Create `src/hooks/queries/` with React Query hooks per service.
3. Migrate two reference modules end-to-end as the template:
   - `FeaturedProperties.tsx` + `PartialProperties.tsx` → `propertyService` + `useFeaturedProperties` / `usePartialProperties`
   - `useAuth.tsx` internals → `authService` (signature unchanged)
4. Remove duplicated property-row normalization into `propertyService` (uses existing `publicPropertyView` + `classifyProperty`).

## Phase 2 — Page migrations (follow-up PRs)

Migrate by domain, one batch per turn, keeping each batch shippable:
- Buyer dashboard + bookings + favorites
- Agent dashboard + visits + verification
- Builder dashboard + projects + promotions
- Admin panels
- Search / Map / Reels
- Hotels module

Each page swaps inline `supabase.from(...)` for the corresponding hook. No UI/JSX changes.

## Phase 3 — Cleanup

- Delete now-unused inline fetchers
- Add ESLint rule forbidding `supabase.from` outside `src/services/**`
- Document the pattern in `README.md`

## Why phased

Doing all of Phase 2 in a single response would mean editing 100+ files blind and almost certainly breaking realtime subscriptions, RLS-dependent queries, and auth flows. Phase 1 lands the architecture and a working template; subsequent turns migrate domains with the existing app fully functional in between.

## Non-goals (explicit)

- No UI/CSS changes
- No routing changes
- No schema/RLS changes
- No edge-function changes
- No new dependencies (React Query is already in the project)

Confirm and I'll execute Phase 1.
