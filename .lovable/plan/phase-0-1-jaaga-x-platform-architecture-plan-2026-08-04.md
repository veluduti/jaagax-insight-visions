# Phase 0.1 — JAAGA X Platform Architecture Plan

No code changes in this phase. This document is the blueprint that later phases implement against.

---

## 1. Current project analysis

### 1.1 Folder structure (as-is)
```text
src/
  ai/                promptBuilder.ts, responseFormatter.ts
  components/        190+ files, 35 domain folders (admin, agent, builder, buyer,
                     seller, hotels, property, visit, notifications, shared, ui, widgets...)
  config/            propertyFieldsConfig.ts, propertyFlows/*
  contexts/          AdminScopeFilter, Location, Profile, ProfileBoot, Wallet
  data/              indianCities, locationData, projectData
  engines/           conversationEngine, extractor, ruleEngine, nextQuestionResolver...
  features/          buyer/*, natural-living/*
  hooks/             ~30 hooks + hooks/queries/* (React Query layer)
  integrations/      supabase/client.ts + types.ts, lovable/
  lib/               utils, roleAccess, supabaseHelper, savedLocation, googleMaps...
  pages/             ~200 page components (flat + natural-living/, partners/, financial/, public/)
  services/          18 services (auth, property, booking, dashboard, notification, ai...)
  store/             conversationStore.ts
  utils/             seeders, brochure generator
supabase/functions/  ~90 edge functions
```
Documented architecture is **2.5-tier**: UI -> React Query hook -> service -> Supabase, with edge functions for secure/complex logic.

Pain points: `pages/` is flat and mixes verticals; `components/` folders are domain-shaped but inconsistent; some pages call Supabase directly instead of going through services; `App.tsx` holds 189 route declarations inline.

### 1.2 Authentication (as-is)
- Supabase (Lovable Cloud) auth, client at `src/integrations/supabase/client.ts`.
- `src/pages/Auth.tsx` — email/password + phone OTP + reset.
- `src/pages/Register.tsx` + edge function `register-otp` — mobile OTP verified **before** account creation, then default role `customer`.
- `src/hooks/useAuth.tsx` — session listener, role resolution, dashboard redirect map.
- `src/lib/authRoleResolver.ts` — `user_roles` -> priority pick -> fallback to `signup_requests.requested_role` -> override by active profile type from `localStorage` (`jaagax.activeProfileId`), admin always wins.
- Natural Living has a parallel `useNLAuth` + `NLProtectedRoute`.
- Partners/hotel has its own login pages (`pages/partners/PartnerLogin.tsx`).

### 1.3 Dashboards (as-is)
Buyer, Seller, Agent, Builder, Financial, Hotel Partner, Admin (+ country/state/district sub-admin), NL Dashboard / Land Owner Portal. Each is a bespoke page with hand-rolled sections; no shared dashboard shell or widget contract. Layout duplication is the main cost.

### 1.4 Routing (as-is)
Single `src/App.tsx`, ~189 `<Route>` entries, `BrowserRouter`, lazy loading via `lazyWithRetry`. Guards: `ProtectedRoute allowedRole=...` (single role only), `NLProtectedRoute`, `BuyerOnboardingGuard`. Admin sub-pages increasingly use query-param tabs (`/admin?tab=nl-land`) with legacy paths redirecting.

