# Partner Hub — Phase 1

A dedicated partner portal at `/partners/*` (Booking.com Partner Hub style), replacing the existing `/hotels/partner` wizard. The current `HotelPartnersPanel` admin approval stays and is extended for the richer KYC docs.

## Scope (this phase only)

- Prompt 1: Landing + partner auth (register / login / forgot-password / OTP / welcome)
- Prompt 2: KYC document upload, verification status timeline, admin approval

Prompts 3–12 (PMS, Dashboard, Rooms, Bookings, etc.) come in follow-up turns.

## Routes

```text
/partners                    → PartnerLanding      (public marketing)
/partners/register           → PartnerRegister     (multi-step form)
/partners/login              → PartnerLogin
/partners/forgot-password    → PartnerForgotPassword
/partners/verify-otp         → PartnerVerifyOtp    (reuses existing signup-otp edge fn)
/partners/welcome            → PartnerWelcome      (first-time success)
/partners/kyc                → PartnerKYC          (upload docs)
/partners/status             → PartnerStatus       (pending / rejected / approved timeline)
```

Auth backend stays the same (Supabase + Hotel role + existing `signup-otp` edge function). Only the UI is partner-branded.

## Landing page sections

- Hero: "Grow your hotel business with JAAGA X" + CTA
- Why Partner: 4-benefit grid (reach, revenue, insights, support)
- Benefits detail
- Pricing (Starter / Growth / Enterprise — commission-based)
- FAQ (accordion)
- Contact Sales form
- Sticky nav with Login / Register buttons

## Registration (multi-step)

Step 1 Account: Owner Name, Mobile, Email, Password
Step 2 Business: Hotel Name, Company Name, Business Type, Country, State, City
Step 3 Compliance: GST, PAN, No. of Hotels, No. of Rooms
Step 4 OTP verify → Welcome screen → `/partners/kyc`

Validation with zod. Signup uses existing `initSignupOtp` service with `selectedRole: "hotel_manager"`.

## KYC upload screen

Reuses the `hotel-documents` storage bucket. Sections with drag-drop + preview:
- GST Certificate
- PAN Card
- Trade License
- Cancelled Cheque
- Address Proof
- Identity Proof
- Hotel Images (multi)
- Bank details form

On submit → creates/updates row in `hotel_partner_applications`, status `pending`. Redirect to `/partners/status`.

## Status screen

Timeline (Submitted → Under Review → Approved / Needs Info / Rejected) with the existing admin panel's status column driving it. Realtime channel already exists.

## Admin

`HotelPartnersPanel` (existing) gets a small addition to display the new KYC document links (trade license, cancelled cheque, address proof, identity proof, bank details) alongside the existing GST / ID / business registration docs.

## Database

Single migration adding nullable columns to `hotel_partner_applications`:

```sql
ALTER TABLE public.hotel_partner_applications
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS num_hotels int,
  ADD COLUMN IF NOT EXISTS num_rooms_total int,
  ADD COLUMN IF NOT EXISTS trade_license_url text,
  ADD COLUMN IF NOT EXISTS cancelled_cheque_url text,
  ADD COLUMN IF NOT EXISTS address_proof_url text,
  ADD COLUMN IF NOT EXISTS identity_proof_url text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS admin_notes text;
```

No new tables. Existing RLS/GRANTs already cover the table.

## Existing wizard retirement

`/hotels/partner` route redirects to `/partners/register`. `HotelManagerDashboard` first-login gate updated to redirect unfinished KYC users to `/partners/kyc` instead of `/hotels/partner`.

## Existing landing "Partner with us" button

Repointed to `/partners`.

## Design system

- Dark + emerald glow (project standard), glassmorphism cards
- Reuses existing shadcn components — no hardcoded colors
- Framer-motion for hero + step transitions (already installed)
- Fully responsive, mobile-first

## Files (new)

```text
src/pages/partners/PartnerLanding.tsx
src/pages/partners/PartnerRegister.tsx
src/pages/partners/PartnerLogin.tsx
src/pages/partners/PartnerForgotPassword.tsx
src/pages/partners/PartnerVerifyOtp.tsx
src/pages/partners/PartnerWelcome.tsx
src/pages/partners/PartnerKYC.tsx
src/pages/partners/PartnerStatus.tsx
src/components/partners/PartnerNav.tsx
src/components/partners/PartnerFooter.tsx
```

## Files (edited)

- `src/App.tsx` — add /partners routes; redirect /hotels/partner → /partners/register
- `src/components/admin/HotelPartnersPanel.tsx` — show new KYC docs
- `src/pages/HotelManagerDashboard.tsx` — first-login redirect to /partners/kyc
- Any existing "Partner with us" CTAs on the hotel landing page

## Out of scope this turn

Prompts 3–12 (PMS/Channel Manager, Dashboard widgets, Rooms, Inventory, Bookings, Users & Perms, Integrations, Reports, Settings, bonus modules). We'll tackle those in follow-ups.

Once you approve, I'll ship this in one build.
