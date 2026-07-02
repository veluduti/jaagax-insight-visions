# Phase 4 — JAAGA X Partner Hub

Ship three modules in one pass. All routes live under `/partners/*` and reuse `PartnerSubNav`.

## 1. Analytics & Reports — `/partners/analytics`

Data source: `hotel_bookings` (already exists), `hotel_rooms`, `hotel_rate_calendar`.

KPI cards (period-filtered: 7d / 30d / 90d / custom):
- Revenue (sum of confirmed + checked_out `total_amount`)
- ADR — revenue ÷ room-nights sold
- RevPAR — revenue ÷ available room-nights
- Occupancy % — nights sold ÷ (rooms × days)
- Booking count, cancellation rate, avg lead time

Charts (recharts, already installed):
- Revenue trend (line, daily)
- Occupancy heatmap (30-day grid)
- Channel mix (donut — from `hotel_bookings.source`)
- Top rooms by revenue (bar)

Export:
- CSV of raw booking rows (client-side `Blob` download)
- PDF summary via `jspdf` (already in deps)

## 2. Payouts & Finance — `/partners/payouts`

Derived from bookings, no gateway. New tables (migration):

```text
hotel_payout_settings   ← bank/UPI details per hotel
hotel_payout_batches    ← monthly rollup rows
hotel_commission_config ← per-channel commission % (default 15%)
```

Views:
- Earnings ledger: booking → gross → commission → net (from `hotel_room_channel_mappings.commission_percent` fallback to config)
- Monthly summary cards: This month / Last month / YTD
- Payout schedule table with status (pending/processing/paid) — admin-controlled
- Bank details form (IFSC, account, UPI) → saved to `hotel_payout_settings`
- Invoice PDF per batch (jspdf)

RLS: hotel-owner scoped via existing `user_owns_hotel()`.

## 3. Reviews & Guest Messaging — `/partners/inbox`

New tables:

```text
hotel_reviews           ← rating, title, body, guest_name, response, responded_at
hotel_guest_messages    ← thread per booking, sender=guest|partner, body, sent_via_whatsapp bool
```

UI (two-tab layout):
- **Reviews tab**: list with star filter, rating breakdown widget, inline "Reply" that saves to `response`
- **Messages tab**: booking-threaded conversation, textarea + "Send in-app" / "Send via WhatsApp" split button

WhatsApp integration:
- Edge function `partner-send-whatsapp` reuses existing Twilio connector
- Formats `+91` if missing, posts to `/Messages.json` with `From=whatsapp:` + business number
- Logs delivery status to `hotel_guest_messages.sent_via_whatsapp`

## 4. Wiring

- Add analytics/payouts/inbox routes in `src/App.tsx`
- Extend `PartnerSubNav` with 3 new tabs
- Add quick-link cards on `PartnerDashboard` overview

## Technical notes
- One migration creates all 5 tables + GRANTs + RLS scoped to `user_owns_hotel()`
- No new dependencies (recharts, jspdf, Twilio connector all present)
- Reviews stay read-only from guest side for now (partners see + reply; guest submission form is Phase 5)
- Payout status transitions are admin-only (add small admin panel section in a follow-up if needed)

Say **go** to ship.
