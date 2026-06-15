# Financial Services Provider Module — Phase 1 Plan

A complete new role with luxury-themed dashboard. Scope is large (~15 components, 8 tables) so I'm splitting into clear phases. Confirm before I start.

## Phase A — Role + Auth Integration
1. Add `financial` as a new selectable role (alongside Buyer/Seller/Agent/Builder) in:
   - `SelectProfile.tsx` (role chooser after signup/login)
   - `Auth.tsx` signup flow + `submit_signup_request` enum
   - `authRoleResolver.ts` + `roleAccess.ts` mappings
   - `ProtectedRoute.tsx` — new `/dashboard/financial` route
2. Update DB: extend `signup_requests.requested_role` and `profiles.type` to accept `'financial'`. Add `assign_user_role` to allow `'financial'` and create matching `user_roles.role` enum value.

## Phase B — Database Schema
New tables (with GRANTs + RLS scoped to `auth.uid() = user_id` via `financial_providers.user_id`):
- `financial_providers` (entity_type, services_offered[], pan_url, gst_url, rbi_registration, company_reg_cert_url, signatory_id_url, logo_url, kyc_status, subscription_status, subscription_expires_at)
- `financial_branches` (provider_id, head_office, branch_locations jsonb, service_areas[], operating_states[], website)
- `financial_loan_applications` (provider_id, buyer_id, property_id, loan_amount, property_value, tenure_months, status, assigned_rm_id, disbursed_amount, sanction_letter_url, rejection_reason)
- `financial_loan_documents` (application_id, document_type, file_path, verified_status, verified_by, notes)
- `financial_leads` (provider_id, lead_type, customer_name, requirement, budget, location, contact_json, price, is_purchased, purchased_at)
- `financial_promotions` (provider_id, package_type, amount, start_date, end_date, is_active)
- `financial_team_members` (provider_id, user_id, name, email, role: rm|verifier|admin, performance_json)
- `financial_notifications` (provider_id, title, message, channel, is_read, link)

Reuse existing `wallets` + `wallet_transactions` for wallet (no new table).

## Phase C — Pages & Components (luxury card UI)

**Pages** (all under `/dashboard/financial/*`):
- `FinancialDashboard.tsx` — KPI cards + Recharts trend/pie
- `FinancialRegistration.tsx` — 4-step wizard (Account → Professional → KYC → Branches)
- `FinancialLeads.tsx` — tabbed lead marketplace with purchase
- `FinancialApplications.tsx` — table + detail drawer (3 tabs: Details, Documents, Actions)
- `FinancialDocuments.tsx` — cross-application document hub
- `FinancialWallet.tsx` — balance, add funds, auto-recharge, history
- `FinancialPromotions.tsx` — 4 packages with purchase
- `FinancialSettings.tsx` — profile, KYC, team management, notification prefs
- `FinancialNotifications.tsx` — center

**Shared luxury components** (`src/components/financial/`):
- `LuxuryKpiCard.tsx` — gold-accent glassmorphism card
- `LuxuryStatTile.tsx`, `LeadCard.tsx`, `PromotionPackageCard.tsx`, `ApplicationDetailDrawer.tsx`, `RegistrationStepper.tsx`, `TeamMembersPanel.tsx`

**Design language** (matches existing dark + emerald-glow + adds gold accents for "premium financial" feel):
- Background: existing dark glass
- Accent: gradient gold `from-amber-300 via-yellow-400 to-amber-600`
- Numeric KPIs use tabular-nums + subtle glow
- All cards use semantic tokens from `index.css`

## Phase D — Integration touchpoints (stubs in Phase 1)
- "Get Loan Assistance" button on `PropertyDetail.tsx` → opens dialog listing financial providers
- Agent/Builder dashboards get a "Refer to Financial Partner" action (creates a `financial_leads` row, credits provider)

## Phase E — Backend logic
- DB function `purchase_financial_lead(_lead_id)` — wallet debit + reveal contact
- DB function `check_financial_kyc(_user_id)` — boolean used before lead purchase
- Reuse `increment_wallet_balance` / `decrement_wallet_balance`

## Out of scope (Phase 1)
- Razorpay live integration (UI ready, will mock "Add Funds" against wallet RPC)
- OTP for email/phone in registration (uses existing Supabase auth instead)
- Real notification dispatch via WhatsApp/SMS (preferences saved, dispatch in Phase 2)
- Encrypted-at-rest customer documents beyond standard Supabase Storage RLS

## Approx surface area
~9 pages + ~8 shared components + 1 migration (8 tables, 2 functions) + 4 file edits to wire role into auth.

Confirm to proceed and I'll ship it.