### 1.5 Role system (as-is)
- DB: `user_roles` (user_id, role), `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `admin_scopes`; helpers `is_admin()`, `has_permission()`, `has_role()`, `admin_can_view_scope()`.
- App: `AppUserRole` union in `authRoleResolver.ts`, priority array, self-assignable set.
- UI feature gating: `src/lib/roleAccess.ts` static map (4 roles x 8 feature keys).
- `profiles` table enables multi-profile switching (a user can be buyer + agent + builder).
Gap: three parallel sources of truth (TS union, `roleAccess` map, DB tables) that must be edited together.

### 1.6 Notification system (as-is)
`notifications` table (8 RLS policies), `notification_preferences`, `notification_channels`, `alert_preferences`, plus email plumbing (`email_send_log`, `email_send_state`, `enqueue_email`, `email_queue_dispatch`, `suppressed_emails`). Edge function `create-notification`. Client: `notificationService.ts` + `useNotifications` + `NotificationBell` / `NotificationList`. WhatsApp via Twilio hub. Gaps: no formal category taxonomy, no push, no unified history page.

### 1.7 AI services (as-is)
~25 `ai-*` edge functions plus `nl-land-agent`, using Lovable AI Gateway. Client side: `services/aiService.ts`, `hooks/useAI.ts`, `useAICall.ts`, `src/ai/promptBuilder.ts`, `src/engines/*` (conversation engine, extractor, rule engine, next-question resolver), `store/conversationStore.ts`. Gaps: prompts are scattered inside each edge function; each agent (land, sell-property, advisor) re-implements its own conversation loop.

---

## 2. Proposed folder architecture

```text
src/
  app/                       NEW  routes/, providers/, layouts/ (App.tsx becomes a thin shell)
    routes/                  NEW  route table split by area: public, auth, dashboard, nl, admin
    providers/               NEW  composed providers (query, auth, location, profile, theme)
    layouts/                 NEW  PublicLayout, AuthLayout, DashboardLayout, AdminLayout, NLLayout(re-export)
  core/                      NEW  cross-cutting primitives
    auth/                    NEW  session, guards, role resolution (moves from lib/hooks)
    rbac/                    NEW  roles.config.ts, permissions.config.ts, useCan()
    nav/                     NEW  menu registry + menu.config.ts
    notifications/           NEW  category registry, channel dispatch client
    ai/                      NEW  agent registry, conversation framework, prompt catalogue
  features/                  REUSE + EXPAND: one folder per vertical
    buyer/ seller/ agent/ builder/ admin/ hotels/ financial/ natural-living/ property/
      each: components/  hooks/  services/  types.ts  routes.tsx  widgets/
  components/                REUSE
    ui/                      UNTOUCHED (shadcn)
    shared/                  REUSE + expand (design-system primitives)
  hooks/  services/  lib/  contexts/   REUSE (gradually thinned as code moves into features/)
  pages/                     REUSE, shrinking: pages become thin wrappers over feature screens
  integrations/              UNTOUCHED (auto-generated)
supabase/functions/          REUSE + new: notify-dispatch, ai-agent-run
```

- **New**: `src/app/**`, `src/core/**`, per-feature `routes.tsx` and `widgets/`.
- **Reused/refactored**: `features/`, `components/shared`, `hooks/queries`, `services/`, `pages/`.
- **Untouched**: `src/components/ui`, `src/integrations/**`, `src/index.css` tokens, existing edge functions not named above.

Rule: nothing is deleted in the refactor; old paths re-export from new locations until every import is migrated.

---

## 3. Route architecture

| Group | Prefix | Guard | Layout |
|---|---|---|---|
| Public | `/`, `/property/*`, `/projects`, `/agents`, `/communities`, `/transactions`, `/events`, `/guides`, `/map`, `/hotels` | none | PublicLayout |
| Auth | `/auth`, `/register`, `/verify-otp`, `/select-profile`, `/onboarding/*`, `/reset-password` | redirect if already signed in | AuthLayout |
| Dashboard | `/dashboard`, `/dashboard/:role/*` | `RequireAuth` + `RequireRole` | DashboardLayout |
| Natural Living | `/natural-living/*` | public pages open; `/natural-living/list-land`, `/my-*` need `RequireAuth` | NLLayout |
| Admin | `/admin`, `/admin/*` (tabs via `?tab=`) | `RequireAuth` + `RequireAnyRole([admin, country/state/district_admin])` + scope filter | AdminLayout |
| Partners | `/partners/*` | partner session guard | DashboardLayout (partner variant) |

Guards (all in `core/auth/guards`):
- `RequireAuth` — session or redirect to `/auth?next=<path>`.
- `RequireRole` / `RequireAnyRole` — replaces today's single-role `ProtectedRoute`; `ProtectedRoute` kept as a wrapper for backward compatibility.
- `RequirePermission` — permission-key based, backed by `role_permissions`.
- `RequireProfileComplete`, `RequireOnboarding` — existing buyer onboarding gate generalised.
- `RequireScope` — district/state/country admin scope check via `admin_can_view_scope()`.

Redirect strategy: `/dashboard` resolves the active profile and forwards to the role dashboard; unauthorised role -> `/dashboard` (never a dead end); unauthenticated -> `/auth` with `next` preserved (must be a same-origin path); legacy paths keep `<Navigate replace>` entries in a single `legacyRedirects.ts`.

---

## 4. Layout architecture

- **PublicLayout** — global `Navigation`, optional hero slot, `Footer`, SEO defaults.
- **AuthLayout** — centred card, brand panel, no nav chrome.
- **DashboardLayout** — collapsible sidebar + top bar (search, notifications, profile switcher) + content container + right rail slot; mobile: drawer sidebar + bottom tab bar.
- **AdminLayout** — DashboardLayout plus scope filter bar and admin tab strip.
- **NLLayout** — existing thin identity bar + NL nav; kept and re-exported.
- **MobileLayout behaviour** — one breakpoint contract (`< lg` = mobile): sidebar becomes drawer, tables become cards, sticky bottom nav (max 5 items), full-height chat surfaces use `100dvh`.

Every layout renders `<Outlet />` so route groups nest cleanly.

---

## 5. Navigation architecture

- **Menu registry** (`core/nav`): each feature calls `registerMenu({ id, label, icon, to, group, roles, permissions, order, badgeSelector })`. Sidebar, mobile drawer, and command palette all render from the registry — no hardcoded menu arrays.
- **Sidebar** — grouped sections (Overview, Work, Growth, Settings), collapsible, active-route highlight, per-item badge counts.
- **Header** — breadcrumbs, global search, location pill, notification bell, profile switcher.
- **Mobile navigation** — bottom bar with the top 4 role items + "More" sheet.
- **Breadcrumbs** — derived from route `handle: { crumb }` metadata, not string parsing.
- **Dynamic registration** — menus filtered by `useCan()` so a role/permission change instantly changes navigation.

---

## 6. Config-driven roles & permissions

Existing tables reused: `roles`, `permissions`, `role_permissions`, `user_roles`, `user_role_assignments`, `admin_scopes`, `profiles`.

Additions:
- `permissions.key` standardised as `resource.action` (e.g. `property.approve`, `land.review`).
- `role_permissions` seeded for every current implicit rule extracted from `roleAccess.ts` and hardcoded checks.
- Optional `feature_flags` reuse for `optional` features.

Client: `core/rbac/roles.config.ts` (role metadata: label, dashboard path, colour, default menu) + `useCan(permissionKey)` backed by a cached fetch of the user's effective permissions. `roleAccess.ts` becomes a thin adapter over `useCan` so existing call sites keep working.

Backward compatibility: `user_roles` stays authoritative; the TS union stays exported; nothing breaks if a permission row is missing (fallback = current hardcoded behaviour, logged in dev).

Migration strategy: additive only — seed permissions, backfill `role_permissions`, no destructive changes; deprecated code paths removed only after every consumer is migrated.

---

## 7. Dashboard framework

- **Widget contract**: `{ id, title, roles, permissions, size: 'sm'|'md'|'lg'|'full', priority, component, dataHook?, emptyState }`.
- **Registry**: `registerWidget()` per feature; `DashboardGrid` resolves visible widgets for the active role/permissions and renders a responsive 12-column grid (1 col mobile).
- **Per-role dashboards** become a config array of widget ids + order, not bespoke JSX. Existing dashboard sections are wrapped as widgets first, then simplified.
- Optional later: user-reorderable layout persisted in `user_settings`.

---

## 8. AI architecture

- **Service layer**: single `core/ai/aiClient.ts` (invoke edge function, stream, retry, error normalise). `services/aiService.ts` re-exports from it.
- **Agent registry**: `registerAgent({ id, schema, systemPrompt, tools, persistence })` — Land Agent, Sell Property Agent, Property Advisor, Farmer Assistant all become registered agents.
- **Conversation framework**: shared `useAgentConversation()` (message list, streaming, extraction merge, autosave, resume, progress %) generalised from the land-agent implementation; shared `AgentChatShell` UI (fixed `100dvh`, scrollable transcript, chips attached to the question bubble, upload dropzone).
- **Prompt organisation**: `core/ai/prompts/<agent>/{system,extraction,question,summary}.ts`, versioned, imported by edge functions via `_shared` where server-side.
- Model default: Lovable AI Gateway, `google/gemini-3-flash-preview` for extraction/chat.

---

## 9. Notification architecture

- **Categories** (enum + registry): `system`, `property`, `visit`, `booking`, `land`, `kyc`, `payment`, `lead`, `marketing`.
- **In-app**: `notifications` table (existing) + realtime subscription; bell with per-category filter and unread counts.
- **Email**: existing `enqueue_email` / `email_queue_dispatch` pipeline, templates per category.
- **Push-ready**: `notification_channels` extended with `web_push`; a `push_subscriptions` table and service-worker hook are designed now, implemented later.
- **Dispatch**: one edge function `notify-dispatch({ userId, category, template, data, channels })` respecting `notification_preferences`; `create-notification` becomes a thin caller.
- **History**: `/dashboard/notifications` page with category filter, read/unread, date grouping, pagination.

---

## 10. Shared component library

`components/shared` grows into the internal design system: `PageHeader`, `SectionCard`, `StatTile`, `DataTable` (mobile card fallback), `EmptyState`, `ErrorState`, `Skeletons`, `ConfirmDialog`, `FileDropzone`, `LocationPicker`, `RoleBadge`, `StatusPill`, `Money`, `DateRangePicker`, `AgentChatShell`. All styled with existing semantic tokens — no hardcoded colours.

---

## 11. Database changes (all additive)

1. Seed `permissions` with `resource.action` keys; backfill `role_permissions` per role.
2. `notifications.category` (text, default `system`) + index on `(user_id, read, created_at)`.
3. `notification_preferences`: per-category channel matrix (jsonb).
4. New `push_subscriptions` (user_id, endpoint, keys, ua, created_at) — RLS owner-only, with GRANTs.
5. Optional `dashboard_layouts` (user_id, role, widget order jsonb) — RLS owner-only, with GRANTs.
6. No column drops, no table renames in this phase.

---

## 12. Migration plan

- **P1 — Scaffolding**: create `src/app` and `src/core`, move route table out of `App.tsx` into route modules, add layouts. Behaviour identical.
- **P2 — Guards & RBAC**: new guards + `useCan`, `roleAccess` adapter, permission seed migration.
- **P3 — Navigation registry**: sidebar/header/mobile nav rendered from registry.
- **P4 — Dashboard framework**: widget registry; convert Buyer -> Seller -> Agent -> Builder -> Admin dashboards one at a time.
- **P5 — Notifications**: categories, dispatch function, preferences UI, history page.
- **P6 — AI framework**: agent registry + shared conversation hook; migrate Land Agent first, then Sell Property, then advisors.
- **P7 — Cleanup**: remove re-export shims, delete dead code, update docs.
Each phase ships independently, is reversible, and keeps old imports working via shims.

---

## 13. Future extensibility

A new vertical = one folder in `features/` with `routes.tsx`, menu registration, widget registration, optional agent registration and notification categories — no edits to `App.tsx`, sidebar, or dashboards. New roles = DB rows + one entry in `roles.config.ts`.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| 189 routes moved at once | Move group by group; snapshot the route list before/after and diff |
| Permission gate hides a working feature | Fallback to current behaviour when a permission row is missing; dev-only warning |
| Multi-profile role resolution regressions | Keep `authRoleResolver` logic untouched in P1–P2; add tests around it first |
| Dashboard rewrite churn | Wrap existing sections as widgets before simplifying |
| Import breakage across ~200 pages | Re-export shims at every old path until the final cleanup phase |
| Notification duplication during dispatch swap | Dual-write off; `create-notification` delegates rather than duplicating |

---

## 15. Acceptance criteria

1. `App.tsx` under ~80 lines; all routes declared in `src/app/routes/*`.
2. Every route renders inside exactly one layout; no duplicated nav markup.
3. Sidebar, mobile nav, and breadcrumbs are generated from the menu registry.
4. `useCan('...')` drives every gated UI element; no new hardcoded role string checks.
5. Each role dashboard is a widget-id config; adding a widget requires no dashboard edits.
6. Notifications carry a category, respect per-category preferences, and are browsable in a history page.
7. Land Agent runs on the shared conversation framework with identical behaviour (draft select, resume, autosave, submit).
8. All existing user journeys pass the current QA/UAT doc unchanged.
9. Build and typecheck clean; no console errors on any dashboard route.
10. No destructive DB migration; every new public table has GRANTs and RLS.
