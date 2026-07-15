
# JAAGA Land Posting — AI Registration Agent

## Goal
Replace the traditional land listing form with a ChatGPT-style AI agent that collects every field from Sheet 1 through natural conversation, silently persisting structured data to the DB with auto-save, resume, and edit support.

## Scope of this build

### 1. Navigation (Natural Living)
- Add **"List Your Land"** (JAAGA Land Posting) as a primary item in `NLLayout.tsx` desktop nav + mobile drawer.
- Reflow nav for narrow widths: collapse extra items into an overflow menu on `< lg`; keep logo, primary CTA, and menu icon on mobile. Tighten spacing so all fields fit at ≥360px screens.
- Route: `/natural-living/list-land` → new chat UI.

### 2. Master Schema (single source of truth)
Encode Sheet 1 as `src/features/natural-living/land-agent/schema.ts`:
- Field groups: Owner & Contact, Location (Village/Mandal/District/State + GPS/Map), Land Details (area, survey #s, soil, terrain), Status & History (current status, availability, current/last crop, 5yr history), Lease Reason, Water (sources multi, availability), Infrastructure (multi), Access (road, electricity, vehicle), Local Environment, Nearby Attractions, Nearby Facilities (Google Places), Farming Readiness, Opportunity Ratings (multi + 1–5 stars per potential), Farm Experience / Suitable For, School Visit Activities, Farm Stay Assessment (accommodation, facilities, experience), Project Framing (tenure, duration, project age), Uploads (land photos, ownership docs).
- Each field: `id, label, type (text|number|enum|multi|stars|gps|upload|date), options?, required?, group, dependsOn?, extractionHints`.

### 3. Database (Lovable Cloud)
New tables (migration in follow-up turn):
- `nl_land_registrations` — one row per draft/submission. Columns for every scalar field + JSONB for arrays/nested (crop_history, water_sources, infrastructure, opportunity_ratings, stay_assessment, etc.), `status` (draft/submitted/verified), `completion_pct`, `missing_fields jsonb`, owner `user_id`, master location IDs (country_id/state_id/district_id/city_id/locality_id), timestamps.
- `nl_land_conversations` — message log per registration (role, content, extracted_fields jsonb, created_at).
- `nl_land_uploads` — file references (kind: photo|document, url, meta).
- RLS: owner can CRUD own; admins via existing `is_admin()`; auto-fill master IDs via existing `resolve_location_ids` trigger. GRANTs to authenticated + service_role.

### 4. AI Agent Architecture (modular)
Directory: `src/features/natural-living/land-agent/`
- `schema.ts` — Sheet 1 field definitions.
- `state.ts` — `LandRegistrationState` type + reducer; single source of truth in-memory, hydrated from DB.
- `extractor.ts` — client-side helper that calls edge function `nl-land-extract` for structured JSON extraction from a user message given current state + schema.
- `validator.ts` — validates phone, survey #s, GPS, area, required uploads.
- `missingFields.ts` — computes remaining required fields and priority order (Owner → Location → Land → Water → Infra → Ratings → Uploads → Framing).
- `questionPlanner.ts` — picks next best question, phrases it naturally, supports conditional branching (borewell count only if borewell selected; farm-house rooms only if selected; skip crop qs if status=Vacant/None; infer village/mandal from GPS+master lookup).
- `autosave.ts` — debounced upsert to `nl_land_registrations`; each extraction step persists diffs + completion %.
- `resume.ts` — on mount, loads latest draft for user, returns greeting with progress ("We completed 72% — shall we continue?").
- `uploader.ts` — file upload manager into Supabase Storage bucket `nl-land`.
- `summary.ts` — final review summary before submit.
- `LandAgentChat.tsx` — ChatGPT-style UI (message list, streaming assistant bubbles, subtle progress bar top-right, inline chips for enum answers, upload dropzone when requested, "Edit" affordance on any prior answer).

### 5. Edge Functions (server-side AI)
- `nl-land-extract`: takes `{ state, userMessage }`; calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with tool/`Output.object` schema mirroring Sheet 1 to return **only fields confidently extracted** + `clarifications[]`. Never invents.
- `nl-land-next-question`: takes `{ state, missingFields }`; returns `{ question, targetFieldIds[], tone }` — natural human-consultant phrasing, no repetition, conditional branching aware.
- `nl-land-summary`: generates final human-readable review.
- All keep `LOVABLE_API_KEY` server-side; stream `nl-land-next-question` for ChatGPT feel via `toUIMessageStreamResponse`.

### 6. Conversation Loop (per user message)
1. Append user msg → conversation log.
2. `nl-land-extract` → structured diff.
3. Validate; if ambiguous → ask clarification (do not save).
4. Merge into state; autosave to DB (upsert diff + recompute completion %).
5. Recompute missing fields.
6. If uploads needed at this natural point, prompt for them.
7. `nl-land-next-question` → stream assistant reply.
8. When completion = 100% and all required uploads present → produce summary + `Confirm & Submit` action → sets `status=submitted`.

### 7. UX
- Full-screen ChatGPT-style layout inside NL theme (cream + forest tokens already in `theme.css`).
- Sticky top: JAAGA logo, subtle "Registration 62%" pill, "Save & exit" link.
- Composer: textarea + send + upload icon + mic (voice input best-effort via `useVoiceSynthesis` pattern — future).
- Chip suggestions for enum questions (Black/Red/Sandy…) below composer; typing free-form also accepted.
- No visible form fields, no wizard, no step indicator beyond a single % bar.

### 8. Reusability
`land-agent/` is generic — `schema.ts` is the only thing swapped for future workflows (Admin Inspection, Labour Registration, Farm Stay, Investment). Rename to `src/features/ai-agent/` in a later phase if we spawn a second flow.

## Technical details

- **Model**: `google/gemini-3-flash-preview` via Lovable AI Gateway. Extraction uses `Output.object` with a lean Zod schema (no bounds, no long enums — enums enumerated in prompt only, validated in code).
- **Streaming**: AI SDK `streamText` + `toUIMessageStreamResponse`; client uses `useChat` with `DefaultChatTransport` pointing to `${VITE_SUPABASE_URL}/functions/v1/nl-land-next-question` with `Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}`.
- **State persistence**: `useChat` `onFinish` writes to `nl_land_conversations`; extractor writes to `nl_land_registrations`.
- **Auth gate**: reuses `NLProtectedRoute` — user must be signed in to persist. Anonymous can preview intro card.
- **Storage bucket**: `nl-land` (private, owner-read/write via RLS).

## Build order (this turn = phases 1–3; follow-up turns = 4+)
1. Header nav update + responsive fixes + new route + placeholder chat page.
2. Schema + state + missing-field/question-planner (pure TS, no AI yet) → works as a client-side deterministic flow.
3. Migration for `nl_land_registrations`, `nl_land_conversations`, `nl_land_uploads`, storage bucket.
4. Edge functions `nl-land-extract`, `nl-land-next-question`, `nl-land-summary` + wire AI SDK streaming.
5. Uploader + final summary + submit.
6. Admin view (list submissions filtered by district scope, reuse existing `AdminScopeFilterContext`).

Do you want me to proceed with phases 1–3 now (nav + route + schema + DB migration), and layer the live AI streaming (phase 4+) after the migration is approved?
