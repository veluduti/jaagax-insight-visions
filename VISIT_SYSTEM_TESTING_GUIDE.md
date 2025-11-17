# JaagaX Visit System - Complete Testing Guide

## Prerequisites

### 1. Test Users Setup
You need at least 3 different user accounts with different roles:

**Buyer Account:**
- Sign up at `/auth`
- Role: buyer (default)
- Will be used to schedule visits

**Agent Account:**
- Sign up at `/auth`
- Go to database and update `user_roles` table to set role = 'agent'
- Create an entry in `agents` table with this user_id

**Builder Account:**
- Sign up at `/auth`
- Go to database and update `user_roles` table to set role = 'builder'
- Link to a project in the database

### 2. Test Data Setup
Ensure you have:
- At least 1 property in the `properties` table
- Property must have: `id`, `title`, `locality`, `city`, `lat`, `lng`
- At least 1 agent in the `agents` table
- Agent must have: `name`, `photo_url`, `user_id`

---

## Flow 1: Complete Visit Lifecycle (Happy Path)

### Step 1: Schedule a Visit (as Buyer)
**Route:** `/visit/schedule/:propertyId`

1. Log in as **Buyer**
2. Go to any property detail page: `/property/1` (replace 1 with actual property ID)
3. Click "Schedule Visit" button
4. You should see the Visit Scheduling Wizard with:
   - Property information at the top
   - Step 1: Date & Time Selection
   - Available dates in calendar
   - Time slots (9 AM, 11 AM, 2 PM, 4 PM)

5. **Test Actions:**
   - Select a date (today or future date)
   - Select a time slot
   - Click "Continue"
   - See Step 2: Travel Preferences
   - Select travel mode (Self, Basic Car, Premium Car)
   - Enter pickup location (if not self)
   - Click "Continue"
   - See Step 3: Confirmation
   - Review all details
   - Click "Confirm Visit"

6. **Expected Outcome:**
   - Success toast: "Visit scheduled successfully!"
   - Redirect to `/visit/confirm/:bookingId`
   - New entry created in `visit_bookings` table with status = 'builder_pending'

### Step 2: View Confirmation Page (as Buyer)
**Route:** `/visit/confirm/:bookingId`

1. After scheduling, you're automatically redirected here
2. **You should see:**
   - ✓ Success icon with "Visit Request Confirmed"
   - Status badge showing "BUILDER PENDING"
   - Visit details card with:
     - Booking ID
     - Property name
     - Date & time
     - Agent assigned (auto-assigned)
     - Vehicle details (if not self)
     - Pickup location
   - "Waiting for builder approval" message
   - OTP and QR code (only after builder approves)
   - Action buttons: "View All Visits"

3. **Test Database:**
   ```sql
   SELECT * FROM visit_bookings WHERE id = 'your-booking-id';
   -- Should show status = 'builder_pending'
   ```

### Step 3: Builder Approves Visit
**Route:** `/dashboard/builder/visits`

1. Log out and log in as **Builder**
2. Navigate to `/dashboard/builder/visits`
3. **You should see:**
   - List of pending visits
   - Each visit card shows:
     - Property name
     - Visitor name
     - Date & time
     - Status badge "BUILDER PENDING"
     - "Approve" and "Reject" buttons

4. **Test Actions:**
   - Find your test visit
   - Click "Approve"
   - Optionally add notes
   - Confirm approval

5. **Expected Outcome:**
   - Success toast: "Visit approved successfully"
   - Visit status changes to 'confirmed'
   - Visit card moves from pending to confirmed section
   - Buyer receives notification (check `notifications` table)

6. **Test Database:**
   ```sql
   SELECT * FROM visit_bookings WHERE id = 'your-booking-id';
   -- Should show status = 'confirmed'
   ```

### Step 4: View Updated Confirmation (as Buyer)
**Route:** `/visit/confirm/:bookingId`

1. Log back in as **Buyer**
2. Go to `/visit/confirm/:bookingId` (use same booking ID)
3. **You should NOW see:**
   - Status badge showing "CONFIRMED"
   - 6-digit OTP code
   - QR code (scannable)
   - "Track Live" button (enabled)
   - Agent details with contact info

