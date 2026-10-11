# Smart Stays — multi-destination stay packages

Agents and hotel partners build packages (several destinations, hotels and dates). Every hotel owner involved approves. Customers pay once, and the platform then confirms each hotel stay.

Built in 4 phases, each one usable on its own. This plan delivers Phases 1–2 now. Phases 3–4 follow after you approve them.

## Phase 1 — Package builder and hotel approvals
- **Package builder** (agent dashboard and partner dashboard): title, photos, inclusions, ordered stops (destination, dates, notes), and one or more hotel stays per stop (hotel, room type, rooms, adults/children, meal plan, check-in/out).
- **Checks:** dates run in order, stays fall inside stop dates, room capacity fits the guests, and hotels come only from live JAAGA hotels.
- **Revisions:** submitting freezes a numbered revision. Editing a published package creates a new revision. Existing bookings keep the itinerary and price they booked.
- **Approvals:** every hotel owner gets an approval request for their stay only. They can Approve, Reject (reason required) or Request changes (reason required). A creator's own hotels are approved automatically. Changing hotel, dates, rooms, rate or cancellation terms resets only the affected approvals.
- **Publish** unlocks only when all approvals for the current revision are done. Everyone involved is notified at each step.

## Phase 2 — Customer browsing, price quote and single payment
- **"Smart Stays" tab under Stays:** package cards and a detail page with timeline, hotels, dates, inclusions and cancellation terms.
- **Quote:** the server works out the price from current room rates and availability for each hotel. The quote shows per-hotel prices, taxes and total, and expires after 15 minutes.
- **Checkout:** one Razorpay payment, checked on the server. This creates one package booking plus one reservation per hotel.
- **Confirmation:** after payment is verified, each hotel stay is reserved on the shared availability calendar. The package shows Confirmed only when every hotel is confirmed.
- **"My Smart Stays" page:** payment status, each hotel's status and reference, and a timeline.

## Phase 3 — Failure recovery, cancellations and refunds (next)
- **Background worker:** retries with backoff, safe repeat protection, and stuck bookings sent to Manual review.
- **Undo and refund:** if a hotel fails after payment, confirmed stays are cancelled and a Razorpay refund is issued and tracked until Razorpay confirms it.
- **Customer cancellation requests:** refunds follow the published policy.

## Phase 4 — Commission, admin tools and settlements (next)
- **Commission rules:** Global Admin sets versioned rules with effective dates, plus per-agent overrides.
- **Commission ledger:** commission is a % of the eligible selling price, saved at booking time. Earnings, reversals and payouts are recorded as separate entries that are never overwritten.
- **Admin Smart Stays console:** approvals, bookings, manual-review queue, refunds and audit log.
- **Hotel views:** hotel managers see reservations and settlement details for their own properties.

## Technical details
- **Tables:** `smart_stays`, `smart_stay_revisions` (frozen JSON itinerary and pricing), `smart_stay_stops`, `smart_stay_hotel_stays`, `smart_stay_approvals`, `smart_stay_quotes`, `smart_stay_bookings` (parent), `smart_stay_reservations` (child), `smart_stay_events` (timeline/audit). Phase 4 adds `smart_stay_commission_rules` and `smart_stay_commission_ledger`.
- **Access rules:** permissions are enforced in the database. Hotel managers can approve only through `is_hotel_member`. Statuses, prices and approvals change only through security-definer RPCs or functions, never by direct client updates.
- **Server functions:**
  - `smart-stay-quote`: uses the shared pricing engine and `check_room_availability`.
  - `smart-stay-pay`: creates and verifies the Razorpay order, with idempotent, deduplicated payment confirmation.
  - `smart-stay-confirm`: worker that reserves each stay through `reserve_inventory` into `hotel_availability_blocks`.
- **Code layout:** `src/services/smartStayService.ts` with React Query hooks, following the services pattern.
- **Hotel confirmation:** JAAGA hotels confirm internally. External channel suppliers sit behind a documented adapter interface (mocked until credentials exist).
- **Testing:** Vitest tests for pricing, date validation and the status machine.
