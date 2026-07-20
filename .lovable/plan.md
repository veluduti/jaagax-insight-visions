
# Phase 0.1 — Platform Foundation (v2, with shared services)

Sections 1–15 from the approved plan stand. This revision folds in **10 shared platform services** as first-class citizens of `src/platform/*` and one new DB schema (`platform_*`). Everything remains **additive** and **backward compatible**.

---

## A. Updated folder architecture (delta only)

```text
src/platform/
  # ---- already in v1 plan ----
  layouts/  navigation/  roles/  permissions/  notifications/
  settings/  ai/  dashboard/  routing/  components/  theme/
  modules/  bootstrap.ts
  # ---- NEW shared services (this revision) ----
  registry/
    ModuleRegistry.ts          # top-level module registry (item 8)
    types.ts                   # ModuleDescriptor
    resolveModule.ts           # by path, by key, by role
  events/
    EventBus.ts                # in-memory pub/sub (item 2)
    types.ts                   # PlatformEvent<T>, EventTopic
    persistence.ts             # opt-in bridge -> platform_events table
    useEvent.ts                # React subscription hook
  timeline/
    TimelineService.ts         # append + query (item 3)
    types.ts                   # TimelineEntry, ActorRef, SubjectRef
    Timeline.tsx               # reusable UI (feeds off TimelineService)
    useTimeline.ts
  search/
    SearchRegistry.ts          # modules register searchable resources (item 4)
    SearchService.ts           # runs registered providers in parallel
    types.ts                   # SearchProvider, SearchResult
    useSearch.ts
    components/GlobalSearch.tsx  # ⌘K palette shell (placeholder, no keybind changes)
  media/
    MediaService.ts            # upload/get/signedUrl/delete (item 5)
    types.ts                   # MediaKind = image|document|drone|ai_asset|video
    adapters/
      supabaseStorage.ts       # default adapter (existing buckets)
      # future: s3.ts, cloudflareR2.ts
    useMedia.ts
  geo/
    GeoService.ts              # geocode, reverse, distance, bbox (item 6)
    types.ts                   # LatLng, Address, LocationScope
    providers/
      googlePlaces.ts          # wraps existing lib/googleMaps/*
      internalLocationMaster.ts # wraps existing loc_* tables + useLocationMaster
    useGeo.ts
  analytics/
    AnalyticsService.ts        # track(event, props) (item 7)
    types.ts                   # AnalyticsEvent
    sinks/
      inApp.ts                 # writes to platform_events
      posthog.ts               # stub (future)
      ga4.ts                   # stub (future)
    useAnalytics.ts
  memory/
    MemoryService.ts           # AI Memory & Context layer (item 1)
    types.ts                   # MemoryScope = 'user'|'session'|'agent'|'module'
    stores/
      supabaseStore.ts         # persisted (ai_memory table)
      sessionStore.ts          # in-memory per tab
    useMemory.ts
```

`ai/AgentRegistry.ts` from v1 gains one new field: `memoryScope?: MemoryScope` and every registered agent gets automatic access to `MemoryService` and `EventBus` via a `ctx` param in its `contextResolver`.

---

## B. Module Registry (item 8) — the spine

`ModuleRegistry` is the **single entry point** every module (Real Estate, Hotels, Natural Living, future Farm Planner, Marketplace, Tourism, Learning, Community, Admin ERP…) uses to plug in:

```ts
export interface ModuleDescriptor {
  key: string;                     // 'real-estate' | 'hotels' | 'natural-living'
  label: string;
  icon?: LucideIcon;
  basePath: string;                // '/', '/hotels', '/natural-living'
  aliases?: string[];              // ['/agriculture'] -> natural-living
  roles?: RoleKey[];               // roles this module is relevant to
  register: (ctx: ModuleContext) => void;
}

export interface ModuleContext {
  routes: RouteRegistry;
  nav: NavRegistry;
  widgets: WidgetRegistry;
  agents: AgentRegistry;
  settings: SettingsRegistry;
  search: SearchRegistry;          // NEW
  events: EventBus;                // NEW
  timeline: TimelineService;       // NEW
  analytics: AnalyticsService;     // NEW
  media: MediaService;             // NEW
  geo: GeoService;                 // NEW
  memory: MemoryService;           // NEW
  permissions: PermissionRegistry;
}
```

