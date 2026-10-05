# JAAGA Hospitality: one connected partner, customer and admin system

## What already exists (we keep and extend it)
- Partner sign-up, verification by an admin, and blocking the dashboard until approved
- One hotel per partner, with profile, business types, amenities, map pin and photos
- Room types with capacity, beds, extra beds and meals; rate plans, pricing rules, promo codes, add-ons
- Room counts per date, reservations, guests, inbox, staff, payouts and analytics
- Customer search (location, dates, guests), the 3-step stay finder, the AI search bar and "Recommended for you"
- Booking with Razorpay and line items

## What's missing (and what this plan builds)
1. **One partner, many businesses, many properties.** A partner such as "Ravi Hospitality Group" can own several businesses, and each business can have several properties. Existing hotels are moved in automatically, so nothing breaks.
2. **Setup for each property type.** Hotel, Resort, Hostel, Apartment, Serviced Apartment, Co-living, PG, Homestay and Farm Stay each get their own setup questions, using the existing shared list of categories.
3. **Individual units and beds.** On top of room types, partners can list each room, unit or bed (Room 101, Bed A). Hostels, PGs and co-living spaces can sell single beds.
4. **Availability calendar.** Partners can block or unblock dates. Booking, cancelling and blocking all update the same calendar, and a protection step stops the same room being booked twice.
5. **Long-stay pricing.** Weekly and monthly prices (for example ₹15,000/month) and minimum stays, shown to customers in search.
6. **Stay requests and matching.** Every customer search or "Tell JAAGA" request is saved as a stay request. Matches score only the facts partners entered and show "Why this matched", so AI never invents features. Partners see these reasons and demand trends.
7. **Onboarding status and quality score.** A step-by-step checklist (business, property, rooms, pricing, availability, photos, verification), then Publish. A data-quality score is shown to the partner and the admin.
8. **"View as customer."** A partner can preview their listing exactly as customers see it.
9. **Cancellation rules.** Cancelling releases the dates according to the cancellation policy and records the refund amount.
10. **Admin hospitality panel.** Separate queues for partner verification and property verification; publish or unpublish; booking monitoring; commission; and an audit log of every admin change.
11. **Test data.** The spec's "Urban CoLiving" example (private room, ₹15,000/month, HITEC City, Wi-Fi, Laundry, Workspace) is added end to end, then checked for a price change, a blocked room, a booking and a cancellation.

## Order of work
- Phase 1: items 1–4 (structure, types, units, calendar and double-booking protection)
- Phase 2: items 5–7 and 9 (pricing, matching, onboarding, cancellation)
- Phase 3: items 8, 10 and 11 (preview, admin, test data and the full test)

## Technical details
- New tables: `partner_accounts`, `partner_businesses`; `partner_hotels` gains `business_id` and `onboarding_status` and serves as the property. Also `hotel_inventory_units` (room or bed level), `hotel_availability_blocks`, `stay_requests`, `match_results` (score and reasons as JSON), `hospitality_audit_log`, plus weekly and monthly price columns on `hotel_rate_plans`.
- Bookings are made through a locking database function (`reserve_inventory`) that checks the calendar and blocks inside one transaction. Cancelling calls `release_inventory`.
- The matching engine runs in an Edge Function and scores only stored attributes.
- New service files on the app side (`partnerService`, `inventoryService`, `availabilityService`, `matchingService`) so screens don't query the database directly.
- Every table gets GRANT and RLS rules: partner members manage their own data, customers can only read published properties, and admins use `is_admin()`.