### Step 5: View Live Tracking (as Buyer)
**Route:** `/visit/live/:bookingId`

1. Still as **Buyer**, click "Track Live" or navigate to `/visit/live/:bookingId`
2. **You should see:**
   - Property information header
   - Agent card with photo and contact
   - Vehicle details (if applicable)
   - Status timeline showing:
     - ✓ Visit Scheduled
     - ✓ Builder Approved
     - ⏳ Waiting for Verification (pending)
     - Upcoming: Tour Started, Tour Completed
   - QR code display
   - OTP display
   - Map showing property location
   - Action buttons:
     - "View Story" (disabled until visit starts)
     - "AI Summary" (disabled until visit completes)

### Step 6: Agent Verifies and Starts Visit
**Route:** `/visit/verify` (Security/Agent verifies)

1. Log out and log in as **Agent**
2. Navigate to `/visit/verify`
3. **Test Actions:**
   - Enter the Booking ID (from confirmation page)
   - Enter the 6-digit OTP
   - Click "Verify & Start Visit"

4. **Expected Outcome:**
   - Success toast: "Visit verified successfully! Visit started."
   - Status changes to 'in_progress'
   - Redirect to `/visit/live/:bookingId`

5. **Test Database:**
   ```sql
   SELECT * FROM visit_bookings WHERE id = 'your-booking-id';
   -- Should show status = 'in_progress'
   ```

### Step 7: Agent Shares Live Stories
**Route:** `/agent/visit/story/:bookingId`

1. Still as **Agent**, from agent dashboard `/dashboard/agent/visits`
2. Find the in-progress visit
3. Click "Share Story" button
4. You're taken to `/agent/visit/story/:bookingId`
5. **Test Actions:**
   - Type a text update: "On my way to the property"
   - Click "Share Update"
   - Upload a photo (optional): Property exterior
   - Add caption: "Beautiful entrance"
   - Click "Share Update"
   - Upload another photo: Living room view
   - Add caption: "Spacious living area"
   - Click "Share Update"

6. **Expected Outcome:**
   - Each update appears in the feed
   - Success toast after each share
   - New entries in `visit_story_updates` table

### Step 8: Buyer Views Live Story Feed
**Route:** `/visit/story/:bookingId`

1. Switch back to **Buyer** account
2. From `/visit/live/:bookingId`, click "View Story" button
3. Navigate to `/visit/story/:bookingId`
4. **You should see:**
   - "Live Visit Story" header
   - Property and agent info
   - Status badge showing "IN PROGRESS"
   - Real-time story feed showing all updates from agent:
     - Text updates with timestamp
     - Photos with captions
     - Agent profile pic and name on each update
   - Stories auto-refresh in real-time (Supabase Realtime)
   - "Auto-expire after 24 hours" notice

5. **Test Real-time:**
   - Keep this page open
   - In another tab, log in as agent and post a new story
   - Watch the buyer's story feed update automatically
   - Should see toast: "New update from your agent!"

### Step 9: Agent Completes Visit
**Route:** `/dashboard/agent/visits`

1. Log in as **Agent**
2. Navigate to `/dashboard/agent/visits`
3. Find the in-progress visit
4. Click "Complete Visit" button
5. Confirm completion

6. **Expected Outcome:**
   - Success toast: "Visit marked as completed"
   - Status changes to 'completed'
   - Agent receives +10 XP points
   - Agent's `completed_visits` count increases by 1

7. **Test Database:**
   ```sql
   SELECT * FROM visit_bookings WHERE id = 'your-booking-id';
   -- Should show status = 'completed'
   
   SELECT completed_visits, xp_points FROM agents WHERE id = 'agent-id';
   -- XP should increase by 10
   ```

### Step 10: Buyer Views AI Summary
**Route:** `/visit/summary/:bookingId`

1. Switch to **Buyer** account
2. From `/visit/live/:bookingId`, click "AI Summary" button (now enabled)
3. Navigate to `/visit/summary/:bookingId`
4. **You should see:**
   - "Generate AI Summary" button (first time)
   - Click it

