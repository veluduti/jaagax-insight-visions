# Phase 1 — Natural Living Entry Experience

Foundation from Phase 0 (`src/platform/*`, RBAC, EventBus, AI Memory, AgentRegistry, Timeline, WidgetRegistry, Notifications, ModuleRegistry) is assumed available and reused. This phase is additive — no existing routes/tables are removed.

Journey covered: Visitor → Landing → Explore → Signup/Login → Verify → Welcome → Choose Goal → AI Intro → Return To Roots AI → Adaptive Interview → Profile → Recommendations → Dashboard.

---

## 1. Landing Website (`/natural-living`)

Purpose: convert visitors emotionally, not sell agriculture.

**Sections (top → bottom)**
1. Hero — full-viewport, ambient video/parallax, headline "Return to your roots.", primary CTA `Begin your journey` (→ signup with `intent=onboarding`), secondary `Explore first`.
2. Emotional Story Strip — 3-scene scroll narrative (city → soil → belonging).
3. What You Can Do — 6 pillar cards (Own Land, Invest, Weekend Farm, Managed Farm, Learn, Community). Cards are data-driven from `landing_pillars` config so pillars can grow without redeploys.
4. AI Companion Teaser — animated chat preview of Return To Roots AI.
5. Live Signals — real counts (approved lands, active farmers, states covered) from a public read-only RPC.
6. Trust — verification, admin hierarchy, secure data.
7. Voices — testimonials carousel.
8. FAQ — accordion, JSON-LD FAQ schema.
9. Final CTA — "Discover your Natural Living path".
10. Footer — legal, sitemap, socials, language.

**Navigation**
- Reuse global JAAGAX header (unchanged) + Natural Living sub-nav.
- Public sub-nav: Home, Vision, How it Works, Lands, Community, Blog, Contact. Auth CTA on the right.

**CTA flow** — every primary CTA routes to `/natural-living/start` (single entry). `start` decides: unauth → `/auth`; authed + no goal → `/natural-living/onboarding/goal`; authed + profile complete → dashboard.

**Animations** — Framer Motion, reduced-motion aware, GPU transforms only, lazy-mounted below-the-fold via existing `LazyMount`.

**Premium UI** — JAAGAX tokens only (no new palette), soft-emerald glow accent, generous whitespace, editorial serif for hero, sans for body.

**SEO** — server-safe SEO component: title/description/canonical/OG/Twitter, JSON-LD `Organization` + `FAQPage` + `WebSite` sitelinks searchbox. Add landing routes to `sitemap.xml`, alt text on all imagery, semantic H1/H2 hierarchy, `prefers-reduced-motion` handled.

**Responsive** — mobile-first: hero collapses to poster image, story strip becomes vertical, pillars 1→2→3 columns, sticky mobile CTA bar.

**Future expansion** — pillars, testimonials, signals, and FAQ are content-driven (JSON in `content/` or DB `platform_cms` later). No hard-coded copy in components.

---

## 2. Authentication

Reuse existing `useAuth` + `authService`; add NL-specific onboarding continuation, no duplicate auth stack.

**Screens**
- `/auth` — unified Login/Signup tabs.
- `/auth/verify` — email OTP + phone OTP (existing `signup-otp` function).
- `/auth/forgot` → `/reset-password` (already exists per memory).
- `/auth/callback` — public same-origin OAuth callback (Google today, Apple later).

**Flows**
- Email + password (default).
- Google OAuth via managed provider (`lovable.auth.signInWithOAuth("google", { redirect_uri: origin + "/auth/callback" })`).
- Phone OTP (existing Twilio path).
- Apple — extension point only: provider slot in `authService.socialProviders[]`; UI hides until enabled.

**Remember Me** — Supabase persistent session (default) + explicit checkbox controlling `localStorage` vs `sessionStorage` bridge.

**Sessions** — single source of truth: `onAuthStateChange`; server-trusted checks use `getUser()`.

