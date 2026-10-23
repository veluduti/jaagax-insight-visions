# Active roadmap — JAAGA Travel
## Smart Stays location recommendations
- [x] Integrate destination-based attractions, popular places, local experiences, hidden gems and approved JaagaX property matches across the creator, published and booked plan views; unknown destinations retain map discovery links
- [x] Ten tests passed; signed-in creator flow verified Hyderabad/Vijayawada recommendations, category switching, a real approved property link and mobile layout without overflow. Build OK. Published/booked customer views could not be exercised against a live package because the only current package awaits hotel approval; no package or booking created.
## Hyderabad featured properties
- [x] Include approved nearby-city properties within 100 km of Hyderabad; four tests passed and homepage Moosapet/Dilsukhnagar cards and separate-tab details verified. Missing legacy pins use city-centre discovery estimates; pending Balanagar remains excluded.
## Final approval error
- [x] Fix both edited-agent submission forms with atomic lifecycle synchronization; repair Kukatpally coworking review and verify District Admin approval in the browser, safe repeated approval, four eligibility tests and build OK.
- [x] Fix the blocked publishing transition with atomic final approval; verified Moosapet approval and persisted live status in the district-admin dashboard. Balanagar remains pending for manual review.
## Locality test agents
- [x] Created agent1 and agent2 with securely updated passwords; verified password sign-in, locality coverage, one pending assignment each, owner/agent notifications, and each property's signed-in Assigned Properties page. Acceptance and site verification remain for the agents.
## State-to-district property release
- [x] Confirm state release skipped an unassigned district; temporarily assign districtadmin@gmail.com to Medchal-Malkajgiri as requested, requeue Balanagar, verify signed-in district card/Hold action, and pass 14 handoff tests
## Hotel discovery layout
- [x] Match the supplied hotel page structure with a photo banner, category tabs, search and AI search, sidebar filters and horizontal hotel results
- [x] Verify city selection, successful AI search applying real criteria, filters, guest selection, sort/list/grid controls and signed-out booking entry on desktop and mobile; no payment made
## Admin-only hotel coupons
- [x] Restrict coupon management to JaagaX Admin and add global/hotel-specific management
- [x] Validate coupon conditions and atomic usage limits across single/multi-room hotel booking paths
- [x] Verify admin UI creation/readback, real hotel-manager write denial, live quote conditions and booking usage limits; seven tests passed and temporary records removed. Partner pricing screen verification is blocked by that account's existing KYC redirect; no payment taken.
## Posting and subscription charges
- [ ] Set authoritative posting fee to ₹300 + 18% GST and agent subscription to ₹1,999 + 18% GST monthly — blocked: Lovable Cloud is paused; saved pricing cannot be updated or read back until resumed
- [x] Verify exact totals and preserve paise in displays and payment requests — three calculation tests passed; preview build OK
- [ ] Verify signed-in checkout against saved pricing — blocked: paused Lovable Cloud prevents sign-in and billing requests
## Long-stay booking details
- [x] Restore date selection for mixed inventory on Jaagax---Durga — verified hotel date inputs and long-stay popup on desktop/mobile; no payment made
- [x] Show configured Hostel, PG and Co-living accommodation details and rental policies throughout customer booking
- [x] Remove remaining nightly fields on long-stay detail pages and verify weekly/monthly date selection — signed-in existing legacy Hostel, PG and Co-living rooms; no payment made

## Property pricing and payment plans
- [x] Gate pricing entry, submission and customer visibility on property admin approval; verified signed-in pending-page denial, approved customer plans, owner permissions and 18 tests
- [x] Replace Comparable Listings with approved price breakdown and selectable payment plans
- [x] Add owner/builder and assigned-agent pricing editor, revisions and enquiry management
- [x] Add secure Global Admin approval, amendment and rejection with notifications
- [x] Validate pricing calculations, owner submission/readback, ownership, rejected unauthorized review and signed-out redirects
- [ ] Verify Global Admin amendment/approval and customer enquiry/creator readback end to end — blocked: current signed-in account is a customer, and no approved live property exists; requires an authorized admin account and approved test listing

- [x] Add Find My Agent and Smart Visits shortcuts directly above homepage Featured Properties
- [x] Improve Smart Visit cards and validate time labels
- [x] Navigate notifications to their linked pages; correct legacy dashboard URLs
- [x] Keep Explore above Stays search controls
- [ ] Verify linked agent-dashboard content — blocked by its existing persistent loading state
- [x] Keep Travel hotel browsing and room previews on the plan page
- [x] Correct right-aligned secondary navigation on narrow screens and verify the layout
- [x] Align the second Travel header links to the right without changing the main header
- [x] Show real destination-matched hotels below generated and reopened AI plans
- [x] Verify header positioning and the signed-in plan-to-hotel journey
- [x] Phase 1: Travel entry points, shell, discovery home, destination and experience details
- [x] Phase 2: Travel profile, AI plan creation, flexible itinerary and Ask JAAGA
- [x] Phase 3: Saved collections, plan comments and private travel memories
- [x] Phase 4: Existing hotel/property recommendations and conversion tracking
- [x] Phase 5: Partner submissions and global-admin Travel review foundations
- [x] Validate public desktop/mobile discovery and signed-in plan generation, save and reopen

- [x] Spec v2: new home hero/actions, Inspire Me + Surprise Me, Join a Journey (group trips), Communities, Memories feed

## Future expansion
- [ ] Invite-based collaborative editing and itinerary voting
- [ ] Rich memory albums with photo uploads and privacy controls
- [ ] Full creator analytics, moderation reports and partner verification workflows

- [ ] Smart Stays Phase 3: retries, compensation, Razorpay refunds, customer cancellation
- [ ] Smart Stays Phase 4: commission rules/ledger, admin console, settlements

- [x] Back button on every page
- [x] Pricing workflow test (Chanda Nagar)
- [ ] HyperGuest Stage 3 live booking (awaiting payment method answer)
