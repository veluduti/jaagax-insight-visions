# Phase 5 — Growth, Scale & Guest Experience

Build on Phases 1–4 (KYC, PMS, Operations, Analytics/Payouts/Inbox) to help hotel partners grow direct revenue, price smarter, and delight guests.

## Modules

### 1. Direct Booking Engine & Embeddable Widget
- Public hotel microsite at `/book/:hotelSlug` (rooms, rates, availability, gallery, reviews).
- Embeddable `<script>` widget hotels paste on their own website; opens booking flow in iframe/modal.
- Zero-commission bookings write directly to `hotel_bookings` with `source='direct'`.

### 2. Dynamic Pricing & Promotions Engine
- New table `hotel_pricing_rules` (occupancy-based, day-of-week, lead-time, min-stay).
- New table `hotel_promo_codes` (percent/flat, validity, usage cap, applicable room types).
- Rule evaluator applied on `hotel_rate_calendar` reads at booking time.
- Partner UI at `/partners/pricing` to create/preview rules.

### 3. Guest Experience Portal (Pre-arrival → Post-stay)
- Guest-facing page at `/stay/:bookingCode` (no login, tokenized link sent via email/WhatsApp).
- Digital check-in form (ID upload, ETA, preferences), house rules acknowledgment.
- In-stay: request add-ons (breakfast, pickup), message hotel, view invoice.
- Post-stay: review prompt feeding `hotel_reviews`.

### 4. Add-on Services & Upsell Marketplace
- New table `hotel_addons` (title, price, category: F&B/transport/experience, availability window).
- New table `hotel_booking_addons` linking selections to bookings.
- Surfaced in booking engine, guest portal, and reservations screen for walk-in upsell.

### 5. Multi-property & Staff Roles
- Extend `hotel_partner_applications` for chains; add `hotel_staff` table (user_id, hotel_id, role: owner/manager/front-desk/housekeeping).
- Property switcher in `PartnerSubNav`.
- Role-gated routes: housekeeping sees only room status board; front-desk sees reservations; manager sees analytics/payouts.
- Consolidated multi-property dashboard for owners.

## Technical Details

- **DB migrations:** `hotel_pricing_rules`, `hotel_promo_codes`, `hotel_addons`, `hotel_booking_addons`, `hotel_staff`, plus columns on `hotel_bookings` (`source`, `promo_code`, `addon_total`).
- **RLS:** reuse `user_owns_hotel(hotel_id)`; staff access via new `user_has_hotel_role(hotel_id, role)` security-definer.
- **Edge functions:** `booking-engine-quote` (applies pricing rules + promos), `booking-engine-confirm`, `guest-portal-token` (issues signed tokens), `send-guest-portal-link`.
- **Widget:** built as standalone `dist/widget.js` served from `/public/widget.js`, mounts iframe pointing to `/book/:hotelSlug`.
- **Guest portal auth:** JWT-signed magic links, no Supabase auth session.
- **Routes:** `/book/:slug`, `/stay/:code`, `/partners/pricing`, `/partners/addons`, `/partners/staff`, `/partners/properties`.

## Suggested Build Order
1. Multi-property + staff roles (foundation for everything else).
2. Dynamic pricing + promos.
3. Direct booking engine + widget.
4. Add-ons marketplace.
5. Guest experience portal.

Approve to proceed, or tell me which modules to drop/reorder.