**Security** — HIBP leaked-password check enabled; rate-limited OTP; generic error masking; no roles stored on profiles (use `user_roles`); RLS on every new table.

**Profile completion gate** — after auth, `ProfileBootProvider` checks `nl_onboarding_state`. If `stage != 'dashboard_ready'`, force redirect to the next stage.

**Post-auth routing table**
| stage | route |
|---|---|
| `needs_verification` | `/auth/verify` |
| `needs_welcome` | `/natural-living/welcome` |
| `needs_goal` | `/natural-living/onboarding/goal` |
| `needs_interview` | `/natural-living/onboarding/interview` |
| `needs_profile_review` | `/natural-living/onboarding/profile` |
| `dashboard_ready` | `/natural-living/dashboard` |

---

## 3. Welcome Experience (`/natural-living/welcome`)

Not a dashboard. Three cinematic slides (skippable), each ~4s auto-advance with manual nav:
1. "You made it home." — name + soft ambient scene.
2. "Meet your AI companion." — introduces Return To Roots AI persona.
3. "Let's find your path." — CTA `Begin` → `/onboarding/goal`.

Emits `nl.welcome.viewed`, `nl.welcome.completed`. Stored in `nl_onboarding_state.welcome_completed_at`.

---

## 4. Choose Your Goal (`/natural-living/onboarding/goal`)

**Design**
- Editorial grid of goal cards (icon, title, one-line intent, expected time investment, difficulty dot).
- Multi-select allowed (min 1, max 3 primary). "Not sure yet — let AI guide me" is a valid selection.
- Search + category filter (Own, Invest, Learn, Live, Manage).

**Data-driven** — goals defined in DB table `nl_goals` (see §12). Each goal has: `slug`, `label`, `emotion_copy`, `category`, `interview_pack_id`, `recommendation_tags[]`, `icon`, `is_active`, `sort_order`. Adding a goal = one row.

**Initial goals** — start_farming, passive_investment, buy_land, lease_land, organic_farming, dairy, poultry, weekend_farming, agri_tourism, learn_farming, farm_management, ai_consultation, undecided.

**Selection persists** to `nl_user_goals` (user_id, goal_id, priority, selected_at). Emits `nl.goal.selected`.

---

## 5. Return To Roots AI (Interview Shell)

Reuses `platform/ai/AgentRegistry` (`agent_id = "return_to_roots"`) and `AIMemory`.

**Conversation flow**
- Streamed chat UI (existing `LandAgentChat` styled shell reused as `AIChat` primitive).
- Turn-based: AI question → optional smart-suggestion chips → user input (text/voice/skip) → extraction → progress update.
- Sections announced with soft dividers ("Let's talk about you", "About your roots", "Your dream", …).

**Question categories** (packs)
1. Identity — name, age band, current city, native place.
2. Roots — family agri history, land ownership past/present.
3. Life Context — profession, lifestyle, family, availability.
4. Financials — investment band, horizon, risk tolerance.
5. Aspirations — what "return to roots" means to them.
6. Practicals — location preference, weekend/full-time, hands-on vs managed.
7. Learning — knowledge level, willingness to learn.
8. Consent — data usage, communication channels.

**Memory** — `AIMemory` scopes: `session` (turn buffer), `user` (canonical answers), `agent:return_to_roots` (extraction state, confidence), `module:natural_living` (goal + profile snapshot for downstream agents).

**Context** — every prompt is assembled from: user profile snapshot + selected goals + prior extracted fields + last N turns + active question spec. No prompt bodies in this plan.

**Validation** — per-field validators (regex/enum/range) declared alongside question spec; failed validation → AI re-asks conversationally.

**Resume** — `nl_interview_sessions` row keyed by user+goal-set; on reopen, chat rehydrates from `nl_interview_turns` and last `active_field`.

**Skip logic** — every question has `is_skippable`; skipped fields recorded in `skipped_fields[]` and revisited at end as optional "quick fills".

