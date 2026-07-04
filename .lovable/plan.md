
## Scope

Phases 1–4 only: public listing → hotel details → availability search → room selection card. No payment / guest info / summary yet (those come in the next iteration; Razorpay integration will be a separate step where I request keys).

## What changes (user-visible)

**Hotels.tsx**
- Fetches only approved + active hotels that have at least one active room (via a room-count check).
- Each card's "Starts From ₹X" is computed from the cheapest active room's `base_price` (not the legacy `partner_hotels.price_per_night`), with discount badge.
- Existing search/filters/hero UI kept as-is.

**HotelDetail.tsx**
- New "Search Rooms" bar at the top of the page: check-in date, check-out date, adults, children, rooms → routes to the Rooms tab and triggers availability check.
- The "Room Types" tab is replaced with a real, DB-driven MMT-style room-list component.
- Replaces the hardcoded `HotelRoomTypes.tsx` mock data.

**New `HotelRoomList.tsx` (MMT-style card)**
Per room, from DB:
- Gallery (`hotel_rooms.photos`), name, size, bed type, max occupancy, amenities, description
- Base price × nights + pricing rules (reuses existing `booking-engine-quote` edge fn per room)
- Discount, taxes (12% GST placeholder for now — flagged in code for real config later), final price
- Policies: free breakfast, cancellation policy, min-nights
- "Only N rooms left" from live inventory
- "Select Room" CTA — currently opens existing `HotelBookingModal` with the selected room pre-filled (fully replaced in Phase 5+)

## Database

New table `hotel_room_inventory` (date × room_id × available_units) with:
- One row per (room_id, date), default `available_units = hotel_rooms.total_units`
- RLS: public SELECT, owner + admin write
- Availability helper RPC `check_room_availability(room_id, check_in, check_out)` → returns `min_available` across the range and computes it from `total_units - (confirmed booking overlap count)` when no explicit inventory row exists (so it works before backfill).
- Trigger on `hotel_bookings` insert/cancel that decrements/restores inventory for the date range when `status = 'confirmed'`.

No changes to existing tables' structure.

## Files touched

- `supabase/migrations/*` — new inventory table, RPC, trigger, grants + RLS
- `src/pages/Hotels.tsx` — swap fetch to filter by "has active rooms", compute min price from `hotel_rooms`
- `src/pages/HotelDetail.tsx` — add availability search bar, wire selected dates to rooms tab
- `src/components/hotels/HotelRoomList.tsx` — NEW, real room cards
- `src/components/hotels/HotelRoomTypes.tsx` — thin wrapper delegating to `HotelRoomList` (keeps existing imports working)

## Out of scope this round

Phases 5–15 (guest info, add-ons, summary, payment, check-in flow, cancellation, reviews). Razorpay integration will be requested in the next iteration once you're ready to share the key_id/key_secret.
