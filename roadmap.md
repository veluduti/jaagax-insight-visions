# Roadmap — Agent Profile page rebuild

## Multi-property reference dashboard
- [x] Match purple portfolio layout, property list/grid, filters, search and management navigation.
- [x] Connect real cross-property metrics, occupancy/revenue charts, tasks/activity and group/brand settings to existing records; enable authorized live refresh and atomic empty-draft deletion.
- [x] Fourteen regression tests passed; real owner brand save/reload/restore, group creation/deletion, second-property creation/editor navigation, archive/restore and safe draft deletion verified. Temporary verification records removed; desktop/695px/390px have no overflow or runtime errors. Existing inventory/bookings retained; no publishing or payment executed. Revenue is confirmed booking value, not cash-settlement accounting.

## Hotel partner reference dashboard
- [x] Build the purple reference workspace, overview, sidebar and responsive shared header.
- [x] Reuse room, rates, inventory, booking, guest, payment, reporting and review tools inside the workspace.
- [x] Connect property editing, media, policies/FAQs, departments and service-category management to existing saved data; add guest-request status management.
- [x] Preserve onboarding, ownership, publication review and multi-property selection; real-owner save/reload/restore, room/rate/calendar/service/review routes and desktop/mobile navigation verified; six validation tests passed. Existing records retained; no payment or publishing action executed. End-to-end verification of every legacy module and a multi-property account remains unavailable in the single-property test account.

## Pre-check-in ID images
- [x] Open Edit Details in an on-page popup using the shared guest upload form. Real booking popup, close/reopen, missing-image validation and mobile fit verified; eleven tests passed. No real ID images submitted.
- [x] Collect separate ID images per room guest; add Driving Licence, Voter ID Card and PAN Card. Eleven tests passed; real two-guest booking shows separate uploads and all five choices, with incomplete submissions blocked. No real ID images submitted.
- [x] Replace ID-number entry with private Aadhaar/passport image uploads and atomic save/notification. Four tests and authenticated real-booking form/rejected-file checks passed; no real ID image was uploaded.

## Hotel price markup management
- [x] Expose Hotel Price Markups in the main Global Admin Features menu using the existing pricing panel; regional flow-only menus remain unchanged.
- [x] Add global-admin-only global and per-hotel markup configuration with audit history and inheritance/reset controls.
- [x] Apply non-compounding prices to native quotes, long-stay quotes and supplier retail displays; preserve supplier payable amounts and existing bookings. Visible discovery/details refresh after changes and periodically across sessions.
- [x] Add administration controls and regression coverage; verify real native/supplier results and regional-admin rejection.
- [ ] Global-admin save/reload verification requires selecting and approving a Global Admin test session; the requesting account is State Admin.
- [ ] HyperGuest margin collection requires approved payment/settlement integration; nonzero markup bookings and supplier-prepaid rates remain blocked.

## Admin dashboard loading recovery
- [x] Resolve dashboard administrator access from active server-managed scopes rather than the retired role table.
- [x] Prevent unresolved account access from leaving the dashboard on an endless loading message.
- [x] Six regression tests passed; authenticated global dashboard opens and survives reload. Repair the same retired-role check in the admin user-list function.

## Hotel reference cards
- [x] Show lowest available matching room prices, real inclusions and quoted discounts without changing checkout prices; supplier prepaid safeguards remain unchanged.
- [x] Match partner/name, compact area/city/distance, blue reviews and saved specialty highlights in grid/list cards; absent areas/ratings/specialties remain hidden.
- [x] 47 focused tests passed; real Hyderabad native and supplier results verified in grid/list at desktop and 631px, including live supplier breakfast inclusion; no booking made.

## HyperGuest production safeguards
- [x] Correct child occupancy, customer pricing/BAR, rate eligibility and nationality/currency continuity.
- [x] Validate bookings against server-owned quotes and current supplier conditions; clarify card guarantees versus collection and block unconfigured prepaid settlement.
- [x] Repair recovery, per-room statuses, cancellation simulation/timezones, and persisted voucher disclosures; no actual cancellation performed.
- [x] Add incremental synchronization/retries and authenticated managed schedules; sync and reconcile callbacks returned HTTP 200.
- [x] 38 focused tests passed; deployed connector and authenticated live hotel availability-to-persisted-quote/payment screen verified; mobile has no overflow or page errors. No reservation made.
- [ ] Supplier prepaid settlement: requires confirmed commercial payment arrangement; never assume card forwarding collects the customer total.

## Reference Properties marketplace
- [x] Match the supplied property listing reference using existing search, details and posting workflows.
- [x] Connect dynamic filters, counts, sorting, views, pagination, saved-coordinate map and favorites without changing role permissions.
- [x] Verify real listings, authenticated favorites with reload/restore, combined filters, new-tab details, sign-in return and desktop/695px/390px layouts; no runtime errors. Role workflows reviewed, not re-executed.
- [ ] Actual property map markers: all four live listings lack saved coordinates; requires owners/agents to save actual locations, never fabricated pins.

## Strict hotel search and matching checkout
- [x] Show only hotels matching all selected filters and the requested available room count; no partial matches or guessed stock. Restore hotel room access by replacing the admin check's missing roles dependency with existing global admin scopes.
- [x] Match regular JaagaX guest/payment screens to HyperGuest presentation while preserving Razorpay and native booking confirmation.
- [x] Verified native one-room result, two-room empty result, missing Pool empty result, native and supplier authenticated guest-to-payment navigation, mobile no-overflow, 13 regression tests and SQL authorization checks. No payment or reservation made.

## Hotel search-to-booking continuity
- [x] Preserve search dates, guests and rooms in regular and supplier hotel details, including redirects and sign-in.
- [x] Align supplier hotel details and checkout with JaagaX presentation; automatically load rooms and make search changes optional.
- [x] Verify real availability, search-result links, supplier redirects, authenticated final-price/guest/payment navigation and mobile no-overflow; nine tests passed. No paid booking created.

## HyperGuest Marketplace import
- [x] Reuse existing static/search/pre-book/booking connector and inspect real supplier content.
- [x] Add unique property/room mapping, safe synchronization, admin controls and logs for the requested 17 hotels.
- [x] Integrate imported inventory with existing customer filters, maps, details and live availability.
- [x] Separate ordinary marketplace bookings from certification-only restrictions without changing supplier/payment handling.
- [x] Import actual data; verify authenticated admin management, customer results and final-price checkout, 22 regression tests and mobile no-overflow. All 17 imported plus 3 preserved live hotels, 61 room types, no local stock/prices.
- [ ] Chargeable booking/confirmation and published map verification: require user-authorized payment and an authorized map origin; no reservation created during development.

- [x] Migration: `agent_meeting_requests`, `agent_inquiries`, `agent_faqs` (grants + RLS)
- [x] `src/lib/agentProfile.ts` derivation helpers + tests (chips, trust items, stats, slots)
- [x] Rebuild `src/pages/AgentDetail.tsx` to reference layout (hero, stats, tabs, sidebar, properties, meeting dialog, contact gating)
- [x] Agent dashboard panel: meeting requests + inquiries + FAQ management
- [x] Verify: typecheck, tests (154 passed), build OK, Playwright (tabs, meeting dialog, no page errors)

## Separate HyperGuest page
- [x] Add connector-backed property listing and a link from Hotels, keeping test inventory separate.
- [x] Verify loaded property, search, detail navigation and mobile layout (live connector response, no page errors or mobile overflow; build OK).