**Progress** — computed as `answered_required / total_required`; shown as thin top bar + section pips.

**AI confidence** — extraction returns `{field, value, confidence 0–1, source_turn_id}`; <0.6 triggers confirmation turn.

**Extraction** — structured JSON from model, validated against a Zod-equivalent server schema; only validated fields written to `nl_ai_profile_fields`.

**Saving** — every turn commits: append turn, upsert extracted fields, update session progress. Atomic via edge function.

**Recovery** — on network error, last user message re-queued; on model error, graceful fallback message and retry button; on schema drift, unknown fields quarantined into `extra` JSONB.

**Error handling** — categorized: `network`, `model`, `validation`, `auth`, `rate_limit`. Each maps to UX copy and a Timeline event.

---

## 6. Adaptive AI Interview (Decision Engine)

**Inputs** → **Output**: (profile signals + selected goals + prior answers) → next `question_id` or `end`.

**Signals**
- Profession bucket (software, doctor, student, retired, existing_farmer, nri, business_owner, govt, other).
- Life stage (age band, family, availability hrs/week).
- Location context (urban/tier2/rural, home state).
- Selected goals set.
- Financial band.
- Extracted flags (owns_land, has_farming_experience, wants_hands_on, …).

**Engine model** — rule-first, ML-later:
- `nl_question_bank` — every question with metadata: `id`, `pack`, `text_key`, `input_type`, `options`, `validators`, `weight`, `required`, `depends_on` (JSON logic), `applies_when` (JSON logic).
- `nextQuestionResolver` (reuses Phase 0 pattern) evaluates `applies_when` against the signal store and returns the highest-priority unanswered question.
- Profession/goal-specific "branches" implemented purely as `applies_when` rules — no hard-coded persona code paths.

**Examples of divergence**
- Software Engineer + weekend_farming → skip deep-agri-knowledge, expand weekend availability + commute radius.
- Existing Farmer → skip basics, expand crop/land/scale.
- NRI → expand remote-management + trusted partner questions, skip hands-on.
- Retired → expand time availability + lifestyle, downplay ROI horizon.
- Student → skip financials-heavy, expand learning-path questions.

**Termination** — engine returns `end` when all `required && applies_when=true` questions are answered OR user hits "Finish now" (min-viable threshold = 60% required + core identity + ≥1 goal).

**Extensibility** — new persona = new rules + questions, zero code changes.

---

## 7. AI Profile Generation (`/natural-living/onboarding/profile`)

Generated from interview + goals + external signals (location weather/soil later).

**Profile sections**
- Identity & Roots
- Life Context
- Financial Snapshot
- Aspirations
- Practical Constraints
- Consents & Preferences

**Score cards** (0–100, with explainability)
- Readiness — how prepared the user is to act now.
- Investment Capacity — normalized band.
- Risk Tolerance — conservative/balanced/aggressive.
- Time Availability — hrs/week + commitment horizon.
- Roots Affinity — emotional connection strength.
- Learning Appetite.

Each score stores: `value`, `band`, `contributing_fields[]`, `explanation`, `computed_at`, `version`.

**Interests & Goals** — normalized tag cloud + priority ordering.

**Recommendations preview** — top 3 next actions inline (deep dive in §8).

**Storage** — `nl_ai_profiles` (one row/user, versioned via `version` int + history table `nl_ai_profile_versions`).

**Foundation for future agents** — all future agents read `nl_ai_profiles` + `AIMemory(user)` before speaking. No agent re-asks profile-level questions.

**User controls** — edit any field (reopens targeted mini-interview), regenerate scores, download profile PDF, delete profile (soft-delete + hard-delete option).

---

## 8. AI Recommendation Engine