5. **AI Generation Process:**
   - Loading state: "Generating..."
   - Calls `generate-visit-summary` edge function
   - Edge function fetches:
     - Visit details
     - Property info
     - Story updates
   - Uses OpenAI to generate summary

6. **Expected Summary Output:**
   - AI Insights paragraph
   - Visit Highlights (numbered list)
   - What You Liked (list with thumbs up icons)
   - Points to Consider (concerns)
   - Recommended Next Steps (numbered)
   - Similar Properties You Might Like (cards)
   - Download PDF & Share buttons

7. **Test Database:**
   ```sql
   SELECT * FROM visit_summaries WHERE booking_id = 'your-booking-id';
   -- Should show the generated summary
   ```

---

## Flow 2: Visit Management (Buyer Dashboard)

### Route: `/visit/manage`

1. Log in as **Buyer**
2. Navigate to `/visit/manage`
3. **You should see:**
   - All your scheduled visits
   - Filter tabs: All, Upcoming, Completed, Cancelled
   - Each visit card shows:
     - Property name
     - Date & time
     - Status badge
     - Action buttons (View, Cancel)

4. **Test Actions:**
   - Filter by "Upcoming" - only see confirmed/in-progress visits
   - Filter by "Completed" - only see completed visits
   - Click "View" on any visit - redirects to `/visit/live/:bookingId`
   - Click "Cancel" on upcoming visit - opens confirmation dialog
   - Confirm cancellation

5. **Expected Outcome:**
   - Status changes to 'cancelled'
   - Visit removed from upcoming, shown in cancelled filter

---

## Flow 3: Agent Dashboard Workflow

### Route: `/dashboard/agent/visits`

1. Log in as **Agent**
2. Navigate to `/dashboard/agent/visits`
3. **You should see:**
   - Stats cards at top:
     - Today's Visits (count)
     - Total Completed
     - XP Points
     - Current Level
   - Tabs: Upcoming, In Progress, Completed, All
   - Visit cards with:
     - Property details
     - Buyer name & phone
     - Date & time
     - Status-specific actions

4. **Test Upcoming Tab:**
   - See all confirmed visits
   - "Start Visit" button (only on visit day)
   - "View Details" button

5. **Test In Progress Tab:**
   - See currently active visits
   - "Share Story" button - goes to story upload
   - "Complete Visit" button
   - "View Details" button

6. **Test Completed Tab:**
   - See past completed visits
   - "View Summary" button
   - No action buttons

---

## Flow 4: Builder Dashboard Workflow

### Route: `/dashboard/builder/visits`

1. Log in as **Builder**
2. Navigate to `/dashboard/builder/visits`
3. **You should see:**
   - Stats cards:
     - Pending Approvals (count)
     - Today's Visits
     - This Month Total
   - Two sections:
     - Pending Visits
     - Approved/Confirmed Visits

4. **Test Pending Visits:**
   - Each card has "Approve" and "Reject" buttons
   - Click "Approve" - opens dialog
   - Add optional notes
   - Confirm approval
   - Visit moves to confirmed section

5. **Test Reject Flow:**
   - Click "Reject" on another pending visit
   - Add rejection reason
   - Confirm rejection
   - Visit status changes to 'cancelled'
   - Buyer receives notification

---

## Flow 5: Edge Cases & Error Handling

### Test 1: Invalid Booking ID
1. Navigate to `/visit/live/invalid-id-123`
2. **Expected:** "Visit not found" message with "Back to Home" button

### Test 2: Accessing Other User's Visit
1. Log in as **Buyer A**
2. Schedule a visit (note the booking ID)
3. Log out and log in as **Buyer B**
4. Try to access `/visit/live/:buyerA-bookingId`
5. **Expected:** Access denied or redirect (needs RLS policy check)

### Test 3: Expired OTP
1. Schedule a visit
2. Wait for OTP to expire (if time-based expiry is implemented)
3. Try to verify with expired OTP
4. **Expected:** "OTP expired" error message