`bootstrap.ts`:

```ts
ModuleRegistry.register(realEstateModule);
ModuleRegistry.register(hotelsModule);
ModuleRegistry.register(naturalLivingModule);
ModuleRegistry.mount(); // invokes each module.register(ctx) with the shared services
```

**This phase implements** the registry + Natural Living module descriptor. Real Estate and Hotels get **placeholder descriptors** that only declare `basePath`, so the existing routes stay owned by them without any code change. Later phases fill in their `register()` bodies without touching core.

---

## C. Event Bus (item 2)

Two layers:
- **In-memory pub/sub** — `EventBus.emit('property.viewed', payload)` / `EventBus.on(...)`. Sync, decoupled, ~50 LOC.
- **Persistence bridge** — opt-in. Topics whitelisted in `EventBus.persist([...])` are also written to `platform_events`. Notifications, Timeline, Analytics all subscribe to interesting topics via `EventBus.on(...)` — they never know each other exists.

Topic naming convention: `<module>.<entity>.<action>` (`property.viewed`, `nl.land.submitted`, `hotel.booking.created`). Enforced by TypeScript template literal type.

Event flow example (no coupling):
```
UI action ──► EventBus.emit('nl.land.submitted', {...})
              │
              ├─► TimelineService writes an entry (subscriber)
              ├─► AnalyticsService.track (subscriber)
              ├─► NotificationsService fans out per prefs (subscriber)
              └─► Dashboard widgets invalidate queries (subscriber)
```

---

## D. Timeline / Audit (item 3)

`TimelineService.append({ actor, subject, action, module, meta })` writes to `platform_timeline`. `Timeline.tsx` renders entries filtered by any combination of actor / subject / module / date-range.

Reuses existing table patterns; **does not replace** the existing `property_audit_log`, `admin_activity_log`, `seller_activity_logs`, `weekend_booking_activity_log`, `team_activity_log`, `agent_success_logs`, `buyer_journey_events` — those keep working. A tiny adapter can later mirror them into `platform_timeline` if desired. Legacy tables untouched this phase.

Auto-population: subscribes to EventBus by default for topics ending in `.created|.updated|.deleted|.approved|.rejected|.submitted`.

---

## E. Search (item 4)

Each module registers a `SearchProvider`:

```ts
search.register({
  key: 'nl.land',
  label: 'Lands',
  scopes: ['authenticated'],
  query: async (q, ctx) => {  /* returns SearchResult[] */ },
});
```

`SearchService.search(q)` runs all providers matching the current user's roles/permissions in parallel with per-provider timeouts, returns a merged, grouped-by-provider result. `GlobalSearch.tsx` renders it — mounted in `platform/navigation/components/Header.tsx` behind a feature flag this phase (off by default; UI shell built, providers registered, no keybind hijack).

---

## F. Media (item 5)