**Architecture**
- `RecommendationRequest` (user_id, context, surface) → `RecommendationService` → returns ranked `Recommendation[]` per category.
- Providers registered per category: `land`, `lease`, `weekend_farming`, `managed_farming`, `investment`, `tourism`, `marketplace`, `learning`, `mentors`, `govt_schemes`, `future_*`.
- Each provider implements `score(profile, item) → {score, reasons[]}`; rule-based v1 (weighted feature match), ML-ready interface for v2.

**Ranking** — weighted composite of: goal match, readiness fit, budget fit, location proximity (geoService), risk fit, freshness. Explainable — each rec shows top 2 reasons.

**Freshness & caching** — cache in `nl_recommendations_cache` keyed by (user_id, profile_version, category); invalidate on profile change or item change events.

**Surfaces** — onboarding final screen, dashboard widgets, notifications, AI chat suggestions.

**Feedback loop** — thumbs up/down + implicit signals (open/save/dismiss) emit `nl.recommendation.feedback`, feeding future ML.

---

## 9. Dashboard (`/natural-living/dashboard`)

Reuses `DashboardShell` + `WidgetRegistry`.

**Layout** — 12-col responsive grid, three zones:
- Header strip — greeting, roots line ("From <native place>"), progress ring.
- Primary column — Suggested Journeys, Recommendations, Active Interviews/Drafts.
- Side column — AI Assistant launcher, Notifications, Timeline, Quick Actions.

**Widgets (v1)**
- SuggestedJourneysWidget
- RecommendationsWidget (multi-category tabs)
- MyLandsWidget (existing)
- InterviewProgressWidget (resume Return To Roots)
- TimelineWidget (from `platform_timeline`)
- NotificationsWidget
- AIAssistantWidget (opens chat drawer)
- QuickActionsWidget (goal-aware: "Start a draft", "Explore lands", "Book a mentor")
- LearningPathWidget (placeholder → filled in later phase)

**Personalization** — `WidgetRegistry.forAudience({ roles, goals, profileFlags })` picks and orders widgets. User can pin/hide.

**Future widgets** — Farm Planner, Harvest Tracker, Weekend Farmer, Tourism, Community — added by registering descriptors, no dashboard rewrite.

---

## 10. Navigation

**Public** — JAAGAX global header (unchanged) + NL sub-nav (Home, Vision, How it Works, Lands, Community, Blog).

**Authenticated** — same header; sub-nav adds Dashboard, My Journey, Lands, Marketplace (soon), Community, Learning (soon).

**Dashboard shell** — collapsible left sidebar (icons + labels), top utility bar (search, notifications, AI, avatar), breadcrumb row below.

**Mobile** — bottom tab bar (Home, Journey, AI, Notifications, Profile); NL sub-nav becomes horizontal scroll chips; hamburger for secondary.

**Tablet** — collapsed sidebar (icons), sub-nav as chips.

**Desktop** — full sidebar + sub-nav + breadcrumbs.

**Breadcrumbs** — derived from route registry (`platform/routing`).

**Quick actions** — command palette (⌘K) sourced from `searchRegistry` + registered actions.

All items driven by `ModuleRegistry` — no hard-coded menus.

---

## 11. Routes (additive)

```
/natural-living                          Landing
/natural-living/vision
/natural-living/how-it-works
/natural-living/lands                    (existing)
/natural-living/lands/:id                (existing)
/natural-living/community
/natural-living/blog
/natural-living/start                    Router hop → next stage
/natural-living/welcome
/natural-living/onboarding/goal
/natural-living/onboarding/interview
/natural-living/onboarding/interview/:sessionId
/natural-living/onboarding/profile
/natural-living/onboarding/recommendations
/natural-living/dashboard                (redesigned)
/natural-living/journey                  User's ongoing journey
/natural-living/profile                  View/edit AI profile
/natural-living/profile/versions
/natural-living/ai                       Full-screen AI companion
/natural-living/settings
/auth, /auth/verify, /auth/forgot, /auth/callback   (existing, extended)
Aliases: /agriculture/* → /natural-living/*         (Phase 0)
```