### Test 4: Wrong OTP
1. Schedule a visit
2. At `/visit/verify`, enter wrong OTP
3. **Expected:** "Invalid OTP or Booking ID" error

### Test 5: Story Upload Without Active Visit
1. Log in as **Agent**
2. Try to access `/agent/visit/story/:completed-bookingId`
3. **Expected:** Should restrict story uploads to in-progress visits only

### Test 6: AI Summary Before Visit Completion
1. Schedule a visit but don't complete it
2. Try to generate AI summary
3. **Expected:** Button should be disabled or show "Complete visit first" message

---

## Testing Checklist

### Database Checks
- [ ] Visit created with correct status
- [ ] Agent auto-assigned based on locality
- [ ] OTP generated (6 digits)
- [ ] Status transitions work: pending → confirmed → in_progress → completed
- [ ] XP points added to agent on completion
- [ ] Story updates saved with timestamps
- [ ] AI summary saved after generation

### UI/UX Checks
- [ ] All pages load without errors
- [ ] Loading skeletons appear during data fetch
- [ ] Error states show friendly messages
- [ ] Status badges show correct colors
- [ ] Timeline updates in real-time
- [ ] Story feed updates live (Realtime)
- [ ] Mobile responsive on all pages
- [ ] Dark mode + emerald theme consistent
- [ ] Buttons disabled/enabled based on status

### Navigation Checks
- [ ] All "Back" buttons work
- [ ] Breadcrumbs are accurate
- [ ] Dashboard links go to correct pages
- [ ] Deep links work (can bookmark and return)
- [ ] Redirects happen correctly after actions

### Real-time Checks
- [ ] Story updates appear instantly for buyer
- [ ] Status changes reflect immediately
- [ ] Notifications sent on key events
- [ ] Multiple tabs sync properly

---

## Quick Test Script

For rapid testing, follow this minimal path:

1. **Setup:** Create 1 buyer, 1 agent, 1 builder, 1 property
2. **As Buyer:** Schedule visit → `/visit/schedule/1`
3. **As Builder:** Approve visit → `/dashboard/builder/visits`
4. **As Buyer:** Check confirmation → `/visit/confirm/:id`
5. **As Agent:** Verify visit → `/visit/verify`
6. **As Agent:** Share 2-3 stories → `/agent/visit/story/:id`
7. **As Buyer:** View live feed → `/visit/story/:id`
8. **As Agent:** Complete visit → `/dashboard/agent/visits`
9. **As Buyer:** Generate AI summary → `/visit/summary/:id`
10. **Verify:** All data in database, XP updated, summary generated

---

## Common Issues & Solutions

### Issue: "invalid input syntax for type uuid"
**Solution:** Check that booking IDs in routes are actual UUIDs from database, not `:bookingId` literal string

### Issue: No agent assigned
**Solution:** Ensure agent exists with matching `cities_served` or locality

### Issue: Story feed not updating
**Solution:** Check Supabase Realtime subscription is active, refresh page

### Issue: AI summary fails
**Solution:** Verify OpenAI API key is set in edge function secrets, check function logs

### Issue: OTP verification fails
**Solution:** Ensure OTP matches exactly, check if OTP was generated (not null in DB)

### Issue: Builder doesn't see pending visits
**Solution:** Verify builder is linked to property via `builder_id` or `submitted_by`

---

## Success Criteria

✅ Complete end-to-end visit flow works without errors  
✅ All status transitions happen correctly  
✅ Real-time updates work (stories, status)  
✅ All dashboards show relevant data  
✅ AI summary generates meaningful insights  
✅ XP and gamification update correctly  
✅ Mobile experience is smooth  
✅ No console errors or broken links  
✅ Data integrity maintained in database  

---

## Next Steps After Testing

1. Test with real users (beta group)
2. Monitor edge function logs for errors
3. Gather feedback on AI summary quality
4. Optimize real-time performance
5. Add analytics tracking
6. Implement WhatsApp notifications (if needed)
7. Scale test with multiple concurrent visits

---

**Good luck testing! 🚀**