`MediaService.upload({ file, kind, module, ownerId, metadata })`:
- Routes to Supabase Storage bucket by `kind` × `module` via config map (default buckets already exist; new buckets added only when a module needs one, in that module's phase).
- Returns `{ id, url, signedUrl, kind, meta }`.
- `MediaKind`: `image`, `document`, `drone`, `ai_asset`, `video`, `audio`.
- Adapter pattern → future S3/R2/CDN without touching callers.

Existing uploads (property photos, land registration uploads, KYC docs, hotel media) keep working through their current paths. Media service is used by **new** flows in later phases; land agent uploads migrate to it as a reference in a follow-up (not this phase).

---

## G. Geo (item 6)

`GeoService`:
- `geocode(address) / reverse(lat,lng)` — via `googlePlaces` provider (wraps existing `src/lib/googleMaps/*`).
- `distance(a,b)`, `bboxFromRadius`, `withinScope(point, scope)` — pure functions.
- `resolveLocationMasterId({ level, name })` — via `internalLocationMaster` provider (wraps `loc_countries/states/districts/cities/localities` + existing `useLocationMaster`).

Every module (hotels, land, agents, properties, farms, future tourism) uses one abstraction. Existing Mapbox map components stay as-is — Geo service is for data lookups, not rendering.

---

## H. Analytics (item 7)

`AnalyticsService.track('nl.land.submitted', props)`:
- Default sink writes to `platform_events` (via EventBus persistence bridge — no double schema).
- Sink interface allows future PostHog / GA4 / Segment without changing call sites.
- KPI widgets read via `useAnalyticsQuery(...)` (thin wrapper over `supabase.from('platform_events')...`).

---

## I. AI Memory & Context (item 1)

`MemoryService` provides four scopes:

| Scope | Store | Example |
|---|---|---|
| `session` | in-memory (Map) | scratchpad during a chat turn |
| `user` | `ai_memory` table, `scope='user'` | long-term preferences, personas |
| `agent` | `ai_memory`, `scope='agent', agent_key=...` | agent-specific learned facts |
| `module` | `ai_memory`, `scope='module', module_key=...` | shared context for a domain (e.g. all NL agents share soil/land facts about a user) |

API:
```ts
memory.get({ userId, scope, key })
memory.put({ userId, scope, key, value, ttl? })
memory.list({ userId, scope, prefix? })
memory.recall({ userId, agentKey, limit })   // top-N relevant facts (embedding-based later; MRU this phase)
```

Every registered agent's `contextResolver(userId)` receives `{ memory, events, timeline, geo }` so all future agents share the same context surface. Land Agent and Farmer Assistant get wired to `memory` in a behavior-preserving way (writes only; reads gated behind a feature flag until prompts are updated in a later phase).

---

## J. New DB schema (single migration, additive)

All tables prefixed `platform_` (or `ai_` for memory) to make ownership obvious. All follow the mandatory pattern: CREATE TABLE → GRANT → ENABLE RLS → POLICY.

```text
platform_events
  id uuid PK, topic text, actor_user_id uuid, subject_type text, subject_id text,
  module_key text, payload jsonb, occurred_at timestamptz default now()

platform_timeline
  id uuid PK, actor_user_id uuid, subject_type text, subject_id text,
  action text, module_key text, meta jsonb, created_at timestamptz default now()

platform_media
  id uuid PK, owner_user_id uuid, module_key text, kind text,
  bucket text, path text, mime text, size_bytes bigint, meta jsonb, created_at

ai_memory
  id uuid PK, user_id uuid, scope text check in ('session','user','agent','module'),
  agent_key text null, module_key text null, key text, value jsonb,
  expires_at timestamptz null, created_at, updated_at
  UNIQUE (user_id, scope, coalesce(agent_key,''), coalesce(module_key,''), key)
```

Plus the tables already in v1: `roles`, `permissions`, `role_permissions`, `user_role_assignments`, `notification_channels`, `notification_preferences`.

**RLS:**
- `platform_events`, `platform_timeline`: authenticated read own rows (`actor_user_id = auth.uid()`) + admin read all; insert own; admins full.
- `platform_media`: read/write own; admins full.
- `ai_memory`: full CRUD on own rows only; no admin bypass (privacy).

**GRANTs** on all four to `authenticated` (SELECT/INSERT/UPDATE/DELETE where policies allow) and `ALL` to `service_role`. No `anon` grants.

**Zero touch** on existing tables, existing enums, existing RLS, existing edge functions.

---

## K. Implementation order (revised)

1. DB migration — v1 tables + new `platform_events`, `platform_timeline`, `platform_media`, `ai_memory` in one migration.
2. Core primitives (no UI): `EventBus`, `ModuleRegistry`, types.
3. Shared services: `TimelineService`, `AnalyticsService`, `MemoryService`, `MediaService`, `GeoService`, `SearchService`. Each with its `useX` hook, ~1 file of ~100 LOC.
4. Wire services into `ModuleContext` and `bootstrap.ts`.
5. v1 items (roles, permissions, notifications extension, layouts, navigation, dashboard shell, AI shell, routing).
6. Register three module descriptors: `real-estate` (placeholder, owns `/`), `hotels` (placeholder, owns `/hotels` and `/partners`), `natural-living` (**full reference** — nav, widgets, agents, search provider, memory scope, event topics).
7. Migrate `NLLayout`, `NLDashboard`, `LandAgentChat`, `nl-farmer-assistant` to shared services (behavior-preserving).
8. Docs: `docs/PLATFORM_FOUNDATION.md` — "How to add a new module" recipe covering all shared services.

---

## L. Backward compatibility guarantees (unchanged from v1, extended)

- `useAuth` untouched. `useNLAuth` untouched.
- Existing edge functions untouched.
- Existing tables and RLS untouched. New services **do not** read/write existing tables except through their current services/hooks.
- Existing components (`Navigation.tsx`, `ProtectedRoute.tsx`, `SidebarMenu.tsx`, `Footer.tsx`) untouched.
- Every new service exposes a `useX()` hook that returns a **stable identity** even when the service is disabled — safe to call from any component today.
- Feature flags per shared service (`platform.search.enabled`, `platform.memory.enabled`, …) via a tiny `PlatformFlags` object seeded to `{ search:false, memory:true (write-only), analytics:true, timeline:true, events:true, media:false, geo:true }`. Flip in later phases without code changes.

---

## M. Extension points for later phases

- **Search**: register providers for properties, projects, agents, hotels, communities, transactions, users, ads.
- **Media**: swap Supabase Storage adapter for R2/S3 by adding one file, changing one config line.
- **Geo**: add `mapboxProvider` for isochrones, `hereProvider` for road networks.
- **Analytics**: add `posthog.ts` sink; call sites unchanged.
- **Memory**: swap MRU recall for embedding recall by implementing one method in `MemoryService`.
- **EventBus**: replace in-memory with Supabase Realtime broadcast by swapping `EventBus.transport`.
- **Modules**: any new module (Farm Planner, Marketplace, Tourism, Learning, Community, Admin ERP) drops in a single `*.module.ts`, no core edits.

---

## N. Risks (delta only)

| Risk | Mitigation |
|---|---|
| Shared services become a god-object | Each service exposed as an interface; `ModuleContext` is the only aggregation point; no service imports another service directly (they communicate via EventBus). |
| `platform_events` grows unbounded | Persistence bridge is opt-in per topic; add TTL cleanup job in a later phase. |
| Duplicate writes (existing audit tables + new timeline) | Timeline is additive; existing tables keep functioning; a later phase decides on unification. |
| AI Memory privacy | `ai_memory` RLS is user-scoped only, no admin bypass; user can wipe via `/settings/privacy`. |
| Media adapter breakage | Default adapter uses only currently-used Supabase Storage buckets; new buckets created lazily per module. |

---

## O. Acceptance criteria (delta)

In addition to v1 criteria:

- [ ] `ModuleRegistry.list()` returns three modules after boot.
- [ ] `EventBus.emit('nl.land.submitted', ...)` triggers a `platform_timeline` row, a `platform_events` row, and an in-app notification (via subscribers).
- [ ] `MemoryService.put/get` roundtrips for the Land Agent scope; row visible only to that user in `psql` as authenticated.
- [ ] `SearchService.search('kukatpally')` returns at least the NL land provider results (feature-flag-controlled UI, but service works).
- [ ] `GeoService.reverse({lat,lng})` returns a location-master id when a match exists.
- [ ] `AnalyticsService.track` results appear in `platform_events` and are queryable from a widget.
- [ ] Zero regression on existing pages/routes.

---

**Ready to implement in the order in section K on approval.**