All routes registered via `platform/routing/RouteAliases` + new `natural-living` module descriptor.

---

## 12. Database (new tables — additive, RLS on, GRANTs per Core rules)

- `nl_onboarding_state` — user_id (PK), stage, welcome_completed_at, goal_completed_at, interview_completed_at, profile_completed_at.
- `nl_goals` — catalog (slug, label, category, interview_pack_id, recommendation_tags[], icon, is_active, sort_order).
- `nl_user_goals` — user_id, goal_id, priority, selected_at.
- `nl_interview_packs` — id, name, description, applies_when JSON.
- `nl_question_bank` — id, pack_id, text_key, input_type, options JSON, validators JSON, applies_when JSON, depends_on JSON, is_required, is_skippable, weight, sort.
- `nl_interview_sessions` — user_id, id, status, progress, current_question_id, started_at, updated_at, completed_at.
- `nl_interview_turns` — session_id, seq, role, content, extracted JSON, confidence, error_code, created_at.
- `nl_ai_profile_fields` — user_id, field_key, value JSON, source (interview/goal/system), confidence, updated_at.
- `nl_ai_profiles` — user_id (PK), version, scores JSON, sections JSON, tags[], summary, generated_at.
- `nl_ai_profile_versions` — historical snapshots.
- `nl_recommendations_cache` — user_id, category, items JSON, profile_version, generated_at, expires_at.
- `nl_recommendation_feedback` — user_id, rec_id, category, signal, created_at.
- `nl_notifications_prefs_nl` — extends `notification_preferences` (module scope = "natural_living").
- `nl_landing_signals_view` — read-only aggregate view for landing "live signals".

Relationships: `nl_user_goals.goal_id → nl_goals.id`; `nl_interview_sessions.user_id → auth.users.id`; `nl_interview_turns.session_id → nl_interview_sessions.id`; profile tables user-scoped; RLS user-private, admin read via `has_role`.

---

## 13. AI Integration

- Every NL agent registers in `AgentRegistry` (`return_to_roots`, `nl_recommender`, `nl_profile_generator`, future `farm_planner`).
- Shared context assembler: `buildContext(user_id, agent_id, surface)` merges profile + goals + memory + recent timeline.
- Memory scopes: `session`, `user`, `agent:<id>`, `module:natural_living`. TTL policy per scope.
- Workflow: request → context → prompt template (versioned) → model call via Lovable AI Gateway → structured output → validation → memory/DB writes → EventBus emit.
- Streaming: SSE from edge function → chat UI.
- Future agents plug in by registering descriptor + prompt template; no shell rewrites.
- Guardrails: PII redaction on outbound logs, content moderation hook, per-user rate limits.

---

## 14. Notifications

Reuses `platform/notifications`. Channels: bell (in-app), email, push (future), WhatsApp (existing integration).

**Triggers**
- Signup verified → welcome email + bell.
- Welcome completed → nudge if goal not chosen in 24h.
- Interview started → resume reminder at 24h/72h if incomplete.
- Interview completed → profile-ready email + bell.
- New recommendation matches → daily digest (opt-in).
- Goal changed → confirmation.
- Profile updated → summary.
- Admin milestones (land approved) → existing.

**AI reminders** — soft in-app prompts from AI Assistant when a journey stalls > threshold.

**Preferences** — per-channel, per-category, per-module; default: bell all on, email essentials only.

---

## 15. Events

**Platform events** (`platform_events`)
- `auth.signup.completed`, `auth.verified`, `auth.login`, `auth.logout`
- `nl.welcome.viewed`, `nl.welcome.completed`
- `nl.goal.selected`, `nl.goal.changed`
- `nl.interview.started`, `nl.interview.question_answered`, `nl.interview.skipped`, `nl.interview.completed`, `nl.interview.abandoned`
- `nl.profile.generated`, `nl.profile.updated`, `nl.profile.deleted`
- `nl.recommendation.shown`, `nl.recommendation.clicked`, `nl.recommendation.feedback`
- `nl.dashboard.viewed`

