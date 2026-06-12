# Seller Dashboard Upgrade — Phased Plan

Goal: Add the requested features to the **existing** `SellerDashboard.tsx` (877 lines, fully wired) as a **non-destructive overlay**. Current listings, agent assignment, boost, chat, and visit flows stay intact. New features render in new sections above/within the page, behind a feature scope so nothing collides.

Design: luxury emerald-glass — reuse existing `glass-panel`, emerald glow, dark background. No new color tokens, no purple/indigo. Framer-motion already in use.

---

## Phase 1 — Database foundations (one migration)

New tables (all in `public`, RLS on, GRANT to authenticated + service_role):

- `wallets` — `user_id` (unique FK), `balance numeric default 0`, `auto_recharge bool default false`, `auto_recharge_threshold`, `auto_recharge_amount`
- `wallet_transactions` — `user_id`, `amount`, `type` (`credit`/`debit`), `description`, `status`, `reference`, `created_at`
- `seller_subscriptions` — `user_id`, `plan_type` (`free`/`premium`/`agent_pro`), `started_at`, `expires_at`, `is_active`
- `monthly_posting_limits` — `user_id`, `month_year` (text YYYY-MM), `posts_used int`, `free_limit int default 1`, unique(user_id, month_year)
- `kyc_verifications` — `user_id` unique, `status` (`not_started`/`pending`/`verified`/`rejected`), `aadhaar_url`, `pan_url`, `selfie_url`, `rejection_reason`, `reviewed_by`, `reviewed_at`
- `seller_activity_logs` — `user_id`, `activity_type`, `metadata jsonb`, `created_at`
- Add to existing `properties`: `is_sold bool default false`, `sold_at timestamptz`, `has_price_drop_ribbon bool default false`, `previous_price numeric`, `price_dropped_at timestamptz`
- Reuse existing `notifications` table (already present).

RPCs (security-definer):
- `increment_wallet_balance(_user_id, _amount, _description, _reference)`
- `decrement_wallet_balance(_user_id, _amount, _description, _reference)` — raises if insufficient
- `check_and_consume_posting_quota(_user_id)` — returns `{allowed, free_remaining, plan, charged}`; auto-debits ₹500 if free exhausted and plan ≠ premium/agent_pro
- `mark_property_sold(_property_id)` — owner-only
- `drop_property_price(_property_id, _new_price)` — owner-only, sets ribbon + previous_price
- `submit_kyc(_aadhaar, _pan, _selfie)` and admin `review_kyc(_user_id, _decision, _reason)`

Storage bucket: `kyc-documents` (private), RLS so user reads/writes own folder, admin reads all.

## Phase 2 — Wallet + Subscription + KYC widgets

New components (all in `src/components/seller/`):
- `WalletBalance.tsx` — balance card, Add Money dialog (₹500/1000/2000/5000, min ₹100, **mock** top-up that just calls `increment_wallet_balance`), auto-recharge toggle, last 5 transactions list with "View all" sheet.
- `SubscriptionManager.tsx` — current plan badge, Free Quota progress ("X / Y posts used this month"), Upgrade dialog with two options (pay-per-post from wallet vs ₹2000/mo). On premium select, show "Switch to Agent profile to get leads?" CTA → `/select-profile`.
- `KYCVerification.tsx` — status badge, benefits checklist when not verified, "Complete KYC" dialog with 3 file inputs uploading to `kyc-documents` then inserting a `pending` row. Read-only once submitted; shows rejection reason if any.

Renders in a new "Seller Tools" section near the top of `SellerDashboard.tsx`, between Hero and existing Stats — additive only.

## Phase 3 — Notification Center + Real-time

- `NotificationCenter.tsx` — bell icon with unread badge in dashboard header, popover list, mark-all-read, click-to-navigate via `action_url`.
- Realtime subscription on `notifications` filtered by `user_id` → sonner toast on insert.
- Wired into the existing header row (next to existing Refresh/Logout — no removal).

## Phase 4 — Listing card enhancements

Inside the existing listing card render (without touching the loop structure):
- New `MarkAsSoldButton.tsx` (AlertDialog → RPC, then refetch).
- New `PriceDropDialog.tsx` (input new price → RPC, shows "Price Reduced" ribbon overlay when `has_price_drop_ribbon`).
- "Edit & Resubmit" button on rejected (already exists in part — verify) and timeline progress bar (Submitted → Review → Agent → Approved) using shadcn `Progress`.

The existing Boost / View / Chat buttons remain untouched.

## Phase 5 — AI Recommendations + Activity Timeline

- `AIRecommendations.tsx` — calls existing `ai-suggest-properties` / `ai-property-decision` edge function with seller's portfolio; renders Smart Match %, Price Prediction, "Upgrade to Agent" if listings ≥ 2, location insights. Falls back to static cards if AI unavailable.
- `ActivityTimeline.tsx` — reads `seller_activity_logs` + `buyer_journey_events` for the user; chronological list with icons.
- `ReferralLink.tsx` — generates `/?ref=<userId>` shareable link with copy button.

## Phase 6 — Visit management section

`VisitManagement.tsx` — pulls `visit_bookings` where property belongs to seller; shows scheduled/past with cancel/modify (cancel = status update). Renders below listings tabs.

## Phase 7 — Posting flow gating

Wrap the existing "Sell Property" CTA: before navigating to `/agent/add-property` (or seller add route), call `check_and_consume_posting_quota`. If quota exhausted and wallet insufficient → open upgrade dialog. Otherwise proceed. KYC verified is **encouraged**, not blocking (toast nudge).

---

## Non-collision guarantees

- Zero deletions in existing `SellerDashboard.tsx`. Only **inserts** of new sections + light wrap of the Sell Property button.
- All new tables are isolated; no FKs into existing tables except `auth.users` and `properties.id`.
- New columns on `properties` are nullable / defaulted false.
- Edge functions: reuse existing `create-notification`. Only RPCs are added (no new edge functions needed since payments are mocked).
- Routing: no new routes required; everything dialog/sheet-based inside the dashboard.

## Out of scope (will revisit)

- Buyer Dashboard (per your reply — later).
- Real Razorpay/Stripe wiring (mock now).
- Admin KYC review UI (RPC + table ready; admin panel surfacing can be a small follow-up).

## Suggested order of execution

1. Phase 1 migration (single approval).
2. Phases 2 + 3 in one code drop (wallet/sub/KYC widgets + notifications).
3. Phases 4 + 7 (listing actions + posting gate).
4. Phases 5 + 6 (AI + activity + visits).

Approve and I'll start Phase 1 (the migration).
