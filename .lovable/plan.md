# Unified Customer Profile — Buyer + Seller + Builder

## Where things stand today

All three dashboards already live under one route, `/dashboard/customer`, as three tabs:

```text
/dashboard/customer
  ├── ?view=buying    → BuyerDashboard   (embedded)
  ├── ?view=selling   → SellerDashboard  (embedded)
  └── ?view=builder   → BuilderDashboard (embedded)
```

Old links (`/dashboard/buyer`, `/dashboard/seller`, `/dashboard/builder`) redirect here.
Feature access (`roleAccess.ts`) already grants the `customer` role the full union of
buyer + seller + builder capabilities, and the builder-only listing gate was removed.

### What each tab covers today

| Tab | Core capabilities |
| --- | --- |
| Buying | Saved/favourite properties, AI recommendations, visits & bookings, preferred locations, wallet, referrals, loan/KYC, activity timeline |
| Selling | My listings, listing performance, leads & enquiries, hotel bookings, seller analytics, alert channels |
| Builder | Projects, property upload form, builder profile/microsite, ad analytics, team & CRM, delivery/trust badges |

## What is still inconsistent

1. Role label drift — internal role stays `buyer`/`seller`/`builder`, UI says "Customer". Some screens still print the raw role ("Your current role is buyer").
2. Duplicate widgets — favourites, activity timeline and notifications render in more than one tab.
3. Stats are per-tab; there is no single "customer at a glance" summary.
4. Tab state is remembered by URL only; returning users always land on Buying.
5. Guards still speak in three roles, which makes future feature gating easy to get wrong.

## The plan

### 1. One customer identity (presentation only)
- Add a single `useCustomerCapabilities()` helper that reports what the signed-in customer
  can do (`canBuy`, `canSell`, `canBuild`) instead of components reading raw roles.
- Remove every remaining raw-role string from user-facing copy; always say "Customer".

### 2. Add an Overview tab (new default)
A first tab that summarises all three sides in one screen:
- Counters: saved properties, scheduled visits, active listings, leads, projects, bookings.
- Merged activity timeline (buying + selling + builder events, newest first).
- Quick actions: Search properties, List a property, Add a project, Book a visit.
- Cards deep-link into the relevant tab, so nothing is duplicated logic-wise.

### 3. De-duplicate shared widgets
- Activity timeline, notifications and wallet move to shared components rendered once
  (Overview + a compact variant where genuinely useful).
- Favourites stay only in Buying.

### 4. Tab memory + clean routing
- Persist the last used tab in `localStorage`; `?view=` still wins when present.
- Keep the three redirects intact for old bookmarks and emails.

### 5. Guard simplification
- `ProtectedRoute` keeps one `customer` bucket covering buyer/seller/builder/customer.
- Admin, agent, hotel manager and financial roles stay separate and untouched.

## Technical notes

- Files touched: `src/pages/CustomerDashboard.tsx` (new Overview tab, tab memory),
  new `src/features/customer/CustomerOverview.tsx`, new
  `src/hooks/useCustomerCapabilities.ts`, plus small copy edits in the three embedded
  dashboards and `PropertyUploadForm.tsx`.
- Overview counters reuse the existing helpers in `src/services/dashboardService.ts`
  (`getBuyerDashboardSummary`, `getAgentDashboardSummary`, `getBuilderDashboardSummary`),
  fetched in parallel with graceful `0` fallbacks.
- No database migrations, no RLS changes, no role-model changes — this is a
  presentation and navigation consolidation.