**Timeline events** (`platform_timeline`, user-visible) — Welcome completed, Goal chosen, Interview milestones, Profile ready, First recommendation acted on, Draft saved.

**Analytics events** — funnel: landing_view → cta_click → auth_start → auth_complete → welcome_complete → goal_complete → interview_start → interview_complete → profile_view → first_dashboard_view. Plus retention & drop-off per stage.

---

## 16. Edge Cases

- **Leaves interview mid-way** → session saved, resume banner on next login, email reminder at 24h.
- **Returns later** → `start` router hop lands them on exact stage; interview resumes on last unanswered question.
- **Skips questions** → tracked in `skipped_fields`; end-of-interview quick-fill offered; skipped-but-required blocks profile generation until resolved (soft block with "Finish now" that uses defaults).
- **Changes goal** → new goals appended to `nl_user_goals`; engine re-evaluates and asks only newly-applicable questions; profile regenerated (new version).
- **Multiple goals** — first-class; interview merges required question sets; recommendations tab per goal + unified feed.
- **Deletes profile** — soft delete (30-day recovery) then hard delete cascading `nl_ai_profile_fields`, `versions`, `sessions`, `turns`, `user_goals`, memory; auth account untouched unless requested.
- **Two devices simultaneously** — session row has `updated_at` + optimistic concurrency; last-write-wins on turns, conflict banner if divergent.
- **Model outage** — chat shows retry, session unaffected.
- **Underage / restricted region** — consent gate; block interview, allow browse.
- **Anonymous exploration** — landing + Lands browsable; AI teaser answers 1 turn then requires signup.
- **Account merge / email change** — profile follows user_id, unaffected.

---

## 17. Acceptance Criteria

Phase 1 is complete when all are true:
1. New visitor can land, explore public NL pages, and reach signup within 1 click from any pillar/CTA.
2. Signup supports email+password, Google, phone OTP; Apple slot exists but hidden; HIBP on; sessions restored across reloads.
3. After first login, user cannot reach `/natural-living/dashboard` until Welcome + Goal + Interview + Profile stages are completed or explicitly minimum-viable-finished.
4. Choose Goal loads from `nl_goals` DB, supports multi-select, persists, and drives interview branching.
5. Return To Roots AI conducts a resumable, streamable, skippable interview with progress, validation, confidence-based confirmations, and structured extraction.
6. Adaptive engine measurably diverges question sets across ≥5 personas (Software, Doctor, Student, Retired, Existing Farmer, NRI) — verifiable via `nl_interview_turns` diff test.
7. AI Profile is generated with 6 score cards, explainability, versioning, edit, regenerate, delete.
8. Recommendations render across ≥5 categories on the final onboarding screen and dashboard, with reasons and feedback capture.
9. Dashboard is fully driven by `WidgetRegistry` and personalizes by roles + goals + profile flags.
10. All new tables have RLS + GRANTs; no role stored on profiles; `getUser()` used for trust-sensitive checks.
11. All defined events emit to `platform_events` and, where user-visible, to `platform_timeline`.
12. Notifications fire on the specified triggers with per-channel prefs.
13. Adding a new goal, question, persona rule, recommendation provider, or dashboard widget requires zero changes to shell code.
14. All screens meet responsive breakpoints (mobile/tablet/desktop) and pass reduced-motion.
15. SEO: landing pages have unique titles, descriptions, canonical, OG, JSON-LD; sitemap updated.
16. Every edge case in §16 has a defined UX and passes manual walkthrough.
17. No existing route, table, or module is broken (regression sweep on Real Estate + Hotels).

---

## Out of scope (later phases)
Land Marketplace deep flows, Farm Planner, Farm Management, Harvest Selling, Adopt a Farm, Agri Tourism operations, Learning Platform courses, Community forums, Admin ERP, ML ranker for recommendations, Apple Sign-In activation.
